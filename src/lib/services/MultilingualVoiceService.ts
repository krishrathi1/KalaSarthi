/**
 * Multilingual Voice Service
 * Handles language configuration, detection, and switching for voice navigation
 */

import { LanguageCode } from '@/lib/i18n';

export interface LanguageVoiceConfig {
    languageCode: string;
    voiceName: string;
    gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    speechRate: number;
    pitch: number;
    sttModel: string;
    ttsModel: string;
    region: string;
    isSupported: boolean;
}

export interface MultilingualNavigationPatterns {
    [language: string]: {
        navigationCommands: Record<string, string[]>;
        confirmationPhrases: string[];
        errorMessages: string[];
        feedbackTemplates: Record<string, string>;
        culturalVariations: Record<string, string[]>;
    };
}

export interface VoiceNavigationLanguageConfig {
    primaryLanguages: string[];
    fallbackLanguage: string;
    autoDetectLanguage: boolean;
    languageConfigs: Record<string, LanguageVoiceConfig>;
    navigationPatterns: MultilingualNavigationPatterns;
    supportedRegions: string[];
}

export class MultilingualVoiceService {
    private static instance: MultilingualVoiceService;
    private config: VoiceNavigationLanguageConfig;
    private currentLanguage: string = 'en-US';
    private detectedLanguages: Map<string, number> = new Map(); // confidence scores
    private languagePreferences: Map<string, string> = new Map(); // user preferences

    private constructor() {
        this.config = this.getDefaultLanguageConfig();
        this.loadUserPreferences();
    }

    public static getInstance(): MultilingualVoiceService {
        if (!MultilingualVoiceService.instance) {
            MultilingualVoiceService.instance = new MultilingualVoiceService();
        }
        return MultilingualVoiceService.instance;
    }

