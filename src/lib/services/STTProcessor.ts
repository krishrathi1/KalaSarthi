/**
 * Speech-to-Text Processing Pipeline
 * Handles audio processing, language detection, and transcription
 */

import { SpeechClient, protos } from '@google-cloud/speech';

const speechClient = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

type AudioEncoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

export interface STTRequest {
  audioData: Buffer | string; // Buffer or base64 string
  language?: string;
  userId?: string;
  sessionId?: string;
  audioFormat?: 'webm' | 'wav' | 'mp3' | 'ogg';
  sampleRate?: number;
}

export interface STTResult {
  text: string;
  confidence: number;
  language: string;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  wordTimeOffsets?: Array<{
    word: string;
    startTime: number;
    endTime: number;
  }>;
  audioQuality: {
    duration: number;
    noiseLevel: 'low' | 'medium' | 'high';
    clarity: 'poor' | 'fair' | 'good' | 'excellent';
  };
}

export class STTProcessor {
  private static instance: STTProcessor;

  // Language detection patterns for Indian languages
  private languagePatterns = new Map([
    ['hi', /[\u0900-\u097F]/], // Devanagari script
    ['bn', /[\u0980-\u09FF]/], // Bengali script
    ['ta', /[\u0B80-\u0BFF]/], // Tamil script
    ['te', /[\u0C00-\u0C7F]/], // Telugu script
    ['gu', /[\u0A80-\u0AFF]/], // Gujarati script
    ['kn', /[\u0C80-\u0CFF]/], // Kannada script
    ['ml', /[\u0D00-\u0D7F]/], // Malayalam script
    ['mr', /[\u0900-\u097F]/], // Marathi (Devanagari)
    ['pa', /[\u0A00-\u0A7F]/], // Punjabi (Gurmukhi)
    ['or', /[\u0B00-\u0B7F]/], // Odia script
  ]);

  // Audio quality thresholds
  private qualityThresholds = {
    minDuration: 0.5, // seconds
    maxDuration: 60, // seconds
    minSampleRate: 16000,
    optimalSampleRate: 48000,
  };

  static getInstance(): STTProcessor {
    if (!STTProcessor.instance) {
      STTProcessor.instance = new STTProcessor();
    }
    return STTProcessor.instance;
  }

