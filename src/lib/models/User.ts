import mongoose, { Document, Model, Schema } from "mongoose";
import connectDB from "../mongodb";

// User interface
export interface IUser {
    uid: string;
    email?: string;
    name: string;
    phone: string;
    role: "artisan" | "buyer";
    artisticProfession: string;
    description?: string;
    profileImage?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

// User document interface (extends Document)
export interface IUserDocument extends IUser, Document { }

// User schema
const userSchema = new Schema<IUserDocument>(
    {
        uid: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            unique: true,
            required: true,
        },
        role: {
            type: String,
            enum: ["artisan", "buyer"],
            required: true,
        },
        artisticProfession: {
            type: String,
        },
        description: {
            type: String,
        },
        profileImage: {
            type: String,
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Create indexes
userSchema.index({ role: 1 });
userSchema.index({
    name: "text",
    artisticProfession: "text",
    description: "text",
});

// User model
const User: Model<IUserDocument> =
    mongoose.models.User || mongoose.model<IUserDocument>("User", userSchema);

export default User;
