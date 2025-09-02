import mongoose, { Document, Model, Schema } from "mongoose";

// Cart interface (base data structure)
export interface ICart {
    cartId: string;
    userId: string; // Reference to User uid
    items: Array<{
        productId: string;
        quantity: number;
        addedAt: Date;
        updatedAt: Date;
    }>;
    totalAmount: number;
    totalItems: number;
    createdAt: Date;
    updatedAt: Date;
}

// Cart document interface - properly extends Document
export interface ICartDocument extends ICart, Document {
    _id: mongoose.Types.ObjectId;
}

// Cart schema
const cartSchema = new Schema<ICartDocument>(
    {
        cartId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: String,
            required: true,
            ref: 'User',
            unique: true, // One cart per user
        },
        items: [{
            productId: {
                type: String,
                required: true,
                ref: 'Product',
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
                default: 1,
            },
            addedAt: {
                type: Date,
                default: Date.now,
            },
            updatedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        totalAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalItems: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Create indexes
cartSchema.index({ cartId: 1 });
cartSchema.index({ userId: 1 });
cartSchema.index({ "items.productId": 1 });

// Middleware to update totalItems before saving
cartSchema.pre('save', function(next) {
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    next();
});

// Cart model
const Cart: Model<ICartDocument> =
    mongoose.models.Cart || mongoose.model<ICartDocument>("Cart", cartSchema);

export default Cart;