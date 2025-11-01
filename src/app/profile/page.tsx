'use client';

import { useAuth } from '@/context/auth-context';
import { useEffect, useState, useRef } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import AuthGuard from '@/components/auth/AuthGuard';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, TrendingUp, Mic, MicOff, Sparkles, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductGrid, ProfileHeader, ProfileInfo } from '@/components/profile';
import ScrapedProductGrid from '@/components/profile/ScrapedProductGrid';
import { useToast } from '@/hooks/use-toast';
import { useOffline } from '@/hooks/use-offline';
import { notificationManager, notifySyncComplete } from '@/lib/notifications';
// Voice features removed - using new voice navigation system

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

    // Offline support
    const {
        isOnline,
        isSyncing,
        storeOffline,
        getOfflineData,
        sync,
    } = useOffline();

    // Track previous online state
    const previousOnlineState = useRef(isOnline);

    // Voice-related state
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceCommand, setVoiceCommand] = useState('');
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    // Voice processor removed - using new voice navigation system
    const { toast } = useToast();
    const router = useRouter();

    // Request notification permission on mount
    useEffect(() => {
        if (notificationManager.isSupported() && notificationManager.getPermission() === 'default') {
            setTimeout(() => {
                notificationManager.requestPermission();
            }, 3000);
        }
    }, []);

    // Detect connection restoration
    useEffect(() => {
        if (!previousOnlineState.current && isOnline) {
            if (notificationManager.getPermission() === 'granted') {
                notificationManager.notifyConnectionRestored();
            }
            toast({
                title: "Connection Restored",
                description: "You're back online! Refreshing products...",
            });
            if (userProfile?.uid) {
                fetchUserProducts();
            }
        }
        previousOnlineState.current = isOnline;
    }, [isOnline, userProfile]);

    const fetchUserProducts = async () => {
        if (!userProfile?.uid) {
            console.log('No userProfile.uid available');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            if (isOnline) {
                // Fetch from API when online
                console.log('Fetching products for artisanId:', userProfile.uid);
                const response = await fetch(`/api/products?artisanId=${userProfile.uid}`);
                const result = await response.json();

                console.log('API Response:', result);

                if (result.success) {
                    console.log('Products fetched:', result.data?.length || 0);
                    setProducts(result.data || []);

                    // Cache products for offline use
                    for (const product of result.data || []) {
                        await storeOffline('product', product, product.productId, true);
                    }
                } else {
                    console.error('API Error:', result.error);
                    setError(result.error || 'Failed to fetch products');
                }
            } else {
                // Load from offline storage when offline
                const offlineProducts = await getOfflineData('product') as IProductDocument[];
                const userProducts = offlineProducts.filter(p => p.artisanId === userProfile.uid);

                if (userProducts.length > 0) {
                    setProducts(userProducts);
                    toast({
                        title: "Working Offline",
                        description: `Showing ${userProducts.length} cached products.`,
                        duration: 5000,
                    });
                } else {
                    setError('No offline data available');
                    toast({
                        title: "No Offline Data",
                        description: "Please connect to the internet to load products.",
                        variant: "destructive",
                    });
                }
            }
        } catch (err) {
            console.error('Fetch Error:', err);

            // Fallback to offline data on error
            try {
                const offlineProducts = await getOfflineData('product') as IProductDocument[];
                const userProducts = offlineProducts.filter(p => p.artisanId === userProfile.uid);

                if (userProducts.length > 0) {
                    setProducts(userProducts);
                    toast({
                        title: "Using Cached Data",
                        description: "Couldn't reach server. Showing cached products.",
                        variant: "destructive",
                    });
                } else {
                    setError('Network error occurred');
                }
            } catch (offlineError) {
                console.error('Error loading offline products:', offlineError);
                setError('Failed to fetch products');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userProfile) {
            fetchUserProducts();
        }
    }, [userProfile]);

    const handleProductStatusChange = async (productId: string, newStatus: 'published' | 'draft' | 'archived') => {
        if (!isOnline) {
            toast({
                title: "Offline Mode",
                description: "Product status changes require an internet connection.",
                variant: "destructive",
            });
            return;
        }

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
        if (!isOnline) {
            toast({
                title: "Offline Mode",
                description: "Product deletion requires an internet connection.",
                variant: "destructive",
            });
            return;
        }

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
        if (!isOnline) {
            toast({
                title: "Offline Mode",
                description: "Market research requires an internet connection.",
                variant: "destructive",
            });
            return;
        }

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
            // Process voice command directly
            const result = { intent: { type: 'general' }, response: '' };

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

    const handleVoiceTabSwitch = (command: string): void => {
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

    const handleVoiceCreateProduct = (command: string): void => {
        router.push('/smart-product-creator');
        toast({
            title: "🎨 Voice Action",
            description: "Opening Smart Product Creator",
        });
    };

    const handleVoiceMarketResearch = (command: string): void => {
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

    const handleVoiceNavigation = (command: string): void => {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('dashboard') || lowerCommand.includes('home')) {
            router.push('/');
        } else if (lowerCommand.includes('marketplace') || lowerCommand.includes('shop')) {
            router.push('/marketplace');
        } else if (lowerCommand.includes('finance') || lowerCommand.includes('money')) {
            router.push('/finance/dashboard');
        }
    };

    const handleVoiceHelp = (command: string): void => {
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
                    {/* Offline/Online Indicator and Sync */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isOnline ? (
                                <Badge variant="outline" className="gap-1 border-green-200 text-green-700 bg-green-50">
                                    <Wifi className="h-3 w-3" />
                                    Online
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="gap-1 border-red-200 text-red-700 bg-red-50">
                                    <WifiOff className="h-3 w-3" />
                                    Offline
                                </Badge>
                            )}
                        </div>

                        {/* Sync Button */}
                        {isOnline && userProfile?.role === 'artisan' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                    const result = await sync();
                                    if (result) {
                                        toast({
                                            title: "Sync Complete",
                                            description: "All data synchronized successfully.",
                                        });

                                        if (notificationManager.getPermission() === 'granted') {
                                            await notifySyncComplete(result.synced || 0);
                                        }
                                    }
                                }}
                                disabled={isSyncing}
                            >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            </Button>
                        )}
                    </div>

                    {/* Offline Banner */}
                    {!isOnline && (
                        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                            <WifiOff className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800">
                                You're working offline. Showing cached products. Changes will sync when you're back online.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Profile Header Section */}
                    <div className="mb-6 sm:mb-8">
                        <ProfileHeader userProfile={userProfile} />

                        {/* AI Design Generator Button - Only for artisans */}
                        {userProfile.role === 'artisan' && (
                            <div className="mt-4">
                                <Button
                                    onClick={() => router.push('/ai-design-generator')}
                                    className="w-full sm:w-auto"
                                    variant="default"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    AI Design Generator
                                </Button>
                            </div>
                        )}

                        {/* Voice navigation now available in header */}
                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
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
                                                isOnline={isOnline}
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
                                                isOnline={isOnline}
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
                                                isOnline={isOnline}
                                            />
                                        </TabsContent>

                                        <TabsContent value="market-research" className="mt-4 sm:mt-6">
                                            <div className="space-y-4 sm:space-y-6">
                                                {/* Offline Warning for Market Research */}
                                                {!isOnline && (
                                                    <Alert className="bg-yellow-50 border-yellow-200">
                                                        <WifiOff className="h-4 w-4 text-yellow-600" />
                                                        <AlertDescription className="text-yellow-800">
                                                            Market research requires an internet connection. Please go online to search for products.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {/* Search Section */}
                                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                                    <Input
                                                        placeholder="Search products (e.g., handicraft, jewelry)"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="flex-1 text-sm"
                                                        disabled={!isOnline}
                                                    />
                                                    <Button
                                                        onClick={() => fetchScrapedProducts(searchQuery)}
                                                        disabled={!isOnline || scrapingLoading}
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