/**
 * WhatsApp Template Management System
 * Manages WhatsApp Business templates, validation, caching, and synchronization with Gupshup
 */

import { getGupshupConfig, GupshupConfig } from '../../config/gupshup-config';
import { 
  GupshupError, 
  GupshupErrorCode,
  handleGupshupError,
  ErrorCategory 
} from './GupshupErrorHandler';
import { 
  getGupshupLogger, 
  createPerformanceTimer,
  GupshupLogger 
} from './GupshupLogger';

export interface MessageTemplate {
  name: string;
  language: string;
  category: 'transactional' | 'promotional' | 'authentication';
  components: TemplateComponent[];
  status: 'approved' | 'pending' | 'rejected' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
  version?: string;
  namespace?: string;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  format?: 'text' | 'image' | 'document' | 'video';
  text?: string;
  parameters?: TemplateParameter[];
  buttons?: TemplateButton[];
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  example?: string;
  required: boolean;
  position: number;
}

export interface TemplateButton {
  type: 'quick_reply' | 'url' | 'phone_number';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parameterCount: number;
  estimatedLength: number;
}

export interface TemplateFormatResult {
  formattedMessage: string;
  components: TemplateComponent[];
  usedParameters: Record<string, string>;
  unusedParameters: string[];
}

export interface TemplateSyncResult {
  synced: number;
  added: number;
  updated: number;
  removed: number;
  errors: string[];
}

/**
 * Template cache for performance optimization
 */
class TemplateCache {
  private cache = new Map<string, MessageTemplate>();
  private cacheExpiry = new Map<string, number>();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  set(key: string, template: MessageTemplate): void {
    this.cache.set(key, template);
    this.cacheExpiry.set(key, Date.now() + this.TTL);
  }

  get(key: string): MessageTemplate | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  size(): number {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
    return this.cache.size;
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.size(),
      hitRate: 0, // Would need hit/miss tracking for real implementation
    };
  }
}

/**
 * WhatsApp Template Manager
 */
export class TemplateManager {
  private config: GupshupConfig;
  private logger: GupshupLogger;
  private cache: TemplateCache;
  private templates: Map<string, MessageTemplate> = new Map();

  constructor(config?: GupshupConfig) {
    this.config = config || getGupshupConfig();
    this.logger = getGupshupLogger();
    this.cache = new TemplateCache();

    this.logger.info('template_manager_init', 'Template Manager initialized', {
      cacheEnabled: true,
      cacheTTL: '24h',
    });
  }

