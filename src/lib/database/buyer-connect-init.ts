import mongoose from 'mongoose';
import connectDB from '../mongodb';
import { 
    User, 
    Chat, 
    MatchHistory, 
    BuyerConnectOrder, 
    VirtualShowroom, 
    AIAgentInteraction 
} from '../models';

/**
 * Initialize Buyer Connect database collections and indexes
 */
export async function initializeBuyerConnectDatabase(): Promise<void> {
    console.log('🗄️ Initializing Buyer Connect database...');
    
    try {
        // Connect to database
        await connectDB();
        
        // Ensure all models are registered and indexes are created
        console.log('📊 Creating database indexes...');
        
        // Create indexes for User model (enhanced)
        await User.createIndexes();
        console.log('✅ User indexes created');
        
        // Create indexes for Chat model
        await Chat.createIndexes();
        console.log('✅ Chat indexes created');
        
        // Create indexes for MatchHistory model
        await MatchHistory.createIndexes();
        console.log('✅ MatchHistory indexes created');
        
        // Create indexes for BuyerConnectOrder model
        await BuyerConnectOrder.createIndexes();
        console.log('✅ BuyerConnectOrder indexes created');
        
        // Create indexes for VirtualShowroom model
        await VirtualShowroom.createIndexes();
        console.log('✅ VirtualShowroom indexes created');
        
        // Create indexes for AIAgentInteraction model
        await AIAgentInteraction.createIndexes();
        console.log('✅ AIAgentInteraction indexes created');
        
        // Verify collections exist
        const collections = await mongoose.connection.db?.listCollections().toArray() || [];
        const collectionNames = collections.map(c => c.name);
        
        const expectedCollections = [
            'users',
            'chats', 
            'matchhistories',
            'buyerconnectorders',
            'virtualshowrooms',
            'aiagentinteractions'
        ];
        
        console.log('📋 Verifying collections...');
        expectedCollections.forEach(collection => {
            if (collectionNames.includes(collection)) {
                console.log(`✅ Collection '${collection}' exists`);
            } else {
                console.log(`⚠️ Collection '${collection}' will be created on first document insert`);
            }
        });
        
        // Create sample data for development (optional)
        if (process.env.NODE_ENV === 'development') {
            await createSampleData();
        }
        
        console.log('🎉 Buyer Connect database initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize Buyer Connect database:', error);
        throw error;
    }
}

/**
 * Create sample data for development environment
 */
