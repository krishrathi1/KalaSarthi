// Order interface for Firestore
export interface IOrder {
    orderId: string;
    userId: string; // Reference to User uid
    items: Array<{
        productId: string;
        artisanId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        productSnapshot: {
            name: string;
            description: string;
            images: string[];
            category: string;
        };
    }>;
    shippingAddress: {
        fullName: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phone: string;
    };
    orderSummary: {
        subtotal: number;
        tax: number;
        shippingCost: number;
        discount: number;
        totalAmount: number;
    };
    status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    paymentDetails?: {
        method?: "card" | "paypal" | "stripe" | "razorpay" | "cash_on_delivery";
        transactionId?: string;
        paidAt?: Date;
    };
    notes?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Order document interface (includes Firestore document ID)
export interface IOrderDocument extends IOrder {
    id?: string;
}

// No model export needed for Firestore - use FirestoreService instead
export default IOrder;

/* Firestore structure notes:
// Order schema equivalent in Firestore
const orderSchema = {
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: String,
            required: true,
            ref: 'User',
        },
        items: [{
            productId: {
                type: String,
                required: true,
                ref: 'Product',
            },
            artisanId: {
                type: String,
                required: true,
                ref: 'User',
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            unitPrice: {
                type: Number,
                required: true,
                min: 0,
            },
            subtotal: {
                type: Number,
                required: true,
                min: 0,
            },
            productSnapshot: {
                name: {
                    type: String,
                    required: true,
                },
                description: {
                    type: String,
                    required: true,
                },
                images: [{
                    type: String,
                    required: true,
                }],
                category: {
                    type: String,
                    required: true,
                },
            },
        }],
        shippingAddress: {
            fullName: {
                type: String,
                required: true,
            },
            street: {
                type: String,
                required: true,
            },
            city: {
                type: String,
                required: true,
            },
            state: {
                type: String,
                required: true,
            },
            zipCode: {
                type: String,
                required: true,
            },
            country: {
                type: String,
                required: true,
            },
            phone: {
                type: String,
                required: true,
            },
        },
        orderSummary: {
            subtotal: {
                type: Number,
                required: true,
                min: 0,
            },
            tax: {
                type: Number,
                default: 0,
                min: 0,
            },
            shippingCost: {
                type: Number,
                default: 0,
                min: 0,
            },
            discount: {
                type: Number,
                default: 0,
                min: 0,
            },
            totalAmount: {
                type: Number,
                required: true,
                min: 0,
            },
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
            default: "pending",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        paymentDetails: {
            method: {
                type: String,
                enum: ["card", "paypal", "stripe", "razorpay", "cash_on_delivery"],
            },
            transactionId: String,
            paidAt: Date,
        },
        notes: String,
        trackingNumber: String,
        estimatedDelivery: Date,
        deliveredAt: Date,
        cancelledAt: Date,
        cancellationReason: String,
    },
    {
        timestamps: true,
    }
);

// Create indexes
// orderId index is automatically created by unique: true constraint
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "items.artisanId": 1 });
orderSchema.index({ "items.productId": 1 });

}
// Firestore indexes should be created in Firebase Console:
// - orderId (ascending)
// - userId (ascending)
// - status (ascending)
// - paymentStatus (ascending)
// - createdAt (descending)
// - items.artisanId (ascending)
// - items.productId (ascending)
*/