    /**
     * Get default language configuration with comprehensive Indian language support
     */
    private getDefaultLanguageConfig(): VoiceNavigationLanguageConfig {
        return {
            primaryLanguages: [
                'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN',
                'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
            ],
            fallbackLanguage: 'en-US',
            autoDetectLanguage: true,
            supportedRegions: ['IN', 'US', 'GB'],
            languageConfigs: {
                'en-US': {
                    languageCode: 'en-US',
                    voiceName: 'en-US-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 1.0,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'US',
                    isSupported: true
                },
                'hi-IN': {
                    languageCode: 'hi-IN',
                    voiceName: 'hi-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'bn-IN': {
                    languageCode: 'bn-IN',
                    voiceName: 'bn-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'ta-IN': {
                    languageCode: 'ta-IN',
                    voiceName: 'ta-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'te-IN': {
                    languageCode: 'te-IN',
                    voiceName: 'te-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'mr-IN': {
                    languageCode: 'mr-IN',
                    voiceName: 'mr-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'gu-IN': {
                    languageCode: 'gu-IN',
                    voiceName: 'gu-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'kn-IN': {
                    languageCode: 'kn-IN',
                    voiceName: 'kn-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'ml-IN': {
                    languageCode: 'ml-IN',
                    voiceName: 'ml-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'pa-IN': {
                    languageCode: 'pa-IN',
                    voiceName: 'pa-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'or-IN': {
                    languageCode: 'or-IN',
                    voiceName: 'or-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                },
                'as-IN': {
                    languageCode: 'as-IN',
                    voiceName: 'as-IN-Standard-A',
                    gender: 'FEMALE',
                    speechRate: 0.9,
                    pitch: 0.0,
                    sttModel: 'latest_long',
                    ttsModel: 'standard',
                    region: 'IN',
                    isSupported: true
                }
            },
            navigationPatterns: this.getDefaultNavigationPatterns()
        };
    }

    /**
     * Get default navigation patterns for all supported languages
     */
    private getDefaultNavigationPatterns(): MultilingualNavigationPatterns {
        return {
            'en-US': {
                navigationCommands: {
                    'navigate_dashboard': ['go to dashboard', 'open dashboard', 'show dashboard', 'main page', 'home'],
                    'navigate_profile': ['go to profile', 'open profile', 'my profile', 'account', 'my account'],
                    'navigate_marketplace': ['go to marketplace', 'open marketplace', 'show marketplace', 'browse products', 'shop'],
                    'navigate_cart': ['go to cart', 'open cart', 'shopping cart', 'my cart', 'show cart'],
                    'navigate_wishlist': ['go to wishlist', 'open wishlist', 'show wishlist', 'saved items', 'favorites'],
                    'navigate_trends': ['go to trends', 'trend analysis', 'show trends', 'trend spotter'],
                    'navigate_finance': ['go to finance', 'financial dashboard', 'sales data', 'digital khata'],
                    'navigate_create_product': ['create product', 'add product', 'new product', 'product creator'],
                    'navigate_back': ['go back', 'previous page', 'back'],
                    'navigate_home': ['go home', 'home page', 'main screen']
                },
                confirmationPhrases: [
                    'Navigating to {destination}',
                    'Opening {destination}',
                    'Taking you to {destination}'
                ],
                errorMessages: [
                    'Sorry, I didn\'t understand that command',
                    'Command not recognized. Please try again',
                    'I couldn\'t find that page. Please try a different command'
                ],
                feedbackTemplates: {
                    'success': 'Successfully navigated to {destination}',
                    'error': 'Navigation failed. {error}',
                    'help': 'Available commands: {commands}'
                },
                culturalVariations: {
                    'polite_forms': ['please go to', 'could you open', 'would you show me'],
                    'casual_forms': ['take me to', 'show me', 'open up']
                }
            },
            'hi-IN': {
                navigationCommands: {
                    'navigate_dashboard': ['डैशबोर्ड पर जाएं', 'डैशबोर्ड खोलें', 'मुख्य पृष्ठ', 'होम'],
                    'navigate_profile': ['प्रोफाइल पर जाएं', 'मेरा प्रोफाइल', 'खाता', 'मेरा खाता'],
                    'navigate_marketplace': ['बाजार पर जाएं', 'मार्केटप्लेस', 'उत्पाद देखें', 'खरीदारी'],
                    'navigate_cart': ['कार्ट पर जाएं', 'शॉपिंग कार्ट', 'मेरा कार्ट'],
                    'navigate_wishlist': ['विशलिस्ट पर जाएं', 'पसंदीदा', 'सेव किए गए आइटम'],
                    'navigate_trends': ['ट्रेंड पर जाएं', 'ट्रेंड एनालिसिस', 'ट्रेंड स्पॉटर'],
                    'navigate_finance': ['वित्त पर जाएं', 'वित्तीय डैशबोर्ड', 'डिजिटल खाता'],
                    'navigate_create_product': ['उत्पाद बनाएं', 'नया उत्पाद', 'प्रोडक्ट क्रिएटर'],
                    'navigate_back': ['वापस जाएं', 'पिछला पृष्ठ'],
                    'navigate_home': ['होम जाएं', 'मुख्य स्क्रीन']
                },
                confirmationPhrases: [
                    '{destination} पर जा रहे हैं',
                    '{destination} खोल रहे हैं',
                    'आपको {destination} ले जा रहे हैं'
                ],
                errorMessages: [
                    'माफ करें, मैं वह कमांड समझ नहीं पाया',
                    'कमांड पहचान नहीं पाया। कृपया फिर से कोशिश करें',
                    'मुझे वह पृष्ठ नहीं मिला। कृपया दूसरा कमांड आजमाएं'
                ],
                feedbackTemplates: {
                    'success': 'सफलतापूर्वक {destination} पर पहुंच गए',
                    'error': 'नेवीगेशन असफल। {error}',
                    'help': 'उपलब्ध कमांड: {commands}'
                },
                culturalVariations: {
                    'polite_forms': ['कृपया जाएं', 'कृपया खोलें', 'कृपया दिखाएं'],
                    'casual_forms': ['ले चलो', 'दिखाओ', 'खोलो']
                }
            },
            'ta-IN': {
                navigationCommands: {
                    'navigate_dashboard': ['டாஷ்போர்டுக்கு செல்லுங்கள்', 'டாஷ்போர்டு திறக்கவும்', 'முதன்மை பக்கம்', 'வீடு'],
                    'navigate_profile': ['சுயவிவரத்திற்கு செல்லுங்கள்', 'என் சுயவிவரம்', 'கணக்கு'],
                    'navigate_marketplace': ['சந்தைக்கு செல்லுங்கள்', 'மார்க்கெட்பிளேஸ்', 'தயாரிப்புகளைப் பார்க்கவும்'],
                    'navigate_cart': ['கார்ட்டுக்கு செல்லுங்கள்', 'ஷாப்பிங் கார்ட்', 'என் கார்ட்'],
                    'navigate_wishlist': ['விஷ்லிஸ்ட்டுக்கு செல்லுங்கள்', 'பிடித்தவை', 'சேமித்த பொருட்கள்'],
                    'navigate_trends': ['ட்ரெண்டுக்கு செல்லுங்கள்', 'ட்ரெண்ட் பகுப்பாய்வு'],
                    'navigate_finance': ['நிதிக்கு செல்லுங்கள்', 'நிதி டாஷ்போர்டு', 'டிஜிட்டல் காதா'],
                    'navigate_create_product': ['தயாரிப்பு உருவாக்கவும்', 'புதிய தயாரிப்பு'],
                    'navigate_back': ['திரும்பிச் செல்லுங்கள்', 'முந்தைய பக்கம்'],
                    'navigate_home': ['வீட்டிற்கு செல்லுங்கள்', 'முதன்மை திரை']
                },
                confirmationPhrases: [
                    '{destination} க்கு செல்கிறோம்',
                    '{destination} ஐ திறக்கிறோம்',
                    'உங்களை {destination} க்கு அழைத்துச் செல்கிறோம்'
                ],
                errorMessages: [
                    'மன்னிக்கவும், அந்த கட்டளையை என்னால் புரிந்து கொள்ள முடியவில்லை',
                    'கட்டளை அடையாளம் காணப்படவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்',
                    'அந்த பக்கத்தை என்னால் கண்டுபிடிக்க முடியவில்லை'
                ],
                feedbackTemplates: {
                    'success': 'வெற்றிகரமாக {destination} க்கு சென்றோம்',
                    'error': 'வழிசெலுத்தல் தோல்வியடைந்தது। {error}',
                    'help': 'கிடைக்கும் கட்டளைகள்: {commands}'
                },
                culturalVariations: {
                    'polite_forms': ['தயவுசெய்து செல்லுங்கள்', 'தயவுசெய்து திறக்கவும்'],
                    'casual_forms': ['கொண்டு செல்', 'காட்டு', 'திற']
                }
            },
            'bn-IN': {
                navigationCommands: {
                    'navigate_dashboard': ['ড্যাশবোর্ডে যান', 'ড্যাশবোর্ড খুলুন', 'মূল পৃষ্ঠা', 'হোম'],
                    'navigate_profile': ['প্রোফাইলে যান', 'আমার প্রোফাইল', 'অ্যাকাউন্ট'],
                    'navigate_marketplace': ['মার্কেটপ্লেসে যান', 'বাজার', 'পণ্য দেখুন'],
                    'navigate_cart': ['কার্টে যান', 'শপিং কার্ট', 'আমার কার্ট'],
                    'navigate_wishlist': ['উইশলিস্টে যান', 'পছন্দের', 'সংরক্ষিত আইটেম'],
                    'navigate_trends': ['ট্রেন্ডে যান', 'ট্রেন্ড বিশ্লেষণ'],
                    'navigate_finance': ['ফিনান্সে যান', 'আর্থিক ড্যাশবোর্ড', 'ডিজিটাল খাতা'],
                    'navigate_create_product': ['পণ্য তৈরি করুন', 'নতুন পণ্য'],
                    'navigate_back': ['ফিরে যান', 'আগের পৃষ্ঠা'],
                    'navigate_home': ['হোমে যান', 'মূল স্ক্রিন']
                },
                confirmationPhrases: [
                    '{destination} এ যাচ্ছি',
                    '{destination} খুলছি',
                    'আপনাকে {destination} এ নিয়ে যাচ্ছি'
                ],
                errorMessages: [
                    'দুঃখিত, আমি সেই কমান্ডটি বুঝতে পারিনি',
                    'কমান্ড চিনতে পারিনি। অনুগ্রহ করে আবার চেষ্টা করুন',
                    'আমি সেই পৃষ্ঠাটি খুঁজে পাইনি'
                ],
                feedbackTemplates: {
                    'success': 'সফলভাবে {destination} এ পৌঁছেছি',
                    'error': 'নেভিগেশন ব্যর্থ। {error}',
                    'help': 'উপলব্ধ কমান্ড: {commands}'
                },
                culturalVariations: {
                    'polite_forms': ['অনুগ্রহ করে যান', 'অনুগ্রহ করে খুলুন'],
                    'casual_forms': ['নিয়ে চল', 'দেখাও', 'খোল']
                }
            },
            'te-IN': {
                navigationCommands: {
                    'navigate_dashboard': ['డాష్‌బోర్డ్‌కు వెళ్లండి', 'డాష్‌బోర్డ్ తెరవండి', 'ముఖ్య పేజీ', 'హోమ్'],
                    'navigate_profile': ['ప్రొఫైల్‌కు వెళ్లండి', 'నా ప్రొఫైల్', 'ఖాతా'],
                    'navigate_marketplace': ['మార్కెట్‌ప్లేస్‌కు వెళ్లండి', 'మార్కెట్', 'ఉత్పత్తులు చూడండి'],
                    'navigate_cart': ['కార్ట్‌కు వెళ్లండి', 'షాపింగ్ కార్ట్', 'నా కార్ట్'],
                    'navigate_wishlist': ['విష్‌లిస్ట్‌కు వెళ్లండి', 'ఇష్టమైనవి', 'సేవ్ చేసిన వస్తువులు'],
                    'navigate_trends': ['ట్రెండ్‌లకు వెళ్లండి', 'ట్రెండ్ విశ్లేషణ'],
                    'navigate_finance': ['ఫైనాన్స్‌కు వెళ్లండి', 'ఆర్థిక డాష్‌బోర్డ్', 'డిజిటల్ ఖాతా'],
                    'navigate_create_product': ['ఉత్పత్తి సృష్టించండి', 'కొత్త ఉత్పత్తి'],
                    'navigate_back': ['వెనక్కి వెళ్లండి', 'మునుపటి పేజీ'],
                    'navigate_home': ['హోమ్‌కు వెళ్లండి', 'ముఖ్య స్క్రీన్']
                },
                confirmationPhrases: [
                    '{destination} కు వెళ్తున్నాము',
                    '{destination} తెరుస్తున్నాము',
                    'మిమ్మల్ని {destination} కు తీసుకెళ్తున్నాము'
                ],
                errorMessages: [
                    'క్షమించండి, ఆ కమాండ్ నాకు అర్థం కాలేదు',
                    'కమాండ్ గుర్తించలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి',
                    'ఆ పేజీని నేను కనుగొనలేకపోయాను'
                ],
                feedbackTemplates: {
                    'success': 'విజయవంతంగా {destination} కు చేరుకున్నాము',
                    'error': 'నావిగేషన్ విఫలమైంది। {error}',
                    'help': 'అందుబాటులో ఉన్న కమాండ్‌లు: {commands}'
                },
                culturalVariations: {
                    'polite_forms': ['దయచేసి వెళ్లండి', 'దయచేసి తెరవండి'],
                    'casual_forms': ['తీసుకెళ్లు', 'చూపించు', 'తెరువు']
                }
            }
        };
    }

    /**
     * Load user language preferences from storage
     */
    private loadUserPreferences(): void {
        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('voice_navigation_language_preferences');
                if (stored) {
                    const preferences = JSON.parse(stored);
                    this.languagePreferences = new Map(Object.entries(preferences));
                }

                // Load current language from translation context or browser
                const currentLang = localStorage.getItem('preferred_language') ||
                    navigator.language ||
                    this.config.fallbackLanguage;

                this.setCurrentLanguage(this.mapToVoiceLanguage(currentLang));
            }
        } catch (error) {
            console.error('Failed to load language preferences:', error);
        }
    }

    /**
     * Save user language preferences to storage
     */
    private saveUserPreferences(): void {
        try {
            if (typeof window !== 'undefined') {
                const preferences = Object.fromEntries(this.languagePreferences);
                localStorage.setItem('voice_navigation_language_preferences', JSON.stringify(preferences));
            }
        } catch (error) {
            console.error('Failed to save language preferences:', error);
        }
    }

    /**
     * Map translation language codes to voice navigation language codes
     */
    private mapToVoiceLanguage(langCode: string): string {
        const mapping: Record<string, string> = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'bn': 'bn-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'pa': 'pa-IN',
            'or': 'or-IN',
            'as': 'as-IN'
        };

        // If already in full format, return as is
        if (langCode.includes('-')) {
            return this.config.languageConfigs[langCode] ? langCode : this.config.fallbackLanguage;
        }

        // Map short code to full code
        return mapping[langCode] || this.config.fallbackLanguage;
    }

    /**
     * Get current language configuration
     */
    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    /**
     * Set current language for voice navigation
     */
    public setCurrentLanguage(languageCode: string): boolean {
        const mappedLanguage = this.mapToVoiceLanguage(languageCode);

        if (!this.isLanguageSupported(mappedLanguage)) {
            console.warn(`Language ${mappedLanguage} not supported, falling back to ${this.config.fallbackLanguage}`);
            this.currentLanguage = this.config.fallbackLanguage;
            return false;
        }

        this.currentLanguage = mappedLanguage;
        this.saveUserPreferences();
        return true;
    }

    /**
     * Check if a language is supported
     */
    public isLanguageSupported(languageCode: string): boolean {
        const mappedLanguage = this.mapToVoiceLanguage(languageCode);
        return this.config.languageConfigs[mappedLanguage]?.isSupported || false;
    }

    /**
     * Get supported languages
     */
    public getSupportedLanguages(): string[] {
        return Object.keys(this.config.languageConfigs)
            .filter(lang => this.config.languageConfigs[lang].isSupported);
    }

    /**
     * Get language configuration for a specific language
     */
    public getLanguageConfig(languageCode?: string): LanguageVoiceConfig {
        const lang = languageCode || this.currentLanguage;
        const mappedLanguage = this.mapToVoiceLanguage(lang);

        return this.config.languageConfigs[mappedLanguage] ||
            this.config.languageConfigs[this.config.fallbackLanguage];
    }

    /**
     * Get navigation patterns for a specific language
     */
    public getNavigationPatterns(languageCode?: string): MultilingualNavigationPatterns[string] {
        const lang = languageCode || this.currentLanguage;
        const mappedLanguage = this.mapToVoiceLanguage(lang);

        return this.config.navigationPatterns[mappedLanguage] ||
            this.config.navigationPatterns[this.config.fallbackLanguage];
    }

    /**
     * Get navigation commands for a specific intent and language
     */
    public getNavigationCommands(intent: string, languageCode?: string): string[] {
        const patterns = this.getNavigationPatterns(languageCode);
        return patterns.navigationCommands[intent] || [];
    }

    /**
     * Get confirmation phrases for a language
     */
    public getConfirmationPhrases(languageCode?: string): string[] {
        const patterns = this.getNavigationPatterns(languageCode);
        return patterns.confirmationPhrases || [];
    }

    /**
     * Get error messages for a language
     */
    public getErrorMessages(languageCode?: string): string[] {
        const patterns = this.getNavigationPatterns(languageCode);
        return patterns.errorMessages || [];
    }

    /**
     * Get feedback template for a specific type and language
     */
    public getFeedbackTemplate(type: string, languageCode?: string): string {
        const patterns = this.getNavigationPatterns(languageCode);
        return patterns.feedbackTemplates[type] || '';
    }

    /**
     * Get cultural variations for a language
     */
    public getCulturalVariations(type: string, languageCode?: string): string[] {
        const patterns = this.getNavigationPatterns(languageCode);
        return patterns.culturalVariations[type] || [];
    }

    /**
     * Detect language from user input text
     */
    public detectLanguageFromText(text: string): {
        language: string;
        confidence: number;
        alternatives: Array<{ language: string; confidence: number }>;
    } {
        // Simple language detection based on character patterns
        const detectionResults: Array<{ language: string; confidence: number }> = [];

        // Check for Devanagari script (Hindi, Marathi)
        if (/[\u0900-\u097F]/.test(text)) {
            detectionResults.push({ language: 'hi-IN', confidence: 0.9 });
            detectionResults.push({ language: 'mr-IN', confidence: 0.7 });
        }

        // Check for Bengali script
        if (/[\u0980-\u09FF]/.test(text)) {
            detectionResults.push({ language: 'bn-IN', confidence: 0.9 });
            detectionResults.push({ language: 'as-IN', confidence: 0.7 });
        }

        // Check for Tamil script
        if (/[\u0B80-\u0BFF]/.test(text)) {
            detectionResults.push({ language: 'ta-IN', confidence: 0.9 });
        }

        // Check for Telugu script
        if (/[\u0C00-\u0C7F]/.test(text)) {
            detectionResults.push({ language: 'te-IN', confidence: 0.9 });
        }

        // Check for Gujarati script
        if (/[\u0A80-\u0AFF]/.test(text)) {
            detectionResults.push({ language: 'gu-IN', confidence: 0.9 });
        }

        // Check for Kannada script
        if (/[\u0C80-\u0CFF]/.test(text)) {
            detectionResults.push({ language: 'kn-IN', confidence: 0.9 });
        }

        // Check for Malayalam script
        if (/[\u0D00-\u0D7F]/.test(text)) {
            detectionResults.push({ language: 'ml-IN', confidence: 0.9 });
        }

        // Check for Gurmukhi script (Punjabi)
        if (/[\u0A00-\u0A7F]/.test(text)) {
            detectionResults.push({ language: 'pa-IN', confidence: 0.9 });
        }

        // Check for Odia script
        if (/[\u0B00-\u0B7F]/.test(text)) {
            detectionResults.push({ language: 'or-IN', confidence: 0.9 });
        }

        // Default to English if no script detected or Latin characters
        if (detectionResults.length === 0 || /^[a-zA-Z\s]+$/.test(text)) {
            detectionResults.push({ language: 'en-US', confidence: 0.8 });
        }

        // Sort by confidence
        detectionResults.sort((a, b) => b.confidence - a.confidence);

        return {
            language: detectionResults[0]?.language || this.config.fallbackLanguage,
            confidence: detectionResults[0]?.confidence || 0.5,
            alternatives: detectionResults.slice(1, 3)
        };
    }

    /**
     * Auto-detect language from user context
     */
    public autoDetectLanguage(): string {
        if (!this.config.autoDetectLanguage) {
            return this.currentLanguage;
        }

        try {
            // Check translation context first
            if (typeof window !== 'undefined') {
                const translationLang = localStorage.getItem('preferred_language');
                if (translationLang) {
                    const mappedLang = this.mapToVoiceLanguage(translationLang);
                    if (this.isLanguageSupported(mappedLang)) {
                        return mappedLang;
                    }
                }

                // Check browser language
                const browserLang = navigator.language;
                const mappedBrowserLang = this.mapToVoiceLanguage(browserLang);
                if (this.isLanguageSupported(mappedBrowserLang)) {
                    return mappedBrowserLang;
                }

                // Check user preferences
                const userPref = this.languagePreferences.get('default');
                if (userPref && this.isLanguageSupported(userPref)) {
                    return userPref;
                }
            }
        } catch (error) {
            console.error('Auto-detection failed:', error);
        }

        return this.config.fallbackLanguage;
    }

    /**
     * Set user language preference
     */
    public setUserLanguagePreference(userId: string, languageCode: string): void {
        const mappedLanguage = this.mapToVoiceLanguage(languageCode);
        if (this.isLanguageSupported(mappedLanguage)) {
            this.languagePreferences.set(userId, mappedLanguage);
            this.saveUserPreferences();
        }
    }

    /**
     * Get user language preference
     */
    public getUserLanguagePreference(userId: string): string | undefined {
        return this.languagePreferences.get(userId);
    }

    /**
     * Update language configuration
     */
    public updateLanguageConfig(languageCode: string, config: Partial<LanguageVoiceConfig>): void {
        const mappedLanguage = this.mapToVoiceLanguage(languageCode);
        if (this.config.languageConfigs[mappedLanguage]) {
            this.config.languageConfigs[mappedLanguage] = {
                ...this.config.languageConfigs[mappedLanguage],
                ...config
            };
        }
    }

    /**
     * Add new navigation patterns for a language
     */
    public addNavigationPatterns(languageCode: string, patterns: Partial<MultilingualNavigationPatterns[string]>): void {
        const mappedLanguage = this.mapToVoiceLanguage(languageCode);
        if (!this.config.navigationPatterns[mappedLanguage]) {
            this.config.navigationPatterns[mappedLanguage] = {
                navigationCommands: {},
                confirmationPhrases: [],
                errorMessages: [],
                feedbackTemplates: {},
                culturalVariations: {}
            };
        }

        const existing = this.config.navigationPatterns[mappedLanguage];
        this.config.navigationPatterns[mappedLanguage] = {
            navigationCommands: { ...existing.navigationCommands, ...patterns.navigationCommands },
            confirmationPhrases: patterns.confirmationPhrases || existing.confirmationPhrases,
            errorMessages: patterns.errorMessages || existing.errorMessages,
            feedbackTemplates: { ...existing.feedbackTemplates, ...patterns.feedbackTemplates },
            culturalVariations: { ...existing.culturalVariations, ...patterns.culturalVariations }
        };
    }

    /**
     * Get language display name
     */
    public getLanguageDisplayName(languageCode: string): string {
        const displayNames: Record<string, string> = {
            'en-US': 'English',
            'hi-IN': 'हिन्दी',
            'bn-IN': 'বাংলা',
            'ta-IN': 'தமிழ்',
            'te-IN': 'తెలుగు',
            'mr-IN': 'मराठी',
            'gu-IN': 'ગુજરાતી',
            'kn-IN': 'ಕನ್ನಡ',
            'ml-IN': 'മലയാളം',
            'pa-IN': 'ਪੰਜਾਬੀ',
            'or-IN': 'ଓଡ଼ିଆ',
            'as-IN': 'অসমীয়া'
        };

        const mappedLanguage = this.mapToVoiceLanguage(languageCode);
        return displayNames[mappedLanguage] || mappedLanguage;
    }

    /**
     * Get configuration for all languages
     */
    public getAllLanguageConfigs(): Record<string, LanguageVoiceConfig> {
        return { ...this.config.languageConfigs };
    }

    /**
     * Get all navigation patterns
     */
    public getAllNavigationPatterns(): MultilingualNavigationPatterns {
        return { ...this.config.navigationPatterns };
    }

    /**
     * Reset to default configuration
     */
    public resetToDefaults(): void {
        this.config = this.getDefaultLanguageConfig();
        this.currentLanguage = this.config.fallbackLanguage;
        this.languagePreferences.clear();
        this.saveUserPreferences();
    }
}