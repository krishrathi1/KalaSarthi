// Enhanced User interface for Firestore with AI-optimized fields
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
    
    // AI-optimized buyer profile
    buyerConnectProfile?: {
        preferredLanguage: string;
        communicationPreferences: {
            emailNotifications: boolean;
            pushNotifications: boolean;
            translationEnabled: boolean;
        };
        purchaseHistory: string[]; // Order IDs
        favoriteArtisans: string[];
        searchHistory: Array<{
            query: string;
            timestamp: Date;
            results: number;
            selectedArtisan?: string;
        }>;
        culturalInterests: string[];
        aiPreferences: {
            recommendationStyle: 'conservative' | 'adventurous' | 'balanced';
            priceRange: { min: number; max: number };
            qualityPreference: 'budget' | 'standard' | 'premium';
        };
        behaviorAnalytics: {
            sessionCount: number;
            averageSessionDuration: number;
            lastActivity: Date;
            engagementScore: number;
        };
    };
    
    // AI-optimized artisan profile
    artisanConnectProfile?: {
        virtualShowroomId?: string;
        businessHours: {
            timezone: string;
            schedule: Array<{
                day: string;
                start: string;
                end: string;
                available: boolean;
            }>;
        };
        responseTimeAverage: number; // in minutes
        acceptsCustomOrders: boolean;
        minimumOrderValue?: number;
        specializations: string[];
        culturalCertifications: Array<{
            name: string;
            issuer: string;
            dateIssued: Date;
            verified: boolean;
        }>;
        portfolioHighlights: string[];
        availabilityStatus: 'available' | 'busy' | 'unavailable';
        aiMetrics: {
            matchSuccessRate: number;
            customerSatisfactionScore: number;
            averageOrderValue: number;
            completionRate: number;
        };
        skillTags: Array<{
            skill: string;
            proficiency: number; // 0-1 scale
            verified: boolean;
        }>;
        
        // Enhanced fields for intelligent matching
        matchingData: {
            skills: string[]; // Structured skill tags for matching
            materials: string[]; // Materials they work with
            techniques: string[]; // Crafting techniques
            portfolioKeywords: string[]; // Extracted from product descriptions
            averageProjectSize: { min: number; max: number };
            typicalTimeline: string;
            lastProfileUpdate: Date;
            categoryTags: string[]; // Product categories
            experienceLevel: 'beginner' | 'intermediate' | 'expert' | 'master';
            verificationStatus: {
                skillsVerified: boolean;
                portfolioVerified: boolean;
                identityVerified: boolean;
            };
        };
        
        locationData: {
            coordinates: {
                latitude: number;
                longitude: number;
            };
            address: {
                city: string;
                state: string;
                country: string;
                postalCode: string;
            };
            deliveryRadius: number; // in kilometers
            serviceAreas: string[]; // Additional cities/regions they serve
            deliveryOptions: ('pickup' | 'local_delivery' | 'shipping')[];
            locationAccuracy: number; // in meters
            lastLocationUpdate: Date;
        };
        
        performanceMetrics: {
            responseTime: number; // average in hours
            completionRate: number; // percentage of completed orders
            customerSatisfaction: number; // average rating
            repeatCustomerRate: number;
            totalOrders: number;
            successfulDeliveries: number;
            averageOrderValue: number;
            lastActiveDate: Date;
            profileViews: number;
            contactRequests: number;
        };
    };
    
    createdAt: Date;
    updatedAt: Date;
}

// User document interface (includes Firestore document ID)
export interface IUserDocument extends IUser {
    id?: string;
}

// Default values for new user creation
export const DEFAULT_USER_VALUES = {
    buyerConnectProfile: {
        preferredLanguage: 'en',
        communicationPreferences: {
            emailNotifications: true,
            pushNotifications: true,
            translationEnabled: true,
        },
        purchaseHistory: [],
        favoriteArtisans: [],
        searchHistory: [],
        culturalInterests: [],
        aiPreferences: {
            recommendationStyle: 'balanced' as const,
            priceRange: { min: 0, max: 100000 },
            qualityPreference: 'standard' as const,
        },
        behaviorAnalytics: {
            sessionCount: 0,
            averageSessionDuration: 0,
            lastActivity: new Date(),
            engagementScore: 0,
        },
    },
    artisanConnectProfile: {
        businessHours: {
            timezone: 'Asia/Kolkata',
            schedule: [],
        },
        responseTimeAverage: 60,
        acceptsCustomOrders: true,
        specializations: [],
        culturalCertifications: [],
        portfolioHighlights: [],
        availabilityStatus: 'available' as const,
        aiMetrics: {
            matchSuccessRate: 0,
            customerSatisfactionScore: 0,
            averageOrderValue: 0,
            completionRate: 0,
        },
        skillTags: [],
        matchingData: {
            skills: [],
            materials: [],
            techniques: [],
            portfolioKeywords: [],
            averageProjectSize: { min: 1000, max: 50000 },
            typicalTimeline: '2-4 weeks',
            lastProfileUpdate: new Date(),
            categoryTags: [],
            experienceLevel: 'intermediate' as const,
            verificationStatus: {
                skillsVerified: false,
                portfolioVerified: false,
                identityVerified: false,
            },
        },
        locationData: {
            coordinates: { latitude: 0, longitude: 0 },
            address: { city: '', state: '', country: 'India', postalCode: '' },
            deliveryRadius: 50,
            serviceAreas: [],
            deliveryOptions: [],
            locationAccuracy: 100,
            lastLocationUpdate: new Date(),
        },
        performanceMetrics: {
            responseTime: 24,
            completionRate: 0.95,
            customerSatisfaction: 4.5,
            repeatCustomerRate: 0.3,
            totalOrders: 0,
            successfulDeliveries: 0,
            averageOrderValue: 5000,
            lastActiveDate: new Date(),
            profileViews: 0,
            contactRequests: 0,
        },
    },
};

// No model export needed for Firestore - use FirestoreService instead
export default IUser;
