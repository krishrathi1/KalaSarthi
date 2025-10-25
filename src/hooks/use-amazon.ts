import { useState, useCallback } from 'react';
import { IProductDocument } from '@/lib/models/Product';

// Types for Amazon SP-API
interface AmazonConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    marketplace: string;
    accessToken?: string;
    isConnected: boolean;
}

interface AmazonListingData {
    sku: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    quantity: number;
    brand?: string;
    condition?: string;
    fulfillmentChannel?: 'DEFAULT' | 'AMAZON';
}

interface ListingResponse {
    success: boolean;
    listingId?: string;
    asin?: string;
    sku?: string;
    status?: string;
    errors?: string[];
    submissionId?: string;
}

interface AuthResponse {
    success: boolean;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: string;
}

interface OrdersResponse {
    success: boolean;
    orders?: any[];
    nextToken?: string;
    error?: string;
}

export const useAmazonSPAPI = () => {
    const [config, setConfig] = useState<AmazonConfig>({
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        marketplace: 'ATVPDKIKX0DER',
        isConnected: false
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize configuration with credentials
    const initializeConfig = useCallback((amazonConfig: Partial<AmazonConfig>) => {
        setConfig(prev => ({ ...prev, ...amazonConfig }));
    }, []);

    // Authenticate with Amazon SP-API using backend route
    const authenticate = useCallback(async (): Promise<AuthResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            const currentConfig = {
                clientId: config.clientId || process.env.NEXT_PUBLIC_AMAZON_CLIENT_ID || '',
                clientSecret: config.clientSecret || process.env.NEXT_PUBLIC_AMAZON_CLIENT_SECRET || '',
                refreshToken: config.refreshToken || process.env.NEXT_PUBLIC_AMAZON_REFRESH_TOKEN || ''
            };

            if (!currentConfig.clientId || !currentConfig.clientSecret || !currentConfig.refreshToken) {
                throw new Error('Missing required Amazon credentials');
            }

            // Call backend authentication route
            const response = await fetch('/api/amazon/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(currentConfig)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Authentication failed');
            }

            const tokenData = await response.json();

            if (tokenData.access_token) {
                setConfig(prev => ({
                    ...prev,
                    clientId: currentConfig.clientId,
                    clientSecret: currentConfig.clientSecret,
                    refreshToken: currentConfig.refreshToken,
                    accessToken: tokenData.access_token,
                    isConnected: true
                }));

                return {
                    success: true,
                    access_token: tokenData.access_token,
                    token_type: tokenData.token_type,
                    expires_in: tokenData.expires_in
                };
            }

            throw new Error('No access token received');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage);
            setConfig(prev => ({ ...prev, isConnected: false }));
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [config.clientId, config.clientSecret, config.refreshToken]);

    // Convert product data to Amazon listing format
    const formatProductForAmazon = useCallback((product: IProductDocument): AmazonListingData => {
        return {
            sku: `SKU_${product.productId}_${Date.now()}`,
            title: product.name,
            description: product.description,
            price: product.price,
            category: mapCategoryToAmazonCategory(product.category),
            images: product.images || [],
            quantity: product.inventory.quantity,
            brand: 'Artisan Marketplace',
            condition: 'new',
            fulfillmentChannel: 'DEFAULT'
        };
    }, []);

    // Map internal categories to Amazon categories
    const mapCategoryToAmazonCategory = (category: string): string => {
        const categoryMapping: Record<string, string> = {
            'home_kitchen': 'Home & Kitchen',
            'jewelry': 'Jewelry',
            'clothing': 'Clothing & Accessories',
            'art_crafts': 'Arts, Crafts & Sewing',
            'electronics': 'Electronics',
            'books': 'Books',
            'toys': 'Toys & Games'
        };

        return categoryMapping[category.toLowerCase()] || 'Home & Kitchen';
    };

    // Create product listing using backend route
    const createListing = useCallback(async (product: IProductDocument): Promise<ListingResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            if (!config.isConnected || !config.accessToken) {
                throw new Error('Not authenticated with Amazon SP-API');
            }

            const listingData = formatProductForAmazon(product);

            const response = await fetch('/api/amazon/listings/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessToken: config.accessToken,
                    marketplace: config.marketplace,
                    sku: listingData.sku,
                    listingData: {
                        title: listingData.title,
                        description: listingData.description,
                        brand: listingData.brand,
                        condition: listingData.condition,
                        category: listingData.category
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create listing');
            }

            const responseData = await response.json();

            if (responseData.status === 'ACCEPTED' || responseData.submissionId) {
                // Persist the listing data to the database
                try {
                    await fetch(`/api/products/${product.productId}/amazon-listing`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            sku: listingData.sku,
                            submissionId: responseData.submissionId,
                            status: responseData.status || 'SUBMITTED',
                            marketplace: config.marketplace,
                        }),
                    });
                } catch (dbError) {
                    // If the DB update fails, we should ideally handle it,
                    // maybe by queuing a retry or logging it for manual intervention.
                    console.error('Failed to save Amazon listing status to database:', dbError);
                    // We don't re-throw here, as the listing on Amazon was successful.
                    // The primary action succeeded.
                }

                return {
                    success: true,
                    listingId: responseData.submissionId || `LISTING_${Date.now()}`,
                    sku: responseData.sku || listingData.sku, // Use the SKU from response or fallback to our generated SKU
                    status: responseData.status || 'SUBMITTED',
                    submissionId: responseData.submissionId,
                    // Note: ASIN might not be available immediately after submission
                    asin: responseData.asin // This might be undefined initially
                };
            }

            throw new Error('Listing submission was not accepted');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create listing';
            setError(errorMessage);
            return {
                success: false,
                errors: [errorMessage]
            };
        } finally {
            setIsLoading(false);
        }
    }, [config.isConnected, config.accessToken, config.marketplace, formatProductForAmazon]);

    // Update inventory using backend route
    const updateInventory = useCallback(async (sku: string, quantity: number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            if (!config.isConnected || !config.accessToken) {
                throw new Error('Not authenticated with Amazon SP-API');
            }

            const response = await fetch('/api/amazon/inventory/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessToken: config.accessToken,
                    sku,
                    quantity
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update inventory');
            }

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update inventory';
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [config.isConnected, config.accessToken]);

    // Get orders using backend route
    const getOrders = useCallback(async (params?: {
        createdAfter?: string;
        statuses?: string[];
        maxResults?: number;
    }): Promise<OrdersResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            if (!config.isConnected || !config.accessToken) {
                throw new Error('Not authenticated with Amazon SP-API');
            }

            const response = await fetch('/api/amazon/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessToken: config.accessToken,
                    marketplace: config.marketplace,
                    createdAfter: params?.createdAfter,
                    statuses: params?.statuses,
                    maxResults: params?.maxResults
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch orders');
            }

            const responseData = await response.json();

            return {
                success: true,
                orders: responseData.payload?.Orders || [],
                nextToken: responseData.payload?.NextToken
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [config.isConnected, config.accessToken, config.marketplace]);

    // Get marketplace participation using backend route
    const getMarketplaceParticipation = useCallback(async () => {
        try {
            if (!config.isConnected || !config.accessToken) {
                throw new Error('Not authenticated with Amazon SP-API');
            }

            const response = await fetch('/api/amazon/marketplace-participation', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get marketplace participation');
            }

            const responseData = await response.json();
            return responseData.payload || [];
        } catch (err) {
            console.error('Failed to get marketplace participation:', err);
            return [];
        }
    }, [config.isConnected, config.accessToken]);

    // Test connection to Amazon SP-API
    const testConnection = useCallback(async (): Promise<boolean> => {
        try {
            const authResult = await authenticate();
            if (!authResult.success) return false;

            // Test with a simple API call
            await getMarketplaceParticipation();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection test failed');
            return false;
        }
    }, [authenticate, getMarketplaceParticipation]);

    // Get listing status using backend route
    const getListingStatus = useCallback(async (sku: string) => {
        try {
            if (!config.isConnected || !config.accessToken) {
                throw new Error('Not authenticated with Amazon SP-API');
            }

            const response = await fetch(`/api/amazon/listings/${config.marketplace}/${sku}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to get listing status:', errorData.error);
                return null;
            }

            const responseData = await response.json();
            return responseData;
        } catch (err) {
            console.error('Failed to get listing status:', err);
            return null;
        }
    }, [config.isConnected, config.accessToken, config.marketplace]);

    return {
        // Configuration
        config,
        isConnected: config.isConnected,
        marketplace: 'Amazon Sandbox (US)',

        // State
        isLoading,
        error,

        // Authentication
        authenticate,
        testConnection,

        // Listings
        createListing,
        getListingStatus,
        formatProductForAmazon,

        // Inventory
        updateInventory,

        // Orders
        getOrders,

        // Utilities
        getMarketplaceParticipation,

        // Configuration
        initializeConfig,

        // Clear error
        clearError: () => setError(null)
    };
};
