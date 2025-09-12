'use client';

import { useState, useEffect, useRef } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Star, Package, ShoppingBag, Mic, MicOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCard from '@/components/marketplace/ProductCard';
import { VoiceControl } from '@/components/ui/VoiceControl';
import { ConversationalVoiceProcessor } from '@/lib/service/ConversationalVoiceProcessor';
import { useToast } from '@/hooks/use-toast';

export default function MarketplacePage() {
    const [products, setProducts] = useState<IProductDocument[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<IProductDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('newest');
    const [categories, setCategories] = useState<string[]>([]);

    // Voice-related state
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceCommand, setVoiceCommand] = useState('');
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const conversationalProcessor = ConversationalVoiceProcessor.getInstance();
    const { toast } = useToast();

    // Fetch products on component mount
    useEffect(() => {
        fetchProducts();
    }, []);

    // Filter and sort products when dependencies change
    useEffect(() => {
        filterAndSortProducts();
    }, [products, searchQuery, selectedCategory, sortBy]);

    // Set up voice command listeners
    useEffect(() => {
        const voiceService = conversationalProcessor;

        // Listen for voice commands from the global voice service
        const handleVoiceCommand = (command: string) => {
            processVoiceCommand(command);
        };

        // For now, we'll simulate voice command handling
        // In production, this would integrate with the global voice service
        const checkForVoiceCommands = () => {
            // This is a placeholder for integrating with global voice commands
            // The actual implementation would listen to voice service events
        };

        checkForVoiceCommands();

        return () => {
            // Cleanup if needed
        };
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products?status=published');
            const data = await response.json();
            
            if (data.success) {
                setProducts(data.data);
                // Extract unique categories
                const uniqueCategories = [...new Set(data.data.map((p: IProductDocument) => p.category))] as string[];
                setCategories(uniqueCategories);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterAndSortProducts = () => {
        let filtered = [...products];

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(product => product.category === selectedCategory);
        }

        // Sort products
        switch (sortBy) {
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
        }

        setFilteredProducts(filtered);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Search is handled by useEffect
    };

    // Voice command processing
    const processVoiceCommand = async (command: string) => {
        setIsProcessingVoice(true);
        setVoiceCommand(command);

        try {
            // Update conversational context
            conversationalProcessor.updateContext({
                currentPage: '/marketplace',
                recentActions: ['voice_search', 'marketplace_browse']
            });

            // Create a text-based audio buffer for processing
            const textBuffer = new ArrayBuffer(command.length * 2);
            const result = await conversationalProcessor.processVoiceCommand(textBuffer, 'hi');

            // Handle different types of voice commands
            if (result.intent.type === 'search' || command.toLowerCase().includes('search') || command.toLowerCase().includes('dhundho')) {
                handleVoiceSearch(command);
            } else if (result.intent.type === 'action' || command.toLowerCase().includes('filter') || command.toLowerCase().includes('dikhao')) {
                handleVoiceFilter(command);
            } else if (result.intent.type === 'navigate' || command.toLowerCase().includes('go to') || command.toLowerCase().includes('show') || command.toLowerCase().includes('jao')) {
                handleVoiceNavigation(command);
            } else if (command.toLowerCase().includes('help') || command.toLowerCase().includes('madad') || command.toLowerCase().includes('samajh')) {
                handleVoiceHelp(command);
            } else if (command.toLowerCase().includes('clear') || command.toLowerCase().includes('reset') || command.toLowerCase().includes('saaf')) {
                handleVoiceClearFilters(command);
            } else {
                // Try to handle as a general search or provide help
                const lowerCommand = command.toLowerCase();
                if (lowerCommand.length > 2) {
                    // If it's a substantial command, try search
                    handleVoiceSearch(command);
                } else {
                    handleVoiceHelp(command);
                }
            }

            // Provide voice feedback
            if (result.response) {
                speakFeedback(result.response);
            }

        } catch (error) {
            console.error('Voice command processing failed:', error);
            speakFeedback('Sorry, I had trouble understanding that. Please try again.');
        } finally {
            setIsProcessingVoice(false);
        }
    };

    const handleVoiceSearch = (command: string) => {
        // Extract search terms from voice command
        const searchTerms = command.toLowerCase()
            .replace(/search for|find|look for|show me|dhundho|dikhao/gi, '')
            .trim();

        if (searchTerms) {
            setSearchQuery(searchTerms);
            toast({
                title: "🔍 Voice Search",
                description: `Searching for "${searchTerms}"`,
            });

            // Provide voice feedback
            speakFeedback(`Searching for ${searchTerms} in the marketplace`);
        } else {
            speakFeedback('What would you like to search for?');
        }
    };

    const handleVoiceFilter = (command: string) => {
        const lowerCommand = command.toLowerCase();

        // Category filtering
        if (lowerCommand.includes('textile') || lowerCommand.includes('fabric') || lowerCommand.includes('kapda')) {
            setSelectedCategory('textiles');
            toast({
                title: "🎨 Voice Filter",
                description: "Showing textile products",
            });
            speakFeedback('Showing textile and fabric products');
        } else if (lowerCommand.includes('jewelry') || lowerCommand.includes('jewellery') || lowerCommand.includes('gahna')) {
            setSelectedCategory('jewelry');
            toast({
                title: "💍 Voice Filter",
                description: "Showing jewelry products",
            });
            speakFeedback('Showing jewelry and ornament products');
        } else if (lowerCommand.includes('pottery') || lowerCommand.includes('ceramic') || lowerCommand.includes('matka')) {
            setSelectedCategory('pottery');
            toast({
                title: "🏺 Voice Filter",
                description: "Showing pottery products",
            });
            speakFeedback('Showing pottery and ceramic products');
        } else if (lowerCommand.includes('handicraft') || lowerCommand.includes('handmade') || lowerCommand.includes('hathkala')) {
            setSelectedCategory('handicrafts');
            toast({
                title: "🎨 Voice Filter",
                description: "Showing handicraft products",
            });
            speakFeedback('Showing handmade handicraft products');
        } else if (lowerCommand.includes('all') || lowerCommand.includes('clear') || lowerCommand.includes('reset')) {
            setSelectedCategory('all');
            toast({
                title: "🔄 Voice Filter",
                description: "Showing all products",
            });
            speakFeedback('Showing all products');
        }

        // Price sorting
        if (lowerCommand.includes('cheapest') || lowerCommand.includes('lowest price') || lowerCommand.includes('sasta')) {
            setSortBy('price-low');
            toast({
                title: "💰 Voice Sort",
                description: "Sorted by lowest price",
            });
            speakFeedback('Sorted by lowest price first');
        } else if (lowerCommand.includes('expensive') || lowerCommand.includes('highest price') || lowerCommand.includes('mehnga')) {
            setSortBy('price-high');
            toast({
                title: "💎 Voice Sort",
                description: "Sorted by highest price",
            });
            speakFeedback('Sorted by highest price first');
        } else if (lowerCommand.includes('newest') || lowerCommand.includes('latest') || lowerCommand.includes('naya')) {
            setSortBy('newest');
            toast({
                title: "🆕 Voice Sort",
                description: "Sorted by newest first",
            });
            speakFeedback('Sorted by newest products first');
        }
    };

    const handleVoiceNavigation = (command: string) => {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('home') || lowerCommand.includes('dashboard') || lowerCommand.includes('ghar')) {
            window.location.href = '/';
            speakFeedback('Taking you to the dashboard');
        } else if (lowerCommand.includes('profile') || lowerCommand.includes('account') || lowerCommand.includes('pr')) {
            window.location.href = '/profile';
            speakFeedback('Opening your profile');
        } else if (lowerCommand.includes('create') || lowerCommand.includes('product') || lowerCommand.includes('naya')) {
            window.location.href = '/smart-product-creator';
            speakFeedback('Opening product creator');
        } else if (lowerCommand.includes('finance') || lowerCommand.includes('money') || lowerCommand.includes('paisa')) {
            window.location.href = '/finance/dashboard';
            speakFeedback('Opening finance dashboard');
        } else if (lowerCommand.includes('schemes') || lowerCommand.includes('government') || lowerCommand.includes('sarkar')) {
            window.location.href = '/yojana-mitra';
            speakFeedback('Opening government schemes');
        }
    };

    const handleVoiceClearFilters = (command: string) => {
        setSearchQuery('');
        setSelectedCategory('all');
        setSortBy('newest');
        toast({
            title: "🔄 Filters Cleared",
            description: "All filters have been reset",
        });
        speakFeedback('All filters cleared. Showing all products');
    };

    const handleVoiceHelp = (command: string) => {
        const helpMessage = `
            You can say:
            • "Search for sarees" or "find jewelry"
            • "Show textiles" or "filter by pottery"
            • "Sort by cheapest" or "newest first"
            • "Clear filters" or "show all"
            • "Go to profile" or "create product"
            • "Help" for this message
        `;
        speakFeedback('Here are some voice commands you can try');
        toast({
            title: "💡 Voice Help",
            description: "Try: 'search for sarees', 'show jewelry', 'sort by cheapest'",
        });
    };

    const speakFeedback = async (text: string) => {
        try {
            const response = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    language: 'hi',
                    voiceType: 'artisan_female',
                    speed: 1.0
                })
            });

            const result = await response.json();
            if (result.success && result.audioData) {
                const audio = new Audio(result.audioData);
                audio.play();
            }
        } catch (error) {
            console.error('Voice feedback failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen ">
                <div className="container mx-auto px-4 py-8">
                    {/* Header Skeleton */}
                    <div className="text-center mb-12">
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-6 w-96 mx-auto" />
                    </div>

                    {/* Filters Skeleton */}
                    <div className="mb-8 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <Skeleton className="h-10 flex-1" />
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-10 w-48" />
                        </div>
                    </div>

                    {/* Products Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="aspect-square w-full" />
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-8 w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <ShoppingBag className="h-10 w-10 text-orange-600" />
                        <h1 className="text-4xl font-bold text-gray-900">
                            Artisan Marketplace
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
                        Discover unique handcrafted products from talented artisans around the world
                    </p>

                    {/* Voice Control */}
                    <div className="flex justify-center mb-4">
                        <VoiceControl
                            variant="inline"
                            showSettings={true}
                            autoStart={false}
                        />
                    </div>

                    {/* Voice Status */}
                    {isVoiceActive && (
                        <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full inline-flex">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Voice Active - Try saying "search for sarees" or "show jewelry"</span>
                        </div>
                    )}

                    {isProcessingVoice && (
                        <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-full inline-flex mt-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span>Processing: "{voiceCommand}"</span>
                        </div>
                    )}
                </div>

                {/* Filters and Search */}
                <div className="mb-8 space-y-4">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                type="text"
                                placeholder="Search products, categories, or tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="price-low">Price: Low to High</SelectItem>
                                <SelectItem value="price-high">Price: High to Low</SelectItem>
                                <SelectItem value="name">Name A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                    </form>

                    {/* Results count */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                        </p>
                        {(searchQuery || selectedCategory !== 'all') && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('all');
                                }}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No products found
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Try adjusting your search or filter criteria
                        </p>
                        <Button 
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                        >
                            View All Products
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.productId} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}