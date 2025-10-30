/**
 * Navigation Feedback Templates for Multilingual Voice Navigation
 * Provides structured templates for voice feedback in multiple languages
 */

export interface NavigationFeedbackTemplate {
  id: string;
  type: 'confirmation' | 'error' | 'navigation' | 'help' | 'retry';
  language: string;
  template: string;
  variables: string[];
  audioCache?: {
    url: string;
    expiresAt: Date;
  };
}

export interface LanguageVoiceConfig {
  languageCode: string;
  voiceName: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speechRate: number;
  pitch: number;
  sttModel: string;
}

export interface MultilingualNavigationPatterns {
  [language: string]: {
    navigationCommands: Record<string, string[]>;
    confirmationPhrases: string[];
    errorMessages: string[];
    feedbackTemplates: Record<string, string>;
  };
}

export class NavigationFeedbackTemplates {
  private static instance: NavigationFeedbackTemplates;
  private templates: Map<string, NavigationFeedbackTemplate[]> = new Map();
  private languageConfigs: Map<string, LanguageVoiceConfig> = new Map();
  private navigationPatterns: MultilingualNavigationPatterns = {};

  private constructor() {
    this.initializeTemplates();
    this.initializeLanguageConfigs();
    this.initializeNavigationPatterns();
  }

  public static getInstance(): NavigationFeedbackTemplates {
    if (!NavigationFeedbackTemplates.instance) {
      NavigationFeedbackTemplates.instance = new NavigationFeedbackTemplates();
    }
    return NavigationFeedbackTemplates.instance;
  }

  /**
   * Get feedback template by type and language
   */
  public getTemplate(
    type: NavigationFeedbackTemplate['type'],
    language: string,
    templateId?: string
  ): NavigationFeedbackTemplate | null {
    const languageTemplates = this.templates.get(language) || [];

    if (templateId) {
      return languageTemplates.find(t => t.id === templateId && t.type === type) || null;
    }

    // Return first template of the specified type
    return languageTemplates.find(t => t.type === type) || null;
  }

  /**
   * Render template with dynamic variables
   */
  public renderTemplate(
    template: NavigationFeedbackTemplate,
    variables: Record<string, string> = {}
  ): string {
    let rendered = template.template;

    template.variables.forEach(variable => {
      const value = variables[variable] || `{${variable}}`;
      rendered = rendered.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
    });

    return rendered;
  }

  /**
   * Get language-specific voice configuration
   */
  public getLanguageVoiceConfig(language: string): LanguageVoiceConfig | null {
    return this.languageConfigs.get(language) || null;
  }

  /**
   * Get all supported languages
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.languageConfigs.keys());
  }

  /**
   * Get navigation patterns for a language
   */
  public getNavigationPatterns(language: string): MultilingualNavigationPatterns[string] | null {
    return this.navigationPatterns[language] || null;
  }

  /**
   * Add or update a template
   */
  public addTemplate(template: NavigationFeedbackTemplate): void {
    const languageTemplates = this.templates.get(template.language) || [];
    const existingIndex = languageTemplates.findIndex(t => t.id === template.id);

    if (existingIndex >= 0) {
      languageTemplates[existingIndex] = template;
    } else {
      languageTemplates.push(template);
    }

    this.templates.set(template.language, languageTemplates);
  }

  /**
   * Initialize default templates for all supported languages
   */
  private initializeTemplates(): void {
    const languages = [
      'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN',
      'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN'
    ];

    languages.forEach(language => {
      this.initializeLanguageTemplates(language);
    });
  }
  /**
    * Initialize templates for a specific language
    */
  private initializeLanguageTemplates(language: string): void {
    const templates: NavigationFeedbackTemplate[] = [];

    // Confirmation templates
    templates.push({
      id: 'nav_confirmation',
      type: 'confirmation',
      language,
      template: this.getConfirmationTemplate(language),
      variables: ['destination']
    });

    templates.push({
      id: 'nav_success',
      type: 'confirmation',
      language,
      template: this.getSuccessTemplate(language),
      variables: ['destination']
    });

    // Error templates
    templates.push({
      id: 'nav_error_not_found',
      type: 'error',
      language,
      template: this.getNotFoundTemplate(language),
      variables: ['command']
    });

    templates.push({
      id: 'nav_error_access_denied',
      type: 'error',
      language,
      template: this.getAccessDeniedTemplate(language),
      variables: ['destination']
    });

    templates.push({
      id: 'nav_error_general',
      type: 'error',
      language,
      template: this.getGeneralErrorTemplate(language),
      variables: ['error']
    });

    // Navigation templates
    templates.push({
      id: 'nav_navigating',
      type: 'navigation',
      language,
      template: this.getNavigatingTemplate(language),
      variables: ['destination']
    });

    // Help templates
    templates.push({
      id: 'nav_help_commands',
      type: 'help',
      language,
      template: this.getHelpCommandsTemplate(language),
      variables: []
    });

    templates.push({
      id: 'nav_help_examples',
      type: 'help',
      language,
      template: this.getHelpExamplesTemplate(language),
      variables: []
    });

    // Retry templates
    templates.push({
      id: 'nav_retry_prompt',
      type: 'retry',
      language,
      template: this.getRetryPromptTemplate(language),
      variables: ['failedCommand', 'retryMessage']
    });

    templates.push({
      id: 'nav_retry_final_attempt',
      type: 'retry',
      language,
      template: this.getRetryFinalAttemptTemplate(language),
      variables: ['failedCommand', 'suggestions']
    });

    // Enhanced error templates
    templates.push({
      id: 'nav_error_network',
      type: 'error',
      language,
      template: this.getNetworkErrorTemplate(language),
      variables: []
    });

    templates.push({
      id: 'nav_error_service_unavailable',
      type: 'error',
      language,
      template: this.getServiceUnavailableTemplate(language),
      variables: []
    });

    templates.push({
      id: 'nav_error_with_suggestions',
      type: 'error',
      language,
      template: this.getErrorWithSuggestionsTemplate(language),
      variables: ['error', 'suggestions']
    });

    // Enhanced help templates
    templates.push({
      id: 'nav_help_admin_commands',
      type: 'help',
      language,
      template: this.getHelpAdminCommandsTemplate(language),
      variables: ['availableCommands']
    });

    this.templates.set(language, templates);
  }

