import { NavigationAction } from './VoiceNavigationService';

export interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: Date;
  language: string;
}

export interface CommandPattern {
  patterns: RegExp[];
  action: NavigationAction;
  keywords: string[];
  language: string;
}

export class VoiceCommandProcessor {
  private commandPatterns: CommandPattern[] = [];
  private languagePatterns: Map<string, CommandPattern[]> = new Map();

  constructor() {
    this.initializeCommandPatterns();
  }

  private initializeCommandPatterns(): void {
    // English patterns
    this.addLanguagePatterns('en', [
      // Navigation commands
      {
        patterns: [
          /\b(?:go to|navigate to|take me to|open)\s+(?:finance|financial|money|tracker|dashboard)\b/i,
          /\b(?:show me|display|view)\s+(?:finance|financial|money)\s+(?:page|section|tracker)\b/i,
          /\b(?:finance|financial|money)\s+(?:tracker|dashboard|page)\b/i
        ],
        action: { type: 'navigate', target: '/finance/dashboard', confidence: 0.9 },
        keywords: ['finance', 'financial', 'money', 'tracker', 'dashboard'],
        language: 'en'
      },
      {
        patterns: [
          /\b(?:go to|navigate to|take me to|open)\s+(?:marketplace|market|shop|shopping|products)\b/i,
          /\b(?:show me|display|view)\s+(?:products|marketplace|shop)\b/i
        ],
        action: { type: 'navigate', target: '/marketplace', confidence: 0.9 },
        keywords: ['marketplace', 'market', 'shop', 'shopping', 'products'],
        language: 'en'
      },
      {
        patterns: [
          /\b(?:go to|navigate to|take me to|open)\s+(?:profile|account|settings)\b/i,
          /\b(?:show me|display|view)\s+(?:my profile|my account|settings)\b/i
        ],
        action: { type: 'navigate', target: '/profile', confidence: 0.9 },
        keywords: ['profile', 'account', 'settings'],
        language: 'en'
      },
      {
        patterns: [
          /\b(?:go to|navigate to|take me to|open)\s+(?:home|main|dashboard|start)\b/i,
          /\b(?:take me|go)\s+(?:home|back to start)\b/i
        ],
        action: { type: 'navigate', target: '/', confidence: 0.9 },
        keywords: ['home', 'main', 'dashboard', 'start'],
        language: 'en'
      },
      {
        patterns: [
          /\b(?:go to|navigate to|take me to|open)\s+(?:loan|loans|credit|borrow)\b/i,
          /\b(?:show me|display|view)\s+(?:loan|loans)\s+(?:page|section|application)\b/i
        ],
        action: { type: 'navigate', target: '/loans', confidence: 0.9 },
        keywords: ['loan', 'loans', 'credit', 'borrow'],
        language: 'en'
      },
      {
        patterns: [
          /\b(?:go to|navigate to|take me to|open)\s+(?:trend|trends|trendspotter|analysis)\b/i,
          /\b(?:show me|display|view)\s+(?:trends|trend analysis)\b/i
        ],
        action: { type: 'navigate', target: '/trend-spotter', confidence: 0.9 },
        keywords: ['trend', 'trends', 'trendspotter', 'analysis'],
        language: 'en'
      },

      // Action commands
      {
        patterns: [
          /\b(?:search for|find|look for)\s+(.+)/i,
          /\b(?:show me|display)\s+(.+)/i
        ],
        action: { type: 'query', target: 'search', confidence: 0.8 },
        keywords: ['search', 'find', 'look', 'show', 'display'],
        language: 'en'
      },
      {
        patterns: [
          /\b(?:help|assist|support|what can you do)\b/i,
          /\b(?:how do I|what is|explain)\b/i
        ],
        action: { type: 'action', target: 'help', confidence: 0.9 },
        keywords: ['help', 'assist', 'support', 'what', 'how', 'explain'],
        language: 'en'
      }
    ]);

    // Hindi patterns
    this.addLanguagePatterns('hi', [
      {
        patterns: [
          /\b(?:जाओ|ले चलो|खोलो)\s+(?:फाइनेंस|वित्त|पैसे|ट्रैकर|डैशबोर्ड)\s+(?:पर|में)\b/i,
          /\b(?:दिखाओ|देखाओ)\s+(?:मुझे|मेरे)\s+(?:फाइनेंस|वित्त|पैसे)\s+(?:पेज|सेक्शन|ट्रैकर)\b/i,
          /\b(?:फाइनेंस|वित्त|पैसे)\s+(?:ट्रैकर|डैशबोर्ड|पेज)\b/i
        ],
        action: { type: 'navigate', target: '/finance/dashboard', confidence: 0.9 },
        keywords: ['फाइनेंस', 'वित्त', 'पैसे', 'ट्रैकर', 'डैशबोर्ड'],
        language: 'hi'
      },
      {
        patterns: [
          /\b(?:जाओ|ले चलो|खोलो)\s+(?:मार्केट|दुकान|खरीदारी|प्रोडक्ट्स)\s+(?:पर|में)\b/i,
          /\b(?:दिखाओ|देखाओ)\s+(?:मुझे|मेरे)\s+(?:प्रोडक्ट्स|मार्केट|दुकान)\b/i
        ],
        action: { type: 'navigate', target: '/marketplace', confidence: 0.9 },
        keywords: ['मार्केट', 'दुकान', 'खरीदारी', 'प्रोडक्ट्स'],
        language: 'hi'
      },
      {
        patterns: [
          /\b(?:जाओ|ले चलो|खोलो)\s+(?:प्रोफाइल|अकाउंट|सेटिंग्स)\s+(?:पर|में)\b/i,
          /\b(?:दिखाओ|देखाओ)\s+(?:मेरा|मेरी)\s+(?:प्रोफाइल|अकाउंट|सेटिंग्स)\b/i
        ],
        action: { type: 'navigate', target: '/profile', confidence: 0.9 },
        keywords: ['प्रोफाइल', 'अकाउंट', 'सेटिंग्स'],
        language: 'hi'
      },
      {
        patterns: [
          /\b(?:जाओ|ले चलो|खोलो)\s+(?:होम|मुख्य|डैशबोर्ड|शुरू)\s+(?:पर|में)\b/i,
          /\b(?:ले चलो|जाओ)\s+(?:होम|वापस)\b/i
        ],
        action: { type: 'navigate', target: '/', confidence: 0.9 },
        keywords: ['होम', 'मुख्य', 'डैशबोर्ड', 'शुरू'],
        language: 'hi'
      }
    ]);

    // Add more languages as needed...
  }

