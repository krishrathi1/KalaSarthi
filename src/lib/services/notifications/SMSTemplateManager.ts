/**
 * SMS Template Manager for Consistent Messaging
 * Handles SMS-specific templates, formatting, and optimization
 */

import { getGupshupLogger, GupshupLogger } from './GupshupLogger';

export interface SMSTemplate {
  name: string;
  content: string;
  language: string;
  category: 'scheme_alert' | 'deadline_reminder' | 'application_update' | 'promotional';
  maxLength: number;
  parameters: SMSTemplateParameter[];
  urlShortening: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface SMSTemplateParameter {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'url';
  required: boolean;
  maxLength?: number;
  format?: string;
}

export interface SMSTemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  formattedContent: string;
  characterCount: number;
  smsCount: number;
  urlsShortened: number;
}

export interface SMSOptimizationResult {
  originalLength: number;
  optimizedLength: number;
  optimizedContent: string;
  smsCount: number;
  optimizations: string[];
  urlsShortened: string[];
}

/**
 * Default SMS templates for common notification types
 */
export const DEFAULT_SMS_TEMPLATES: SMSTemplate[] = [
  {
    name: 'scheme_alert_hindi',
    content: 'नई योजना: {{schemeName}} - {{eligibility}} के लिए। राशि: {{amount}}। अंतिम तिथि: {{deadline}}। आवेदन: {{applicationUrl}}',
    language: 'hi',
    category: 'scheme_alert',
    maxLength: 160,
    parameters: [
      { name: 'schemeName', type: 'text', required: true, maxLength: 50 },
      { name: 'eligibility', type: 'text', required: true, maxLength: 30 },
      { name: 'amount', type: 'currency', required: true },
      { name: 'deadline', type: 'date', required: true, format: 'DD/MM/YYYY' },
      { name: 'applicationUrl', type: 'url', required: true },
    ],
    urlShortening: true,
    priority: 'high',
  },
  {
    name: 'scheme_alert_english',
    content: 'New Scheme: {{schemeName}} for {{eligibility}}. Amount: {{amount}}. Deadline: {{deadline}}. Apply: {{applicationUrl}}',
    language: 'en',
    category: 'scheme_alert',
    maxLength: 160,
    parameters: [
      { name: 'schemeName', type: 'text', required: true, maxLength: 50 },
      { name: 'eligibility', type: 'text', required: true, maxLength: 30 },
      { name: 'amount', type: 'currency', required: true },
      { name: 'deadline', type: 'date', required: true, format: 'DD/MM/YYYY' },
      { name: 'applicationUrl', type: 'url', required: true },
    ],
    urlShortening: true,
    priority: 'high',
  },
  {
    name: 'deadline_reminder_hindi',
    content: 'अंतिम चेतावनी: {{schemeName}} की अंतिम तिथि {{deadline}} है। अभी आवेदन करें: {{applicationUrl}}',
    language: 'hi',
    category: 'deadline_reminder',
    maxLength: 160,
    parameters: [
      { name: 'schemeName', type: 'text', required: true, maxLength: 60 },
      { name: 'deadline', type: 'date', required: true, format: 'DD/MM/YYYY' },
      { name: 'applicationUrl', type: 'url', required: true },
    ],
    urlShortening: true,
    priority: 'high',
  },
  {
    name: 'deadline_reminder_english',
    content: 'Final Reminder: {{schemeName}} deadline is {{deadline}}. Apply now: {{applicationUrl}}',
    language: 'en',
    category: 'deadline_reminder',
    maxLength: 160,
    parameters: [
      { name: 'schemeName', type: 'text', required: true, maxLength: 60 },
      { name: 'deadline', type: 'date', required: true, format: 'DD/MM/YYYY' },
      { name: 'applicationUrl', type: 'url', required: true },
    ],
    urlShortening: true,
    priority: 'high',
  },
  {
    name: 'application_update_hindi',
    content: 'आवेदन अपडेट: {{schemeName}} - स्थिति: {{status}}। विवरण: {{details}}',
    language: 'hi',
    category: 'application_update',
    maxLength: 160,
    parameters: [
      { name: 'schemeName', type: 'text', required: true, maxLength: 50 },
      { name: 'status', type: 'text', required: true, maxLength: 20 },
      { name: 'details', type: 'text', required: false, maxLength: 80 },
    ],
    urlShortening: false,
    priority: 'medium',
  },
  {
    name: 'application_update_english',
    content: 'Application Update: {{schemeName}} - Status: {{status}}. Details: {{details}}',
    language: 'en',
    category: 'application_update',
    maxLength: 160,
    parameters: [
      { name: 'schemeName', type: 'text', required: true, maxLength: 50 },
      { name: 'status', type: 'text', required: true, maxLength: 20 },
      { name: 'details', type: 'text', required: false, maxLength: 80 },
    ],
    urlShortening: false,
    priority: 'medium',
  },
];

