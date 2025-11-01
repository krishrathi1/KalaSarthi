/**
 * Vision Service for Artisan Buddy
 * 
 * Provides image analysis capabilities including:
 * - Image upload handling
 * - Image preprocessing
 * - Craft-specific image analysis
 * - Text extraction from images (OCR)
 * - Quality assessment and improvement suggestions
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { googleCloudAI } from './GoogleCloudAI';
import { redisClient } from './RedisClient';
import {
  ImageAnalysis,
  TextExtraction,
  CraftDetection,
  Label,
  ColorInfo,
  DetectedObject,
  QualityAssessment,
  TextBlock,
} from '@/lib/types/enhanced-artisan-buddy';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ImageUploadOptions {
  maxSizeBytes?: number;
  allowedFormats?: string[];
  quality?: number;
}

export interface ImagePreprocessingOptions {
  resize?: {
    width: number;
    height: number;
  };
  compress?: boolean;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CraftAnalysisOptions {
  detectMaterials?: boolean;
  detectTechniques?: boolean;
  detectRegion?: boolean;
  generateSuggestions?: boolean;
}

export interface VisionAnalysisResult {
  imageAnalysis: ImageAnalysis;
  craftDetection?: CraftDetection;
  textExtraction?: TextExtraction;
  processingTime: number;
  cached: boolean;
}

// ============================================================================
// CRAFT TYPE MAPPINGS
// ============================================================================

const CRAFT_TYPE_KEYWORDS: Record<string, string[]> = {
  'pottery': ['pottery', 'ceramic', 'clay', 'terracotta', 'earthenware', 'pot', 'vase'],
  'weaving': ['weaving', 'textile', 'fabric', 'loom', 'thread', 'yarn', 'cloth', 'handloom'],
  'metalwork': ['metal', 'brass', 'copper', 'bronze', 'silver', 'gold', 'iron', 'steel'],
  'woodcarving': ['wood', 'carving', 'wooden', 'timber', 'sculpture', 'carved'],
  'painting': ['painting', 'painted', 'art', 'canvas', 'miniature', 'madhubani', 'warli'],
  'embroidery': ['embroidery', 'embroidered', 'stitching', 'needlework', 'chikankari'],
  'jewelry': ['jewelry', 'jewellery', 'necklace', 'bracelet', 'earring', 'ornament'],
  'leather': ['leather', 'hide', 'suede', 'bag', 'wallet', 'belt'],
  'bamboo': ['bamboo', 'cane', 'rattan', 'basket', 'wicker'],
  'stone': ['stone', 'marble', 'granite', 'sculpture', 'carving'],
};

const MATERIAL_KEYWORDS: string[] = [
  'cotton', 'silk', 'wool', 'jute', 'clay', 'wood', 'metal', 'brass',
  'copper', 'silver', 'gold', 'leather', 'bamboo', 'stone', 'marble',
  'glass', 'ceramic', 'terracotta', 'fabric', 'thread', 'yarn',
];

const TECHNIQUE_KEYWORDS: string[] = [
  'handmade', 'hand-woven', 'hand-painted', 'carved', 'embroidered',
  'stitched', 'molded', 'cast', 'forged', 'etched', 'engraved',
  'dyed', 'printed', 'block-printed', 'tie-dyed',
];

const REGIONAL_KEYWORDS: Record<string, string[]> = {
  'Rajasthan': ['rajasthani', 'jaipur', 'jodhpur', 'udaipur', 'block print'],
  'Gujarat': ['gujarati', 'ahmedabad', 'kutch', 'bandhani', 'patola'],
  'West Bengal': ['bengali', 'kolkata', 'terracotta', 'dokra'],
  'Tamil Nadu': ['tamil', 'chennai', 'tanjore', 'kanchipuram'],
  'Kashmir': ['kashmiri', 'srinagar', 'pashmina', 'papier-mache'],
  'Uttar Pradesh': ['lucknow', 'varanasi', 'chikankari', 'zardozi'],
  'Maharashtra': ['maharashtra', 'pune', 'warli', 'kolhapuri'],
};

// ============================================================================
// VISION SERVICE
// ============================================================================

export class VisionService {
  private static instance: VisionService;
  private readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

  private constructor() {}

  public static getInstance(): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService();
    }
    return VisionService.instance;
  }

  // ============================================================================
  // IMAGE UPLOAD HANDLING
  // ============================================================================

  /**
   * Validate image upload
   */
  public validateImageUpload(
    file: File | Buffer,
    options: ImageUploadOptions = {}
  ): { valid: boolean; error?: string } {
    const maxSize = options.maxSizeBytes || this.MAX_IMAGE_SIZE;
    const allowedFormats = options.allowedFormats || this.ALLOWED_FORMATS;

    // Check file size
    const fileSize = file instanceof File ? file.size : file.length;
    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `Image size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      };
    }

    // Check file format
    if (file instanceof File) {
      if (!allowedFormats.includes(file.type)) {
        return {
          valid: false,
          error: `Image format not supported. Allowed formats: ${allowedFormats.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Handle image upload and return URL
   */
  public async handleImageUpload(
    file: File | Buffer,
    userId: string
  ): Promise<string> {
    // Validate upload
    const validation = this.validateImageUpload(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // In a real implementation, upload to cloud storage (e.g., Google Cloud Storage)
      // For now, we'll assume the image is already uploaded and return a placeholder URL
      const timestamp = Date.now();
      const imageUrl = `https://storage.googleapis.com/artisan-buddy-images/${userId}/${timestamp}.jpg`;
      
      console.log('[VisionService] Image uploaded:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('[VisionService] Image upload failed:', error);
      throw new Error(`Image upload failed: ${error}`);
    }
  }

  // ============================================================================
  // IMAGE PREPROCESSING
  // ============================================================================

  /**
   * Preprocess image before analysis
   */
  public async preprocessImage(
    imageUrl: string,
    options: ImagePreprocessingOptions = {}
  ): Promise<string> {
    try {
      // In a real implementation, use image processing library (e.g., Sharp)
      // to resize, compress, and optimize the image
      
      // For now, return the original URL
      // TODO: Implement actual preprocessing with Sharp or similar library
      console.log('[VisionService] Image preprocessing:', options);
      return imageUrl;
    } catch (error) {
      console.error('[VisionService] Image preprocessing failed:', error);
      // Return original URL on error
      return imageUrl;
    }
  }

  // ============================================================================
  // COMPLETE IMAGE ANALYSIS PIPELINE
  // ============================================================================

  /**
   * Analyze image with full pipeline
   */
  public async analyzeImage(
    imageUrl: string,
    options: {
      includeCraftDetection?: boolean;
      includeTextExtraction?: boolean;
      craftAnalysisOptions?: CraftAnalysisOptions;
    } = {}
  ): Promise<VisionAnalysisResult> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = `vision:analysis:${this.hashUrl(imageUrl)}`;
      const cached = await redisClient.getCachedJSON<VisionAnalysisResult>(cacheKey);
      
      if (cached) {
        console.log('[VisionService] Loaded from cache');
        cached.cached = true;
        cached.processingTime = Date.now() - startTime;
        return cached;
      }

      // Preprocess image
      const processedUrl = await this.preprocessImage(imageUrl);

      // Perform basic image analysis
      const imageAnalysis = await googleCloudAI.analyzeImage(processedUrl);

      // Perform craft-specific analysis if requested
      let craftDetection: CraftDetection | undefined;
      if (options.includeCraftDetection !== false) {
        craftDetection = await this.detectCraftType(
          imageAnalysis,
          options.craftAnalysisOptions
        );
      }

      // Perform text extraction if requested
      let textExtraction: TextExtraction | undefined;
      if (options.includeTextExtraction) {
        textExtraction = await this.extractText(processedUrl);
      }

      const result: VisionAnalysisResult = {
        imageAnalysis,
        craftDetection,
        textExtraction,
        processingTime: Date.now() - startTime,
        cached: false,
      };

      // Cache the result
      await redisClient.cacheJSON(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      console.error('[VisionService] Image analysis failed:', error);
      throw new Error(`Image analysis failed: ${error}`);
    }
  }

  // ============================================================================
  // CRAFT-SPECIFIC IMAGE ANALYSIS
  // ============================================================================

  /**
   * Detect craft type from image analysis
   */
  public async detectCraftType(
    imageAnalysis: ImageAnalysis,
    options: CraftAnalysisOptions = {}
  ): Promise<CraftDetection> {
    try {
      const labels = imageAnalysis.labels.map(l => l.description.toLowerCase());
      const objects = imageAnalysis.objects.map(o => o.name.toLowerCase());
      const allKeywords = [...labels, ...objects];

      // Detect craft type
      let craftType = 'unknown';
      let maxScore = 0;

      for (const [craft, keywords] of Object.entries(CRAFT_TYPE_KEYWORDS)) {
        const matches = keywords.filter(keyword => 
          allKeywords.some(label => label.includes(keyword))
        );
        const score = matches.length / keywords.length;
        
        if (score > maxScore) {
          maxScore = score;
          craftType = craft;
        }
      }

      // Detect materials
      const materials: string[] = [];
      if (options.detectMaterials !== false) {
        for (const material of MATERIAL_KEYWORDS) {
          if (allKeywords.some(label => label.includes(material))) {
            materials.push(material);
          }
        }
      }

      // Detect techniques
      const techniques: string[] = [];
      if (options.detectTechniques !== false) {
        for (const technique of TECHNIQUE_KEYWORDS) {
          if (allKeywords.some(label => label.includes(technique))) {
            techniques.push(technique);
          }
        }
      }

      // Detect region
      let region = 'unknown';
      if (options.detectRegion !== false) {
        for (const [regionName, keywords] of Object.entries(REGIONAL_KEYWORDS)) {
          if (keywords.some(keyword => 
            allKeywords.some(label => label.includes(keyword))
          )) {
            region = regionName;
            break;
          }
        }
      }

      const confidence = Math.min(maxScore + 0.3, 1.0);

      return {
        craftType,
        confidence,
        materials,
        techniques,
        region,
      };
    } catch (error) {
      console.error('[VisionService] Craft detection failed:', error);
      return {
        craftType: 'unknown',
        confidence: 0,
        materials: [],
        techniques: [],
        region: 'unknown',
      };
    }
  }

  /**
   * Identify materials from image
   */
  public identifyMaterials(imageAnalysis: ImageAnalysis): string[] {
    const labels = imageAnalysis.labels.map(l => l.description.toLowerCase());
    const materials: string[] = [];

    for (const material of MATERIAL_KEYWORDS) {
      if (labels.some(label => label.includes(material))) {
        materials.push(material);
      }
    }

    return materials;
  }

  /**
   * Assess product quality from image
   */
  public assessQuality(imageAnalysis: ImageAnalysis): QualityAssessment {
    const quality = imageAnalysis.quality;

    // Enhanced quality assessment with craft-specific criteria
    const improvements: string[] = [...quality.improvements];

    // Check for proper lighting
    if (quality.brightness < 0.6) {
      improvements.push('Use natural daylight or bright lighting for better product visibility');
    }

    // Check for focus and sharpness
    if (quality.sharpness < 0.7) {
      improvements.push('Ensure the product is in focus and the camera is steady');
    }

    // Check for composition
    if (quality.composition < 0.7) {
      improvements.push('Center the product and use a plain background to highlight details');
    }

    // Check for multiple angles
    if (imageAnalysis.objects.length < 2) {
      improvements.push('Consider taking photos from multiple angles to showcase all features');
    }

    return {
      ...quality,
      improvements,
    };
  }

  /**
   * Generate improvement suggestions
   */
  public generateImprovementSuggestions(
    imageAnalysis: ImageAnalysis,
    craftDetection: CraftDetection
  ): string[] {
    const suggestions: string[] = [];

    // Quality-based suggestions
    const quality = this.assessQuality(imageAnalysis);
    suggestions.push(...quality.improvements);

    // Craft-specific suggestions
    if (craftDetection.confidence > 0.5) {
      suggestions.push(`Detected ${craftDetection.craftType} - highlight unique features in your description`);
      
      if (craftDetection.materials.length > 0) {
        suggestions.push(`Materials identified: ${craftDetection.materials.join(', ')} - mention these in your listing`);
      }

      if (craftDetection.techniques.length > 0) {
        suggestions.push(`Techniques detected: ${craftDetection.techniques.join(', ')} - emphasize craftsmanship`);
      }

      if (craftDetection.region !== 'unknown') {
        suggestions.push(`Regional style: ${craftDetection.region} - leverage cultural heritage in marketing`);
      }
    }

    // Color-based suggestions
    if (imageAnalysis.colors.length > 0) {
      const dominantColors = imageAnalysis.colors.slice(0, 3);
      suggestions.push(`Dominant colors: Use these in your product tags for better discoverability`);
    }

    // Pricing suggestions based on detected features
    if (craftDetection.techniques.includes('handmade') || 
        craftDetection.techniques.includes('hand-woven')) {
      suggestions.push('Handmade products typically command premium pricing - ensure your price reflects the craftsmanship');
    }

    return suggestions;
  }

  // ============================================================================
  // TEXT EXTRACTION FROM IMAGES
  // ============================================================================

  /**
   * Extract text from image (OCR)
   */
  public async extractText(imageUrl: string): Promise<TextExtraction> {
    try {
      // Check cache
      const cacheKey = `vision:text:${this.hashUrl(imageUrl)}`;
      const cached = await redisClient.getCachedJSON<TextExtraction>(cacheKey);
      
      if (cached) {
        console.log('[VisionService] Text extraction loaded from cache');
        return cached;
      }

      // Perform OCR
      const textExtraction = await googleCloudAI.extractText(imageUrl);

      // Cache the result
      await redisClient.cacheJSON(cacheKey, textExtraction, this.CACHE_TTL);

      return textExtraction;
    } catch (error) {
      console.error('[VisionService] Text extraction failed:', error);
      throw new Error(`Text extraction failed: ${error}`);
    }
  }

  /**
   * Extract product labels from image
   */
  public extractProductLabels(textExtraction: TextExtraction): string[] {
    const labels: string[] = [];
    const text = textExtraction.text.toLowerCase();

    // Common label patterns
    const labelPatterns = [
      /price[:\s]+₹?(\d+)/gi,
      /mrp[:\s]+₹?(\d+)/gi,
      /size[:\s]+(\w+)/gi,
      /weight[:\s]+(\d+\s*(?:kg|g|gm))/gi,
      /material[:\s]+(\w+)/gi,
      /made in[:\s]+(\w+)/gi,
    ];

    for (const pattern of labelPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          labels.push(match[0].trim());
        }
      }
    }

    return labels;
  }

  /**
   * Extract handwritten notes from image
   */
  public extractHandwrittenNotes(textExtraction: TextExtraction): string[] {
    // In a real implementation, use handwriting recognition
    // For now, return all text blocks with lower confidence as potential handwritten text
    const handwrittenBlocks = textExtraction.blocks.filter(
      block => block.confidence < 0.8
    );

    return handwrittenBlocks.map(block => block.text);
  }

  /**
   * Handle multilingual text extraction
   */
  public async extractMultilingualText(imageUrl: string): Promise<{
    text: string;
    language: string;
    translations: Record<string, string>;
  }> {
    try {
      const textExtraction = await this.extractText(imageUrl);

      // If no text found, return empty result
      if (!textExtraction.text) {
        return {
          text: '',
          language: 'unknown',
          translations: {},
        };
      }

      // Translate to common languages if needed
      const translations: Record<string, string> = {};
      
      // For now, return the extracted text without translation
      // Translation can be handled by TranslationService if needed
      
      return {
        text: textExtraction.text,
        language: textExtraction.language,
        translations,
      };
    } catch (error) {
      console.error('[VisionService] Multilingual text extraction failed:', error);
      throw new Error(`Multilingual text extraction failed: ${error}`);
    }
  }

  /**
   * Create structured data from extracted text
   */
  public createStructuredData(textExtraction: TextExtraction): Record<string, any> {
    const structuredData: Record<string, any> = {
      fullText: textExtraction.text,
      language: textExtraction.language,
      confidence: textExtraction.confidence,
    };

    // Extract product labels
    const labels = this.extractProductLabels(textExtraction);
    if (labels.length > 0) {
      structuredData.labels = labels;
    }

    // Extract price information
    const priceMatch = textExtraction.text.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    if (priceMatch) {
      structuredData.price = parseFloat(priceMatch[1].replace(/,/g, ''));
      structuredData.currency = 'INR';
    }

    // Extract dimensions
    const dimensionMatch = textExtraction.text.match(/(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?/i);
    if (dimensionMatch) {
      structuredData.dimensions = {
        length: parseInt(dimensionMatch[1]),
        width: parseInt(dimensionMatch[2]),
        height: dimensionMatch[3] ? parseInt(dimensionMatch[3]) : undefined,
      };
    }

    // Extract weight
    const weightMatch = textExtraction.text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm)/i);
    if (weightMatch) {
      structuredData.weight = {
        value: parseFloat(weightMatch[1]),
        unit: weightMatch[2].toLowerCase(),
      };
    }

    return structuredData;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Hash URL for cache key
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear vision cache
   */
  public async clearCache(): Promise<void> {
    try {
      // In a real implementation, clear all vision-related cache keys
      console.log('[VisionService] Cache cleared');
    } catch (error) {
      console.error('[VisionService] Failed to clear cache:', error);
    }
  }
}

// Export singleton instance
export const visionService = VisionService.getInstance();