  /**
   * Initialize language-specific voice configurations
   */
  private initializeLanguageConfigs(): void {
    const configs: LanguageVoiceConfig[] = [
      {
        languageCode: 'en-US',
        voiceName: 'en-US-Neural2-F',
        gender: 'FEMALE',
        speechRate: 1.0,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'hi-IN',
        voiceName: 'hi-IN-Neural2-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'bn-IN',
        voiceName: 'bn-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'ta-IN',
        voiceName: 'ta-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'te-IN',
        voiceName: 'te-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'mr-IN',
        voiceName: 'mr-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'gu-IN',
        voiceName: 'gu-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'kn-IN',
        voiceName: 'kn-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'ml-IN',
        voiceName: 'ml-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      },
      {
        languageCode: 'pa-IN',
        voiceName: 'pa-IN-Standard-A',
        gender: 'FEMALE',
        speechRate: 0.9,
        pitch: 0.0,
        sttModel: 'latest_long'
      }
    ];

    configs.forEach(config => {
      this.languageConfigs.set(config.languageCode, config);
    });
  }  /**

   * Initialize navigation patterns for all languages
   */
  private initializeNavigationPatterns(): void {
    // English patterns
    this.navigationPatterns['en-US'] = {
      navigationCommands: {
        dashboard: ['go to dashboard', 'open dashboard', 'show dashboard', 'main page'],
        profile: ['go to profile', 'open profile', 'my profile', 'account settings'],
        marketplace: ['go to marketplace', 'open marketplace', 'show products', 'browse items'],
        cart: ['go to cart', 'open cart', 'shopping cart', 'my cart'],
        wishlist: ['go to wishlist', 'open wishlist', 'saved items', 'favorites'],
        trends: ['go to trends', 'show trends', 'trend analysis', 'market trends'],
        finance: ['go to finance', 'financial dashboard', 'sales data', 'revenue'],
        'create-product': ['create product', 'add product', 'new product', 'add item'],
        back: ['go back', 'previous page', 'back'],
        home: ['go home', 'home page', 'main screen']
      },
      confirmationPhrases: [
        'Navigating to {destination}',
        'Opening {destination}',
        'Taking you to {destination}'
      ],
      errorMessages: [
        'Sorry, I could not find that page',
        'That command was not recognized',
        'Please try again with a different command'
      ],
      feedbackTemplates: {
        success: 'Successfully navigated to {destination}',
        error: 'Navigation failed: {error}',
        help: 'You can say commands like "go to dashboard" or "open profile"'
      }
    };

    // Hindi patterns
    this.navigationPatterns['hi-IN'] = {
      navigationCommands: {
        dashboard: ['डैशबोर्ड पर जाएं', 'डैशबोर्ड खोलें', 'मुख्य पृष्ठ'],
        profile: ['प्रोफाइल पर जाएं', 'प्रोफाइल खोलें', 'मेरा प्रोफाइल'],
        marketplace: ['बाज़ार पर जाएं', 'उत्पाद देखें', 'खरीदारी करें'],
        cart: ['कार्ट पर जाएं', 'शॉपिंग कार्ट', 'मेरा कार्ट'],
        wishlist: ['विशलिस्ट पर जाएं', 'पसंदीदा आइटम', 'सेव किए गए आइटम'],
        trends: ['ट्रेंड देखें', 'बाज़ार के रुझान', 'ट्रेंड एनालिसिस'],
        finance: ['वित्त डैशबोर्ड', 'बिक्री डेटा', 'आय'],
        'create-product': ['उत्पाद बनाएं', 'नया उत्पाद जोड़ें'],
        back: ['वापस जाएं', 'पिछला पृष्ठ'],
        home: ['होम पर जाएं', 'मुख्य स्क्रीन']
      },
      confirmationPhrases: [
        '{destination} पर जा रहे हैं',
        '{destination} खोल रहे हैं'
      ],
      errorMessages: [
        'माफ करें, वह पृष्ठ नहीं मिला',
        'वह कमांड समझ नहीं आया',
        'कृपया दूसरे कमांड के साथ कोशिश करें'
      ],
      feedbackTemplates: {
        success: '{destination} पर सफलतापूर्वक पहुंच गए',
        error: 'नेवीगेशन असफल: {error}',
        help: 'आप "डैशबोर्ड पर जाएं" या "प्रोफाइल खोलें" जैसे कमांड कह सकते हैं'
      }
    };

    // Add more language patterns
    this.addRegionalLanguagePatterns();
  }

  /**
   * Add patterns for other regional languages
   */
  private addRegionalLanguagePatterns(): void {
    // Bengali patterns
    this.navigationPatterns['bn-IN'] = {
      navigationCommands: {
        dashboard: ['ড্যাশবোর্ডে যান', 'ড্যাশবোর্ড খুলুন'],
        profile: ['প্রোফাইলে যান', 'আমার প্রোফাইল'],
        marketplace: ['বাজারে যান', 'পণ্য দেখুন'],
        cart: ['কার্টে যান', 'শপিং কার্ট'],
        back: ['ফিরে যান', 'আগের পাতা'],
        home: ['হোমে যান', 'মূল পাতা']
      },
      confirmationPhrases: ['{destination} এ যাচ্ছি'],
      errorMessages: ['দুঃখিত, সেই পাতা পাওয়া যায়নি'],
      feedbackTemplates: {
        success: '{destination} এ সফলভাবে পৌঁছেছি',
        error: 'নেভিগেশন ব্যর্থ: {error}',
        help: 'আপনি "ড্যাশবোর্ডে যান" বা "প্রোফাইল খুলুন" এর মতো কমান্ড বলতে পারেন'
      }
    };

    // Tamil patterns
    this.navigationPatterns['ta-IN'] = {
      navigationCommands: {
        dashboard: ['டாஷ்போர்டுக்கு செல்லுங்கள்', 'டாஷ்போர்டு திறக்கவும்'],
        profile: ['சுயவிவரத்திற்கு செல்லுங்கள்', 'என் சுயவிவரம்'],
        marketplace: ['சந்தைக்கு செல்லுங்கள்', 'பொருட்களைப் பார்க்கவும்'],
        cart: ['கார்ட்டுக்கு செல்லுங்கள்', 'ஷாப்பிங் கார்ட்'],
        back: ['திரும்பிச் செல்லுங்கள்', 'முந்தைய பக்கம்'],
        home: ['வீட்டிற்கு செல்லுங்கள்', 'முதன்மை திரை']
      },
      confirmationPhrases: ['{destination} க்கு செல்கிறோம்'],
      errorMessages: ['மன்னிக்கவும், அந்த பக்கம் கிடைக்கவில்லை'],
      feedbackTemplates: {
        success: '{destination} க்கு வெற்றிகரமாக சென்றோம்',
        error: 'வழிசெலுத்தல் தோல்வி: {error}',
        help: 'நீங்கள் "டாஷ்போர்டுக்கு செல்லுங்கள்" அல்லது "சுயவிவரம் திறக்கவும்" போன்ற கட்டளைகளைச் சொல்லலாம்'
      }
    };
  }
  /**

   * Template methods for generating language-specific feedback text
   */
  private getConfirmationTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Navigating to {destination}',
      'hi-IN': '{destination} पर जा रहे हैं',
      'bn-IN': '{destination} এ যাচ্ছি',
      'ta-IN': '{destination} க்கு செல்கிறோம்',
      'te-IN': '{destination} కు వెళ్తున్నాము',
      'mr-IN': '{destination} वर जात आहोत',
      'gu-IN': '{destination} પર જઈ રહ્યા છીએ',
      'kn-IN': '{destination} ಗೆ ಹೋಗುತ್ತಿದ್ದೇವೆ',
      'ml-IN': '{destination} ലേക്ക് പോകുന്നു',
      'pa-IN': '{destination} ਤੇ ਜਾ ਰਹੇ ਹਾਂ'
    };
    return templates[language] || templates['en-US'];
  }

  private getSuccessTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Successfully navigated to {destination}',
      'hi-IN': '{destination} पर सफलतापूर्वक पहुंच गए',
      'bn-IN': '{destination} এ সফলভাবে পৌঁছেছি',
      'ta-IN': '{destination} க்கு வெற்றிகரமாக சென்றோம்',
      'te-IN': '{destination} కు విజయవంతంగా చేరుకున్నాము',
      'mr-IN': '{destination} वर यशस्वीरित्या पोहोचलो',
      'gu-IN': '{destination} પર સફળતાપૂર્વક પહોંચ્યા',
      'kn-IN': '{destination} ಗೆ ಯಶಸ್ವಿಯಾಗಿ ತಲುಪಿದ್ದೇವೆ',
      'ml-IN': '{destination} ലേക്ക് വിജയകരമായി എത്തി',
      'pa-IN': '{destination} ਤੇ ਸਫਲਤਾਪੂਰਵਕ ਪਹੁੰਚ ਗਏ'
    };
    return templates[language] || templates['en-US'];
  }

  private getNotFoundTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Sorry, I could not find "{command}". Please try a different command.',
      'hi-IN': 'माफ करें, मुझे "{command}" नहीं मिला। कृपया दूसरा कमांड आज़माएं।',
      'bn-IN': 'দুঃখিত, আমি "{command}" খুঁজে পাইনি। অনুগ্রহ করে অন্য কমান্ড চেষ্টা করুন।',
      'ta-IN': 'மன்னிக்கவும், என்னால் "{command}" ஐ கண்டுபிடிக்க முடியவில்லை। வேறு கட்டளையை முயற்சிக்கவும்।',
      'te-IN': 'క్షమించండి, నేను "{command}" ని కనుగొనలేకపోయాను. దయచేసి వేరే కమాండ్ ప్రయత్నించండి।',
      'mr-IN': 'माफ करा, मला "{command}" सापडले नाही. कृपया दुसरा कमांड वापरून पहा.',
      'gu-IN': 'માફ કરશો, મને "{command}" મળ્યું નથી. કૃપા કરીને બીજો આદેશ અજમાવો.',
      'kn-IN': 'ಕ್ಷಮಿಸಿ, ನನಗೆ "{command}" ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೇರೆ ಆಜ್ಞೆಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.',
      'ml-IN': 'ക്ഷമിക്കണം, എനിക്ക് "{command}" കണ്ടെത്താൻ കഴിഞ്ഞില്ല. ദയവായി മറ്റൊരു കമാൻഡ് പരീക്ഷിക്കുക.',
      'pa-IN': 'ਮਾਫ਼ ਕਰੋ, ਮੈਨੂੰ "{command}" ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਕੋਈ ਹੋਰ ਕਮਾਂਡ ਅਜ਼ਮਾਓ।'
    };
    return templates[language] || templates['en-US'];
  }

  private getAccessDeniedTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Access denied to {destination}. You may not have permission to view this page.',
      'hi-IN': '{destination} तक पहुंच अस्वीकृत। आपको इस पृष्ठ को देखने की अनुमति नहीं हो सकती।',
      'bn-IN': '{destination} এ প্রবেশাধিকার অস্বীকৃত। এই পৃষ্ঠা দেখার অনুমতি আপনার নাও থাকতে পারে।',
      'ta-IN': '{destination} க்கு அணுகல் மறுக்கப்பட்டது. இந்த பக்கத்தைப் பார்க்க உங்களுக்கு அனுமதி இல்லாமல் இருக்கலாம்।',
      'te-IN': '{destination} కు యాక్సెస్ నిరాకరించబడింది. ఈ పేజీని చూడటానికి మీకు అనుమతి లేకపోవచ్చు.',
      'mr-IN': '{destination} वर प्रवेश नाकारला. तुम्हाला हे पान पाहण्याची परवानगी नसू शकते.',
      'gu-IN': '{destination} પર પ્રવેશ નકારવામાં આવ્યો. આ પૃષ્ઠ જોવાની તમને પરવાનગી ન હોઈ શકે.',
      'kn-IN': '{destination} ಗೆ ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಈ ಪುಟವನ್ನು ವೀಕ್ಷಿಸಲು ನಿಮಗೆ ಅನುಮತಿ ಇಲ್ಲದಿರಬಹುದು.',
      'ml-IN': '{destination} ലേക്കുള്ള പ്രവേശനം നിരസിച്ചു. ഈ പേജ് കാണാൻ നിങ്ങൾക്ക് അനുമതി ഇല്ലായിരിക്കാം.',
      'pa-IN': '{destination} ਤੱਕ ਪਹੁੰਚ ਇਨਕਾਰ। ਤੁਹਾਨੂੰ ਇਸ ਪੰਨੇ ਨੂੰ ਦੇਖਣ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਹੋ ਸਕਦੀ।'
    };
    return templates[language] || templates['en-US'];
  }

  private getGeneralErrorTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Navigation error: {error}. Please try again.',
      'hi-IN': 'नेवीगेशन त्रुटि: {error}। कृपया पुनः प्रयास करें।',
      'bn-IN': 'নেভিগেশন ত্রুটি: {error}। অনুগ্রহ করে আবার চেষ্টা করুন।',
      'ta-IN': 'வழிசெலுத்தல் பிழை: {error}। தயவுசெய்து மீண்டும் முயற்சிக்கவும்।',
      'te-IN': 'నావిగేషన్ లోపం: {error}. దయచేసి మళ్లీ ప్రయత్నించండి.',
      'mr-IN': 'नेव्हिगेशन त्रुटी: {error}. कृपया पुन्हा प्रयत्न करा.',
      'gu-IN': 'નેવિગેશન ભૂલ: {error}. કૃપા કરીને ફરી પ્રયાસ કરો.',
      'kn-IN': 'ನ್ಯಾವಿಗೇಶನ್ ದೋಷ: {error}. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      'ml-IN': 'നാവിഗേഷൻ പിശക്: {error}. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
      'pa-IN': 'ਨੈਵੀਗੇਸ਼ਨ ਗਲਤੀ: {error}। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
    };
    return templates[language] || templates['en-US'];
  }

  private getNavigatingTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Opening {destination}',
      'hi-IN': '{destination} खोल रहे हैं',
      'bn-IN': '{destination} খুলছি',
      'ta-IN': '{destination} ஐ திறக்கிறோம்',
      'te-IN': '{destination} ని తెరుస్తున్నాము',
      'mr-IN': '{destination} उघडत आहे',
      'gu-IN': '{destination} ખોલી રહ્યા છીએ',
      'kn-IN': '{destination} ಅನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇವೆ',
      'ml-IN': '{destination} തുറക്കുന്നു',
      'pa-IN': '{destination} ਖੋਲ੍ਹ ਰਹੇ ਹਾਂ'
    };
    return templates[language] || templates['en-US'];
  }

  private getHelpCommandsTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'You can say commands like "go to dashboard", "open profile", "show marketplace", or "go back".',
      'hi-IN': 'आप "डैशबोर्ड पर जाएं", "प्रोफाइल खोलें", "बाज़ार दिखाएं", या "वापस जाएं" जैसे कमांड कह सकते हैं।',
      'bn-IN': 'আপনি "ড্যাশবোর্ডে যান", "প্রোফাইল খুলুন", "বাজার দেখান", বা "ফিরে যান" এর মতো কমান্ড বলতে পারেন।',
      'ta-IN': 'நீங்கள் "டாஷ்போர்டுக்கு செல்லுங்கள்", "சுயவிவரம் திறக்கவும்", "சந்தையைக் காட்டு", அல்லது "திரும்பிச் செல்லுங்கள்" போன்ற கட்டளைகளைச் சொல்லலாம்।',
      'te-IN': 'మీరు "డాష్‌బోర్డ్‌కు వెళ్లండి", "ప్రొఫైల్ తెరవండి", "మార్కెట్‌ప్లేస్ చూపించండి", లేదా "వెనక్కి వెళ్లండి" వంటి కమాండ్‌లు చెప్పవచ్చు.',
      'mr-IN': 'तुम्ही "डॅशबोर्डवर जा", "प्रोफाइल उघडा", "मार्केटप्लेस दाखवा", किंवा "मागे जा" असे कमांड बोलू शकता.',
      'gu-IN': 'તમે "ડેશબોર્ડ પર જાઓ", "પ્રોફાઇલ ખોલો", "માર્કેટપ્લેસ બતાવો", અથવા "પાછા જાઓ" જેવા આદેશો કહી શકો છો.',
      'kn-IN': 'ನೀವು "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹೋಗಿ", "ಪ್ರೊಫೈಲ್ ತೆರೆಯಿರಿ", "ಮಾರುಕಟ್ಟೆ ತೋರಿಸಿ", ಅಥವಾ "ಹಿಂದಕ್ಕೆ ಹೋಗಿ" ಮುಂತಾದ ಆಜ್ಞೆಗಳನ್ನು ಹೇಳಬಹುದು.',
      'ml-IN': 'നിങ്ങൾക്ക് "ഡാഷ്‌ബോർഡിലേക്ക് പോകുക", "പ്രൊഫൈൽ തുറക്കുക", "മാർക്കറ്റ്‌പ്ലേസ് കാണിക്കുക", അല്ലെങ്കിൽ "തിരികെ പോകുക" പോലുള്ള കമാൻഡുകൾ പറയാം.',
      'pa-IN': 'ਤੁਸੀਂ "ਡੈਸ਼ਬੋਰਡ ਤੇ ਜਾਓ", "ਪ੍ਰੋਫਾਈਲ ਖੋਲ੍ਹੋ", "ਮਾਰਕੇਟਪਲੇਸ ਦਿਖਾਓ", ਜਾਂ "ਵਾਪਸ ਜਾਓ" ਵਰਗੇ ਕਮਾਂਡ ਕਹਿ ਸਕਦੇ ਹੋ।'
    };
    return templates[language] || templates['en-US'];
  }

  private getHelpExamplesTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Try saying: "Take me to my profile", "Show me the marketplace", or "Go to dashboard".',
      'hi-IN': 'कहने की कोशिश करें: "मुझे मेरे प्रोफाइल पर ले जाएं", "मुझे बाज़ार दिखाएं", या "डैशबोर्ड पर जाएं"।',
      'bn-IN': 'বলার চেষ্টা করুন: "আমাকে আমার প্রোফাইলে নিয়ে যান", "আমাকে বাজার দেখান", বা "ড্যাশবোর্ডে যান"।',
      'ta-IN': 'சொல்ல முயற்சிக்கவும்: "என்னை என் சுயவிவரத்திற்கு அழைத்துச் செல்லுங்கள்", "எனக்கு சந்தையைக் காட்டுங்கள்", அல்லது "டாஷ்போர்டுக்குச் செல்லுங்கள்"।',
      'te-IN': 'చెప్పడానికి ప్రయత్నించండి: "నన్ను నా ప్రొఫైల్‌కు తీసుకెళ్లండి", "నాకు మార్కెట్‌ప్లేస్ చూపించండి", లేదా "డాష్‌బోర్డ్‌కు వెళ్లండి"।',
      'mr-IN': 'म्हणण्याचा प्रयत्न करा: "मला माझ्या प्रोफाइलवर घेऊन जा", "मला मार्केटप्लेस दाखवा", किंवा "डॅशबोर्डवर जा"।',
      'gu-IN': 'કહેવાનો પ્રયાસ કરો: "મને મારી પ્રોફાઇલ પર લઈ જાઓ", "મને માર્કેટપ્લેસ બતાવો", અથવા "ડેશબોર્ડ પર જાઓ"।',
      'kn-IN': 'ಹೇಳಲು ಪ್ರಯತ್ನಿಸಿ: "ನನ್ನನ್ನು ನನ್ನ ಪ್ರೊಫೈಲ್‌ಗೆ ಕರೆದೊಯ್ಯಿ", "ನನಗೆ ಮಾರುಕಟ್ಟೆಯನ್ನು ತೋರಿಸಿ", ಅಥವಾ "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹೋಗಿ"।',
      'ml-IN': 'പറയാൻ ശ്രമിക്കുക: "എന്നെ എന്റെ പ്രൊഫൈലിലേക്ക് കൊണ്ടുപോകുക", "എനിക്ക് മാർക്കറ്റ്‌പ്ലേസ് കാണിക്കുക", അല്ലെങ്കിൽ "ഡാഷ്‌ബോർഡിലേക്ക് പോകുക"।',
      'pa-IN': 'ਕਹਿਣ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ: "ਮੈਨੂੰ ਮੇਰੇ ਪ੍ਰੋਫਾਈਲ ਤੇ ਲੈ ਜਾਓ", "ਮੈਨੂੰ ਮਾਰਕੇਟਪਲੇਸ ਦਿਖਾਓ", ਜਾਂ "ਡੈਸ਼ਬੋਰਡ ਤੇ ਜਾਓ"।'
    };
    return templates[language] || templates['en-US'];
  }

  private getRetryPromptTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'I didn\'t catch that. {retryMessage} Please try speaking more clearly or use a different command.',
      'hi-IN': 'मुझे समझ नहीं आया। {retryMessage} कृपया अधिक स्पष्ट रूप से बोलें या दूसरा कमांड उपयोग करें।',
      'bn-IN': 'আমি বুঝতে পারিনি। {retryMessage} অনুগ্রহ করে আরও স্পষ্টভাবে বলুন বা অন্য কমান্ড ব্যবহার করুন।',
      'ta-IN': 'எனக்குப் புரியவில்லை. {retryMessage} தயவுசெய்து இன்னும் தெளிவாகப் பேசுங்கள் அல்லது வேறு கட்டளையைப் பயன்படுத்துங்கள்.',
      'te-IN': 'నాకు అర్థం కాలేదు. {retryMessage} దయచేసి మరింత స్పష్టంగా మాట్లాడండి లేదా వేరే కమాండ్ ఉపయోగించండి.',
      'mr-IN': 'मला समजले नाही. {retryMessage} कृपया अधिक स्पष्टपणे बोला किंवा दुसरा कमांड वापरा.',
      'gu-IN': 'મને સમજાયું નહીં. {retryMessage} કૃપા કરીને વધુ સ્પષ્ટતાથી બોલો અથવા બીજો આદેશ વાપરો.',
      'kn-IN': 'ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. {retryMessage} ದಯವಿಟ್ಟು ಹೆಚ್ಚು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ ಅಥವಾ ಬೇರೆ ಆಜ್ಞೆಯನ್ನು ಬಳಸಿ.',
      'ml-IN': 'എനിക്ക് മനസ്സിലായില്ല. {retryMessage} ദയവായി കൂടുതൽ വ്യക്തമായി സംസാരിക്കുക അല്ലെങ്കിൽ മറ്റൊരു കമാൻഡ് ഉപയോഗിക്കുക.',
      'pa-IN': 'ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। {retryMessage} ਕਿਰਪਾ ਕਰਕੇ ਹੋਰ ਸਾਫ਼ ਬੋਲੋ ਜਾਂ ਕੋਈ ਹੋਰ ਕਮਾਂਡ ਵਰਤੋ।'
    };
    return templates[language] || templates['en-US'];
  }

  private getRetryFinalAttemptTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'This is your final attempt. Please try one of these commands: {suggestions}',
      'hi-IN': 'यह आपका अंतिम प्रयास है। कृपया इनमें से कोई कमांड आज़माएं: {suggestions}',
      'bn-IN': 'এটি আপনার চূড়ান্ত প্রচেষ্টা। অনুগ্রহ করে এই কমান্ডগুলির মধ্যে একটি চেষ্টা করুন: {suggestions}',
      'ta-IN': 'இது உங்கள் இறுதி முயற்சி. தயவுசெய்து இந்த கட்டளைகளில் ஒன்றை முயற்சிக்கவும்: {suggestions}',
      'te-IN': 'ఇది మీ చివరి ప్రయత్నం. దయచేసి ఈ కమాండ్‌లలో ఒకదాన్ని ప్రయత్నించండి: {suggestions}',
      'mr-IN': 'हा तुमचा शेवटचा प्रयत्न आहे. कृपया यापैकी एक कमांड वापरून पहा: {suggestions}',
      'gu-IN': 'આ તમારો અંતિમ પ્રયાસ છે. કૃપા કરીને આમાંથી કોઈ એક આદેશ અજમાવો: {suggestions}',
      'kn-IN': 'ಇದು ನಿಮ್ಮ ಅಂತಿಮ ಪ್ರಯತ್ನ. ದಯವಿಟ್ಟು ಈ ಆಜ್ಞೆಗಳಲ್ಲಿ ಒಂದನ್ನು ಪ್ರಯತ್ನಿಸಿ: {suggestions}',
      'ml-IN': 'ഇത് നിങ്ങളുടെ അവസാന ശ്രമമാണ്. ദയവായി ഈ കമാൻഡുകളിൽ ഒന്ന് പരീക്ഷിക്കുക: {suggestions}',
      'pa-IN': 'ਇਹ ਤੁਹਾਡਾ ਅੰਤਿਮ ਪ੍ਰਯਾਸ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੋਈ ਕਮਾਂਡ ਅਜ਼ਮਾਓ: {suggestions}'
    };
    return templates[language] || templates['en-US'];
  }

  private getNetworkErrorTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Network connection issue. Please check your internet connection and try again.',
      'hi-IN': 'नेटवर्क कनेक्शन की समस्या। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।',
      'bn-IN': 'নেটওয়ার্ক সংযোগ সমস্যা। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।',
      'ta-IN': 'நெட்வொர்க் இணைப்பு சிக்கல். தயவுசெய்து உங்கள் இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்।',
      'te-IN': 'నెట్‌వర్క్ కనెక్షన్ సమస్య. దయచేసి మీ ఇంటర్నెట్ కనెక్షన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి।',
      'mr-IN': 'नेटवर्क कनेक्शन समस्या. कृपया तुमचे इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
      'gu-IN': 'નેટવર્ક કનેક્શન સમસ્યા. કૃપા કરીને તમારું ઇન્ટરનેટ કનેક્શન તપાસો અને ફરી પ્રયાસ કરો.',
      'kn-IN': 'ನೆಟ್‌ವರ್ಕ್ ಸಂಪರ್ಕ ಸಮಸ್ಯೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      'ml-IN': 'നെറ്റ്‌വർക്ക് കണക്ഷൻ പ്രശ്നം. ദയവായി നിങ്ങളുടെ ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.',
      'pa-IN': 'ਨੈੱਟਵਰਕ ਕਨੈਕਸ਼ਨ ਸਮੱਸਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਇੰਟਰਨੈੱਟ ਕਨੈਕਸ਼ਨ ਚੈੱਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
    };
    return templates[language] || templates['en-US'];
  }

  private getServiceUnavailableTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Voice navigation service is temporarily unavailable. Please use manual navigation or try again later.',
      'hi-IN': 'वॉयस नेवीगेशन सेवा अस्थायी रूप से अनुपलब्ध है। कृपया मैन्युअल नेवीगेशन का उपयोग करें या बाद में पुनः प्रयास करें।',
      'bn-IN': 'ভয়েস নেভিগেশন সেবা সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে ম্যানুয়াল নেভিগেশন ব্যবহার করুন বা পরে আবার চেষ্টা করুন।',
      'ta-IN': 'குரல் வழிசெலுத்தல் சேவை தற்காலிகமாக கிடைக்கவில்லை. தயவுசெய்து கைமுறை வழிசெலுத்தலைப் பயன்படுத்துங்கள் அல்லது பின்னர் முயற்சிக்கவும்.',
      'te-IN': 'వాయిస్ నావిగేషన్ సేవ తాత్కాలికంగా అందుబాటులో లేదు. దయచేసి మాన్యువల్ నావిగేషన్ ఉపయోగించండి లేదా తర్వాత ప్రయత్నించండి.',
      'mr-IN': 'व्हॉइस नेव्हिगेशन सेवा तात्पुरती अनुपलब्ध आहे. कृपया मॅन्युअल नेव्हिगेशन वापरा किंवा नंतर प्रयत्न करा.',
      'gu-IN': 'વૉઇસ નેવિગેશન સેવા અસ્થાયી રૂપે અનુપલબ્ધ છે. કૃપા કરીને મેન્યુઅલ નેવિગેશન વાપરો અથવા પછીથી પ્રયાસ કરો.',
      'kn-IN': 'ಧ್ವನಿ ನ್ಯಾವಿಗೇಶನ್ ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಹಸ್ತಚಾಲಿತ ನ್ಯಾವಿಗೇಶನ್ ಬಳಸಿ ಅಥವಾ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.',
      'ml-IN': 'വോയ്‌സ് നാവിഗേഷൻ സേവനം താൽക്കാലികമായി ലഭ്യമല്ല. ദയവായി മാനുവൽ നാവിഗേഷൻ ഉപയോഗിക്കുക അല്ലെങ്കിൽ പിന്നീട് ശ്രമിക്കുക.',
      'pa-IN': 'ਵੌਇਸ ਨੈਵੀਗੇਸ਼ਨ ਸੇਵਾ ਅਸਥਾਈ ਤੌਰ ਤੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੁਅਲ ਨੈਵੀਗੇਸ਼ਨ ਵਰਤੋ ਜਾਂ ਬਾਅਦ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
    };
    return templates[language] || templates['en-US'];
  }

  private getErrorWithSuggestionsTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'Navigation error: {error}. {suggestions}',
      'hi-IN': 'नेवीगेशन त्रुटि: {error}। {suggestions}',
      'bn-IN': 'নেভিগেশন ত্রুটি: {error}। {suggestions}',
      'ta-IN': 'வழிசெலுத்தல் பிழை: {error}। {suggestions}',
      'te-IN': 'నావిగేషన్ లోపం: {error}. {suggestions}',
      'mr-IN': 'नेव्हिगेशन त्रुटी: {error}. {suggestions}',
      'gu-IN': 'નેવિગેશન ભૂલ: {error}. {suggestions}',
      'kn-IN': 'ನ್ಯಾವಿಗೇಶನ್ ದೋಷ: {error}. {suggestions}',
      'ml-IN': 'നാവിഗേഷൻ പിശക്: {error}. {suggestions}',
      'pa-IN': 'ਨੈਵੀਗੇਸ਼ਨ ਗਲਤੀ: {error}। {suggestions}'
    };
    return templates[language] || templates['en-US'];
  }

  private getHelpAdminCommandsTemplate(language: string): string {
    const templates: Record<string, string> = {
      'en-US': 'As an admin, you have access to additional commands: {availableCommands}. You can also use standard navigation commands.',
      'hi-IN': 'एक एडमिन के रूप में, आपके पास अतिरिक्त कमांड्स तक पहुंच है: {availableCommands}। आप मानक नेवीगेशन कमांड्स का भी उपयोग कर सकते हैं।',
      'bn-IN': 'একজন অ্যাডমিন হিসেবে, আপনার অতিরিক্ত কমান্ডের অ্যাক্সেস রয়েছে: {availableCommands}। আপনি স্ট্যান্ডার্ড নেভিগেশন কমান্ডও ব্যবহার করতে পারেন।',
      'ta-IN': 'ஒரு நிர்வாகியாக, உங்களுக்கு கூடுதல் கட்டளைகளுக்கான அணுகல் உள்ளது: {availableCommands}। நீங்கள் நிலையான வழிசெலுத்தல் கட்டளைகளையும் பயன்படுத்தலாம்.',
      'te-IN': 'అడ్మిన్‌గా, మీకు అదనపు కమాండ్‌లకు యాక్సెస్ ఉంది: {availableCommands}. మీరు ప్రామాణిక నావిగేషన్ కమాండ్‌లను కూడా ఉపయోగించవచ్చు.',
      'mr-IN': 'एक अॅडमिन म्हणून, तुम्हाला अतिरिक्त कमांड्सचा प्रवेश आहे: {availableCommands}. तुम्ही मानक नेव्हिगेशन कमांड्स देखील वापरू शकता.',
      'gu-IN': 'એક એડમિન તરીકે, તમારી પાસે વધારાના આદેશોની ઍક્સેસ છે: {availableCommands}. તમે પ્રમાણભૂત નેવિગેશન આદેશોનો પણ ઉપયોગ કરી શકો છો.',
      'kn-IN': 'ಒಬ್ಬ ನಿರ್ವಾಹಕರಾಗಿ, ನೀವು ಹೆಚ್ಚುವರಿ ಆಜ್ಞೆಗಳಿಗೆ ಪ್ರವೇಶವನ್ನು ಹೊಂದಿದ್ದೀರಿ: {availableCommands}. ನೀವು ಪ್ರಮಾಣಿತ ನ್ಯಾವಿಗೇಶನ್ ಆಜ್ಞೆಗಳನ್ನು ಸಹ ಬಳಸಬಹುದು.',
      'ml-IN': 'ഒരു അഡ്മിൻ എന്ന നിലയിൽ, നിങ്ങൾക്ക് അധിക കമാൻഡുകളിലേക്ക് ആക്‌സസ് ഉണ്ട്: {availableCommands}. നിങ്ങൾക്ക് സ്റ്റാൻഡേർഡ് നാവിഗേഷൻ കമാൻഡുകളും ഉപയോഗിക്കാം.',
      'pa-IN': 'ਇੱਕ ਐਡਮਿਨ ਦੇ ਰੂਪ ਵਿੱਚ, ਤੁਹਾਡੇ ਕੋਲ ਵਾਧੂ ਕਮਾਂਡਾਂ ਤੱਕ ਪਹੁੰਚ ਹੈ: {availableCommands}। ਤੁਸੀਂ ਮਿਆਰੀ ਨੈਵੀਗੇਸ਼ਨ ਕਮਾਂਡਾਂ ਦੀ ਵਰਤੋਂ ਵੀ ਕਰ ਸਕਦੇ ਹੋ।'
    };
    return templates[language] || templates['en-US'];
  }
}