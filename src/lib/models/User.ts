// User interface for Firestore
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

// User document interface (includes Firestore document ID)
export interface IUserDocument extends IUser {
    id?: string;
}

// No model export needed for Firestore - use FirestoreService instead
export default IUser;