  /**
   * Get template by name and language
   */
  async getTemplate(name: string, language: string): Promise<MessageTemplate> {
    const timer = createPerformanceTimer('get_template');
    
    try {
      const cacheKey = `${name}:${language}`;
      
      // Check cache first
      const cachedTemplate = this.cache.get(cacheKey);
      if (cachedTemplate) {
        timer.end(true, null, { source: 'cache', templateName: name, language });
        this.logger.debug('template_cache_hit', 'Template found in cache', {
          templateName: name,
          language,
          status: cachedTemplate.status,
        });
        return cachedTemplate;
      }

      // Fetch from API if not in cache
      const template = await this.fetchTemplateFromAPI(name, language);
      
      // Cache the result
      this.cache.set(cacheKey, template);
      
      const duration = timer.end(true, null, { source: 'api', templateName: name, language });
      this.logger.logTemplateOperation('get', name, language, true, duration);
      
      return template;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { templateName: name, language });
      this.logger.logTemplateOperation('get', name, language, false, duration, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Validate template parameters against template definition
   */
  validateTemplate(template: MessageTemplate, params: Record<string, string>): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let parameterCount = 0;
    let estimatedLength = 0;

    try {
      // Check template status
      if (template.status !== 'approved') {
        errors.push(`Template '${template.name}' is not approved (status: ${template.status})`);
      }

      // Validate each component
      for (const component of template.components) {
        if (component.parameters) {
          for (const parameter of component.parameters) {
            parameterCount++;
            const paramKey = `param${parameter.position}`;
            const paramValue = params[paramKey] || params[parameter.position.toString()];

            // Check required parameters
            if (parameter.required && (!paramValue || paramValue.trim() === '')) {
              errors.push(`Required parameter at position ${parameter.position} is missing`);
              continue;
            }

            if (paramValue) {
              // Validate parameter type
              const validation = this.validateParameterType(parameter, paramValue);
              if (!validation.isValid) {
                errors.push(`Parameter at position ${parameter.position}: ${validation.error}`);
              }

              // Estimate length
              estimatedLength += paramValue.length;

              // Check parameter length limits
              if (paramValue.length > 1024) {
                warnings.push(`Parameter at position ${parameter.position} is very long (${paramValue.length} chars)`);
              }
            }
          }
        }

        // Estimate component text length
        if (component.text) {
          estimatedLength += component.text.length;
        }
      }

      // Check overall message length
      if (estimatedLength > 4096) {
        errors.push(`Estimated message length (${estimatedLength}) exceeds WhatsApp limit of 4096 characters`);
      } else if (estimatedLength > 2000) {
        warnings.push(`Message is quite long (${estimatedLength} chars), consider shortening`);
      }

      // Check parameter count
      if (parameterCount > 10) {
        warnings.push(`Template has ${parameterCount} parameters, which may cause performance issues`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        parameterCount,
        estimatedLength,
      };

    } catch (error) {
      this.logger.error('template_validation_error', 'Template validation failed', error, {
        templateName: template.name,
        language: template.language,
      });

      return {
        isValid: false,
        errors: [`Template validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        parameterCount,
        estimatedLength,
      };
    }
  }

  /**
   * Format message using template and parameters
   */
  formatMessage(template: MessageTemplate, params: Record<string, string>): TemplateFormatResult {
    const timer = createPerformanceTimer('format_template');
    
    try {
      // Validate first
      const validation = this.validateTemplate(template, params);
      if (!validation.isValid) {
        throw new GupshupError(
          GupshupErrorCode.INVALID_PARAMETERS,
          `Template formatting failed: ${validation.errors.join(', ')}`,
          { category: ErrorCategory.VALIDATION }
        );
      }

      const formattedComponents: TemplateComponent[] = [];
      const usedParameters: Record<string, string> = {};
      const unusedParameters: string[] = [];
      let formattedMessage = '';

      // Process each component
      for (const component of template.components) {
        const formattedComponent = { ...component };
        
        if (component.text && component.parameters) {
          let componentText = component.text;
          
          // Replace parameters in text
          for (const parameter of component.parameters) {
            const paramKey = `param${parameter.position}`;
            const paramValue = params[paramKey] || params[parameter.position.toString()];
            
            if (paramValue) {
              // Replace placeholder with actual value
              const placeholder = `{{${parameter.position}}}`;
              componentText = componentText.replace(placeholder, paramValue);
              usedParameters[paramKey] = paramValue;
            }
          }
          
          formattedComponent.text = componentText;
          formattedMessage += componentText + '\n';
        } else if (component.text) {
          formattedMessage += component.text + '\n';
        }

        formattedComponents.push(formattedComponent);
      }

      // Find unused parameters
      for (const key of Object.keys(params)) {
        if (!usedParameters[key]) {
          unusedParameters.push(key);
        }
      }

      const duration = timer.end(true, null, { 
        templateName: template.name, 
        paramCount: Object.keys(usedParameters).length 
      });
      
      this.logger.logTemplateOperation('format', template.name, template.language, true, duration);

      return {
        formattedMessage: formattedMessage.trim(),
        components: formattedComponents,
        usedParameters,
        unusedParameters,
      };

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { 
        templateName: template.name, 
        language: template.language,
        params 
      });
      this.logger.logTemplateOperation('format', template.name, template.language, false, duration, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Synchronize templates with Gupshup API
   */
  async syncTemplates(): Promise<TemplateSyncResult> {
    const timer = createPerformanceTimer('sync_templates');
    
    try {
      this.logger.info('template_sync_start', 'Starting template synchronization');

      const result: TemplateSyncResult = {
        synced: 0,
        added: 0,
        updated: 0,
        removed: 0,
        errors: [],
      };

      // Fetch all templates from Gupshup API
      const apiTemplates = await this.fetchAllTemplatesFromAPI();
      
      // Process each template
      for (const apiTemplate of apiTemplates) {
        try {
          const cacheKey = `${apiTemplate.name}:${apiTemplate.language}`;
          const existingTemplate = this.templates.get(cacheKey);

          if (!existingTemplate) {
            // New template
            this.templates.set(cacheKey, apiTemplate);
            this.cache.set(cacheKey, apiTemplate);
            result.added++;
          } else if (this.isTemplateUpdated(existingTemplate, apiTemplate)) {
            // Updated template
            this.templates.set(cacheKey, apiTemplate);
            this.cache.set(cacheKey, apiTemplate);
            result.updated++;
          }

          result.synced++;

        } catch (error) {
          const errorMsg = `Failed to sync template ${apiTemplate.name}:${apiTemplate.language}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          this.logger.warn('template_sync_error', errorMsg, { template: apiTemplate });
        }
      }

      // Clean up removed templates (templates that exist locally but not in API)
      const apiTemplateKeys = new Set(apiTemplates.map(t => `${t.name}:${t.language}`));
      for (const [key, template] of this.templates.entries()) {
        if (!apiTemplateKeys.has(key)) {
          this.templates.delete(key);
          // Don't remove from cache immediately to allow for temporary API issues
          result.removed++;
        }
      }

      const duration = timer.end(true, null, result);
      this.logger.logTemplateOperation('sync', 'all', 'all', true, duration, null);
      
      this.logger.info('template_sync_complete', 'Template synchronization completed', result);
      
      return result;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { operation: 'sync_templates' });
      this.logger.logTemplateOperation('sync', 'all', 'all', false, duration, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Get all approved templates
   */
  async getApprovedTemplates(): Promise<MessageTemplate[]> {
    const approvedTemplates: MessageTemplate[] = [];
    
    // Return cached templates if available
    for (const template of this.templates.values()) {
      if (template.status === 'approved') {
        approvedTemplates.push(template);
      }
    }

    // If no cached templates, sync first
    if (approvedTemplates.length === 0) {
      await this.syncTemplates();
      
      // Get approved templates after sync
      for (const template of this.templates.values()) {
        if (template.status === 'approved') {
          approvedTemplates.push(template);
        }
      }
    }

    return approvedTemplates;
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('template_cache_cleared', 'Template cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * Fetch template from Gupshup API
   */
  private async fetchTemplateFromAPI(name: string, language: string): Promise<MessageTemplate> {
    // This would make an actual API call to Gupshup
    // For now, we'll simulate the API response
    
    this.logger.debug('template_api_fetch', 'Fetching template from API', { name, language });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock template response - in real implementation, this would be an HTTP call
    const mockTemplate: MessageTemplate = {
      name,
      language,
      category: 'transactional',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
      components: [
        {
          type: 'body',
          text: 'Hello {{1}}, your scheme {{2}} application status is {{3}}.',
          parameters: [
            { type: 'text', required: true, position: 1, example: 'John' },
            { type: 'text', required: true, position: 2, example: 'PM Vishwakarma' },
            { type: 'text', required: true, position: 3, example: 'approved' },
          ],
        },
      ],
    };

    return mockTemplate;
  }

  /**
   * Fetch all templates from Gupshup API
   */
  private async fetchAllTemplatesFromAPI(): Promise<MessageTemplate[]> {
    // This would make an actual API call to Gupshup to get all templates
    // For now, we'll return mock data
    
    this.logger.debug('template_api_fetch_all', 'Fetching all templates from API');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mock templates - in real implementation, this would be an HTTP call
    return [
      {
        name: 'scheme_alert',
        language: 'en',
        category: 'transactional',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        components: [
          {
            type: 'body',
            text: 'New scheme {{1}} is available! Match score: {{2}}%. Apply by {{3}}.',
            parameters: [
              { type: 'text', required: true, position: 1, example: 'PM Vishwakarma' },
              { type: 'text', required: true, position: 2, example: '95' },
              { type: 'text', required: true, position: 3, example: '31st Dec 2024' },
            ],
          },
        ],
      },
      {
        name: 'scheme_alert',
        language: 'hi',
        category: 'transactional',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        components: [
          {
            type: 'body',
            text: 'नई योजना {{1}} उपलब्ध है! मैच स्कोर: {{2}}%। {{3}} तक आवेदन करें।',
            parameters: [
              { type: 'text', required: true, position: 1, example: 'पीएम विश्वकर्मा' },
              { type: 'text', required: true, position: 2, example: '95' },
              { type: 'text', required: true, position: 3, example: '31 दिसंबर 2024' },
            ],
          },
        ],
      },
    ];
  }

  /**
   * Validate parameter type and value
   */
  private validateParameterType(parameter: TemplateParameter, value: string): { isValid: boolean; error?: string } {
    switch (parameter.type) {
      case 'text':
        if (value.length > 1024) {
          return { isValid: false, error: 'Text parameter exceeds 1024 character limit' };
        }
        return { isValid: true };

      case 'currency':
        // Basic currency validation - should be a number
        if (!/^\d+(\.\d{1,2})?$/.test(value)) {
          return { isValid: false, error: 'Currency parameter must be a valid number' };
        }
        return { isValid: true };

      case 'date_time':
        // Basic date validation
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { isValid: false, error: 'Date parameter must be a valid date' };
        }
        return { isValid: true };

      case 'image':
      case 'document':
      case 'video':
        // URL validation for media parameters
        try {
          new URL(value);
          return { isValid: true };
        } catch {
          return { isValid: false, error: `${parameter.type} parameter must be a valid URL` };
        }

      default:
        return { isValid: true };
    }
  }

  /**
   * Check if template has been updated
   */
  private isTemplateUpdated(existing: MessageTemplate, updated: MessageTemplate): boolean {
    return existing.updatedAt.getTime() < updated.updatedAt.getTime() ||
           existing.status !== updated.status ||
           existing.components.length !== updated.components.length;
  }
}

/**
 * Singleton instance for global use
 */
let templateManagerInstance: TemplateManager | null = null;

export function getTemplateManager(): TemplateManager {
  if (!templateManagerInstance) {
    templateManagerInstance = new TemplateManager();
  }
  return templateManagerInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearTemplateManagerInstance(): void {
  templateManagerInstance = null;
}