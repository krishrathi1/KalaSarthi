import {
    ArtisanProfile,
    ConversationContext,
    MessageResponse,
    MessageMetadata,
    Preferences
} from '../types/enhanced-artisan-buddy';

/**
 * Response Generation Service
 * 
 * Handles response formatting, templating, fallback responses,
 * and personalization based on user preferences.
 */
export class ResponseGenerationService {
    private static instance: ResponseGenerationService;

    // Response templates organized by category and style
    private responseTemplates: Map<string, ResponseTemplate> = new Map();

    // Fallback responses for different error scenarios
    private fallbackResponses: Map<string, FallbackResponse> = new Map();

    private constructor() {
        this.initializeResponseTemplates();
        this.initializeFallbackResponses();
    }

    public static getInstance(): ResponseGenerationService {
        if (!ResponseGenerationService.instance) {
            ResponseGenerationService.instance = new ResponseGenerationService();
        }
        return ResponseGenerationService.instance;
    }

    /**
     * Generate personalized response based on user preferences and context
     */
    public async generateResponse(
        content: string,
        context: ConversationContext,
        metadata?: Partial<MessageMetadata>
    ): Promise<MessageResponse> {
        try {
            const preferences = context.profileContext?.preferences;
            const formattedContent = await this.formatResponse(content, preferences);

            return {
                content: formattedContent,
                metadata: {
                    confidence: 0.8,
                    intent: metadata?.intent || 'general_response',
                    entities: metadata?.entities || {},
                    source: 'assistant',
                    processingTime: metadata?.processingTime
                }
            };

        } catch (error) {
            console.error('Error generating response:', error);
            return this.generateFallbackResponse('generation_error', context);
        }
    }

    /**
     * Generate greeting response based on user profile and preferences
     */
    public async generateGreeting(context: ConversationContext): Promise<MessageResponse> {
        const profile = context.profileContext;
        const preferences = profile?.preferences;

        let greeting = "Hello! I'm your Enhanced Artisan Buddy.";

        if (profile) {
            const name = profile.personalInfo.name;
            const craft = profile.businessInfo.businessType || 'artisan';

            switch (preferences?.communicationStyle) {
                case 'formal':
                    greeting = `Good day, ${name}. I am here to assist you with your ${craft} business endeavors.`;
                    break;
                case 'casual':
                    greeting = `Hey ${name}! Ready to work on your ${craft} projects today?`;
                    break;
                case 'technical':
                    greeting = `Hello ${name}. I'm your AI assistant for ${craft} business optimization and technical support.`;
                    break;
                default:
                    greeting = `Hi ${name}! I'm here to help with your ${craft} business. What can I assist you with?`;
            }
        }

        const capabilities = this.getCapabilitiesDescription(preferences);
        const fullGreeting = `${greeting}\n\n${capabilities}`;

        return {
            content: fullGreeting,
            metadata: {
                confidence: 0.9,
                intent: 'greeting',
                entities: {},
                source: 'assistant'
            }
        };
    }

    /**
     * Generate help response based on user preferences
     */
    public async generateHelpResponse(context: ConversationContext): Promise<MessageResponse> {
        const preferences = context.profileContext?.preferences;
        const template = this.getResponseTemplate('help', preferences?.communicationStyle);

        const helpContent = this.formatHelpContent(template, preferences);

        return {
            content: helpContent,
            metadata: {
                confidence: 0.9,
                intent: 'help',
                entities: {},
                source: 'assistant'
            }
        };
    }

    /**
     * Generate error response with appropriate tone and suggestions
     */
    public generateFallbackResponse(
        errorType: string,
        context: ConversationContext
    ): MessageResponse {
        const fallback = this.fallbackResponses.get(errorType) || this.fallbackResponses.get('default')!;
        const preferences = context.profileContext?.preferences;

        let content = fallback.message;

        // Personalize based on communication style
        if (preferences?.communicationStyle === 'formal') {
            content = fallback.formalMessage || content;
        } else if (preferences?.communicationStyle === 'casual') {
            content = fallback.casualMessage || content;
        }

        // Add suggestions if available
        if (fallback.suggestions.length > 0) {
            content += '\n\nHere are some things you can try:\n';
            content += fallback.suggestions.map(s => `• ${s}`).join('\n');
        }

        return {
            content,
            metadata: {
                confidence: 0.1,
                intent: 'error',
                entities: {},
                source: 'assistant'
            }
        };
    }

