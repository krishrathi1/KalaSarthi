import mongoose, { Document, Model, Schema } from "mongoose";

// Product interface
export interface IProduct {
    productId: string;
    artisanId: string; // Reference to User uid
    name: string;
    description: string;
    price: number;
    category: string;
    images: string[]; // Array of image URLs
    story?: {
        englishStory?: string;
        englishCaption?: string;
        spanishStory?: string;
        spanishCaption?: string;
        frenchStory?: string;
        frenchCaption?: string;
    };
    specifications?: {
        materials?: string[];
        dimensions?: {
            length?: number;
            width?: number;
            height?: number;
            weight?: number;
        };
        colors?: string[];
    };
    amazonListing?: {
        isListed?: boolean;
        asin?: string;
        sku?: string;
        listingId?: string;
        submissionId?: string;
        status?: 'ACCEPTED' | 'INVALID' | 'SUBMITTED' | 'PROCESSING' | 'BUYABLE' | 'DISCOVERABLE' | 'DELETED' | 'ACTIVE' | 'INACTIVE' | 'ERROR';
        lastSync?: Date;
        createdAt?: Date;
        errors?: string[];
        marketplace?: string;
    };
    inventory: {
        quantity: number;
        isAvailable: boolean;
    };
    tags?: string[];
    status: "draft" | "published" | "archived";
    createdAt: Date;
    updatedAt: Date;
}

// Product document interface (extends Document)
export interface IProductDocument extends IProduct, Document { }

// Product schema
const productSchema = new Schema<IProductDocument>(
    {
        productId: {
            type: String,
            required: true,
            unique: true,
        },
        artisanId: {
            type: String,
            required: true,
            ref: 'User', // Reference to User model
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        category: {
            type: String,
            required: true,
        },
        images: [{
            type: String,
            required: true,
        }],
        story: {
            englishStory: String,
            englishCaption: String,
            spanishStory: String,
            spanishCaption: String,
            frenchStory: String,
            frenchCaption: String,
        },
        specifications: {
            materials: [String],
            dimensions: {
                length: Number,
                width: Number,
                height: Number,
                weight: Number,
            },
            colors: [String],
        },
        amazonListing: {
            isListed: { type: Boolean, default: false },
            asin: { type: String, index: true }, // Index for faster queries
            sku: { type: String, unique: true, sparse: true }, // Unique SKU
            listingId: { type: String },
            submissionId: { type: String },
            status: {
                type: String,
                enum: ['ACCEPTED', 'INVALID', 'SUBMITTED', 'PROCESSING', 'BUYABLE', 'DISCOVERABLE', 'DELETED', 'ACTIVE', 'INACTIVE', 'ERROR'],
                default: 'SUBMITTED'
            },
            lastSync: { type: Date, default: Date.now },
            createdAt: { type: Date, default: Date.now },
            errors: [{ type: String }],
            marketplace: { type: String, default: 'ATVPDKIKX0DER' } // US marketplace
        },
        inventory: {
            quantity: {
                type: Number,
                required: true,
                min: 0,
                default: 1,
            },
            isAvailable: {
                type: Boolean,
                default: true,
            },
        },
        tags: [String],
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Create indexes
productSchema.index({ artisanId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ category: 1 });
productSchema.index({ "inventory.isAvailable": 1 });
productSchema.index({
    name: "text",
    description: "text",
    category: "text",
    tags: "text",
});

// Product model
const Product: Model<IProductDocument> =
    mongoose.models.Product || mongoose.model<IProductDocument>("Product", productSchema);

export default Product;