import User, { IUser, IUserDocument } from "../models/User";
import connectDB from "../mongodb";

interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

interface CreateUserResponse extends ServiceResponse {
    insertedId?: string;
}

interface UpdateUserResponse extends ServiceResponse {
    modifiedCount?: number;
}

interface DeleteUserResponse extends ServiceResponse {
    deletedCount?: number;
}

// User service class
export class UserService {
    static async createUser(userData: Partial<IUser>): Promise<CreateUserResponse> {
        try {
            await connectDB();

            const user = new User({
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const savedUser = await user.save();
            return {
                success: true,
                data: savedUser,
                insertedId: savedUser.uid.toString()
            };
        } catch (error: any) {
            console.error('Error creating user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getUserByUid(uid: string): Promise<IUserDocument | null> {
        try {
            await connectDB();
            const user = await User.findOne({ uid }).exec();
            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    static async getUserByPhone(phone: string): Promise<IUserDocument | null> {
        try {
            await connectDB();
            const user = await User.findOne({ phone }).exec();
            return user;
        } catch (error) {
            console.error('Error fetching user by phone:', error);
            return null;
        }
    }

    static async getUserByEmail(email: string): Promise<IUserDocument | null> {
        try {
            await connectDB();
            const user = await User.findOne({ email }).exec();
            return user;
        } catch (error) {
            console.error('Error fetching user by email:', error);
            return null;
        }
    }

    static async updateUser(uid: string, updateData: Partial<IUser>): Promise<UpdateUserResponse> {
        try {
            await connectDB();

            const result = await User.updateOne(
                { uid },
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
            console.error('Error updating user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async deleteUser(uid: string): Promise<DeleteUserResponse> {
        try {
            await connectDB();
            const result = await User.deleteOne({ uid }).exec();
            return {
                success: true,
                deletedCount: result.deletedCount
            };
        } catch (error: any) {
            console.error('Error deleting user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getAllArtisans(filter: Partial<IUser> = {}): Promise<IUserDocument[]> {
        try {
            await connectDB();
            const artisans = await User
                .find({ role: 'artisan', ...filter })
                .sort({ createdAt: -1 })
                .exec();
            return artisans;
        } catch (error) {
            console.error('Error fetching artisans:', error);
            return [];
        }
    }

    static async searchArtisans(searchTerm: string): Promise<IUserDocument[]> {
        try {
            await connectDB();
            const artisans = await User
                .find({
                    role: 'artisan',
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { artisticProfession: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } }
                    ]
                })
                .exec();
            return artisans;
        } catch (error) {
            console.error('Error searching artisans:', error);
            return [];
        }
    }

    static async getUserStats(): Promise<{ totalUsers: number; artisans: number; buyers: number }> {
        try {
            await connectDB();
            const totalUsers = await User.countDocuments().exec();
            const artisans = await User.countDocuments({ role: 'artisan' }).exec();
            const buyers = await User.countDocuments({ role: 'buyer' }).exec();

            return { totalUsers, artisans, buyers };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return { totalUsers: 0, artisans: 0, buyers: 0 };
        }
    }

    static async getRecentArtisans(limit: number = 10): Promise<IUserDocument[]> {
        try {
            await connectDB();
            const artisans = await User
                .find({ role: 'artisan' })
                .sort({ createdAt: -1 })
                .limit(limit)
                .exec();
            return artisans;
        } catch (error) {
            console.error('Error fetching recent artisans:', error);
            return [];
        }
    }
}