/**
 * URL shortening service interface
 */
export interface URLShortener {
  shortenUrl(url: string): Promise<string>;
  expandUrl(shortUrl: string): Promise<string>;
  getClickStats(shortUrl: string): Promise<{ clicks: number; lastClicked?: Date }>;
}

/**
 * Simple in-memory URL shortener (for development/testing)
 * In production, this would integrate with a real URL shortening service
 */
export class SimpleURLShortener implements URLShortener {
  private urlMap = new Map<string, string>();
  private reverseMap = new Map<string, string>();
  private clickStats = new Map<string, { clicks: number; lastClicked?: Date }>();
  private baseUrl = 'https://kala.ly/';

  async shortenUrl(url: string): Promise<string> {
    // Check if already shortened
    const existing = this.reverseMap.get(url);
    if (existing) {
      return existing;
    }

    // Generate short code
    const shortCode = this.generateShortCode();
    const shortUrl = this.baseUrl + shortCode;

    // Store mappings
    this.urlMap.set(shortCode, url);
    this.reverseMap.set(url, shortUrl);
    this.clickStats.set(shortCode, { clicks: 0 });

    return shortUrl;
  }

  async expandUrl(shortUrl: string): Promise<string> {
    const shortCode = shortUrl.replace(this.baseUrl, '');
    const originalUrl = this.urlMap.get(shortCode);
    
    if (!originalUrl) {
      throw new Error('Short URL not found');
    }

    // Update click stats
    const stats = this.clickStats.get(shortCode) || { clicks: 0 };
    stats.clicks++;
    stats.lastClicked = new Date();
    this.clickStats.set(shortCode, stats);

    return originalUrl;
  }

  async getClickStats(shortUrl: string): Promise<{ clicks: number; lastClicked?: Date }> {
    const shortCode = shortUrl.replace(this.baseUrl, '');
    return this.clickStats.get(shortCode) || { clicks: 0 };
  }

  private generateShortCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * SMS Template Manager class
 */
export class SMSTemplateManager {
  private templates: Map<string, SMSTemplate> = new Map();
  private logger: GupshupLogger;
  private urlShortener: URLShortener;

  constructor(urlShortener?: URLShortener) {
    this.logger = getGupshupLogger();
    this.urlShortener = urlShortener || new SimpleURLShortener();
    
    // Load default templates
    this.loadDefaultTemplates();
    
    this.logger.info('sms_template_manager_init', 'SMS Template Manager initialized', {
      templateCount: this.templates.size,
      urlShortenerType: this.urlShortener.constructor.name,
    });
  }

  /**
   * Get SMS template by name and language
   */
  getTemplate(name: string, language: string = 'en'): SMSTemplate | null {
    const templateKey = `${name}_${language}`;
    let template = this.templates.get(templateKey);
    
    // Fallback to English if language-specific template not found
    if (!template && language !== 'en') {
      template = this.templates.get(`${name}_en`);
    }
    
    return template || null;
  }

