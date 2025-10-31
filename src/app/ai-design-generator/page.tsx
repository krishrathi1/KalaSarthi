'use client';

import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import AuthGuard from '@/components/auth/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Palette, Sparkles, Download, ArrowLeft, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useOffline } from '@/hooks/use-offline';
import { notificationManager, notifyAIGenerationComplete } from '@/lib/notifications';

interface ColorVariation {
    color: string;
    imageUrl: string;
    prompt: string;
}

const AVAILABLE_COLORS = [
    { name: 'Red', value: 'red', hex: '#EF4444' },
    { name: 'Blue', value: 'blue', hex: '#3B82F6' },
    { name: 'Green', value: 'green', hex: '#10B981' },
    { name: 'Yellow', value: 'yellow', hex: '#F59E0B' },
    { name: 'Purple', value: 'purple', hex: '#A855F7' },
    { name: 'Pink', value: 'pink', hex: '#EC4899' },
    { name: 'Orange', value: 'orange', hex: '#F97316' },
    { name: 'Teal', value: 'teal', hex: '#14B8A6' },
    { name: 'Indigo', value: 'indigo', hex: '#6366F1' },
    { name: 'Brown', value: 'brown', hex: '#92400E' },
];

const STYLE_OPTIONS = [
    { 
        id: 'traditional', 
        name: 'Traditional', 
        description: 'Classic Indian handicraft style',
        prompt: 'traditional Indian handicraft style with intricate patterns, authentic cultural motifs, and heritage craftsmanship'
    },
    { 
        id: 'modern', 
        name: 'Modern', 
        description: 'Contemporary minimalist design',
        prompt: 'modern minimalist design with clean lines, contemporary aesthetic, and sleek finishing'
    },
    { 
        id: 'vibrant', 
        name: 'Vibrant', 
        description: 'Bold and energetic patterns',
        prompt: 'vibrant and bold design with energetic patterns, high contrast, and eye-catching details'
    },
    { 
        id: 'elegant', 
        name: 'Elegant', 
        description: 'Sophisticated and refined',
        prompt: 'elegant and sophisticated design with refined details, graceful patterns, and premium finishing'
    },
    { 
        id: 'rustic', 
        name: 'Rustic', 
        description: 'Natural and earthy',
        prompt: 'rustic natural design with earthy tones, organic textures, and handcrafted feel'
    },
    { 
        id: 'festive', 
        name: 'Festive', 
        description: 'Celebratory and decorative',
        prompt: 'festive celebratory design with decorative elements, rich ornamentation, and joyful aesthetic'
    },
];

