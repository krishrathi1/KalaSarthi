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
// Voice features removed - using new voice navigation system
import { useToast } from '@/hooks/use-toast';

export default function MarketplacePage() {
    const [products, setProducts] = useState<IProductDocument[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<IProductDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('newest');
    const [categories, setCategories] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [showFilters, setShowFilters] = useState(false);

    // Voice-related state
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceCommand, setVoiceCommand] = useState('');
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    // Voice processor removed - using new voice navigation system
    const { toast } = useToast();

    // Fetch products on component mount
    useEffect(() => {
        fetchProducts();
    }, []);

    // Filter and sort products when dependencies change
    useEffect(() => {
        filterAndSortProducts();
    }, [products, searchQuery, selectedCategory, sortBy, priceRange]);

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

        // Filter by price range
        filtered = filtered.filter(product =>
            product.price >= priceRange[0] && product.price <= priceRange[1]
        );

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
            window.location.href = '/scheme-sahayak';
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
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    {/* Header Skeleton */}
                    <div className="text-center mb-8 sm:mb-12">
                        <Skeleton className="h-8 sm:h-10 lg:h-12 w-48 sm:w-64 lg:w-80 mx-auto mb-4" />
                        <Skeleton className="h-4 sm:h-5 lg:h-6 w-64 sm:w-80 lg:w-96 mx-auto" />
                    </div>

                    {/* Filters Skeleton */}
                    <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                        <Skeleton className="h-16 w-full rounded-lg" />
                    </div>

                    {/* Products Grid Skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="space-y-3 sm:space-y-4 bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                                <Skeleton className="aspect-square w-full rounded-lg" />
                                <Skeleton className="h-4 sm:h-5 w-3/4" />
                                <Skeleton className="h-3 sm:h-4 w-full" />
                                <Skeleton className="h-3 sm:h-4 w-full" />
                                <Skeleton className="h-6 sm:h-8 w-1/2" />
                                <Skeleton className="h-8 sm:h-10 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4">
                        <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600 flex-shrink-0" />
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 text-center">
                            Artisan Marketplace
                        </h1>
                    </div>
                    <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto mb-4 sm:mb-6 px-4">
                        Discover unique handcrafted products from talented artisans around the world
                    </p>

                    {/* Voice Control */}
                    {/* Voice navigation now available in header */}

                    {/* Voice Status */}
                    {isVoiceActive && (
                        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-blue-600 bg-blue-50 px-3 sm:px-4 py-2 rounded-full inline-flex mx-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
                            <span className="text-center">
                                <span className="hidden sm:inline">Voice Active - Try saying "search for sarees" or "show jewelry"</span>
                                <span className="sm:hidden">Voice Active - Try voice commands</span>
                            </span>
                        </div>
                    )}

                    {isProcessingVoice && (
                        <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 px-3 sm:px-4 py-2 rounded-full inline-flex mt-2 mx-4">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse flex-shrink-0"></div>
                            <span className="text-xs sm:text-sm text-center truncate max-w-xs">
                                Processing: "{voiceCommand}"
                            </span>
                        </div>
                    )}
                </div>

                {/* Featured Categories */}
                <div className="mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
                        Shop by Category
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {[
                            { name: 'Textiles', icon: '🧵', color: 'from-purple-400 to-pink-400' },
                            { name: 'Jewelry', icon: '💍', color: 'from-yellow-400 to-orange-400' },
                            { name: 'Pottery', icon: '🏺', color: 'from-blue-400 to-cyan-400' },
                            { name: 'Handicrafts', icon: '🎨', color: 'from-green-400 to-emerald-400' },
                            { name: 'Metalwork', icon: '⚒️', color: 'from-gray-400 to-slate-400' },
                            { name: 'Woodwork', icon: '🪵', color: 'from-amber-400 to-yellow-400' }
                        ].map((category) => (
                            <button
                                key={category.name}
                                onClick={() => setSelectedCategory(category.name.toLowerCase())}
                                className={`group relative overflow-hidden rounded-xl p-4 sm:p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl ${selectedCategory === category.name.toLowerCase()
                                    ? 'ring-2 ring-orange-400 ring-offset-2'
                                    : ''
                                    }`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                                <div className="relative z-10">
                                    <div className="text-2xl sm:text-3xl mb-2">{category.icon}</div>
                                    <div className="text-white font-semibold text-sm sm:text-base">
                                        {category.name}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="mb-6 sm:mb-8 space-y-4">
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <Input
                                type="text"
                                placeholder="Search products, categories, or tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 h-14 text-base bg-white shadow-lg border-gray-200 focus:border-orange-300 focus:ring-orange-200 rounded-xl"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-orange-600"
                            >
                                <Filter className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="h-12 bg-white shadow-sm border-gray-200 focus:border-orange-300 focus:ring-orange-200 rounded-lg">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-12 bg-white shadow-sm border-gray-200 focus:border-orange-300 focus:ring-orange-200 rounded-lg">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">🆕 Newest First</SelectItem>
                                    <SelectItem value="price-low">💰 Price: Low to High</SelectItem>
                                    <SelectItem value="price-high">💎 Price: High to Low</SelectItem>
                                    <SelectItem value="name">🔤 Name A-Z</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 h-12">
                                <span className="text-sm text-gray-600 whitespace-nowrap">Price: ₹{priceRange[0]} - ₹{priceRange[1]}</span>
                            </div>
                        </div>

                        {/* Advanced Filters */}
                        {showFilters && (
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Filters</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Price Range */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Price Range</label>
                                        <div className="space-y-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="10000"
                                                step="100"
                                                value={priceRange[1]}
                                                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>₹0</span>
                                                <span>₹10,000+</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Availability</label>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline" className="cursor-pointer hover:bg-orange-50">
                                                In Stock
                                            </Badge>
                                            <Badge variant="outline" className="cursor-pointer hover:bg-orange-50">
                                                New Arrivals
                                            </Badge>
                                            <Badge variant="outline" className="cursor-pointer hover:bg-orange-50">
                                                On Sale
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('all');
                                            setPriceRange([0, 10000]);
                                            setSortBy('newest');
                                        }}
                                        className="flex-1"
                                    >
                                        Clear All
                                    </Button>
                                    <Button
                                        onClick={() => setShowFilters(false)}
                                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Results count */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                        <p className="text-sm sm:text-base text-gray-600 font-medium">
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
                                className="w-full sm:w-auto border-orange-200 text-orange-600 hover:bg-orange-50"
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 sm:py-16 bg-white rounded-xl shadow-lg border border-gray-100">
                        <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                            No products found
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">
                            Try adjusting your search or filter criteria
                        </p>
                        <Button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                                setPriceRange([0, 10000]);
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            View All Products
                        </Button>
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                    {searchQuery || selectedCategory !== 'all' ? 'Search Results' : 'All Products'}
                                </h2>
                                {!searchQuery && selectedCategory === 'all' && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        Look for 🔥 trending and ✨ new products
                                    </p>
                                )}
                            </div>
                            <div className="text-sm text-gray-500">
                                Showing {filteredProducts.length} products
                            </div>
                        </div>
                        <div className="marketplace-grid">
                            {filteredProducts.map((product, index) => (
                                <ProductCard
                                    key={product.productId}
                                    product={product}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}