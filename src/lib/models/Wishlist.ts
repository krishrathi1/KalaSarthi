import mongoose, { Document, Model, Schema } from "mongoose";

// Wishlist interface
export interface IWishlist {
    wishlistId: string;
    userId: string; // Reference to User uid
    products: Array<{
        productId: string;
        addedAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

// Wishlist document interface (extends Document)
export interface IWishlistDocument extends IWishlist, Document { }

// Wishlist schema
const wishlistSchema = new Schema<IWishlistDocument>(
    {
        wishlistId: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
            ref: 'User',
        },
        products: [{
            productId: {
                type: String,
                required: true,
                ref: 'Product',
            },
            addedAt: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    {
        timestamps: true,
    }
);

// Create indexes
wishlistSchema.index({ wishlistId: 1 }, { unique: true });
wishlistSchema.index({ userId: 1 }, { unique: true }); // One wishlist per user
wishlistSchema.index({ "products.productId": 1 });

// Wishlist model
const Wishlist: Model<IWishlistDocument> =
    mongoose.models.Wishlist || mongoose.model<IWishlistDocument>("Wishlist", wishlistSchema);

export default Wishlist;