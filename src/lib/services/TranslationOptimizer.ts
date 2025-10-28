/**
 * Translation Optimizer Service
 * Optimizes translation performance through caching, batching, and smart routing
 */

import { TranslationCache } from './TranslationCache';
import { CulturalContextTranslator } from './CulturalContextTranslator';

export interface TranslationRequest {
  id: string;
  text