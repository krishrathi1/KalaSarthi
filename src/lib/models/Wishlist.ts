// Wishlist interface for Firestore
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

// Wishlist document interface (includes Firestore document ID)
export interface IWishlistDocument extends IWishlist {
    id?: string;
}

// No model export needed for Firestore - use FirestoreService instead
export default IWishlist;
