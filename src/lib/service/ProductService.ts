import Product, { IProduct, IProductDocument } from "../models/Product";
import connectDB from "../mongodb";
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

// Product service class
export class ProductService {
    static async createProduct(productData: Partial<IProduct>): Promise<CreateProductResponse> {
        try {
            await connectDB();

            const product = new Product({
                ...productData,
                productId: productData.productId || uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const savedProduct = await product.save();
            return {
                success: true,
                data: savedProduct,
                insertedId: savedProduct.productId
            };
        } catch (error: any) {
            console.error('Error creating product:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getProductById(productId: string): Promise<IProductDocument | null> {
        try {
            await connectDB();
            const product = await Product.findOne({ productId }).exec();
            return product;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    }

    static async getProductsByArtisan(artisanId: string, status?: string): Promise<IProductDocument[]> {
        try {
            await connectDB();
            const filter: any = { artisanId };
            if (status) {
                filter.status = status;
            }
            const products = await Product
                .find(filter)
                .sort({ createdAt: -1 })
                .exec();
            return products;
        } catch (error) {
            console.error('Error fetching products by artisan:', error);
            return [];
        }
    }

    static async getAllProducts(filter: Partial<IProduct> = {}): Promise<IProductDocument[]> {
        try {
            await connectDB();
            const products = await Product
                .find(filter)
                .sort({ createdAt: -1 })
                .exec();
            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    static async getPublishedProducts(category?: string): Promise<IProductDocument[]> {
        try {
            await connectDB();
            const filter: any = { status: 'published', 'inventory.isAvailable': true };
            if (category) {
                filter.category = category;
            }
            const products = await Product
                .find(filter)
                .sort({ createdAt: -1 })
                .exec();
            return products;
        } catch (error) {
            console.error('Error fetching published products:', error);
            return [];
        }
    }

    static async searchProducts(searchTerm: string): Promise<IProductDocument[]> {
        try {
            await connectDB();
            const products = await Product
                .find({
                    status: 'published',
                    'inventory.isAvailable': true,
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { category: { $regex: searchTerm, $options: 'i' } },
                        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
                    ]
                })
                .exec();
            return products;
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }

    static async updateProduct(productId: string, updateData: Partial<IProduct>): Promise<UpdateProductResponse> {
        try {
            await connectDB();

            const result = await Product.updateOne(
                { productId },
                {
                    $set: {
                        ...updateData,
                        updatedAt: new Date()
                    }
                }
            ).exec();

            return {
                success: true,
                modifiedCount: result.modifiedCount
            };
        } catch (error: any) {
            console.error('Error updating product:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async updateProductStory(productId: string, story: IProduct['story']): Promise<UpdateProductResponse> {
        try {
            await connectDB();

            const result = await Product.updateOne(
                { productId },
                {
                    $set: {
                        story,
                        updatedAt: new Date()
                    }
                }
            ).exec();

            return {
                success: true,
                modifiedCount: result.modifiedCount
            };
        } catch (error: any) {
            console.error('Error updating product story:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async deleteProduct(productId: string): Promise<DeleteProductResponse> {
        try {
            await connectDB();
            const result = await Product.deleteOne({ productId }).exec();
            return {
                success: true,
                deletedCount: result.deletedCount
            };
        } catch (error: any) {
            console.error('Error deleting product:', error);
            return {
                success: false,
                error: error.message
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
            await connectDB();
            const totalProducts = await Product.countDocuments().exec();
            const publishedProducts = await Product.countDocuments({ status: 'published' }).exec();
            const draftProducts = await Product.countDocuments({ status: 'draft' }).exec();

            // Get category statistics
            const categoryStats = await Product.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]).exec();

            const categories: Record<string, number> = {};
            categoryStats.forEach(stat => {
                categories[stat._id] = stat.count;
            });

            return { totalProducts, publishedProducts, draftProducts, categories };
        } catch (error) {
            console.error('Error fetching product stats:', error);
            return { totalProducts: 0, publishedProducts: 0, draftProducts: 0, categories: {} };
        }
    }

    static async getFeaturedProducts(limit: number = 10): Promise<IProductDocument[]> {
        try {
            await connectDB();
            const products = await Product
                .find({ 
                    status: 'published', 
                    'inventory.isAvailable': true 
                })
                .sort({ createdAt: -1 })
                .limit(limit)
                .exec();
            return products;
        } catch (error) {
            console.error('Error fetching featured products:', error);
            return [];
        }
    }
}