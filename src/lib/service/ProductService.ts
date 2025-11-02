import { IProduct, IProductDocument } from "../models/Product";
import { FirestoreService, COLLECTIONS, where, orderBy, limit as limitQuery } from "../firestore";
import { v4 as uuidv4 } from 'uuid';

interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

interface CreateProductResponse extends ServiceResponse {
    insertedId?: string;
}

interface UpdateProductResponse extends ServiceResponse {
    modifiedCount?: number;
}

interface DeleteProductResponse extends ServiceResponse {
    deletedCount?: number;
}

// Product service class for Firestore
export class ProductService {
    static async createProduct(productData: Partial<IProduct>): Promise<CreateProductResponse> {
        try {
            // Check for duplicate products (same name + artisan + similar price)
            if (productData.name && productData.artisanId) {
                const existingProducts = await FirestoreService.query<IProduct>(
                    COLLECTIONS.PRODUCTS,
                    [
                        where('artisanId', '==', productData.artisanId),
                        where('name', '==', productData.name)
                    ]
                );

                // If a product with same name and artisan exists, check if it's a true duplicate
                if (existingProducts.length > 0) {
                    const duplicate = existingProducts.find(p =>
                        Math.abs(p.price - (productData.price || 0)) < 10 && // Price within 10 rupees
                        p.category === productData.category
                    );

                    if (duplicate) {
                        console.warn('Duplicate product detected, returning existing product:', duplicate.productId);
                        return {
                            success: true,
                            data: duplicate,
                            insertedId: duplicate.productId
                        };
                    }
                }
            }

            // Ensure specifications.dimensions is always an object
            if (productData?.specifications?.dimensions && typeof productData.specifications.dimensions === "string") {
                const dimStr = productData.specifications.dimensions as string;
                const dims: { length?: number; width?: number; height?: number; weight?: number } = {};
                const regex = /(\w+):\s*([\d.]+)/g;
                let match;
                while ((match = regex.exec(dimStr)) !== null) {
                    const key = match[1].toLowerCase();
                    const value = parseFloat(match[2]);
                    if (['length', 'width', 'height', 'weight'].includes(key)) {
                        dims[key as keyof typeof dims] = value;
                    }
                }
                productData.specifications.dimensions = dims;
            }

            const productId = productData.productId || uuidv4();
            const product: IProduct = {
                ...productData,
                productId,
                createdAt: new Date(),
                updatedAt: new Date()
            } as IProduct;

            await FirestoreService.set(COLLECTIONS.PRODUCTS, productId, product);

            return {
                success: true,
                data: product,
                insertedId: productId
            };
        } catch (error: any) {
            console.error('Error creating product:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getProductById(productId: string): Promise<IProductDocument | null> {
        try {
            const product = await FirestoreService.getById<IProduct>(COLLECTIONS.PRODUCTS, productId);
            return product;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    }

    static async getProductsByArtisan(artisanId: string, status?: string): Promise<IProductDocument[]> {
        try {
            const constraints = [where('artisanId', '==', artisanId), orderBy('createdAt', 'desc')];
            if (status) {
                constraints.unshift(where('status', '==', status));
            }

            const products = await FirestoreService.query<IProduct>(COLLECTIONS.PRODUCTS, constraints);
            return products;
        } catch (error) {
            console.error('Error fetching products by artisan:', error);
            return [];
        }
    }

    static async getAllProducts(filter: Partial<IProduct> = {}): Promise<IProductDocument[]> {
        try {
            if (Object.keys(filter).length === 0) {
                const products = await FirestoreService.getAll<IProduct>(COLLECTIONS.PRODUCTS);
                return products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            }

            // Build constraints from filter
            const constraints: any[] = Object.entries(filter).map(([key, value]) =>
                where(key, '==', value)
            );
            constraints.push(orderBy('createdAt', 'desc'));

            const products = await FirestoreService.query<IProduct>(COLLECTIONS.PRODUCTS, constraints);
            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    static async getPublishedProducts(category?: string): Promise<IProductDocument[]> {
        try {
            const constraints = [
                where('status', '==', 'published'),
                where('inventory.isAvailable', '==', true),
                orderBy('createdAt', 'desc')
            ];

            if (category) {
                constraints.unshift(where('category', '==', category));
            }

            const products = await FirestoreService.query<IProduct>(COLLECTIONS.PRODUCTS, constraints);
            return products;
        } catch (error) {
            console.error('Error fetching published products:', error);
            return [];
        }
    }

    static async searchProducts(searchTerm: string): Promise<IProductDocument[]> {
        try {
            // Firestore doesn't support regex search natively
            // Fetch published products and filter client-side
            const products = await FirestoreService.query<IProduct>(
                COLLECTIONS.PRODUCTS,
                [
                    where('status', '==', 'published'),
                    where('inventory.isAvailable', '==', true)
                ]
            );

            const searchLower = searchTerm.toLowerCase();
            return products.filter(product =>
                product.name.toLowerCase().includes(searchLower) ||
                product.description.toLowerCase().includes(searchLower) ||
                product.category.toLowerCase().includes(searchLower) ||
                product.tags?.some(tag => tag.toLowerCase().includes(searchLower))
            );
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }

    static async updateProduct(productId: string, updateData: Partial<IProduct>): Promise<UpdateProductResponse> {
        try {
            await FirestoreService.update(COLLECTIONS.PRODUCTS, productId, {
                ...updateData,
                updatedAt: new Date()
            });

            return {
                success: true,
                modifiedCount: 1
            };
        } catch (error: any) {
            console.error('Error updating product:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async updateProductStory(productId: string, story: IProduct['story']): Promise<UpdateProductResponse> {
        try {
            await FirestoreService.update(COLLECTIONS.PRODUCTS, productId, {
                story,
                updatedAt: new Date()
            });

            return {
                success: true,
                modifiedCount: 1
            };
        } catch (error: any) {
            console.error('Error updating product story:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async deleteProduct(productId: string): Promise<DeleteProductResponse> {
        try {
            await FirestoreService.delete(COLLECTIONS.PRODUCTS, productId);
            return {
                success: true,
                deletedCount: 1
            };
        } catch (error: any) {
            console.error('Error deleting product:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getProductStats(): Promise<{
        totalProducts: number;
        publishedProducts: number;
        draftProducts: number;
        categories: Record<string, number>;
    }> {
        try {
            const allProducts = await FirestoreService.getAll<IProduct>(COLLECTIONS.PRODUCTS);

            const totalProducts = allProducts.length;
            const publishedProducts = allProducts.filter(p => p.status === 'published').length;
            const draftProducts = allProducts.filter(p => p.status === 'draft').length;

            // Get category statistics
            const categories: Record<string, number> = {};
            allProducts.forEach(product => {
                categories[product.category] = (categories[product.category] || 0) + 1;
            });

            return { totalProducts, publishedProducts, draftProducts, categories };
        } catch (error) {
            console.error('Error fetching product stats:', error);
            return { totalProducts: 0, publishedProducts: 0, draftProducts: 0, categories: {} };
        }
    }

    static async getFeaturedProducts(limitCount: number = 10): Promise<IProductDocument[]> {
        try {
            const products = await FirestoreService.query<IProduct>(
                COLLECTIONS.PRODUCTS,
                [
                    where('status', '==', 'published'),
                    where('inventory.isAvailable', '==', true),
                    orderBy('createdAt', 'desc'),
                    limitQuery(limitCount)
                ]
            );
            return products;
        } catch (error) {
            console.error('Error fetching featured products:', error);
            return [];
        }
    }
}
