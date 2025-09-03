'use client';

import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import AuthGuard from '@/components/auth/AuthGuard';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductGrid, ProfileHeader, ProfileInfo } from '@/components/profile';
import ScrapedProductGrid from '@/components/profile/ScrapedProductGrid';
import { useToast } from '@/hooks/use-toast';

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
                <div className="container mx-auto px-4 py-8">
                    <ProfileHeader userProfile={userProfile} />

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Profile Information */}
                        <div className="lg:col-span-1">
                            <ProfileInfo userProfile={userProfile} />
                        </div>

                        {/* Products Section */}
                        <div className="lg:col-span-3">
                            <div className="bg-card rounded-lg border p-6">
                                <h2 className="text-2xl font-semibold mb-6">
                                    {userProfile.role === 'artisan' ? 'My Products' : 'Favorite Products'}
                                </h2>

                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-8">
                                        <p className="text-destructive">{error}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Debug: User ID = {userProfile?.uid}
                                        </p>
                                    </div>
                                ) : userProfile.role === 'artisan' ? (
                                    <Tabs defaultValue="published" className="w-full">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="published">
                                                Published ({publishedProducts.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="drafts">
                                                Drafts ({draftProducts.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="archived">
                                                Archived ({archivedProducts.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="market-research">
                                                <TrendingUp className="h-4 w-4 mr-1" />
                                                Market Research
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

                                        <TabsContent value="market-research" className="mt-6">
                                            <div className="space-y-6">
                                                {/* Search Section */}
                                                <div className="flex gap-4">
                                                    <Input
                                                        placeholder="Search for products (e.g., handicraft, jewelry, textiles)"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <Button
                                                        onClick={() => fetchScrapedProducts(searchQuery)}
                                                        disabled={scrapingLoading}
                                                    >
                                                        {scrapingLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Search className="h-4 w-4 mr-2" />
                                                        )}
                                                        Search Market
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