export default function AIDesignGeneratorPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<IProductDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<IProductDocument | null>(null);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedStyle, setSelectedStyle] = useState('traditional');
    const [generating, setGenerating] = useState(false);
    const [variations, setVariations] = useState<ColorVariation[]>([]);
    const [waitingForConnection, setWaitingForConnection] = useState(false);
    const [pendingRequest, setPendingRequest] = useState<{
        productId: string;
        productName: string;
        productDescription: string;
        productCategory: string;
        originalImageUrl: string;
        colors: string[];
        style: string;
        stylePrompt: string;
    } | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Offline support
    const {
        isOnline,
        isSyncing,
        storeOffline,
        getOfflineData,
        sync,
    } = useOffline();

    // Request notification permission on mount
    useEffect(() => {
        if (notificationManager.isSupported() && notificationManager.getPermission() === 'default') {
            setTimeout(() => {
                notificationManager.requestPermission().then(permission => {
                    console.log('Notification permission:', permission);
                });
            }, 2000);
        }
    }, []);

    // Watch for connection restoration and execute pending request
    useEffect(() => {
        const executePendingRequest = async () => {
            if (isOnline && waitingForConnection && pendingRequest) {
                console.log('Connection restored, executing pending request...');
                
                toast({
                    title: "Connection Restored!",
                    description: "Generating your AI designs now...",
                });

                try {
                    if (notificationManager.getPermission() === 'granted') {
                        await notificationManager.notifyConnectionRestored();
                    }
                } catch (error) {
                    console.error('Error showing connection notification:', error);
                }

                setWaitingForConnection(false);
                await executeGeneration(pendingRequest);
                setPendingRequest(null);
            }
        };

        executePendingRequest();
    }, [isOnline, waitingForConnection, pendingRequest]);

    // Fetch artisan's products with offline support
    useEffect(() => {
        const fetchProducts = async () => {
            if (!userProfile?.uid) return;

            try {
                setLoading(true);

                if (isOnline) {
                    const response = await fetch(`/api/products?artisanId=${userProfile.uid}`);
                    const result = await response.json();

                    if (result.success) {
                        const publishedProducts = result.data.filter(
                            (p: IProductDocument) => p.status === 'published' && p.images?.length > 0
                        );
                        setProducts(publishedProducts);

                        for (const product of publishedProducts) {
                            await storeOffline('product', product, product.productId, true);
                        }
                    } else {
                        toast({
                            title: 'Error',
                            description: result.error || 'Failed to fetch products',
                            variant: 'destructive',
                        });
                    }
                } else {
                    const offlineProducts = await getOfflineData('product') as IProductDocument[];
                    const artisanProducts = offlineProducts.filter(
                        (p: IProductDocument) =>
                            p.artisanId === userProfile.uid &&
                            p.status === 'published' &&
                            p.images?.length > 0
                    );

                    if (artisanProducts.length > 0) {
                        setProducts(artisanProducts);
                        toast({
                            title: "Working Offline",
                            description: `Showing ${artisanProducts.length} cached products. AI generation requires internet.`,
                            duration: 5000,
                        });
                    } else {
                        toast({
                            title: "No Offline Data",
                            description: "Please connect to the internet to load products.",
                            variant: "destructive",
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching products:', error);

                try {
                    const offlineProducts = await getOfflineData('product') as IProductDocument[];
                    const artisanProducts = offlineProducts.filter(
                        (p: IProductDocument) =>
                            p.artisanId === userProfile.uid &&
                            p.status === 'published' &&
                            p.images?.length > 0
                    );

                    if (artisanProducts.length > 0) {
                        setProducts(artisanProducts);
                        toast({
                            title: "Using Cached Data",
                            description: "Couldn't reach server. Showing cached products.",
                            variant: "destructive",
                        });
                    }
                } catch (offlineError) {
                    console.error('Error loading offline products:', offlineError);
                }

                toast({
                    title: 'Error',
                    description: 'Failed to fetch products',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        if (userProfile) {
            fetchProducts();
        }
    }, [userProfile, isOnline, toast, storeOffline, getOfflineData]);

    const toggleColor = (colorValue: string) => {
        setSelectedColors(prev => {
            if (prev.includes(colorValue)) {
                return prev.filter(c => c !== colorValue);
            } else {
                if (prev.length >= 6) {
                    toast({
                        title: 'Maximum Colors',
                        description: 'You can select up to 6 colors at a time',
                        variant: 'destructive',
                    });
                    return prev;
                }
                return [...prev, colorValue];
            }
        });
    };

    // Execute the actual AI generation
    const executeGeneration = async (requestData: {
        productId: string;
        productName: string;
        productDescription: string;
        productCategory: string;
        originalImageUrl: string;
        colors: string[];
        style: string;
        stylePrompt: string;
    }) => {
        try {
            setGenerating(true);
            setVariations([]);

            console.log('Starting AI generation with detailed prompts...');

            const response = await fetch('/api/ai-design/generate-variations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            const result = await response.json();

            if (result.success) {
                console.log('AI generation successful:', result.count, 'variations');
                setVariations(result.variations);
                
                toast({
                    title: 'Success!',
                    description: `Generated ${result.count} design variations`,
                });

                try {
                    if (notificationManager.getPermission() === 'granted') {
                        await notifyAIGenerationComplete(result.count);
                    } else if (notificationManager.getPermission() === 'default') {
                        const permission = await notificationManager.requestPermission();
                        if (permission === 'granted') {
                            await notifyAIGenerationComplete(result.count);
                        }
                    }
                } catch (notifError) {
                    console.error('Error showing notification:', notifError);
                }
            } else {
                console.error('AI generation failed:', result.error);
                toast({
                    title: 'Generation Failed',
                    description: result.error || 'Failed to generate variations',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error generating variations:', error);
            toast({
                title: 'Error',
                description: 'Failed to generate design variations',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const generateVariations = async () => {
        if (!selectedProduct || selectedColors.length === 0) {
            toast({
                title: 'Missing Selection',
                description: 'Please select a product and at least one color',
                variant: 'destructive',
            });
            return;
        }

        const selectedStyleOption = STYLE_OPTIONS.find(s => s.id === selectedStyle);

        const requestData = {
            productId: selectedProduct.productId,
            productName: selectedProduct.name,
            productDescription: selectedProduct.description || '',
            productCategory: selectedProduct.category || '',
            originalImageUrl: selectedProduct.images[0],
            colors: selectedColors,
            style: selectedStyle,
            stylePrompt: selectedStyleOption?.prompt || '',
        };

        // Check if online for AI generation
        if (!isOnline) {
            setPendingRequest(requestData);
            setWaitingForConnection(true);

            toast({
                title: 'Waiting for Connection',
                description: 'Your request is queued. We\'ll generate the designs automatically when you\'re back online.',
                duration: 6000,
            });
            return;
        }

        await executeGeneration(requestData);
    };

    const downloadImage = (imageUrl: string, color: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${selectedProduct?.name}-${color}-variation.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!userProfile || userProfile.role !== 'artisan') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>
                            This feature is only available for artisans.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background">
                {/* Fixed Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <div className="container mx-auto px-4 py-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="mb-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-7 w-7 text-primary" />
                                <div>
                                    <h1 className="text-2xl font-bold">AI Design Generator</h1>
                                    <p className="text-sm text-muted-foreground">
                                        Generate beautiful color variations of your products using AI
                                    </p>
                                </div>
                            </div>

                            {/* Offline/Online Indicator */}
                            <div className="flex items-center gap-2">
                                {isOnline ? (
                                    <Badge variant="outline" className="gap-1 border-green-200 text-green-700 bg-green-50">
                                        <Wifi className="h-3 w-3" />
                                        <span className="hidden sm:inline">Online</span>
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="gap-1 border-red-200 text-red-700 bg-red-50">
                                        <WifiOff className="h-3 w-3" />
                                        <span className="hidden sm:inline">Offline</span>
                                    </Badge>
                                )}

                                {/* Sync Button */}
                                {isOnline && (
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
                                            }
                                        }}
                                        disabled={isSyncing}
                                        className="h-8 px-2"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Notification Permission Banner */}
                        {notificationManager.isSupported() && notificationManager.getPermission() === 'default' && (
                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-blue-800">
                                            Enable Notifications
                                        </p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Get notified when your AI designs are ready, even if you switch tabs!
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                const permission = await notificationManager.requestPermission();
                                                if (permission === 'granted') {
                                                    toast({
                                                        title: "Notifications Enabled!",
                                                        description: "You'll be notified when tasks complete.",
                                                    });
                                                    await notificationManager.showNotification('Test Notification', {
                                                        body: 'Notifications are working! 🎉',
                                                        tag: 'test'
                                                    });
                                                }
                                            }}
                                            className="mt-2 h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                                        >
                                            Enable Notifications
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notification Denied Banner */}
                        {notificationManager.isSupported() && notificationManager.getPermission() === 'denied' && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-start gap-3">
                                    <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-red-800">
                                            Notifications Blocked
                                        </p>
                                        <p className="text-xs text-red-700 mt-1">
                                            Please enable notifications in your browser settings to get alerts when designs are ready.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Offline Banner */}
                        {!isOnline && (
                            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-start gap-3">
                                    <WifiOff className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-yellow-800">
                                            Working Offline
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            You can view your cached products, but AI design generation requires an internet connection.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="container mx-auto px-4 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Scrollable */}
                        <div className="lg:h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-3 space-y-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                            {/* Product Selection */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>1. Select Your Product</CardTitle>
                                    <CardDescription>
                                        Choose a product to generate design variations
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {products.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No published products found. Please publish some products first.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            {products.map((product) => (
                                                <div
                                                    key={product.productId}
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setVariations([]);
                                                    }}
                                                    className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${selectedProduct?.productId === product.productId
                                                        ? 'border-primary bg-primary/5 shadow-md'
                                                        : 'border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    <div className="relative aspect-square mb-2 rounded-md overflow-hidden bg-gray-100">
                                                        <Image
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <p className="text-sm font-medium truncate">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        ₹{product.price}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Style Selection */}
                            {selectedProduct && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>2. Choose Style</CardTitle>
                                        <CardDescription>
                                            Select the artistic style for variations
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-3">
                                            {STYLE_OPTIONS.map((style) => (
                                                <button
                                                    key={style.id}
                                                    onClick={() => setSelectedStyle(style.id)}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${selectedStyle === style.id
                                                        ? 'border-primary bg-primary/5 shadow-md'
                                                        : 'border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    <p className="font-medium text-sm">{style.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {style.description}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Color Selection */}
                            {selectedProduct && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Palette className="h-5 w-5" />
                                            3. Select Colors
                                        </CardTitle>
                                        <CardDescription>
                                            Choose up to 6 colors for variations (Selected: {selectedColors.length}/6)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-5 gap-3">
                                            {AVAILABLE_COLORS.map((color) => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => toggleColor(color.value)}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:shadow-md ${selectedColors.includes(color.value)
                                                        ? 'border-primary bg-primary/5 shadow-md scale-105'
                                                        : 'border-border hover:border-primary/50 hover:scale-105'
                                                        }`}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                                                        style={{ backgroundColor: color.hex }}
                                                    />
                                                    <span className="text-xs font-medium">{color.name}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <Button
                                            onClick={generateVariations}
                                            disabled={generating || selectedColors.length === 0}
                                            className="w-full mt-6"
                                            size="lg"
                                            variant={waitingForConnection ? "secondary" : "default"}
                                        >
                                            {generating ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Generating Variations...
                                                </>
                                            ) : waitingForConnection ? (
                                                <>
                                                    <WifiOff className="h-4 w-4 mr-2 animate-pulse" />
                                                    Waiting for Connection...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                    Generate Design Variations
                                                </>
                                            )}
                                        </Button>

                                        {/* Waiting for Connection Info */}
                                        {waitingForConnection && (
                                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-start gap-2">
                                                    <WifiOff className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0 animate-pulse" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-blue-900">
                                                            Request Queued
                                                        </p>
                                                        <p className="text-xs text-blue-700 mt-1">
                                                            Your AI generation request is ready. We'll automatically start generating when you're back online.
                                                        </p>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setWaitingForConnection(false);
                                                                setPendingRequest(null);
                                                                toast({
                                                                    title: "Request Cancelled",
                                                                    description: "AI generation request has been cancelled.",
                                                                });
                                                            }}
                                                            className="mt-2 h-7 text-xs text-blue-700 hover:text-blue-900"
                                                        >
                                                            Cancel Request
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column - Scrollable */}
                        <div className="lg:h-[calc(100vh-180px)] lg:overflow-y-auto lg:pl-3 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                            <Card className="h-full">
                                <CardHeader className="sticky top-0 bg-card z-10 border-b">
                                    <CardTitle>Generated Variations</CardTitle>
                                    <CardDescription>
                                        {variations.length > 0
                                            ? `${variations.length} variations generated`
                                            : 'Your generated designs will appear here'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {generating ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                            <p className="text-sm text-muted-foreground">
                                                Creating beautiful variations...
                                            </p>
                                        </div>
                                    ) : variations.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {variations.map((variation, index) => (
                                                <div
                                                    key={index}
                                                    className="group relative rounded-lg border overflow-hidden hover:shadow-lg transition-shadow"
                                                >
                                                    <div className="relative aspect-square bg-gray-100">
                                                        <Image
                                                            src={variation.imageUrl}
                                                            alt={`${variation.color} variation`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div className="p-3 bg-background">
                                                        <p className="font-medium text-sm capitalize mb-2">
                                                            {variation.color}
                                                        </p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => downloadImage(variation.imageUrl, variation.color)}
                                                            className="w-full hover:bg-primary hover:text-primary-foreground transition-colors"
                                                        >
                                                            <Download className="h-3 w-3 mr-2" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                                            <p className="text-sm text-muted-foreground">
                                                Select a product, style, and colors to generate variations
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}