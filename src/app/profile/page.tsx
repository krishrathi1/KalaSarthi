'use client';

import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import AuthGuard from '@/components/auth/AuthGuard';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, TrendingUp, Mic, MicOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductGrid, ProfileHeader, ProfileInfo } from '@/components/profile';
import ScrapedProductGrid from '@/components/profile/ScrapedProductGrid';
import { useToast } from '@/hooks/use-toast';
import { VoiceControl } from '@/components/ui/VoiceControl';
import { ConversationalVoiceProcessor } from '@/lib/service/ConversationalVoiceProcessor';

export default function ProfilePage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<IProductDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [scrapedProducts, setScrapedProducts] = useState<any>({});
    const [scrapingLoading, setScrapingLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('handicraft');
    const [activeTab, setActiveTab] = useState('published');

    // Voice-related state
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceCommand, setVoiceCommand] = useState('');
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const conversationalProcessor = ConversationalVoiceProcessor.getInstance();
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchUserProducts = async () => {
            if (!userProfile?.uid) {
                console.log('No userProfile.uid available');
                return;
            }

            try {
                setLoading(true);
                console.log('Fetching products for artisanId:', userProfile.uid);
                const response = await fetch(`/api/products?artisanId=${userProfile.uid}`);
                const result = await response.json();
                
                console.log('API Response:', result);

                if (result.success) {
                    console.log('Products fetched:', result.data?.length || 0);
                    setProducts(result.data || []);
                } else {
                    console.error('API Error:', result.error);
                    setError(result.error || 'Failed to fetch products');
                }
            } catch (err) {
                console.error('Fetch Error:', err);
                setError('Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };

        if (userProfile) {
            fetchUserProducts();
        }
    }, [userProfile]);

    const handleProductStatusChange = async (productId: string, newStatus: 'published' | 'draft' | 'archived') => {
        try {
            setUpdating(productId);
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const result = await response.json();

            if (result.success) {
                // Update the local products state
                setProducts(prevProducts => 
                    prevProducts.map(product => 
                        product.productId === productId 
                            ? { ...product, status: newStatus } as IProductDocument
                            : product
                    )
                );

                // Show success toast
                const statusMessages = {
                    published: 'Product published successfully!',
                    archived: 'Product archived successfully!',
                    draft: 'Product moved to drafts!'
                };

                toast({
                    title: 'Status Updated',
                    description: statusMessages[newStatus],
                });
            } else {
                toast({
                    title: 'Update Failed',
                    description: result.error || 'Failed to update product status',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Error updating product status:', err);
            toast({
                title: 'Update Failed',
                description: 'Failed to update product status',
                variant: 'destructive',
            });
        } finally {
            setUpdating(null);
        }
    };

    const handleEditProduct = (productId: string) => {
        // Navigate to smart product creator with edit mode
        router.push(`/smart-product-creator?edit=${productId}`);
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }

        try {
            setDeleting(productId);
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                // Remove the product from local state
                setProducts(prevProducts => 
                    prevProducts.filter(product => product.productId !== productId)
                );

                toast({
                    title: 'Product Deleted',
                    description: 'Product has been permanently deleted.',
                });
            } else {
                toast({
                    title: 'Delete Failed',
                    description: result.error || 'Failed to delete product',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Error deleting product:', err);
            toast({
                title: 'Delete Failed',
                description: 'Failed to delete product',
                variant: 'destructive',
            });
        } finally {
            setDeleting(null);
        }
    };

    const fetchScrapedProducts = async (query: string = 'handicraft') => {
        try {
            setScrapingLoading(true);
            const response = await fetch(`/api/scrape-products?query=${encodeURIComponent(query)}`);
            const result = await response.json();

            if (result.success) {
                setScrapedProducts(result.data);
            } else {
                toast({
                    title: 'Scraping Failed',
                    description: result.error || 'Failed to fetch competitor products',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Error fetching scraped products:', err);
            toast({
                title: 'Scraping Failed',
                description: 'Failed to fetch competitor products',
                variant: 'destructive',
            });
        } finally {
            setScrapingLoading(false);
        }
    };

    // Voice command processing
    const processVoiceCommand = async (command: string) => {
        setIsProcessingVoice(true);
        setVoiceCommand(command);

        try {
            // Update conversational context
            conversationalProcessor.updateContext({
                currentPage: '/profile',
                recentActions: ['profile_management', 'voice_interaction']
            });

            // Create a text-based audio buffer for processing
            const textBuffer = new ArrayBuffer(command.length * 2);
            const result = await conversationalProcessor.processVoiceCommand(textBuffer, 'hi');

            // Handle different types of voice commands
            if (command.toLowerCase().includes('show') || command.toLowerCase().includes('view')) {
                handleVoiceTabSwitch(command);
            } else if (command.toLowerCase().includes('create') || command.toLowerCase().includes('new')) {
                handleVoiceCreateProduct(command);
            } else if (result.intent.type === 'search' || command.toLowerCase().includes('search') || command.toLowerCase().includes('find')) {
                handleVoiceMarketResearch(command);
            } else if (result.intent.type === 'navigate' || command.toLowerCase().includes('go to') || command.toLowerCase().includes('open')) {
                handleVoiceNavigation(command);
            } else {
                // Fallback to general help
                handleVoiceHelp(command);
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

    const handleVoiceTabSwitch = (command: string) => {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('published') || lowerCommand.includes('live')) {
            setActiveTab('published');
            toast({
                title: "🔄 Voice Tab Switch",
                description: "Showing published products",
            });
        } else if (lowerCommand.includes('draft') || lowerCommand.includes('drafts')) {
            setActiveTab('drafts');
            toast({
                title: "🔄 Voice Tab Switch",
                description: "Showing draft products",
            });
        } else if (lowerCommand.includes('archived') || lowerCommand.includes('archive')) {
            setActiveTab('archived');
            toast({
                title: "🔄 Voice Tab Switch",
                description: "Showing archived products",
            });
        } else if (lowerCommand.includes('market') || lowerCommand.includes('research')) {
            setActiveTab('market-research');
            toast({
                title: "🔄 Voice Tab Switch",
                description: "Opening market research",
            });
        }
    };

    const handleVoiceCreateProduct = (command: string) => {
        router.push('/smart-product-creator');
        toast({
            title: "🎨 Voice Action",
            description: "Opening Smart Product Creator",
        });
    };

    const handleVoiceMarketResearch = (command: string) => {
        const searchTerms = command.toLowerCase()
            .replace(/search for|find|look for/gi, '')
            .trim();

        if (searchTerms) {
            setSearchQuery(searchTerms);
            setActiveTab('market-research');
            fetchScrapedProducts(searchTerms);
            toast({
                title: "🔍 Voice Market Research",
                description: `Searching for "${searchTerms}"`,
            });
        } else {
            setActiveTab('market-research');
            toast({
                title: "📊 Voice Action",
                description: "Opening market research",
            });
        }
    };

    const handleVoiceNavigation = (command: string) => {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('dashboard') || lowerCommand.includes('home')) {
            router.push('/');
        } else if (lowerCommand.includes('marketplace') || lowerCommand.includes('shop')) {
            router.push('/marketplace');
        } else if (lowerCommand.includes('finance') || lowerCommand.includes('money')) {
            router.push('/finance/dashboard');
        }
    };

    const handleVoiceHelp = (command: string) => {
        speakFeedback('You can say: "show published products", "create new product", "search for sarees", or "go to marketplace"');
        toast({
            title: "💡 Voice Help",
            description: "Try saying: 'show drafts', 'create product', 'market research'",
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

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
                    <p className="text-muted-foreground">Please complete your registration.</p>
                </div>
            </div>
        );
    }

    const publishedProducts = products.filter(p => p.status === 'published');
    const draftProducts = products.filter(p => p.status === 'draft');
    const archivedProducts = products.filter(p => p.status === 'archived');

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
                    {/* Profile Header Section */}
                    <div className="mb-6 sm:mb-8">
                        <ProfileHeader userProfile={userProfile} />
                        
                        {/* Voice Control - Mobile responsive */}
                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <VoiceControl
                                variant="inline"
                                showSettings={true}
                                autoStart={false}
                            />

                            {/* Voice Status Indicators */}
                            <div className="flex flex-wrap gap-2">
                                {isVoiceActive && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 bg-blue-50 px-2 sm:px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span>Voice Active</span>
                                    </div>
                                )}

                                {isProcessingVoice && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-orange-600 bg-orange-50 px-2 sm:px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                        <span className="hidden sm:inline">Processing: "{voiceCommand}"</span>
                                        <span className="sm:hidden">Processing...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Responsive Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
                        {/* Profile Information Sidebar */}
                        <div className="xl:col-span-1 order-2 xl:order-1">
                            <div className="sticky top-4">
                                <ProfileInfo userProfile={userProfile} />
                            </div>
                        </div>

                        {/* Products Section */}
                        <div className="xl:col-span-3 order-1 xl:order-2">
                            <div className="bg-card rounded-lg border p-4 sm:p-6">
                                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 sm:mb-6">
                                    {userProfile.role === 'artisan' ? 'My Products' : 'Favorite Products'}
                                </h2>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-8">
                                        <p className="text-destructive text-sm sm:text-base">{error}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Debug: User ID = {userProfile?.uid}
                                        </p>
                                    </div>
                                ) : userProfile.role === 'artisan' ? (
                                    <Tabs defaultValue="published" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                                            <TabsTrigger value="published" className="text-xs sm:text-sm p-2 sm:p-3">
                                                <span className="hidden sm:inline">Published ({publishedProducts.length})</span>
                                                <span className="sm:hidden">Published</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="drafts" className="text-xs sm:text-sm p-2 sm:p-3">
                                                <span className="hidden sm:inline">Drafts ({draftProducts.length})</span>
                                                <span className="sm:hidden">Drafts</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="archived" className="text-xs sm:text-sm p-2 sm:p-3">
                                                <span className="hidden sm:inline">Archived ({archivedProducts.length})</span>
                                                <span className="sm:hidden">Archived</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="market-research" className="text-xs sm:text-sm p-2 sm:p-3">
                                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                <span className="hidden lg:inline">Market Research</span>
                                                <span className="lg:hidden">Research</span>
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="published" className="mt-6">
                                            <ProductGrid 
                                                products={publishedProducts} 
                                                showActions={true}
                                                onStatusChange={handleProductStatusChange}
                                                onEdit={handleEditProduct}
                                                onDelete={handleDeleteProduct}
                                                updating={updating}
                                                deleting={deleting}
                                            />
                                        </TabsContent>

                                        <TabsContent value="drafts" className="mt-6">
                                            <ProductGrid 
                                                products={draftProducts} 
                                                showActions={true}
                                                isDraft={true}
                                                onStatusChange={handleProductStatusChange}
                                                onEdit={handleEditProduct}
                                                onDelete={handleDeleteProduct}
                                                updating={updating}
                                                deleting={deleting}
                                            />
                                        </TabsContent>

                                        <TabsContent value="archived" className="mt-6">
                                            <ProductGrid
                                                products={archivedProducts}
                                                showActions={true}
                                                onStatusChange={handleProductStatusChange}
                                                onEdit={handleEditProduct}
                                                onDelete={handleDeleteProduct}
                                                updating={updating}
                                                deleting={deleting}
                                            />
                                        </TabsContent>

                                        <TabsContent value="market-research" className="mt-4 sm:mt-6">
                                            <div className="space-y-4 sm:space-y-6">
                                                {/* Search Section */}
                                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                                    <Input
                                                        placeholder="Search products (e.g., handicraft, jewelry)"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="flex-1 text-sm"
                                                    />
                                                    <Button
                                                        onClick={() => fetchScrapedProducts(searchQuery)}
                                                        disabled={scrapingLoading}
                                                        className="w-full sm:w-auto"
                                                        size="sm"
                                                    >
                                                        {scrapingLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Search className="h-4 w-4 mr-2" />
                                                        )}
                                                        <span className="hidden sm:inline">Search Market</span>
                                                        <span className="sm:hidden">Search</span>
                                                    </Button>
                                                </div>

                                                {/* Results Section */}
                                                {scrapingLoading ? (
                                                    <div className="flex justify-center py-8">
                                                        <Loader2 className="h-6 w-6 animate-spin" />
                                                        <p className="text-sm text-muted-foreground mt-2 ml-2">
                                                            Analyzing market data...
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-8">
                                                        {scrapedProducts.amazon && scrapedProducts.amazon.length > 0 && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                                                    <span className="text-orange-600 mr-2">Amazon</span>
                                                                    Products ({scrapedProducts.amazon.length})
                                                                </h3>
                                                                <ScrapedProductGrid
                                                                    products={scrapedProducts.amazon}
                                                                    platform="Amazon"
                                                                />
                                                            </div>
                                                        )}

                                                        {scrapedProducts.flipkart && scrapedProducts.flipkart.length > 0 && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                                                    <span className="text-blue-600 mr-2">Flipkart</span>
                                                                    Products ({scrapedProducts.flipkart.length})
                                                                </h3>
                                                                <ScrapedProductGrid
                                                                    products={scrapedProducts.flipkart}
                                                                    platform="Flipkart"
                                                                />
                                                            </div>
                                                        )}

                                                        {scrapedProducts.meesho && scrapedProducts.meesho.length > 0 && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                                                    <span className="text-pink-600 mr-2">Meesho</span>
                                                                    Products ({scrapedProducts.meesho.length})
                                                                </h3>
                                                                <ScrapedProductGrid
                                                                    products={scrapedProducts.meesho}
                                                                    platform="Meesho"
                                                                />
                                                            </div>
                                                        )}

                                                        {(!scrapedProducts.amazon || scrapedProducts.amazon.length === 0) &&
                                                         (!scrapedProducts.flipkart || scrapedProducts.flipkart.length === 0) &&
                                                         (!scrapedProducts.meesho || scrapedProducts.meesho.length === 0) && (
                                                            <div className="text-center py-12">
                                                                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                                <h3 className="text-lg font-medium mb-2">No Market Data</h3>
                                                                <p className="text-muted-foreground mb-4">
                                                                    Search for products to analyze market trends and competitor pricing.
                                                                </p>
                                                                <Button onClick={() => fetchScrapedProducts(searchQuery)}>
                                                                    <Search className="h-4 w-4 mr-2" />
                                                                    Start Market Research
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">
                                            Favorite products feature coming soon!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}