  private addLanguagePatterns(language: string, patterns: CommandPattern[]): void {
    if (!this.languagePatterns.has(language)) {
      this.languagePatterns.set(language, []);
    }
    this.languagePatterns.get(language)!.push(...patterns);
  }

  public async processCommand(command: VoiceCommand): Promise<NavigationAction | null> {
    const language = this.detectLanguage(command.language);
    const patterns = this.languagePatterns.get(language) || [];

    // Normalize the command text
    const normalizedCommand = this.normalizeText(command.command, language);

    console.log(`🎯 Processing command: "${normalizedCommand}" in ${language}`);

    // Find the best matching pattern
    let bestMatch: NavigationAction | null = null;
    let bestScore = 0;

    for (const pattern of patterns) {
      for (const regex of pattern.patterns) {
        const match = normalizedCommand.match(regex);
        if (match) {
          // Calculate confidence score based on regex match and original confidence
          const matchScore = this.calculateMatchScore(normalizedCommand, pattern, match);
          const finalScore = matchScore * command.confidence;

          if (finalScore > bestScore && finalScore > 0.6) { // Minimum confidence threshold
            bestMatch = { ...pattern.action, confidence: finalScore };
            bestScore = finalScore;

            // Extract parameters if needed
            if (match[1]) {
              bestMatch.params = { ...bestMatch.params, query: match[1].trim() };
            }
          }
        }
      }
    }

    return bestMatch;
  }

  private detectLanguage(languageCode: string): string {
    // Extract base language from language code (e.g., 'en-US' -> 'en')
    const baseLang = languageCode.split('-')[0].toLowerCase();

    // Map to our supported languages
    const languageMap: { [key: string]: string } = {
      'en': 'en',
      'hi': 'hi',
      'bn': 'hi', // Bengali -> Hindi patterns for now
      'te': 'hi', // Telugu -> Hindi patterns for now
      'mr': 'hi', // Marathi -> Hindi patterns for now
      'ta': 'hi', // Tamil -> Hindi patterns for now
      'gu': 'hi', // Gujarati -> Hindi patterns for now
      'kn': 'hi', // Kannada -> Hindi patterns for now
      'ml': 'hi', // Malayalam -> Hindi patterns for now
      'pa': 'hi', // Punjabi -> Hindi patterns for now
      'or': 'hi', // Odia -> Hindi patterns for now
      'as': 'hi'  // Assamese -> Hindi patterns for now
    };

    return languageMap[baseLang] || 'en';
  }

  private normalizeText(text: string, language: string): string {
    let normalized = text.toLowerCase().trim();

    // Language-specific normalization
    if (language === 'hi') {
      // Remove common Hindi fillers and normalize
      normalized = normalized
        .replace(/\s+/g, ' ')
        .replace(/[।॥]/g, '.') // Replace Hindi punctuation
        .replace(/[^\w\s\u0900-\u097F.]/g, ''); // Keep Hindi characters
    } else {
      // English normalization
      normalized = normalized.replace(/[^\w\s]/g, '');
    }

    return normalized;
  }

  private calculateMatchScore(text: string, pattern: CommandPattern, match: RegExpMatchArray): number {
    let score = 0.8; // Base score for regex match

    // Boost score for exact keyword matches
    const textWords = text.toLowerCase().split(/\s+/);
    const keywordMatches = pattern.keywords.filter(keyword =>
      textWords.some(word => word.includes(keyword.toLowerCase()))
    );

    if (keywordMatches.length > 0) {
      score += 0.1 * keywordMatches.length;
    }

    // Boost score for position (commands at start get higher score)
    if (textWords[0] && pattern.keywords.includes(textWords[0])) {
      score += 0.1;
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  public addCustomPattern(pattern: CommandPattern): void {
    this.addLanguagePatterns(pattern.language, [pattern]);
  }

  public getSupportedLanguages(): string[] {
    return Array.from(this.languagePatterns.keys());
  }

  public getPatternsForLanguage(language: string): CommandPattern[] {
    return this.languagePatterns.get(language) || [];
  }
}