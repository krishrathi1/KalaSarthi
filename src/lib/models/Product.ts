// Product interface for Firestore
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

// Product document interface (includes Firestore document ID)
export interface IProductDocument extends IProduct {
    id?: string;
}

// No model export needed for Firestore - use FirestoreService instead
export default IProduct;