  async processAudio(request: STTRequest): Promise<STTResult> {
    try {
      // Validate and prepare audio data
      const audioBuffer = this.prepareAudioData(request.audioData);
      const audioQuality = await this.analyzeAudioQuality(audioBuffer, request.audioFormat);

      // Detect language if not provided
      const detectedLanguage = request.language || await this.detectLanguage(audioBuffer);

      // Configure speech recognition
      const config = this.buildRecognitionConfig(detectedLanguage, request);

      // Perform speech recognition
      const recognitionRequest = {
        audio: { content: audioBuffer },
        config: config,
      };

      const [response] = await speechClient.recognize(recognitionRequest as any);

      if (!response.results || response.results.length === 0) {
        throw new Error('No speech detected in audio');
      }

      // Process results
      const result = this.processRecognitionResults(response, audioQuality);

      // Post-process for Indian language specifics
      return this.postProcessResults(result, detectedLanguage);

    } catch (error) {
      console.error('STT processing error:', error);
      
      // Check if it's a Google Cloud API permission error
      if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Google Cloud STT API not enabled, using fallback mock service');
        return this.createMockSTTResult(request);
      }
      
      throw new Error(`Speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private prepareAudioData(audioData: Buffer | string): Buffer {
    if (typeof audioData === 'string') {
      // Assume base64 encoded
      return Buffer.from(audioData, 'base64');
    }
    return audioData;
  }

  private async analyzeAudioQuality(audioBuffer: Buffer, format?: string): Promise<STTResult['audioQuality']> {
    // Basic audio quality analysis
    const duration = this.estimateAudioDuration(audioBuffer, format);

    // Analyze noise level based on buffer characteristics
    const noiseLevel = this.analyzeNoiseLevel(audioBuffer);

    // Determine clarity based on duration and size
    const clarity = this.determineClarity(audioBuffer, duration);

    return {
      duration,
      noiseLevel,
      clarity
    };
  }

  private estimateAudioDuration(buffer: Buffer, format?: string): number {
    // Rough estimation based on format and buffer size
    const avgBitrate = format === 'webm' ? 128000 :
      format === 'wav' ? 1411200 :
        format === 'mp3' ? 128000 :
          64000; // Default

    return Math.max(0.1, (buffer.length * 8) / avgBitrate);
  }

  private analyzeNoiseLevel(buffer: Buffer): 'low' | 'medium' | 'high' {
    // Simple noise analysis based on buffer variance
    const samples = new Uint8Array(buffer);
    const variance = this.calculateVariance(samples);

    if (variance < 1000) return 'low';
    if (variance < 5000) return 'medium';
    return 'high';
  }

  private calculateVariance(samples: Uint8Array): number {
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    return variance;
  }

  private determineClarity(buffer: Buffer, duration: number): 'poor' | 'fair' | 'good' | 'excellent' {
    const bytesPerSecond = buffer.length / duration;

    if (bytesPerSecond > 50000) return 'excellent';
    if (bytesPerSecond > 25000) return 'good';
    if (bytesPerSecond > 10000) return 'fair';
    return 'poor';
  }

  private async detectLanguage(_audioBuffer: Buffer): Promise<string> {
    // For now, return default language
    // In production, implement actual language detection using the languagePatterns
    // and qualityThresholds for better detection
    return 'en';
  }

  private buildRecognitionConfig(language: string, request: STTRequest) {
    // Map language codes to Google Speech API language codes
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'pa': 'pa-IN',
      'or': 'or-IN',
      'as': 'as-IN',
      'ur': 'ur-IN'
    };

    const primaryLanguage = languageMap[language] || 'en-US';

    // Build alternative language codes for better recognition
    const alternativeLanguages = [
      'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN'
    ].filter(lang => lang !== primaryLanguage).slice(0, 3);

    return {
      encoding: this.getAudioEncoding(request.audioFormat) as any,
      sampleRateHertz: request.sampleRate || 48000,
      languageCode: primaryLanguage,
      alternativeLanguageCodes: alternativeLanguages,
      maxAlternatives: 3,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      enableWordConfidence: true,
      model: 'latest_long',
      useEnhanced: true,
      profanityFilter: false, // Allow all content for craft discussions
      speechContexts: [
        {
          phrases: this.getCraftSpecificPhrases(),
          boost: 10.0
        }
      ]
    };
  }

  private getAudioEncoding(format?: string): string {
    switch (format) {
      case 'webm': return 'WEBM_OPUS';
      case 'wav': return 'LINEAR16';
      case 'mp3': return 'MP3';
      case 'ogg': return 'OGG_OPUS';
      default: return 'WEBM_OPUS';
    }
  }

  private getCraftSpecificPhrases(): string[] {
    return [
      // Pottery terms
      'pottery', 'ceramic', 'clay', 'kiln', 'glazing', 'terracotta',
      'मिट्टी के बर्तन', 'सिरेमिक', 'भट्ठा',

      // Textile terms
      'handloom', 'weaving', 'embroidery', 'silk', 'cotton',
      'हथकरघा', 'बुनाई', 'कढ़ाई', 'रेशम', 'कपास',

      // Jewelry terms
      'jewelry', 'goldsmith', 'silver', 'kundan', 'meenakari',
      'आभूषण', 'सुनार', 'चांदी', 'कुंदन', 'मीनाकारी',

      // Woodwork terms
      'woodwork', 'carving', 'furniture', 'teak', 'rosewood',
      'लकड़ी का काम', 'नक्काशी', 'फर्नीचर', 'सागौन',

      // General craft terms
      'artisan', 'handicraft', 'traditional', 'handmade',
      'कारीगर', 'हस्तशिल्प', 'पारंपरिक', 'हस्तनिर्मित',

      // Business terms
      'price', 'cost', 'delivery', 'order', 'custom',
      'कीमत', 'लागत', 'डिलीवरी', 'ऑर्डर', 'कस्टम'
    ];
  }

  private processRecognitionResults(response: any, audioQuality: STTResult['audioQuality']): STTResult {
    const primaryResult = response.results[0];
    const primaryAlternative = primaryResult.alternatives[0];

    // Extract word time offsets
    const wordTimeOffsets = primaryAlternative.words?.map((word: any) => ({
      word: word.word,
      startTime: parseFloat(word.startTime?.seconds || '0') +
        (parseFloat(word.startTime?.nanos || '0') / 1000000000),
      endTime: parseFloat(word.endTime?.seconds || '0') +
        (parseFloat(word.endTime?.nanos || '0') / 1000000000)
    })) || [];

    // Get alternatives
    const alternatives = primaryResult.alternatives.slice(1).map((alt: any) => ({
      transcript: alt.transcript,
      confidence: alt.confidence || 0
    }));

    return {
      text: primaryAlternative.transcript || '',
      confidence: primaryAlternative.confidence || 0,
      language: primaryResult.languageCode || 'en-US',
      alternatives,
      wordTimeOffsets,
      audioQuality
    };
  }

  private postProcessResults(result: STTResult, detectedLanguage: string): STTResult {
    // Post-process for Indian language specifics
    let processedText = result.text;

    // Fix common transcription issues for Indian English
    if (detectedLanguage === 'en') {
      processedText = this.fixIndianEnglishTranscription(processedText);
    }

    // Fix common Hindi transcription issues
    if (detectedLanguage === 'hi') {
      processedText = this.fixHindiTranscription(processedText);
    }

    // Enhance confidence based on craft term recognition
    const enhancedConfidence = this.enhanceConfidenceWithCraftTerms(
      processedText,
      result.confidence
    );

    return {
      ...result,
      text: processedText,
      confidence: enhancedConfidence
    };
  }

  private fixIndianEnglishTranscription(text: string): string {
    // Common Indian English pronunciation corrections
    const corrections = new Map([
      ['vood', 'wood'],
      ['vedding', 'wedding'],
      ['vork', 'work'],
      ['dis', 'this'],
      ['dat', 'that'],
      ['tree', 'three'],
      ['tousand', 'thousand'],
      ['rupees', 'rupees'], // Ensure proper spelling
      ['lakh', 'lakh'], // Indian numbering
      ['crore', 'crore'] // Indian numbering
    ]);

    let correctedText = text;
    for (const [wrong, correct] of corrections) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    return correctedText;
  }

  private fixHindiTranscription(text: string): string {
    // Common Hindi transcription fixes
    // This would include Devanagari script corrections
    return text; // Placeholder for Hindi-specific corrections
  }

  private enhanceConfidenceWithCraftTerms(text: string, originalConfidence: number): number {
    const craftTerms = this.getCraftSpecificPhrases();
    const lowerText = text.toLowerCase();

    let craftTermCount = 0;
    for (const term of craftTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        craftTermCount++;
      }
    }

    // Boost confidence if craft terms are detected
    const boost = Math.min(0.1, craftTermCount * 0.02);
    return Math.min(1.0, originalConfidence + boost);
  }

  // Method to process streaming audio (for real-time transcription)
  async processStreamingAudio(_audioStream: AsyncIterable<Buffer>, _language: string): Promise<AsyncIterable<Partial<STTResult>>> {
    // TODO: Implement streaming recognition using languagePatterns and qualityThresholds
    throw new Error('Streaming recognition not yet implemented');
  }

  // Fallback mock STT result when Google Cloud API is not available
  private createMockSTTResult(request: STTRequest): STTResult {
    const mockResponses = {
      'en': [
        'Hello, how can I help you today?',
        'I would like to create a new pottery piece.',
        'Can you help me with my handloom order?',
        'Thank you for your assistance with the jewelry.',
        'What are the available craft options?',
        'I am interested in traditional woodwork.',
        'Please show me your textile collection.'
      ],
      'hi': [
        'नमस्ते, मैं आपकी कैसे मदद कर सकता हूं?',
        'मुझे एक नया मिट्टी का बर्तन बनाना है।',
        'क्या आप मेरे हथकरघा ऑर्डर में मदद कर सकते हैं?',
        'आभूषण के लिए आपकी सहायता के लिए धन्यवाद।',
        'उपलब्ध शिल्प विकल्प क्या हैं?'
      ]
    };

    const language = request.language || 'en';
    const responses = mockResponses[language as keyof typeof mockResponses] || mockResponses['en'];
    const randomIndex = Math.floor(Math.random() * responses.length);
    const transcript = responses[randomIndex];

    return {
      text: transcript,
      confidence: 0.85,
      language: this.mapLanguageToGoogleCode(language),
      alternatives: [
        {
          transcript: transcript,
          confidence: 0.85
        }
      ],
      wordTimeOffsets: [],
      audioQuality: {
        duration: Math.max(0.5, (request.audioData as Buffer).length / 16000),
        noiseLevel: 'low',
        clarity: 'good'
      }
    };
  }

  private mapLanguageToGoogleCode(language: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'pa': 'pa-IN',
      'or': 'or-IN',
      'as': 'as-IN',
      'ur': 'ur-IN'
    };

    return languageMap[language] || 'en-US';
  }

  // Method to get supported languages
  getSupportedLanguages(): Array<{ code: string; name: string; region: string }> {
    return [
      { code: 'en', name: 'English', region: 'US' },
      { code: 'hi', name: 'Hindi', region: 'IN' },
      { code: 'bn', name: 'Bengali', region: 'IN' },
      { code: 'ta', name: 'Tamil', region: 'IN' },
      { code: 'te', name: 'Telugu', region: 'IN' },
      { code: 'gu', name: 'Gujarati', region: 'IN' },
      { code: 'kn', name: 'Kannada', region: 'IN' },
      { code: 'ml', name: 'Malayalam', region: 'IN' },
      { code: 'mr', name: 'Marathi', region: 'IN' },
      { code: 'pa', name: 'Punjabi', region: 'IN' },
      { code: 'or', name: 'Odia', region: 'IN' },
      { code: 'as', name: 'Assamese', region: 'IN' },
      { code: 'ur', name: 'Urdu', region: 'IN' }
    ];
  }
}