    /**
     * Format response based on user preferences
     */
    private async formatResponse(content: string, preferences?: Preferences): Promise<string> {
        if (!preferences) return content;

        let formattedContent = content;

        // Adjust response length based on preference
        switch (preferences.responseLength) {
            case 'brief':
                formattedContent = this.makeBrief(content);
                break;
            case 'comprehensive':
                formattedContent = this.makeComprehensive(content);
                break;
            case 'detailed':
            default:
                // Keep as is for detailed responses
                break;
        }

        // Adjust tone based on communication style
        switch (preferences.communicationStyle) {
            case 'formal':
                formattedContent = this.makeFormal(formattedContent);
                break;
            case 'casual':
                formattedContent = this.makeCasual(formattedContent);
                break;
            case 'technical':
                formattedContent = this.makeTechnical(formattedContent);
                break;
        }

        return formattedContent;
    }

    /**
     * Make response brief by summarizing key points
     */
    private makeBrief(content: string): string {
        // Split into sentences and take first 2-3 key sentences
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

        if (sentences.length <= 2) return content;

        // Take first sentence and last sentence for brief response
        return `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`;
    }

    /**
     * Make response comprehensive by adding context and examples
     */
    private makeComprehensive(content: string): string {
        // Add introductory context and examples
        const intro = "Let me provide you with a detailed explanation:\n\n";
        const conclusion = "\n\nWould you like me to elaborate on any specific aspect of this information?";

        return `${intro}${content}${conclusion}`;
    }