  /**
   * Validate and format SMS template with parameters
   */
  async validateAndFormatTemplate(
    templateName: string,
    parameters: Record<string, string>,
    language: string = 'en'
  ): Promise<SMSTemplateValidationResult> {
    const template = this.getTemplate(templateName, language);
    
    if (!template) {
      return {
        isValid: false,
        errors: [`Template '${templateName}' not found for language '${language}'`],
        warnings: [],
        formattedContent: '',
        characterCount: 0,
        smsCount: 0,
        urlsShortened: 0,
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let urlsShortened = 0;

    // Validate required parameters
    for (const param of template.parameters) {
      if (param.required && !parameters[param.name]) {
        errors.push(`Required parameter '${param.name}' is missing`);
      }
      
      if (parameters[param.name]) {
        const value = parameters[param.name];
        
        // Validate parameter length
        if (param.maxLength && value.length > param.maxLength) {
          warnings.push(`Parameter '${param.name}' exceeds max length of ${param.maxLength}`);
        }
        
        // Validate parameter type
        if (param.type === 'number' && isNaN(Number(value))) {
          errors.push(`Parameter '${param.name}' must be a number`);
        }
        
        if (param.type === 'date' && !this.isValidDate(value)) {
          errors.push(`Parameter '${param.name}' must be a valid date`);
        }
        
        if (param.type === 'url' && !this.isValidUrl(value)) {
          errors.push(`Parameter '${param.name}' must be a valid URL`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        formattedContent: '',
        characterCount: 0,
        smsCount: 0,
        urlsShortened: 0,
      };
    }

    // Format template content
    let formattedContent = await this.formatTemplateContent(template, parameters);
    
    // Apply URL shortening if enabled
    if (template.urlShortening) {
      const shorteningResult = await this.shortenUrlsInContent(formattedContent);
      formattedContent = shorteningResult.content;
      urlsShortened = shorteningResult.urlsShortened;
    }

    // Optimize content if it exceeds max length
    if (formattedContent.length > template.maxLength) {
      const optimizationResult = this.optimizeContent(formattedContent, template.maxLength);
      formattedContent = optimizationResult.optimizedContent;
      warnings.push(`Content optimized to fit ${template.maxLength} characters`);
    }

    const characterCount = formattedContent.length;
    const smsCount = Math.ceil(characterCount / template.maxLength);

    return {
      isValid: true,
      errors,
      warnings,
      formattedContent,
      characterCount,
      smsCount,
      urlsShortened,
    };
  }

  /**
   * Optimize SMS content for length and readability
   */
  optimizeContent(content: string, maxLength: number): SMSOptimizationResult {
    const originalLength = content.length;
    const optimizations: string[] = [];
    const urlsShortened: string[] = [];
    let optimizedContent = content;

    if (originalLength <= maxLength) {
      return {
        originalLength,
        optimizedLength: originalLength,
        optimizedContent,
        smsCount: 1,
        optimizations,
        urlsShortened,
      };
    }

    // Apply various optimization strategies
    
    // 1. Remove extra whitespace
    const beforeWhitespace = optimizedContent.length;
    optimizedContent = optimizedContent.replace(/\s+/g, ' ').trim();
    if (optimizedContent.length < beforeWhitespace) {
      optimizations.push('Removed extra whitespace');
    }

    // 2. Use abbreviations for common terms
    const abbreviations = {
      'योजना': 'योज',
      'आवेदन': 'आवेद',
      'अंतिम तिथि': 'अंत तिथि',
      'Scheme': 'Sch',
      'Application': 'App',
      'Deadline': 'DL',
      'Government': 'Govt',
      'Registration': 'Reg',
    };

    const beforeAbbrev = optimizedContent.length;
    for (const [full, abbrev] of Object.entries(abbreviations)) {
      optimizedContent = optimizedContent.replace(new RegExp(full, 'gi'), abbrev);
    }
    if (optimizedContent.length < beforeAbbrev) {
      optimizations.push('Applied abbreviations');
    }

    // 3. If still too long, truncate intelligently
    if (optimizedContent.length > maxLength) {
      // Preserve important information (URLs, dates, amounts)
      const importantPatterns = [
        /https?:\/\/[^\s]+/g, // URLs
        /₹[\d,]+|\d+\s*रुपए/g, // Amounts
        /\d{1,2}\/\d{1,2}\/\d{4}/g, // Dates
      ];

      let preservedInfo = '';
      for (const pattern of importantPatterns) {
        const matches = optimizedContent.match(pattern);
        if (matches) {
          preservedInfo += ' ' + matches.join(' ');
        }
      }

      const availableSpace = maxLength - preservedInfo.length - 3; // 3 for "..."
      if (availableSpace > 20) {
        const mainContent = optimizedContent.replace(/https?:\/\/[^\s]+/g, '').trim();
        optimizedContent = mainContent.substring(0, availableSpace) + '...' + preservedInfo;
        optimizations.push('Truncated with preserved important info');
      } else {
        optimizedContent = optimizedContent.substring(0, maxLength - 3) + '...';
        optimizations.push('Simple truncation');
      }
    }

    const optimizedLength = optimizedContent.length;
    const smsCount = Math.ceil(optimizedLength / maxLength);

    return {
      originalLength,
      optimizedLength,
      optimizedContent,
      smsCount,
      optimizations,
      urlsShortened,
    };
  }

  /**
   * Add or update an SMS template
   */
  addTemplate(template: SMSTemplate): void {
    const templateKey = `${template.name}_${template.language}`;
    this.templates.set(templateKey, template);
    
    this.logger.info('sms_template_added', 'SMS template added/updated', {
      name: template.name,
      language: template.language,
      category: template.category,
      maxLength: template.maxLength,
    });
  }

  /**
   * Remove an SMS template
   */
  removeTemplate(name: string, language: string): boolean {
    const templateKey = `${name}_${language}`;
    const removed = this.templates.delete(templateKey);
    
    if (removed) {
      this.logger.info('sms_template_removed', 'SMS template removed', {
        name,
        language,
      });
    }
    
    return removed;
  }

  /**
   * Get all templates for a category
   */
  getTemplatesByCategory(category: string): SMSTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): SMSTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Clear all templates
   */
  clearTemplates(): void {
    this.templates.clear();
    this.logger.info('sms_templates_cleared', 'All SMS templates cleared');
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    for (const template of DEFAULT_SMS_TEMPLATES) {
      this.addTemplate(template);
    }
  }

  /**
   * Format template content with parameters
   */
  private async formatTemplateContent(
    template: SMSTemplate,
    parameters: Record<string, string>
  ): Promise<string> {
    let content = template.content;
    
    for (const param of template.parameters) {
      const value = parameters[param.name] || '';
      let formattedValue = value;
      
      // Apply parameter-specific formatting
      if (param.type === 'date' && param.format && value) {
        formattedValue = this.formatDate(value, param.format);
      } else if (param.type === 'currency' && value) {
        formattedValue = this.formatCurrency(value);
      }
      
      // Replace parameter placeholder
      const placeholder = `{{${param.name}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), formattedValue);
    }
    
    return content;
  }

  /**
   * Shorten URLs in content
   */
  private async shortenUrlsInContent(content: string): Promise<{ content: string; urlsShortened: number }> {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlPattern) || [];
    let modifiedContent = content;
    let urlsShortened = 0;

    for (const url of urls) {
      try {
        const shortUrl = await this.urlShortener.shortenUrl(url);
        modifiedContent = modifiedContent.replace(url, shortUrl);
        urlsShortened++;
      } catch (error) {
        this.logger.warn('url_shortening_failed', 'Failed to shorten URL', {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { content: modifiedContent, urlsShortened };
  }

  /**
   * Validate date string
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Validate URL string
   */
  private isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format date according to specified format
   */
  private formatDate(dateString: string, format: string): string {
    const date = new Date(dateString);
    
    if (format === 'DD/MM/YYYY') {
      return date.toLocaleDateString('en-GB');
    } else if (format === 'MM/DD/YYYY') {
      return date.toLocaleDateString('en-US');
    }
    
    return dateString;
  }

  /**
   * Format currency value
   */
  private formatCurrency(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return value;
    }
    
    // Format as Indian currency
    return `₹${num.toLocaleString('en-IN')}`;
  }
}

/**
 * Singleton instance for global use
 */
let smsTemplateManagerInstance: SMSTemplateManager | null = null;

export function getSMSTemplateManager(): SMSTemplateManager {
  if (!smsTemplateManagerInstance) {
    smsTemplateManagerInstance = new SMSTemplateManager();
  }
  return smsTemplateManagerInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearSMSTemplateManagerInstance(): void {
  smsTemplateManagerInstance = null;
}