async function createSampleData(): Promise<void> {
    console.log('🌱 Creating sample data for development...');
    
    try {
        // Check if sample data already exists
        const existingUsers = await User.countDocuments({ role: 'artisan' });
        if (existingUsers > 0) {
            console.log('📝 Sample data already exists, skipping creation');
            return;
        }
        
        // Create sample artisan users
        const sampleArtisans = [
            {
                uid: 'artisan_sample_1',
                email: 'rajesh.potter@example.com',
                name: 'Rajesh Kumar',
                phone: '+91-9876543210',
                role: 'artisan' as const,
                artisticProfession: 'Pottery',
                description: 'Traditional pottery artisan specializing in terracotta and ceramic work',
                artisanConnectProfile: {
                    specializations: ['pottery', 'ceramics', 'terracotta'],
                    businessHours: {
                        timezone: 'Asia/Kolkata',
                        schedule: [
                            { day: 'Monday', start: '09:00', end: '18:00', available: true },
                            { day: 'Tuesday', start: '09:00', end: '18:00', available: true },
                            { day: 'Wednesday', start: '09:00', end: '18:00', available: true },
                            { day: 'Thursday', start: '09:00', end: '18:00', available: true },
                            { day: 'Friday', start: '09:00', end: '18:00', available: true },
                            { day: 'Saturday', start: '10:00', end: '16:00', available: true },
                            { day: 'Sunday', start: '10:00', end: '14:00', available: false }
                        ]
                    },
                    responseTimeAverage: 45,
                    acceptsCustomOrders: true,
                    minimumOrderValue: 500,
                    availabilityStatus: 'available',
                    aiMetrics: {
                        matchSuccessRate: 0.85,
                        customerSatisfactionScore: 4.6,
                        averageOrderValue: 2500,
                        completionRate: 0.92
                    },
                    skillTags: [
                        { skill: 'wheel throwing', proficiency: 0.95, verified: true },
                        { skill: 'glazing', proficiency: 0.88, verified: true },
                        { skill: 'firing techniques', proficiency: 0.90, verified: false }
                    ]
                }
            },
            {
                uid: 'artisan_sample_2',
                email: 'priya.weaver@example.com',
                name: 'Priya Sharma',
                phone: '+91-9876543211',
                role: 'artisan' as const,
                artisticProfession: 'Textile Weaving',
                description: 'Master weaver specializing in traditional Indian textiles and handloom work',
                artisanConnectProfile: {
                    specializations: ['handloom', 'silk weaving', 'cotton textiles'],
                    businessHours: {
                        timezone: 'Asia/Kolkata',
                        schedule: [
                            { day: 'Monday', start: '08:00', end: '17:00', available: true },
                            { day: 'Tuesday', start: '08:00', end: '17:00', available: true },
                            { day: 'Wednesday', start: '08:00', end: '17:00', available: true },
                            { day: 'Thursday', start: '08:00', end: '17:00', available: true },
                            { day: 'Friday', start: '08:00', end: '17:00', available: true },
                            { day: 'Saturday', start: '09:00', end: '15:00', available: true },
                            { day: 'Sunday', start: '09:00', end: '13:00', available: false }
                        ]
                    },
                    responseTimeAverage: 30,
                    acceptsCustomOrders: true,
                    minimumOrderValue: 1000,
                    availabilityStatus: 'available',
                    aiMetrics: {
                        matchSuccessRate: 0.78,
                        customerSatisfactionScore: 4.8,
                        averageOrderValue: 3200,
                        completionRate: 0.95
                    },
                    skillTags: [
                        { skill: 'handloom weaving', proficiency: 0.98, verified: true },
                        { skill: 'natural dyeing', proficiency: 0.85, verified: true },
                        { skill: 'pattern design', proficiency: 0.92, verified: false }
                    ]
                }
            }
        ];
        
        // Create sample buyer users
        const sampleBuyers = [
            {
                uid: 'buyer_sample_1',
                email: 'amit.hotel@example.com',
                name: 'Amit Patel',
                phone: '+91-9876543212',
                role: 'buyer' as const,
                artisticProfession: 'Hotel Business',
                description: 'Hotel owner looking for authentic handicrafts for interior decoration',
                buyerConnectProfile: {
                    preferredLanguage: 'en',
                    communicationPreferences: {
                        emailNotifications: true,
                        pushNotifications: true,
                        translationEnabled: true
                    },
                    culturalInterests: ['pottery', 'textiles', 'woodwork'],
                    aiPreferences: {
                        recommendationStyle: 'balanced',
                        priceRange: { min: 1000, max: 10000 },
                        qualityPreference: 'premium'
                    },
                    behaviorAnalytics: {
                        sessionCount: 15,
                        averageSessionDuration: 1200,
                        lastActivity: new Date(),
                        engagementScore: 0.75
                    }
                }
            }
        ];
        
        // Insert sample users
        await User.insertMany([...sampleArtisans, ...sampleBuyers]);
        console.log(`✅ Created ${sampleArtisans.length} sample artisans and ${sampleBuyers.length} sample buyers`);
        
        // Create sample virtual showroom
        const sampleShowroom = {
            artisanId: 'artisan_sample_1',
            showroomId: 'showroom_rajesh_pottery',
            title: 'Rajesh Kumar\'s Traditional Pottery Workshop',
            description: 'Experience the ancient art of pottery making in our traditional workshop',
            arPreviewEnabled: true,
            featuredProducts: [],
            workspaceImages: [
                {
                    id: 'img_1',
                    url: '/sample-images/pottery-workshop.jpg',
                    type: '360',
                    caption: 'Main pottery workshop with traditional wheel',
                    metadata: {
                        resolution: '4K',
                        fileSize: 2048000,
                        captureDate: new Date(),
                        location: 'Khurja, Uttar Pradesh'
                    },
                    aiAnalysis: {
                        qualityScore: 0.92,
                        compositionScore: 0.88,
                        lightingScore: 0.85,
                        suggestions: ['Add more natural lighting', 'Show pottery tools more prominently'],
                        detectedObjects: [
                            { object: 'pottery wheel', confidence: 0.95 },
                            { object: 'clay pots', confidence: 0.88 },
                            { object: 'kiln', confidence: 0.82 }
                        ]
                    },
                    viewCount: 0,
                    engagementMetrics: {
                        averageViewTime: 0,
                        interactionRate: 0,
                        shareCount: 0
                    }
                }
            ],
            processVideos: [],
            culturalStory: 'Our pottery tradition spans three generations, preserving ancient techniques passed down through our family.',
            aiContent: {
                generatedDescription: 'Step into a world where clay transforms into art through skilled hands and ancient wisdom.',
                culturalNarrative: 'This workshop represents the living heritage of Indian pottery, where each piece tells a story of tradition and craftsmanship.',
                technicalExplanations: [
                    {
                        technique: 'Wheel Throwing',
                        explanation: 'The art of shaping clay on a spinning wheel using centrifugal force and skilled hand movements.',
                        difficulty: 'intermediate',
                        culturalSignificance: 'A technique that has remained unchanged for thousands of years in Indian pottery tradition.'
                    }
                ],
                recommendedTour: [
                    {
                        step: 1,
                        title: 'Welcome to the Workshop',
                        description: 'Begin your journey in our traditional pottery space',
                        mediaType: '360',
                        mediaId: 'img_1',
                        duration: 30
                    }
                ],
                personalizedContent: [
                    {
                        visitorType: 'buyer',
                        customDescription: 'Discover authentic pottery pieces perfect for your business needs',
                        highlightedFeatures: ['custom orders', 'bulk pricing', 'quality assurance'],
                        recommendedPath: ['workshop_tour', 'product_gallery', 'contact_form']
                    }
                ]
            },
            interactiveElements: [],
            analytics: {
                totalVisitors: 0,
                uniqueVisitors: 0,
                averageSessionDuration: 0,
                bounceRate: 0,
                conversionRate: 0,
                popularSections: [],
                visitorDemographics: {
                    countries: {},
                    languages: {},
                    deviceTypes: {}
                },
                aiInsights: {
                    engagementPrediction: 0.75,
                    improvementSuggestions: [
                        {
                            area: 'content',
                            suggestion: 'Add more process videos showing pottery techniques',
                            priority: 'high',
                            estimatedImpact: 0.25
                        }
                    ],
                    contentGaps: ['process videos', 'customer testimonials'],
                    optimizationOpportunities: ['mobile optimization', 'loading speed improvement']
                }
            },
            accessibility: {
                screenReaderSupport: false,
                keyboardNavigation: false,
                highContrastMode: false,
                audioDescriptions: false,
                multiLanguageSupport: ['en', 'hi'],
                aiAccessibilityScore: 0.4
            },
            seoOptimization: {
                metaTitle: 'Traditional Pottery Workshop - Rajesh Kumar',
                metaDescription: 'Experience authentic Indian pottery making with master artisan Rajesh Kumar',
                keywords: ['pottery', 'traditional crafts', 'handmade', 'ceramic', 'indian art'],
                structuredData: {},
                aiSeoScore: 0.7,
                recommendations: ['Add more descriptive alt text', 'Improve meta descriptions']
            },
            isPublished: true,
            moderationStatus: 'approved'
        };
        
        await VirtualShowroom.create(sampleShowroom);
        console.log('✅ Created sample virtual showroom');
        
        console.log('🌱 Sample data creation completed!');
        
    } catch (error) {
        console.error('❌ Failed to create sample data:', error);
        // Don't throw error for sample data creation failure
    }
}

/**
 * Clean up development data
 */
export async function cleanupSampleData(): Promise<void> {
    console.log('🧹 Cleaning up sample data...');
    
    try {
        await connectDB();
        
        // Remove sample users
        await User.deleteMany({ uid: { $regex: /^(artisan_sample_|buyer_sample_)/ } });
        
        // Remove sample showrooms
        await VirtualShowroom.deleteMany({ showroomId: { $regex: /^showroom_/ } });
        
        // Remove sample interactions
        await AIAgentInteraction.deleteMany({ userId: { $regex: /^(artisan_sample_|buyer_sample_)/ } });
        
        console.log('✅ Sample data cleanup completed');
        
    } catch (error) {
        console.error('❌ Failed to cleanup sample data:', error);
        throw error;
    }
}

// Functions are already exported individually above