'use client';

import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { IProductDocument } from '@/lib/models/Product';
import AuthGuard from '@/components/auth/AuthGuard';
import { Loader2, Archive, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductGrid } from '@/components/profile';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ArchivedPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<IProductDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchArchivedProducts = async () => {
            if (!userProfile?.uid) {
                console.log('No userProfile.uid available');
                return;
            }

            try {
                setLoading(true);
                console.log('Fetching archived products for artisanId:', userProfile.uid);
                const response = await fetch(`/api/products?artisanId=${userProfile.uid}&status=archived`);
                const result = await response.json();
                
                console.log('API Response:', result);

                if (result.success) {
                    console.log('Archived products fetched:', result.data?.length || 0);
                    setProducts(result.data || []);
                } else {
                    console.error('API Error:', result.error);
                    setError(result.error || 'Failed to fetch archived products');
                }
            } catch (err) {
                console.error('Fetch Error:', err);
                setError('Failed to fetch archived products');
            } finally {
                setLoading(false);
            }
        };

        if (userProfile) {
            fetchArchivedProducts();
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
                // Remove the product from archived if it's published or moved to draft
                if (newStatus !== 'archived') {
                    setProducts(prevProducts => 
                        prevProducts.filter(product => product.productId !== productId)
                    );
                } else {
                    // Update the local products state
                    setProducts(prevProducts => 
                        prevProducts.map(product => 
                            product.productId === productId 
                                ? { ...product, status: newStatus } as IProductDocument
                                : product
                        )
                    );
                }

                // Show success toast
                const statusMessages = {
                    published: 'Product restored and published successfully!',
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
        // Navigate to story generator with edit mode
        router.push(`/story-generator?edit=${productId}`);
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to permanently delete this archived product? This action cannot be undone.')) {
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
                    description: 'Archived product has been permanently deleted.',
                });
            } else {
                toast({
                    title: 'Delete Failed',
                    description: result.error || 'Failed to delete archived product',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Error deleting archived product:', err);
            toast({
                title: 'Delete Failed',
                description: 'Failed to delete archived product',
                variant: 'destructive',
            });
        } finally {
            setDeleting(null);
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

    if (userProfile.role !== 'artisan') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                    <p className="text-muted-foreground">Only artisans can access archived products.</p>
                </div>
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Archive className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <h1 className="text-3xl font-bold">Archived Products</h1>
                                <p className="text-muted-foreground">
                                    Manage your archived products - restore or permanently remove them
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/drafts">
                                <Button variant="outline">
                                    View Drafts
                                </Button>
                            </Link>
                            <Link href="/story-generator">
                                <Button>
                                    <Package className="h-4 w-4 mr-2" />
                                    Create New Product
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Products Section */}
                    <div className="bg-card rounded-lg border p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                <p className="text-sm text-muted-foreground">Loading archived products...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-destructive mb-2">{error}</p>
                                <p className="text-xs text-muted-foreground">
                                    Debug: User ID = {userProfile?.uid}
                                </p>
                            </div>
                        ) : (
                            <ProductGrid 
                                products={products} 
                                showActions={true}
                                onStatusChange={handleProductStatusChange}
                                onEdit={handleEditProduct}
                                onDelete={handleDeleteProduct}
                                updating={updating}
                                deleting={deleting}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}