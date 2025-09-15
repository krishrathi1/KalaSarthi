"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Star, ExternalLink, Eye, ShoppingBag, Search, AlertTriangle, Zap, BarChart3, TrendingDown, Minus, WifiOff, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { formatPrice } from "@/lib/format-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ui/product-image";
import { getTopViralProducts, getViralProductsByProfession, getViralAlerts, getViralProductsWithConnectivity, type ViralProduct } from "@/lib/viral-products";

interface TrendSpotterProduct {
    title: string;
    price: string | number;
    rating: number;
    reviewCount: number;
    platform: string;
    url: string;
    imageUrl: string;
    id: string;
    category?: string;
    description?: string;
    timestamp?: number;
    isOffline?: boolean;
    isViral?: boolean;
    viralScore?: number;
    trendingReason?: string;
}

export function ViralTrendSpotter() {
    const { userProfile, isArtisan } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [products, setProducts] = useState<TrendSpotterProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<TrendSpotterProduct | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<TrendSpotterProduct[]>([]);
    const [viralAlerts, setViralAlerts] = useState<any[]>([]);
    const [viralProducts, setViralProducts] = useState<ViralProduct[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [isRealTime, setIsRealTime] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const { toast } = useToast();

    // Load data on component mount
    useEffect(() => {
        if (userProfile?.uid && isArtisan) {
            loadViralProducts();
            loadViralAlerts();
        }
    }, [userProfile, isArtisan]);

    const loadViralProducts = async () => {
        setLoading(true);

        try {
            // Use hybrid approach - try real-time first, fallback to hardcoded
            const result = await getViralProductsWithConnectivity(userProfile?.artisticProfession);

            const formattedProducts = result.products.map(product => ({
                id: product.id,
                title: product.title,
                price: product.price,
                rating: product.rating,
                reviewCount: product.reviewCount,
                platform: product.platform,
                url: product.url,
                imageUrl: product.imageUrl,
                category: product.category,
                description: product.description,
                isViral: product.isViral,
                viralScore: product.viralScore,
                trendingReason: product.trendingReason,
                isRealTime: (product as any).isRealTime || false
            }));

            setProducts(formattedProducts);
            setViralProducts(result.products);
            setLastUpdated(result.lastUpdated);
            setIsOffline(result.isOffline);
            setIsRealTime(!result.isOffline);

            console.log(`✅ Viral products loaded: ${formattedProducts.length} (${result.isOffline ? 'Offline' : 'Real-time'})`);

            if (result.isOffline) {
                toast({
                    title: "Offline Mode",
                    description: "Showing cached viral products. Connect to internet for real-time updates.",
                    duration: 3000,
                });
            } else {
                toast({
                    title: "Real-time Data",
                    description: "Live viral products loaded successfully!",
                    duration: 2000,
                });
            }
        } catch (error) {
            console.error('Failed to load viral products:', error);

            // Fallback to hardcoded data on error
            const hardcodedProducts = userProfile?.artisticProfession
                ? getViralProductsByProfession(userProfile.artisticProfession)
                : getTopViralProducts(10);

            const formattedHardcoded = hardcodedProducts.map(product => ({
                id: product.id,
                title: product.title,
                price: product.price,
                rating: product.rating,
                reviewCount: product.reviewCount,
                platform: product.platform,
                url: product.url,
                imageUrl: product.imageUrl,
                category: product.category,
                description: product.description,
                isViral: product.isViral,
                viralScore: product.viralScore,
                trendingReason: product.trendingReason,
                isRealTime: false
            }));

            setProducts(formattedHardcoded);
            setViralProducts(hardcodedProducts);
            setLastUpdated(new Date());
            setIsOffline(true);
            setIsRealTime(false);

            toast({
                title: "Error",
                description: "Failed to load viral products, showing cached data",
                variant: "destructive",
            });
        }
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast({
                title: "Enter Search Term",
                description: "Please enter a product name to search",
                variant: "destructive",
            });
            return;
        }

        setSearchLoading(true);
        setError(null);

        try {
            // Search through viral products
            const searchResults = viralProducts.filter(product =>
                product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(searchQuery.toLowerCase())
            );

            const formattedResults = searchResults.map(product => ({
                id: product.id,
                title: product.title,
                price: product.price,
                rating: product.rating,
                reviewCount: product.reviewCount,
                platform: product.platform,
                url: product.url,
                imageUrl: product.imageUrl,
                category: product.category,
                description: product.description,
                isViral: product.isViral,
                viralScore: product.viralScore,
                trendingReason: product.trendingReason
            }));

            setSearchResults(formattedResults);
            setLastUpdated(new Date());

            toast({
                title: "Search Complete",
                description: `Found ${formattedResults.length} viral products for "${searchQuery}"`,
            });
        } catch (error) {
            const errorMessage = "Failed to search viral products";
            setError(errorMessage);
            toast({
                title: "Search Failed",
                description: errorMessage,
                variant: "destructive",
            });
        }
        setSearchLoading(false);
    };

    const loadViralAlerts = async () => {
        try {
            const alerts = getViralAlerts();
            setViralAlerts(alerts);
        } catch (error) {
            console.error('Failed to load viral alerts:', error);
        }
    };


    const handleViewProduct = (product: TrendSpotterProduct) => {
        setSelectedProduct(product);
    };

    const handleRedirectToStore = (url: string) => {
        window.open(url, '_blank');
    };

    if (!isArtisan) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <TrendingUp className="size-6 text-primary" />
                        Viral Trend Spotter
                    </CardTitle>
                    <CardDescription>
                        Discover viral and trending products in your craft category. Complete your artisan profile to get started.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="h-full shadow-lg border-0 bg-gradient-to-br from-card via-card to-card/95">
            <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <TrendingUp className="size-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-xl">
                            Viral Trend Spotter
                            <Badge className="ml-2 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200">
                                Hot Products
                            </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-2">
                                {isOffline ? (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                                        <WifiOff className="size-3" />
                                        <span>Offline Mode</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                                        <TrendingUp className="size-3" />
                                        <span>Live Data</span>
                                    </div>
                                )}
                            </div>
                            {lastUpdated && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="size-3" />
                                    <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                    Discover what's going viral in {userProfile?.artisticProfession} and get inspired for your next creation.
                    <span className="block mt-2 text-orange-600 font-medium">
                        These products are trending on social media and e-commerce platforms!
                    </span>
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Viral Alerts */}
                {viralAlerts.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-red-500" />
                            <h3 className="font-semibold text-lg">Viral Alerts</h3>
                        </div>
                        <div className="space-y-2">
                            {viralAlerts.map((alert, index) => (
                                <Card key={index} className="p-4 border-red-200 bg-red-50">
                                    <div className="flex items-start gap-3">
                                        <Zap className="size-5 text-red-500 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{alert.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">{alert.platform}</Badge>
                                                <span className="text-xs text-muted-foreground">{alert.timeAgo}</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    Score: {alert.viralScore}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search viral products (e.g., 'handmade bags', 'wooden toys')"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 pr-4 py-2"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={searchLoading || loading}
                            className="px-6"
                        >
                            {searchLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
                                    <span>Searching...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Search className="size-4" />
                                    <span>Search</span>
                                </div>
                            )}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span>Search through {viralProducts.length} viral products trending right now</span>
                    </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Search Results</h3>
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                                {searchResults.length} viral products found
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {searchResults.map((product) => (
                                <Card key={product.id} className="p-4 hover:shadow-lg transition-shadow border-red-100">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden">
                                            <ProductImage
                                                src={product.imageUrl}
                                                alt={product.title}
                                                fill
                                                sizes="(max-width: 768px) 64px, 64px"
                                                fallbackIcon={<ShoppingBag className="size-6 text-muted-foreground" />}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
                                                <Badge variant="destructive" className="text-xs">
                                                    Viral
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex items-center gap-1">
                                                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {product.rating} ({product.reviewCount})
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                                            </div>
                                            <div className="text-lg font-bold text-primary mb-2">
                                                {product.price}
                                            </div>
                                            {product.trendingReason && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                    {product.trendingReason}
                                                </p>
                                            )}
                                            <Button size="sm" onClick={() => handleRedirectToStore(product.url)} className="w-full bg-red-600 hover:bg-red-700">
                                                <ExternalLink className="size-3 mr-1" />
                                                View Viral Product
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}


                {/* Main Viral Products */}
                {loading ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6 shadow-sm">
                                <div className="animate-spin">
                                    <TrendingUp className="size-5 text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-semibold text-blue-800">Loading Viral Products</div>
                                    <div className="text-xs text-blue-600">Discovering what's trending right now...</div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i} className="p-6 border-2 border-dashed border-gray-200">
                                    <div className="flex gap-4">
                                        <Skeleton className="w-20 h-20 rounded-xl" />
                                        <div className="flex-1 space-y-3">
                                            <Skeleton className="h-5 w-4/5" />
                                            <div className="flex gap-2">
                                                <Skeleton className="h-4 w-16" />
                                                <Skeleton className="h-4 w-20" />
                                            </div>
                                            <Skeleton className="h-6 w-24" />
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-3 w-3/4" />
                                            <div className="flex gap-2 mt-4">
                                                <Skeleton className="h-8 w-20" />
                                                <Skeleton className="h-8 w-24" />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : products.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Viral Products</h3>
                            <div className="flex items-center gap-2">
                                {isOffline ? (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                                        <WifiOff className="size-3 mr-1" />
                                        Offline
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                        <TrendingUp className="size-3 mr-1" />
                                        Live
                                    </Badge>
                                )}
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                                    {products.length} Hot Products
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map((product) => (
                                <Card key={product.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-red-100">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden">
                                            <ProductImage
                                                src={product.imageUrl}
                                                alt={product.title}
                                                fill
                                                sizes="(max-width: 768px) 64px, 64px"
                                                fallbackIcon={<ShoppingBag className="size-6 text-muted-foreground" />}
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
                                                <Badge variant="destructive" className="text-xs">
                                                    Viral
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex items-center gap-1">
                                                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {product.rating} ({product.reviewCount})
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                                            </div>
                                            <div className="text-lg font-bold text-primary mb-2">
                                                {product.price}
                                            </div>
                                            {product.trendingReason && (
                                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                                    {product.trendingReason}
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewProduct(product)}
                                                            className="flex-1"
                                                        >
                                                            <Eye className="size-3 mr-1" />
                                                            View Details
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle>{product.title}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4">
                                                            <div className="w-full h-48 relative rounded-lg overflow-hidden">
                                                                <ProductImage
                                                                    src={product.imageUrl}
                                                                    alt={product.title}
                                                                    fill
                                                                    sizes="(max-width: 768px) 100vw, 400px"
                                                                    fallbackIcon={<ShoppingBag className="size-12 text-muted-foreground" />}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <div className="text-sm text-muted-foreground">Price</div>
                                                                    <div className="text-lg font-bold rupee-symbol">{product.price}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm text-muted-foreground">Rating</div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                                                        <span className="font-medium">{product.rating}</span>
                                                                        <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm text-muted-foreground mb-1">Platform</div>
                                                                <Badge>{product.platform}</Badge>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm text-muted-foreground mb-1">Category</div>
                                                                <Badge variant="outline">{product.category || 'General'}</Badge>
                                                            </div>
                                                            {product.trendingReason && (
                                                                <div>
                                                                    <div className="text-sm text-muted-foreground mb-1">Why It's Viral</div>
                                                                    <p className="text-sm text-gray-700 leading-relaxed">{product.trendingReason}</p>
                                                                </div>
                                                            )}
                                                            <Button
                                                                onClick={() => handleRedirectToStore(product.url)}
                                                                className="w-full bg-red-600 hover:bg-red-700"
                                                            >
                                                                <ExternalLink className="size-4 mr-2" />
                                                                View Viral Product
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                <Button
                                                    size="sm"
                                                    onClick={() => handleRedirectToStore(product.url)}
                                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                                >
                                                    <ExternalLink className="size-3 mr-1" />
                                                    Visit Store
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <TrendingUp className="size-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium text-lg mb-2">No viral products available</h3>
                        <p className="text-muted-foreground mb-4">
                            We're updating our viral products collection. Please try again later.
                        </p>
                        <Button onClick={loadViralProducts} disabled={loading}>
                            Refresh Viral Products
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
