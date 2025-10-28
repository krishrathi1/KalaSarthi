// Cart interface for Firestore (base data structure)
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

// Cart document interface (includes Firestore document ID)
export interface ICartDocument extends ICart {
    id?: string;
}

// No model export needed for Firestore - use FirestoreService instead
export default ICart;
