/**
 * Google Cloud AI Services Integration
 * 
 * Provides wrappers for Google Cloud Translation, Vision, and Natural Language APIs
 */

import { v2 as translate } from '@google-cloud/translate';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { LanguageServiceClient } from '@google-cloud/language';

type TranslateClient = translate.Translate;
import {
  TranslationResult,
  LanguageDetection,
  ImageAnalysis,
  TextExtraction,
  Label,
  ColorInfo,
  DetectedObject,
  QualityAssessment,
  BoundingBox,
  RGB,
} from '@/lib/types/enhanced-artisan-buddy';

export class GoogleCloudAI {
  private static instance: GoogleCloudAI;
  private translateClient: TranslateClient | null = null;
  private visionClient: ImageAnnotatorClient | null = null;
  private languageClient: LanguageServiceClient | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): GoogleCloudAI {
    if (!GoogleCloudAI.instance) {
      GoogleCloudAI.instance = new GoogleCloudAI();
    }
    return GoogleCloudAI.instance;
  }

  /**
   * Initialize Google Cloud clients
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const credentials = {
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      };

      // Initialize Translation API client
      this.translateClient = new translate.Translate({
        credentials,
        projectId: credentials.project_id,
      });

      // Initialize Vision API client
      this.visionClient = new ImageAnnotatorClient({
        credentials,
        projectId: credentials.project_id,
      });

      // Initialize Natural Language API client
      this.languageClient = new LanguageServiceClient({
        credentials,
        projectId: credentials.project_id,
      });

      this.isInitialized = true;
      console.log('Google Cloud AI: Initialized successfully');
    } catch (error) {
      console.error('Google Cloud AI: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure clients are initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // ============================================================================
  // Translation API
  // ============================================================================

  /**
   * Translate text
   */
  public async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    await await this.ensureInitialized();

    try {
      const [translation] = await this.translateClient!.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
      });

      // Detect source language if not provided
      let detectedSource = sourceLanguage;
      if (!sourceLanguage) {
        const [detection] = await this.translateClient!.detect(text);
        detectedSource = Array.isArray(detection) ? detection[0].language : detection.language;
      }

      return {
        translatedText: translation,
        sourceLanguage: detectedSource || 'unknown',
        targetLanguage,
        confidence: 0.95, // Google Translate doesn't provide confidence scores
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Translation failed: ${error}`);
    }
  }

  /**
   * Batch translate multiple texts
   */
  public async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult[]> {
    await this.ensureInitialized();

    try {
      const [translations] = await this.translateClient!.translate(texts, {
        from: sourceLanguage,
        to: targetLanguage,
      });

      // Detect source language for first text if not provided
      let detectedSource = sourceLanguage;
      if (!sourceLanguage && texts.length > 0) {
        const [detection] = await this.translateClient!.detect(texts[0]);
        detectedSource = Array.isArray(detection) ? detection[0].language : detection.language;
      }

      return translations.map((translation) => ({
        translatedText: translation,
        sourceLanguage: detectedSource || 'unknown',
        targetLanguage,
        confidence: 0.95,
      }));
    } catch (error) {
      console.error('Batch translation error:', error);
      throw new Error(`Batch translation failed: ${error}`);
    }
  }

  /**
   * Detect language
   */
  public async detectLanguage(text: string): Promise<LanguageDetection> {
    await this.ensureInitialized();

    try {
      const [detections] = await this.translateClient!.detect(text);
      const detection = Array.isArray(detections) ? detections[0] : detections;

      return {
        language: detection.language,
        confidence: detection.confidence || 0.95,
        alternatives: [],
      };
    } catch (error) {
      console.error('Language detection error:', error);
      throw new Error(`Language detection failed: ${error}`);
    }
  }

  // ============================================================================
  // Vision API
  // ============================================================================

  /**
   * Analyze image
   */
  public async analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    await this.ensureInitialized();

    try {
      const [result] = await this.visionClient!.annotateImage({
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'IMAGE_PROPERTIES' },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        ],
      });

      // Extract labels
      const labels: Label[] = (result.labelAnnotations || []).map((label) => ({
        description: label.description || '',
        score: label.score || 0,
        topicality: label.topicality || 0,
      }));

      // Extract colors
      const colors: ColorInfo[] = (result.imagePropertiesAnnotation?.dominantColors?.colors || []).map((color) => ({
        color: {
          red: color.color?.red || 0,
          green: color.color?.green || 0,
          blue: color.color?.blue || 0,
        },
        score: color.score || 0,
        pixelFraction: color.pixelFraction || 0,
      }));

      // Extract objects
      const objects: DetectedObject[] = (result.localizedObjectAnnotations || []).map((obj) => ({
        name: obj.name || '',
        confidence: obj.score || 0,
        boundingBox: {
          x: obj.boundingPoly?.normalizedVertices?.[0]?.x || 0,
          y: obj.boundingPoly?.normalizedVertices?.[0]?.y || 0,
          width: (obj.boundingPoly?.normalizedVertices?.[2]?.x || 0) - (obj.boundingPoly?.normalizedVertices?.[0]?.x || 0),
          height: (obj.boundingPoly?.normalizedVertices?.[2]?.y || 0) - (obj.boundingPoly?.normalizedVertices?.[0]?.y || 0),
        },
      }));

      // Assess quality
      const quality = this.assessImageQuality(result);

      // Generate suggestions
      const suggestions = this.generateImageSuggestions(labels, colors, quality);

      return {
        labels,
        colors,
        objects,
        quality,
        suggestions,
      };
    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(`Image analysis failed: ${error}`);
    }
  }

  /**
   * Extract text from image (OCR)
   */
  public async extractText(imageUrl: string): Promise<TextExtraction> {
    await this.ensureInitialized();

    try {
      const [result] = await this.visionClient!.textDetection(imageUrl);
      const detections = result.textAnnotations || [];

      if (detections.length === 0) {
        return {
          text: '',
          language: 'unknown',
          confidence: 0,
          blocks: [],
        };
      }

      // First annotation contains full text
      const fullText = detections[0].description || '';

      // Detect language
      const languageDetection = await this.detectLanguage(fullText);

      // Extract individual text blocks
      const blocks = detections.slice(1).map((detection) => ({
        text: detection.description || '',
        boundingBox: {
          x: detection.boundingPoly?.vertices?.[0]?.x || 0,
          y: detection.boundingPoly?.vertices?.[0]?.y || 0,
          width: (detection.boundingPoly?.vertices?.[2]?.x || 0) - (detection.boundingPoly?.vertices?.[0]?.x || 0),
          height: (detection.boundingPoly?.vertices?.[2]?.y || 0) - (detection.boundingPoly?.vertices?.[0]?.y || 0),
        },
        confidence: 0.9, // Vision API doesn't provide per-block confidence
      }));

      return {
        text: fullText,
        language: languageDetection.language,
        confidence: languageDetection.confidence,
        blocks,
      };
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error(`Text extraction failed: ${error}`);
    }
  }

  /**
   * Assess image quality
   */
  private assessImageQuality(result: any): QualityAssessment {
    // Simple quality assessment based on available data
    const hasLabels = (result.labelAnnotations?.length || 0) > 0;
    const hasObjects = (result.localizedObjectAnnotations?.length || 0) > 0;
    const hasColors = (result.imagePropertiesAnnotation?.dominantColors?.colors?.length || 0) > 0;

    const sharpness = hasLabels && hasObjects ? 0.8 : 0.5;
    const brightness = hasColors ? 0.7 : 0.5;
    const composition = hasObjects ? 0.8 : 0.6;
    const overallScore = (sharpness + brightness + composition) / 3;

    const improvements: string[] = [];
    if (sharpness < 0.7) improvements.push('Improve image sharpness');
    if (brightness < 0.6) improvements.push('Adjust lighting');
    if (composition < 0.7) improvements.push('Center the subject better');

    return {
      sharpness,
      brightness,
      composition,
      overallScore,
      improvements,
    };
  }

  /**
   * Generate image suggestions
   */
  private generateImageSuggestions(labels: Label[], colors: ColorInfo[], quality: QualityAssessment): string[] {
    const suggestions: string[] = [];

    // Quality-based suggestions
    if (quality.overallScore < 0.7) {
      suggestions.push('Consider retaking the photo with better lighting and focus');
    }

    // Label-based suggestions
    const craftLabels = labels.filter((l) => 
      l.description.toLowerCase().includes('craft') ||
      l.description.toLowerCase().includes('art') ||
      l.description.toLowerCase().includes('pottery') ||
      l.description.toLowerCase().includes('textile')
    );

    if (craftLabels.length > 0) {
      suggestions.push(`Detected craft type: ${craftLabels[0].description}`);
    }

    // Color-based suggestions
    if (colors.length > 0) {
      const dominantColor = colors[0];
      suggestions.push(`Dominant color detected - consider highlighting this in your product description`);
    }

    return suggestions;
  }

  // ============================================================================
  // Natural Language API
  // ============================================================================

  /**
   * Analyze entities in text
   */
  public async analyzeEntities(text: string): Promise<any[]> {
    await this.ensureInitialized();

    try {
      const document = {
        content: text,
        type: 'PLAIN_TEXT' as const,
      };

      const [result] = await this.languageClient!.analyzeEntities({ document });
      return result.entities || [];
    } catch (error) {
      console.error('Entity analysis error:', error);
      throw new Error(`Entity analysis failed: ${error}`);
    }
  }

  /**
   * Analyze sentiment
   */
  public async analyzeSentiment(text: string): Promise<any> {
    await this.ensureInitialized();

    try {
      const document = {
        content: text,
        type: 'PLAIN_TEXT' as const,
      };

      const [result] = await this.languageClient!.analyzeSentiment({ document });
      return result.documentSentiment;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      throw new Error(`Sentiment analysis failed: ${error}`);
    }
  }

  /**
   * Analyze syntax
   */
  public async analyzeSyntax(text: string): Promise<any[]> {
    await this.ensureInitialized();

    try {
      const document = {
        content: text,
        type: 'PLAIN_TEXT' as const,
      };

      const [result] = await this.languageClient!.analyzeSyntax({ document });
      return result.tokens || [];
    } catch (error) {
      console.error('Syntax analysis error:', error);
      throw new Error(`Syntax analysis failed: ${error}`);
    }
  }
}

// Export singleton instance
export const googleCloudAI = GoogleCloudAI.getInstance();