    /**
     * Make response formal in tone
     */
    private makeFormal(content: string): string {
        return content
            .replace(/\bcan't\b/g, 'cannot')
            .replace(/\bwon't\b/g, 'will not')
            .replace(/\bdon't\b/g, 'do not')
            .replace(/\bI'm\b/g, 'I am')
            .replace(/\byou're\b/g, 'you are')
            .replace(/\bit's\b/g, 'it is')
            .replace(/\blet's\b/g, 'let us')
            .replace(/Hey/g, 'Hello')
            .replace(/Sure!/g, 'Certainly.')
            .replace(/Great!/g, 'Excellent.');
    }

    /**
     * Make response casual in tone
     */
    private makeCasual(content: string): string {
        return content
            .replace(/\bHello\b/g, 'Hey')
            .replace(/\bCertainly\b/g, 'Sure')
            .replace(/\bExcellent\b/g, 'Great')
            .replace(/I would recommend/g, "I'd suggest")
            .replace(/Please consider/g, 'Maybe try')
            .replace(/\bHowever\b/g, 'But');
    }

    /**
     * Make response technical in tone
     */
    private makeTechnical(content: string): string {
        // Add technical precision and specific terminology
        return content
            .replace(/\bhelp\b/g, 'assist')
            .replace(/\bfix\b/g, 'resolve')
            .replace(/\bproblem\b/g, 'issue')
            .replace(/\bway\b/g, 'method')
            .replace(/\bthing\b/g, 'component');
    }

    /**
     * Get capabilities description based on user preferences
     */
    private getCapabilitiesDescription(preferences?: Preferences): string {
        const baseCapabilities = [
            'Product creation and management',
            'Sales tracking and analytics',
            'Trend analysis and market insights',
            'Buyer matching and networking',
            'Business guidance and support'
        ];

        let description = "I can help you with:\n";
        description += baseCapabilities.map(cap => `• ${cap}`).join('\n');

        if (preferences?.responseLength === 'comprehensive') {
            description += '\n\nI also provide voice interaction, multilingual support, and personalized recommendations based on your artisan profile.';
        }

        return description;
    }

    /**
     * Get response template based on type and communication style
     */
    private getResponseTemplate(type: string, style?: string): ResponseTemplate {
        const key = `${type}_${style || 'default'}`;
        return this.responseTemplates.get(key) || this.responseTemplates.get(`${type}_default`)!;
    }

    /**
     * Format help content based on template and preferences
     */
    private formatHelpContent(template: ResponseTemplate, preferences?: Preferences): string {
        let content = template.content;

        if (preferences?.responseLength === 'brief') {
            content = template.briefContent || content;
        } else if (preferences?.responseLength === 'comprehensive') {
            content = template.comprehensiveContent || content;
        }

        return content;
    }

    /**
     * Initialize response templates for different scenarios
     */
    private initializeResponseTemplates(): void {
        // Help templates
        this.responseTemplates.set('help_default', {
            content: `I can assist you with various aspects of your artisan business:

• **Product Management**: Create, edit, and organize your craft products
• **Sales Analytics**: Track revenue, orders, and performance metrics  
• **Market Trends**: Discover trending designs and popular products
• **Buyer Connections**: Find and connect with potential customers
• **Business Guidance**: Get advice on pricing, marketing, and growth

What specific area would you like help with?`,
            briefContent: 'I help with products, sales, trends, buyers, and business advice. What do you need?',
            comprehensiveContent: `As your Enhanced Artisan Buddy, I provide comprehensive support for your craft business:

**Core Features:**
• Product Management: Create detailed product listings with photos, descriptions, and pricing
• Sales Analytics: Real-time tracking of orders, revenue, and customer metrics
• Trend Analysis: AI-powered insights into market trends and popular designs
• Buyer Matching: Connect with customers based on their preferences and your specialties
• Business Guidance: Personalized advice on pricing strategies, marketing, and business growth

**Advanced Capabilities:**
• Voice interaction for hands-free operation
• Multilingual support for global market reach
• Inventory management and stock tracking
• Financial planning and forecasting tools
• Integration with major e-commerce platforms

I adapt my responses to your communication style and provide information at your preferred level of detail. What aspect of your business would you like to explore first?`
        });

        this.responseTemplates.set('help_formal', {
            content: `I am equipped to provide assistance across several key areas of your artisan enterprise:

• Product catalog management and optimization
• Sales performance analysis and reporting
• Market trend identification and analysis
• Customer acquisition and relationship management
• Strategic business development guidance

Please specify which area requires your immediate attention.`,
            briefContent: 'I provide business assistance in products, sales, trends, customers, and strategy.',
            comprehensiveContent: `I am designed to serve as your comprehensive business assistant for artisan enterprises. My capabilities encompass:

**Primary Functions:**
• Product Portfolio Management: Systematic organization and optimization of your craft inventory
• Revenue Analytics: Detailed financial performance tracking and trend analysis
• Market Intelligence: Data-driven insights into consumer preferences and market opportunities
• Customer Relationship Management: Strategic approaches to client acquisition and retention
• Business Development: Professional guidance on scaling and operational efficiency

**Technical Specifications:**
• Multi-modal interaction supporting both text and voice input
• Cross-platform integration capabilities
• Real-time data processing and analysis
• Customizable reporting and dashboard functionality

Please indicate your priority area for immediate consultation.`
        });

        this.responseTemplates.set('help_casual', {
            content: `Hey! I'm here to make your artisan life easier. Here's what I can do:

• **Products**: Help you create awesome listings and manage your inventory
• **Sales**: Keep track of how you're doing money-wise
• **Trends**: Show you what's hot and what people are buying
• **Customers**: Help you find the right buyers for your stuff
• **Business Tips**: Share ideas to grow your craft business

What sounds interesting to you?`,
            briefContent: 'I help with products, sales, trends, customers, and business tips. What\'s up?',
            comprehensiveContent: `Hey there! I'm your go-to buddy for everything artisan business related. Here's the full scoop on what we can do together:

**The Fun Stuff:**
• Product Creation: Make your crafts shine with great photos and descriptions
• Sales Tracking: See how much you're making and celebrate those wins!
• Trend Spotting: Find out what's trending so you can ride the wave
• Customer Matching: Connect with people who'll love your work
• Business Growth: Tips and tricks to take your craft to the next level

**Cool Features:**
• Talk to me with your voice while you're crafting
• I speak multiple languages for international sales
• Keep track of your inventory so you never run out
• Plan your finances and see where you're headed
• Connect with online marketplaces easily

I'll chat with you however you like - formal, casual, or super technical. Plus, I can give you quick answers or dive deep into the details. What do you want to explore first?`
        });

        this.responseTemplates.set('help_technical', {
            content: `System capabilities include the following modules:

• **Product Management API**: CRUD operations for inventory and catalog management
• **Analytics Engine**: Real-time data processing for sales metrics and KPIs
• **Trend Analysis Algorithm**: Machine learning-based market trend identification
• **Matching System**: Customer-artisan compatibility scoring and recommendations
• **Business Intelligence**: Strategic planning tools and performance optimization

Specify your required functionality for detailed implementation guidance.`,
            briefContent: 'Available modules: Product API, Analytics, Trend ML, Matching System, Business Intelligence.',
            comprehensiveContent: `Enhanced Artisan Buddy System Architecture Overview:

**Core Modules:**
• Product Management API: RESTful endpoints for inventory CRUD operations, image processing, and metadata management
• Analytics Engine: Real-time stream processing for sales data, customer behavior analysis, and performance metrics calculation
• Trend Analysis System: Machine learning pipeline using collaborative filtering and market sentiment analysis
• Customer Matching Algorithm: Multi-factor scoring system based on preference vectors and behavioral patterns
• Business Intelligence Suite: Predictive modeling for revenue forecasting and strategic planning tools

**Technical Stack:**
• Frontend: React with TypeScript for type-safe component development
• Backend: Node.js with Express framework and microservices architecture
• Database: Vector database for semantic search, Redis for caching, MongoDB for document storage
• AI/ML: Integration with Google Gemini AI, custom embedding models for product similarity
• Infrastructure: Cloud-native deployment with auto-scaling and load balancing

**Integration Capabilities:**
• Voice Processing: Speech-to-Text and Text-to-Speech APIs with real-time streaming
• Multi-language Support: Translation services with context-aware localization
• E-commerce Platforms: API connectors for major marketplaces and payment processors
• Observability: Comprehensive logging, monitoring, and performance tracking

Select your target module for detailed API documentation and implementation specifications.`
        });
    }

    /**
     * Initialize fallback responses for error scenarios
     */
    private initializeFallbackResponses(): void {
        this.fallbackResponses.set('generation_error', {
            message: "I'm having trouble generating a response right now. Please try asking your question again.",
            formalMessage: "I apologize, but I am currently experiencing difficulties processing your request. Please rephrase your inquiry.",
            casualMessage: "Oops! Something went wrong on my end. Mind trying that again?",
            suggestions: [
                "Try rephrasing your question",
                "Check if you're asking about a supported topic",
                "Wait a moment and try again"
            ]
        });

        this.fallbackResponses.set('voice_processing_error', {
            message: "I couldn't process your voice message clearly. Please try speaking again or use text input.",
            formalMessage: "I was unable to process your voice input successfully. Please consider using text input or speaking more clearly.",
            casualMessage: "Sorry, I didn't catch that! Try speaking again or just type it out.",
            suggestions: [
                "Speak more slowly and clearly",
                "Reduce background noise",
                "Use text input instead",
                "Check your microphone settings"
            ]
        });

        this.fallbackResponses.set('profile_not_found', {
            message: "I don't have your profile information yet. Let me help you set it up so I can provide better assistance.",
            formalMessage: "Your artisan profile has not been configured. I recommend completing your profile setup for personalized assistance.",
            casualMessage: "Looks like you haven't set up your profile yet! Let's get that sorted so I can help you better.",
            suggestions: [
                "Complete your artisan profile",
                "Add your skills and specialties",
                "Upload photos of your work",
                "Set your business preferences"
            ]
        });

        this.fallbackResponses.set('service_unavailable', {
            message: "Some of my services are temporarily unavailable. I can still help with basic questions and guidance.",
            formalMessage: "Certain system components are currently offline. Basic functionality remains available for your assistance.",
            casualMessage: "Some features are taking a break right now, but I can still help with the basics!",
            suggestions: [
                "Try basic questions about your craft",
                "Ask for general business advice",
                "Check back later for full functionality",
                "Contact support if the issue persists"
            ]
        });

        this.fallbackResponses.set('default', {
            message: "I encountered an unexpected issue. Please try again or contact support if the problem continues.",
            formalMessage: "An unexpected error has occurred. Please retry your request or contact technical support.",
            casualMessage: "Something unexpected happened! Give it another shot or let us know if it keeps happening.",
            suggestions: [
                "Try your request again",
                "Restart the application",
                "Contact customer support",
                "Check your internet connection"
            ]
        });
    }
}

// Supporting interfaces
interface ResponseTemplate {
    content: string;
    briefContent?: string;
    comprehensiveContent?: string;
}

interface FallbackResponse {
    message: string;
    formalMessage?: string;
    casualMessage?: string;
    suggestions: string[];
}