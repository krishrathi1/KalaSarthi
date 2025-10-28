import { IUser, IUserDocument } from "../models/User";
import { FirestoreService, COLLECTIONS, where, orderBy, limit as limitQuery } from "../firestore";

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

// User service class for Firestore
export class UserService {
    static async createUser(userData: Partial<IUser>): Promise<CreateUserResponse> {
        try {
            const user: IUser = {
                ...userData,
                uid: userData.uid!,
                name: userData.name!,
                phone: userData.phone!,
                role: userData.role!,
                artisticProfession: userData.artisticProfession || '',
                createdAt: new Date(),
                updatedAt: new Date()
            } as IUser;

            await FirestoreService.set(COLLECTIONS.USERS, user.uid, user);
            
            return {
                success: true,
                data: user,
                insertedId: user.uid
            };
        } catch (error: any) {
            console.error('Error creating user:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getUserByUid(uid: string): Promise<IUser | null> {
        try {
            const user = await FirestoreService.getById<IUser>(COLLECTIONS.USERS, uid);
            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    static async getUserByPhone(phone: string): Promise<IUser | null> {
        try {
            const users = await FirestoreService.query<IUser>(
                COLLECTIONS.USERS,
                [where('phone', '==', phone), limitQuery(1)]
            );
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('Error fetching user by phone:', error);
            return null;
        }
    }

    static async getUserByEmail(email: string): Promise<IUser | null> {
        try {
            const users = await FirestoreService.query<IUser>(
                COLLECTIONS.USERS,
                [where('email', '==', email), limitQuery(1)]
            );
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('Error fetching user by email:', error);
            return null;
        }
    }

    static async updateUser(uid: string, updates: Partial<IUser>): Promise<UpdateUserResponse> {
        try {
            await FirestoreService.update(COLLECTIONS.USERS, uid, {
                ...updates,
                updatedAt: new Date()
            });

            return {
                success: true,
                modifiedCount: 1
            };
        } catch (error: any) {
            console.error('Error updating user:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async deleteUser(uid: string): Promise<DeleteUserResponse> {
        try {
            await FirestoreService.delete(COLLECTIONS.USERS, uid);
            return {
                success: true,
                deletedCount: 1
            };
        } catch (error: any) {
            console.error('Error deleting user:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    static async getAllArtisans(): Promise<IUser[]> {
        try {
            const constraints = [
                where('role', '==', 'artisan'),
                orderBy('createdAt', 'desc')
            ];

            const artisans = await FirestoreService.query<IUser>(
                COLLECTIONS.USERS,
                constraints
            );

            return artisans;
        } catch (error) {
            console.error('Error fetching artisans:', error);
            return [];
        }
    }

    static async searchArtisans(searchTerm: string): Promise<IUser[]> {
        try {
            // Firestore doesn't support full-text search natively
            // We'll fetch all artisans and filter client-side
            // For production, consider using Algolia or similar service
            const artisans = await FirestoreService.query<IUser>(
                COLLECTIONS.USERS,
                [where('role', '==', 'artisan')]
            );

            const searchLower = searchTerm.toLowerCase();
            return artisans.filter(artisan => 
                artisan.name.toLowerCase().includes(searchLower) ||
                artisan.artisticProfession?.toLowerCase().includes(searchLower) ||
                artisan.description?.toLowerCase().includes(searchLower)
            );
        } catch (error) {
            console.error('Error searching artisans:', error);
            return [];
        }
    }

    static async getUserStats(): Promise<{ totalUsers: number; artisans: number; buyers: number }> {
        try {
            const totalUsers = await FirestoreService.count(COLLECTIONS.USERS);
            const artisans = await FirestoreService.count(COLLECTIONS.USERS, [where('role', '==', 'artisan')]);
            const buyers = await FirestoreService.count(COLLECTIONS.USERS, [where('role', '==', 'buyer')]);

            return { totalUsers, artisans, buyers };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return { totalUsers: 0, artisans: 0, buyers: 0 };
        }
    }

    static async getRecentArtisans(limitCount: number = 10): Promise<IUser[]> {
        try {
            const artisans = await FirestoreService.query<IUser>(
                COLLECTIONS.USERS,
                [
                    where('role', '==', 'artisan'),
                    orderBy('createdAt', 'desc'),
                    limitQuery(limitCount)
                ]
            );

            return artisans;
        } catch (error) {
            console.error('Error fetching recent artisans:', error);
            return [];
        }
    }
}