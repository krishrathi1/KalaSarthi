/**
 * Vector Database Schema for Artisan Profile Embeddings
 * Defines the structure and validation for artisan profile data in the vector store
 */

import { z } from 'zod';

// Zod schemas for validation
export const ArtisanProfileSchema = z.object({
    id: z.string().min(1),
    userId: z.string().min(1),
    personalInfo: z.object({
        name: z.string().min(1),
        location: z.string().min(1),
        languages: z.array(z.string()).min(1),
        experience: z.number().min(0),
    }),
    skills: z.object({
        primary: z.array(z.string()).min(1),
        secondary: z.array(z.string()).default([]),
        certifications: z.array(z.string()).default([]),
    }),
    products: z.object({
        categories: z.array(z.string()).min(1),
        specialties: z.array(z.string()).default([]),
        priceRange: z.object({
            min: z.number().min(0),
            max: z.number().min(0),
            currency: z.string().default('INR'),
        }),
    }),
    preferences: z.object({
        communicationStyle: z.enum(['formal', 'casual', 'technical']).default('casual'),
        responseLength: z.enum(['brief', 'detailed', 'comprehensive']).default('detailed'),
        topics: z.array(z.string()).default([]),
    }),
    businessInfo: z.object({
        businessType: z.string().min(1),
        targetMarket: z.array(z.string()).min(1),
        challenges: z.array(z.string()).default([]),
        goals: z.array(z.string()).default([]),
    }),
    metadata: z.object({
        createdAt: z.date(),
        updatedAt: z.date(),
        completeness: z.number().min(0).max(100),
        embedding: z.array(z.number()).optional(),
    }),
});

export const VectorDocumentSchema = z.object({
    id: z.string().min(1),
    embedding: z.array(z.number()).min(1),
    metadata: z.record(z.any()),
});

export const ProfileMatchSchema = z.object({
    profile: ArtisanProfileSchema,
    similarity: z.number().min(0).max(1),
    matchedFields: z.array(z.string()),
});

// TypeScript types derived from schemas
export type ArtisanProfile = z.infer<typeof ArtisanProfileSchema>;
export type VectorDocument = z.infer<typeof VectorDocumentSchema>;
export type ProfileMatch = z.infer<typeof ProfileMatchSchema>;

// Embedding field definitions for different profile sections
export interface EmbeddingFieldConfig {
    field: string;
    weight: number;
    maxLength: number;
    required: boolean;
}

export const PROFILE_EMBEDDING_FIELDS: EmbeddingFieldConfig[] = [
    // Personal Information
    { field: 'personalInfo.name', weight: 0.8, maxLength: 100, required: true },
    { field: 'personalInfo.location', weight: 0.9, maxLength: 200, required: true },
    { field: 'personalInfo.languages', weight: 0.6, maxLength: 100, required: true },

    // Skills and Expertise
    { field: 'skills.primary', weight: 1.0, maxLength: 500, required: true },
    { field: 'skills.secondary', weight: 0.7, maxLength: 300, required: false },
    { field: 'skills.certifications', weight: 0.8, maxLength: 300, required: false },

    // Products and Services
    { field: 'products.categories', weight: 0.9, maxLength: 300, required: true },
    { field: 'products.specialties', weight: 0.8, maxLength: 400, required: false },

    // Business Information
    { field: 'businessInfo.businessType', weight: 0.7, maxLength: 100, required: true },
    { field: 'businessInfo.targetMarket', weight: 0.6, maxLength: 200, required: true },
    { field: 'businessInfo.challenges', weight: 0.5, maxLength: 500, required: false },
    { field: 'businessInfo.goals', weight: 0.6, maxLength: 500, required: false },
];

// Search query types and their field mappings
export interface SearchQueryType {
    type: string;
    fields: string[];
    weights: Record<string, number>;
    description: string;
}

export const SEARCH_QUERY_TYPES: SearchQueryType[] = [
    {
        type: 'skill_based',
        fields: ['skills.primary', 'skills.secondary', 'skills.certifications'],
        weights: { 'skills.primary': 1.0, 'skills.secondary': 0.7, 'skills.certifications': 0.8 },
        description: 'Search based on artisan skills and expertise',
    },
    {
        type: 'product_based',
        fields: ['products.categories', 'products.specialties'],
        weights: { 'products.categories': 0.9, 'products.specialties': 0.8 },
        description: 'Search based on product categories and specialties',
    },
    {
        type: 'location_based',
        fields: ['personalInfo.location'],
        weights: { 'personalInfo.location': 1.0 },
        description: 'Search based on geographical location',
    },
    {
        type: 'business_based',
        fields: ['businessInfo.businessType', 'businessInfo.targetMarket'],
        weights: { 'businessInfo.businessType': 0.8, 'businessInfo.targetMarket': 0.7 },
        description: 'Search based on business type and target market',
    },
    {
        type: 'comprehensive',
        fields: [
            'personalInfo.name', 'personalInfo.location',
            'skills.primary', 'skills.secondary',
            'products.categories', 'products.specialties',
            'businessInfo.businessType', 'businessInfo.targetMarket'
        ],
        weights: {
            'personalInfo.name': 0.6,
            'personalInfo.location': 0.7,
            'skills.primary': 1.0,
            'skills.secondary': 0.7,
            'products.categories': 0.9,
            'products.specialties': 0.8,
            'businessInfo.businessType': 0.6,
            'businessInfo.targetMarket': 0.5,
        },
        description: 'Comprehensive search across all profile fields',
    },
];

// Metadata field definitions
export interface MetadataField {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    indexed: boolean;
    filterable: boolean;
    description: string;
}

export const METADATA_FIELDS: MetadataField[] = [
    { name: 'artisanId', type: 'string', indexed: true, filterable: true, description: 'Unique artisan identifier' },
    { name: 'userId', type: 'string', indexed: true, filterable: true, description: 'Associated user ID' },
    { name: 'location', type: 'string', indexed: true, filterable: true, description: 'Artisan location' },
    { name: 'experience', type: 'number', indexed: true, filterable: true, description: 'Years of experience' },
    { name: 'primarySkills', type: 'array', indexed: true, filterable: true, description: 'Primary skill categories' },
    { name: 'productCategories', type: 'array', indexed: true, filterable: true, description: 'Product categories' },
    { name: 'businessType', type: 'string', indexed: true, filterable: true, description: 'Type of business' },
    { name: 'languages', type: 'array', indexed: true, filterable: true, description: 'Supported languages' },
    { name: 'priceRange', type: 'object', indexed: false, filterable: true, description: 'Product price range' },
    { name: 'completeness', type: 'number', indexed: true, filterable: true, description: 'Profile completeness percentage' },
    { name: 'createdAt', type: 'string', indexed: true, filterable: true, description: 'Profile creation timestamp' },
    { name: 'updatedAt', type: 'string', indexed: true, filterable: true, description: 'Last update timestamp' },
];

// Validation functions
export function validateArtisanProfile(profile: unknown): ArtisanProfile {
    return ArtisanProfileSchema.parse(profile);
}

export function validateVectorDocument(document: unknown): VectorDocument {
    return VectorDocumentSchema.parse(document);
}

export function validateProfileMatch(match: unknown): ProfileMatch {
    return ProfileMatchSchema.parse(match);
}

// Helper functions for profile processing
export function extractTextForEmbedding(profile: ArtisanProfile, fields?: string[]): string {
    const fieldsToExtract = fields || PROFILE_EMBEDDING_FIELDS.map(f => f.field);
    const textParts: string[] = [];

    for (const fieldPath of fieldsToExtract) {
        const value = getNestedValue(profile, fieldPath);
        if (value) {
            const textValue = Array.isArray(value) ? value.join(', ') : String(value);
            textParts.push(textValue);
        }
    }

    return textParts.join(' | ');
}

export function extractMetadata(profile: ArtisanProfile): Record<string, any> {
    return {
        artisanId: profile.id,
        userId: profile.userId,
        location: profile.personalInfo.location,
        experience: profile.personalInfo.experience,
        primarySkills: profile.skills.primary,
        productCategories: profile.products.categories,
        businessType: profile.businessInfo.businessType,
        languages: profile.personalInfo.languages,
        priceRange: profile.products.priceRange,
        completeness: profile.metadata.completeness,
        createdAt: profile.metadata.createdAt.toISOString(),
        updatedAt: profile.metadata.updatedAt.toISOString(),
    };
}

export function calculateProfileCompleteness(profile: Partial<ArtisanProfile>): number {
    const requiredFields = PROFILE_EMBEDDING_FIELDS.filter(f => f.required);
    let completedFields = 0;

    for (const field of requiredFields) {
        const value = getNestedValue(profile, field.field);
        if (value && (Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0)) {
            completedFields++;
        }
    }

    return Math.round((completedFields / requiredFields.length) * 100);
}

// Utility function to get nested object values
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Profile text chunking for large profiles
export function chunkProfileText(text: string, maxChunkSize: number = 512): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk + '.');
            }
            currentChunk = trimmedSentence;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk + '.');
    }

    return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
}