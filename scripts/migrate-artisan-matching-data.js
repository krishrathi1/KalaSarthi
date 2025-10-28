/**
 * Database Migration Script for Intelligent Artisan Matching
 * 
 * This script updates existing artisan records with the new matching and location fields
 * required for the intelligent matching system.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'kalasarthi';

// Default values for new fields
const DEFAULT_MATCHING_DATA = {
    skills: [],
    materials: [],
    techniques: [],
    portfolioKeywords: [],
    averageProjectSize: { min: 1000, max: 50000 },
    typicalTimeline: '2-4 weeks',
    lastProfileUpdate: new Date()
};

const DEFAULT_LOCATION_DATA = {
    coordinates: {
        latitude: null,
        longitude: null
    },
    address: {
        city: '',
        state: '',
        country: 'India'
    },
    deliveryRadius: 50, // 50km default
    serviceAreas: [],
    deliveryOptions: ['shipping']
};

const DEFAULT_PERFORMANCE_METRICS = {
    responseTime: 24, // 24 hours
    completionRate: 0.95,
    customerSatisfaction: 4.5,
    repeatCustomerRate: 0.3,
    lastActiveDate: new Date()
};

// Skill mapping based on artistic professions
const PROFESSION_SKILL_MAPPING = {
    'pottery': ['pottery', 'ceramics', 'clay work', 'wheel throwing', 'glazing'],
    'weaving': ['weaving', 'textile', 'loom work', 'fabric design', 'thread work'],
    'jewelry': ['jewelry making', 'metalwork', 'gem setting', 'silver work', 'gold work'],
    'woodwork': ['woodworking', 'carving', 'furniture making', 'wood turning', 'joinery'],
    'painting': ['painting', 'canvas work', 'brush techniques', 'color mixing', 'art'],
    'sculpture': ['sculpting', 'stone carving', 'modeling', '3d art', 'figurines'],
    'embroidery': ['embroidery', 'needlework', 'thread art', 'fabric decoration', 'stitching'],
    'leather': ['leather work', 'tanning', 'leather crafting', 'bag making', 'shoe making'],
    'metalwork': ['metalworking', 'forging', 'welding', 'metal crafting', 'blacksmithing'],
    'glass': ['glasswork', 'glass blowing', 'stained glass', 'glass cutting', 'glass art']
};

// Material mapping based on professions
const PROFESSION_MATERIAL_MAPPING = {
    'pottery': ['clay', 'ceramic', 'porcelain', 'earthenware', 'stoneware'],
    'weaving': ['cotton', 'silk', 'wool', 'jute', 'linen'],
    'jewelry': ['gold', 'silver', 'copper', 'brass', 'gemstones'],
    'woodwork': ['teak', 'oak', 'pine', 'bamboo', 'rosewood'],
    'painting': ['acrylic', 'oil', 'watercolor', 'canvas', 'paper'],
    'sculpture': ['stone', 'marble', 'bronze', 'clay', 'wood'],
    'embroidery': ['cotton thread', 'silk thread', 'fabric', 'beads', 'sequins'],
    'leather': ['leather', 'suede', 'hide', 'synthetic leather', 'fabric'],
    'metalwork': ['iron', 'steel', 'aluminum', 'copper', 'brass'],
    'glass': ['glass', 'crystal', 'colored glass', 'mirror', 'tempered glass']
};

async function migrateArtisanData() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        
        // Find all artisan users
        const artisans = await usersCollection.find({ role: 'artisan' }).toArray();
        console.log(`Found ${artisans.length} artisan records to migrate`);
        
        let migratedCount = 0;
        let skippedCount = 0;
        
        for (const artisan of artisans) {
            try {
                // Check if already migrated
                if (artisan.artisanConnectProfile?.matchingData) {
                    console.log(`Skipping ${artisan.name} - already migrated`);
                    skippedCount++;
                    continue;
                }
                
                // Extract skills and materials based on artistic profession
                const profession = artisan.artisticProfession?.toLowerCase() || '';
                const extractedSkills = extractSkillsFromProfession(profession);
                const extractedMaterials = extractMaterialsFromProfession(profession);
                const extractedTechniques = extractTechniquesFromProfession(profession);
                
                // Extract location data from existing address
                const locationData = extractLocationData(artisan.address);
                
                // Create update object
                const updateData = {
                    $set: {
                        'artisanConnectProfile.matchingData': {
                            ...DEFAULT_MATCHING_DATA,
                            skills: extractedSkills,
                            materials: extractedMaterials,
                            techniques: extractedTechniques,
                            portfolioKeywords: extractKeywordsFromDescription(artisan.description)
                        },
                        'artisanConnectProfile.locationData': locationData,
                        'artisanConnectProfile.performanceMetrics': DEFAULT_PERFORMANCE_METRICS
                    }
                };
                
                // Update the artisan record
                await usersCollection.updateOne(
                    { _id: artisan._id },
                    updateData
                );
                
                console.log(`✓ Migrated ${artisan.name} (${profession})`);
                migratedCount++;
                
            } catch (error) {
                console.error(`Error migrating ${artisan.name}:`, error.message);
            }
        }
        
        console.log('\n=== Migration Summary ===');
        console.log(`Total artisans: ${artisans.length}`);
        console.log(`Successfully migrated: ${migratedCount}`);
        console.log(`Skipped (already migrated): ${skippedCount}`);
        console.log(`Failed: ${artisans.length - migratedCount - skippedCount}`);
        
        // Create indexes if they don't exist
        console.log('\nCreating indexes...');
        await createIndexes(usersCollection);
        console.log('✓ Indexes created successfully');
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.close();
        console.log('Database connection closed');
    }
}

function extractSkillsFromProfession(profession) {
    const skills = [];
    
    // Check each profession mapping
    for (const [key, professionSkills] of Object.entries(PROFESSION_SKILL_MAPPING)) {
        if (profession.includes(key)) {
            skills.push(...professionSkills);
        }
    }
    
    // Add the profession itself as a skill
    if (profession && !skills.includes(profession)) {
        skills.push(profession);
    }
    
    return skills.length > 0 ? skills : ['handcraft', 'artisan work'];
}

function extractMaterialsFromProfession(profession) {
    const materials = [];
    
    // Check each profession mapping
    for (const [key, professionMaterials] of Object.entries(PROFESSION_MATERIAL_MAPPING)) {
        if (profession.includes(key)) {
            materials.push(...professionMaterials);
        }
    }
    
    return materials.length > 0 ? materials : ['natural materials'];
}

function extractTechniquesFromProfession(profession) {
    const techniques = [];
    
    // Basic technique mapping
    const techniqueMap = {
        'pottery': ['hand building', 'wheel throwing', 'glazing', 'firing'],
        'weaving': ['plain weave', 'twill weave', 'pattern weaving', 'dyeing'],
        'jewelry': ['soldering', 'stone setting', 'wire wrapping', 'polishing'],
        'woodwork': ['carving', 'turning', 'joinery', 'finishing'],
        'painting': ['brush work', 'color blending', 'layering', 'detailing'],
        'embroidery': ['chain stitch', 'satin stitch', 'french knots', 'applique']
    };
    
    for (const [key, professionTechniques] of Object.entries(techniqueMap)) {
        if (profession.includes(key)) {
            techniques.push(...professionTechniques);
        }
    }
    
    return techniques.length > 0 ? techniques : ['traditional techniques'];
}

function extractKeywordsFromDescription(description) {
    if (!description) return [];
    
    // Simple keyword extraction from description
    const keywords = description
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['with', 'from', 'that', 'this', 'have', 'been', 'will'].includes(word))
        .slice(0, 10); // Limit to 10 keywords
    
    return keywords;
}

function extractLocationData(address) {
    const locationData = { ...DEFAULT_LOCATION_DATA };
    
    if (address) {
        locationData.address = {
            city: address.city || '',
            state: address.state || '',
            country: address.country || 'India'
        };
        
        // Set delivery radius based on city size (rough estimation)
        if (address.city) {
            const majorCities = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune'];
            const cityLower = address.city.toLowerCase();
            
            if (majorCities.some(city => cityLower.includes(city))) {
                locationData.deliveryRadius = 100; // Major cities - 100km
            } else {
                locationData.deliveryRadius = 50; // Other cities - 50km
            }
        }
    }
    
    return locationData;
}

async function createIndexes(collection) {
    const indexes = [
        // Geospatial index for location queries
        { 'artisanConnectProfile.locationData.coordinates': '2dsphere' },
        
        // Text indexes for matching
        { 'artisanConnectProfile.matchingData.skills': 1 },
        { 'artisanConnectProfile.matchingData.materials': 1 },
        { 'artisanConnectProfile.matchingData.techniques': 1 },
        
        // Performance indexes
        { 'artisanConnectProfile.performanceMetrics.customerSatisfaction': -1 },
        { 'artisanConnectProfile.locationData.deliveryRadius': 1 }
    ];
    
    for (const index of indexes) {
        try {
            await collection.createIndex(index);
        } catch (error) {
            // Index might already exist, continue
            console.log(`Index creation note: ${error.message}`);
        }
    }
}

// Run the migration
if (require.main === module) {
    migrateArtisanData()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateArtisanData };