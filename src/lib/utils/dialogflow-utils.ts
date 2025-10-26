/**
 * Utility functions for Dialogflow CX intent and entity management
 */

export interface IntentDefinition {
    name: string;
    displayName: string;
    trainingPhrases: string[];
    parameters?: EntityParameter[];
    action?: string;
    requiresContext?: boolean;
}

export interface EntityParameter {
    name: string;
    entityType: string;
    required: boolean;
    prompts?: string[];
}

export interface EntityType {
    name: string;
    displayName: string;
    kind: 'KIND_MAP' | 'KIND_LIST' | 'KIND_REGEXP';
    entities: EntityEntry[];
}

export interface EntityEntry {
    value: string;
    synonyms: string[];
}

/**
 * Predefined artisan-specific intents for Dialogflow CX
 */
export const ARTISAN_INTENTS: IntentDefinition[] = [
    {
        name: 'product_creation',
        displayName: 'Product Creation',
        trainingPhrases: [
            'I want to create a new product',
            'Help me make a product',
            'Create product',
            'New product',
            'मैं नया प्रोडक्ट बनाना चाहता हूं',
            'प्रोडक्ट बनाने में मदद करो'
        ],
        parameters: [
            {
                name: 'product-type',
                entityType: '@product-type',
                required: true,
                prompts: [
                    'What type of product would you like to create?',
                    'आप किस प्रकार का प्रोडक्ट बनाना चाहते हैं?'
                ]
            }
        ],
        action: 'navigate',
        requiresContext: false
    },
    {
        name: 'sales_inquiry',
        displayName: 'Sales Inquiry',
        trainingPhrases: [
            'Show me my sales',
            'How much did I earn',
            'Sales report',
            'Revenue data',
            'मेरी सेल्स दिखाओ',
            'कितनी कमाई हुई'
        ],
        parameters: [
            {
                name: 'time-period',
                entityType: '@time-period',
                required: false
            }
        ],
        action: 'navigate',
        requiresContext: false
    },
    {
        name: 'trend_analysis',
        displayName: 'Trend Analysis',
        trainingPhrases: [
            'What\'s trending',
            'Show me trends',
            'Popular designs',
            'Market trends',
            'क्या ट्रेंड में है',
            'ट्रेंड्स दिखाओ'
        ],
        parameters: [
            {
                name: 'craft-category',
                entityType: '@craft-category',
                required: false
            }
        ],
        action: 'navigate',
        requiresContext: true
    },
    {
        name: 'buyer_matching',
        displayName: 'Buyer Matching',
        trainingPhrases: [
            'Find buyers for my products',
            'Connect me with customers',
            'Buyer matching',
            'मेरे प्रोडक्ट्स के लिए बायर खोजो',
            'ग्राहकों से जोड़ो'
        ],
        parameters: [
            {
                name: 'product-type',
                entityType: '@product-type',
                required: true
            },
            {
                name: 'location',
                entityType: '@location',
                required: false
            }
        ],
        action: 'navigate',
        requiresContext: true
    },
    {
        name: 'greeting',
        displayName: 'Greeting',
        trainingPhrases: [
            'Hello',
            'Hi',
            'Good morning',
            'Namaste',
            'नमस्ते',
            'हैलो'
        ],
        action: 'greeting',
        requiresContext: false
    },
    {
        name: 'help_request',
        displayName: 'Help Request',
        trainingPhrases: [
            'Help me',
            'What can you do',
            'I need assistance',
            'मदद करो',
            'तुम क्या कर सकते हो'
        ],
        action: 'help',
        requiresContext: false
    }
];

/**
 * Predefined artisan-specific entity types for Dialogflow CX
 */
export const ARTISAN_ENTITY_TYPES: EntityType[] = [
    {
        name: 'product-type',
        displayName: 'Product Type',
        kind: 'KIND_MAP',
        entities: [
            {
                value: 'jewelry',
                synonyms: ['jewelry', 'jewellery', 'ornaments', 'आभूषण', 'गहने']
            },
            {
                value: 'textile',
                synonyms: ['textile', 'fabric', 'cloth', 'कपड़े', 'वस्त्र']
            },
            {
                value: 'pottery',
                synonyms: ['pottery', 'ceramics', 'clay', 'मिट्टी के बर्तन', 'कुम्हारी']
            },
            {
                value: 'woodwork',
                synonyms: ['woodwork', 'carpentry', 'wood', 'लकड़ी का काम', 'बढ़ईगीरी']
            },
            {
                value: 'metalwork',
                synonyms: ['metalwork', 'metal', 'iron', 'धातु का काम', 'लोहारी']
            }
        ]
    },
    {
        name: 'craft-category',
        displayName: 'Craft Category',
        kind: 'KIND_MAP',
        entities: [
            {
                value: 'fashion',
                synonyms: ['fashion', 'clothing', 'apparel', 'फैशन', 'कपड़े']
            },
            {
                value: 'home-decor',
                synonyms: ['home decor', 'decoration', 'interior', 'होम डेकोर', 'सजावट']
            },
            {
                value: 'traditional',
                synonyms: ['traditional', 'heritage', 'cultural', 'पारंपरिक', 'सांस्कृतिक']
            },
            {
                value: 'modern',
                synonyms: ['modern', 'contemporary', 'new', 'आधुनिक', 'नया']
            }
        ]
    },
    {
        name: 'time-period',
        displayName: 'Time Period',
        kind: 'KIND_MAP',
        entities: [
            {
                value: 'current_month',
                synonyms: ['this month', 'current month', 'इस महीने', 'वर्तमान महीना']
            },
            {
                value: 'last_month',
                synonyms: ['last month', 'previous month', 'पिछले महीने', 'पिछला महीना']
            },
            {
                value: 'current_year',
                synonyms: ['this year', 'current year', 'इस साल', 'वर्तमान वर्ष']
            },
            {
                value: 'last_year',
                synonyms: ['last year', 'previous year', 'पिछले साल', 'पिछला वर्ष']
            }
        ]
    },
    {
        name: 'location',
        displayName: 'Location',
        kind: 'KIND_MAP',
        entities: [
            {
                value: 'local',
                synonyms: ['local', 'nearby', 'around here', 'स्थानीय', 'आस-पास']
            },
            {
                value: 'national',
                synonyms: ['national', 'country', 'india', 'राष्ट्रीय', 'देश']
            },
            {
                value: 'international',
                synonyms: ['international', 'global', 'worldwide', 'अंतर्राष्ट्रीय', 'विश्वव्यापी']
            }
        ]
    }
];

/**
 * Generate training phrases for an intent in multiple languages
 */
export function generateTrainingPhrases(
    basePhrase: string,
    variations: string[],
    hindiTranslations: string[]
): string[] {
    const phrases: string[] = [basePhrase];

    // Add variations
    phrases.push(...variations);

    // Add Hindi translations
    phrases.push(...hindiTranslations);

    // Generate some automatic variations
    const lowerCase = basePhrase.toLowerCase();
    const withPlease = `please ${lowerCase}`;
    const withCan = `can you ${lowerCase}`;
    const withI = `i want to ${lowerCase}`;

    phrases.push(withPlease, withCan, withI);

    return phrases;
}

/**
 * Validate intent definition
 */
export function validateIntentDefinition(intent: IntentDefinition): string[] {
    const errors: string[] = [];

    if (!intent.name || intent.name.trim() === '') {
        errors.push('Intent name is required');
    }

    if (!intent.displayName || intent.displayName.trim() === '') {
        errors.push('Intent display name is required');
    }

    if (!intent.trainingPhrases || intent.trainingPhrases.length === 0) {
        errors.push('At least one training phrase is required');
    }

    if (intent.trainingPhrases && intent.trainingPhrases.length < 3) {
        errors.push('At least 3 training phrases are recommended for better accuracy');
    }

    // Validate parameters
    if (intent.parameters) {
        intent.parameters.forEach((param, index) => {
            if (!param.name || param.name.trim() === '') {
                errors.push(`Parameter ${index + 1}: name is required`);
            }

            if (!param.entityType || param.entityType.trim() === '') {
                errors.push(`Parameter ${index + 1}: entity type is required`);
            }

            if (param.required && (!param.prompts || param.prompts.length === 0)) {
                errors.push(`Parameter ${index + 1}: prompts are required for required parameters`);
            }
        });
    }

    return errors;
}

/**
 * Validate entity type definition
 */
export function validateEntityType(entityType: EntityType): string[] {
    const errors: string[] = [];

    if (!entityType.name || entityType.name.trim() === '') {
        errors.push('Entity type name is required');
    }

    if (!entityType.displayName || entityType.displayName.trim() === '') {
        errors.push('Entity type display name is required');
    }

    if (!entityType.entities || entityType.entities.length === 0) {
        errors.push('At least one entity entry is required');
    }

    // Validate entities
    if (entityType.entities) {
        entityType.entities.forEach((entity, index) => {
            if (!entity.value || entity.value.trim() === '') {
                errors.push(`Entity ${index + 1}: value is required`);
            }

            if (!entity.synonyms || entity.synonyms.length === 0) {
                errors.push(`Entity ${index + 1}: at least one synonym is required`);
            }
        });
    }

    return errors;
}

/**
 * Convert intent definition to Dialogflow CX format
 */
export function convertToDialogflowFormat(intent: IntentDefinition): any {
    return {
        displayName: intent.displayName,
        trainingPhrases: intent.trainingPhrases.map(phrase => ({
            parts: [{ text: phrase }],
            repeatCount: 1
        })),
        parameters: intent.parameters?.map(param => ({
            id: param.name,
            entityType: param.entityType,
            isList: false,
            redact: false,
            required: param.required,
            prompts: param.prompts?.map(prompt => ({
                text: { text: [prompt] }
            }))
        })) || []
    };
}

/**
 * Convert entity type definition to Dialogflow CX format
 */
export function convertEntityTypeToDialogflowFormat(entityType: EntityType): any {
    return {
        displayName: entityType.displayName,
        kind: entityType.kind,
        entities: entityType.entities.map(entity => ({
            value: entity.value,
            synonyms: entity.synonyms
        }))
    };
}