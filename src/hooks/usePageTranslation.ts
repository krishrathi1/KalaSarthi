/**
 * Page Translation Hook
 * Handles automatic translation of DOM elements
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { LanguageCode } from '@/lib/i18n';

interface TranslatedElement {
  element: Element;
  originalText: string;
  translatedText: string;
  language: LanguageCode;
}

interface UsePageTranslationOptions {
  enabled?: boolean;
  excludeSelectors?: string[];
  includeSelectors?: string[];
  translateAttributes?: string[];
  debounceMs?: number;
}

export function usePageTranslation(options: UsePageTranslationOptions = {}) {
  const {
    enabled = true,
    excludeSelectors = ['script', 'style', 'code', 'pre', '[data-no-translate]'],
    includeSelectors = [],
    translateAttributes = ['placeholder', 'title', 'alt'],
    debounceMs = 500
  } = options;

  const { currentLanguage, isEnabled, translateText, isTranslating } = useTranslation();
  const { unifiedTranslationService } = require('@/lib/services/UnifiedTranslationService');
  const translatedElements = useRef<Map<Element, TranslatedElement>>(new Map());
  const translationTimeoutRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<MutationObserver>();

  // Get all translatable text nodes
  const getTranslatableNodes = useCallback((root: Element = document.body): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_SKIP;

          // Skip excluded elements
          if (excludeSelectors.some(selector => parent.closest(selector))) {
            return NodeFilter.FILTER_SKIP;
          }

          // If include selectors are specified, only include those
          if (includeSelectors.length > 0 && 
              !includeSelectors.some(selector => parent.closest(selector))) {
            return NodeFilter.FILTER_SKIP;
          }

          // Skip empty or whitespace-only text
          const text = node.textContent?.trim();
          if (!text || text.length === 0) {
            return NodeFilter.FILTER_SKIP;
          }

          // Skip very short text (likely not meaningful)
          if (text.length < 3) {
            return NodeFilter.FILTER_SKIP;
          }

          // Skip common UI elements that don't need translation
          if (/^[\d\s\-\+\*\/\=\(\)\[\]\{\}\|\\\:\;\,\.\?\!]+$/.test(text)) {
            return NodeFilter.FILTER_SKIP;
          }

          // Skip single words that are likely technical terms or proper nouns
          if (text.length < 15 && !/\s/.test(text) && /^[A-Z]/.test(text)) {
            return NodeFilter.FILTER_SKIP;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    return textNodes;
  }, [excludeSelectors, includeSelectors]);

  // Get translatable attributes
  const getTranslatableAttributes = useCallback((root: Element = document.body): Array<{element: Element, attribute: string, text: string}> => {
    const attributes: Array<{element: Element, attribute: string, text: string}> = [];
    
    const elements = root.querySelectorAll('*');
    elements.forEach(element => {
      // Skip excluded elements
      if (excludeSelectors.some(selector => element.matches(selector))) {
        return;
      }

      translateAttributes.forEach(attr => {
        const value = element.getAttribute(attr);
        if (value && value.trim().length > 1) {
          attributes.push({ element, attribute: attr, text: value.trim() });
        }
      });
    });

    return attributes;
  }, [excludeSelectors, translateAttributes]);

  // Translate page content
  const translatePage = useCallback(async () => {
    if (!enabled || !isEnabled || currentLanguage === 'en' || isTranslating) {
      return;
    }

    try {
      // Get all translatable content
      const textNodes = getTranslatableNodes();
      const attributeNodes = getTranslatableAttributes();

      // Group by unique text to avoid duplicate translations
      const uniqueTexts = new Map<string, Array<{type: 'text' | 'attribute', node: Text | Element, attribute?: string}>>();

      // Process text nodes
      textNodes.forEach(node => {
        const text = node.textContent?.trim();
        if (text) {
          if (!uniqueTexts.has(text)) {
            uniqueTexts.set(text, []);
          }
          uniqueTexts.get(text)!.push({ type: 'text', node });
        }
      });

      // Process attribute nodes
      attributeNodes.forEach(({ element, attribute, text }) => {
        if (!uniqueTexts.has(text)) {
          uniqueTexts.set(text, []);
        }
        uniqueTexts.get(text)!.push({ type: 'attribute', node: element, attribute });
      });

      // Separate texts that need translation vs those already translated
      const textsToTranslate: string[] = [];
      const textNodeMap = new Map<string, Array<{type: 'text' | 'attribute', node: Text | Element, attribute?: string}>>();

      Array.from(uniqueTexts.entries()).forEach(([originalText, nodes]) => {
        // Check if already translated for current language
        const existingTranslation = Array.from(translatedElements.current.values())
          .find(t => t.originalText === originalText && t.language === currentLanguage);

        if (existingTranslation) {
          // Use existing translation
          nodes.forEach(({ type, node, attribute }) => {
            if (type === 'text' && node instanceof Text) {
              const parent = node.parentElement;
              if (parent && !parent.hasAttribute('data-original-text')) {
                parent.setAttribute('data-original-text', originalText);
              }
              node.textContent = existingTranslation.translatedText;
            } else if (type === 'attribute' && node instanceof Element && attribute) {
              const originalAttrKey = `data-original-${attribute}`;
              if (!node.hasAttribute(originalAttrKey)) {
                node.setAttribute(originalAttrKey, originalText);
              }
              node.setAttribute(attribute, existingTranslation.translatedText);
            }
          });
        } else {
          // Add to batch translation queue
          textsToTranslate.push(originalText);
          textNodeMap.set(originalText, nodes);
        }
      });

      // Batch translate all new texts
      if (textsToTranslate.length > 0) {
        try {
          // Filter out very short or invalid texts before sending to API
          const validTextsToTranslate = textsToTranslate.filter(text => 
            text && text.trim().length >= 3 && text.trim().length <= 1000
          );

          if (validTextsToTranslate.length === 0) {
            console.log('No valid texts to translate after filtering');
            return;
          }

          const batchResult = await unifiedTranslationService.translateBatch(
            validTextsToTranslate,
            currentLanguage,
            'en',
            true // auto-detect source
          );

          // Apply batch translations
          batchResult.results.forEach((result, index) => {
            const originalText = validTextsToTranslate[index];
            const nodes = textNodeMap.get(originalText) || [];
            const translatedText = result.translatedText;

            nodes.forEach(({ type, node, attribute }) => {
              if (type === 'text' && node instanceof Text) {
                // Store original text if not already stored
                const parent = node.parentElement;
                if (parent && !parent.hasAttribute('data-original-text')) {
                  parent.setAttribute('data-original-text', originalText);
                }

                // Update text content
                node.textContent = translatedText;

                // Store translation info
                if (parent) {
                  const translationInfo: TranslatedElement = {
                    element: parent,
                    originalText,
                    translatedText,
                    language: currentLanguage
                  };
                  translatedElements.current.set(parent, translationInfo);
                }
              } else if (type === 'attribute' && node instanceof Element && attribute) {
                // Store original attribute value
                const originalAttrKey = `data-original-${attribute}`;
                if (!node.hasAttribute(originalAttrKey)) {
                  node.setAttribute(originalAttrKey, originalText);
                }

                // Update attribute
                node.setAttribute(attribute, translatedText);

                // Store translation info
                const translationInfo: TranslatedElement = {
                  element: node,
                  originalText,
                  translatedText,
                  language: currentLanguage
                };
                translatedElements.current.set(node, translationInfo);
              }
            });
          });
        } catch (error) {
          console.error('Batch translation failed:', error);
          
          // Check if it's a rate limiting error
          if (error instanceof Error && error.message.includes('429')) {
            console.log('Rate limited - skipping translation for now');
            return;
          }
          
          // Check if it's a service unavailable error
          if (error instanceof Error && (error.message.includes('503') || error.message.includes('500'))) {
            console.log('Translation service unavailable - skipping translation for now');
            return;
          }
          
          // For other errors, try a very limited fallback
          const criticalTexts = validTextsToTranslate.slice(0, 3); // Only translate first 3 as fallback
          console.log(`Attempting fallback translation for ${criticalTexts.length} critical texts`);
          
          for (const originalText of criticalTexts) {
            try {
              const translatedText = await translateText(originalText);
              const nodes = textNodeMap.get(originalText) || [];
              
              nodes.forEach(({ type, node, attribute }) => {
                if (type === 'text' && node instanceof Text) {
                  const parent = node.parentElement;
                  if (parent && !parent.hasAttribute('data-original-text')) {
                    parent.setAttribute('data-original-text', originalText);
                  }
                  node.textContent = translatedText;
                  
                  if (parent) {
                    const translationInfo: TranslatedElement = {
                      element: parent,
                      originalText,
                      translatedText,
                      language: currentLanguage
                    };
                    translatedElements.current.set(parent, translationInfo);
                  }
                } else if (type === 'attribute' && node instanceof Element && attribute) {
                  const originalAttrKey = `data-original-${attribute}`;
                  if (!node.hasAttribute(originalAttrKey)) {
                    node.setAttribute(originalAttrKey, originalText);
                  }
                  node.setAttribute(attribute, translatedText);
                  
                  const translationInfo: TranslatedElement = {
                    element: node,
                    originalText,
                    translatedText,
                    language: currentLanguage
                  };
                  translatedElements.current.set(node, translationInfo);
                }
              });
            } catch (individualError) {
              console.warn('Failed to translate text:', originalText, individualError);
            }
          }
        }
      }

    } catch (error) {
      console.error('Page translation failed:', error);
    }
  }, [enabled, isEnabled, currentLanguage, isTranslating, translateText, getTranslatableNodes, getTranslatableAttributes]);

  // Restore original text
  const restoreOriginalText = useCallback(() => {
    translatedElements.current.forEach((translationInfo, element) => {
      // Restore text content
      const originalText = element.getAttribute('data-original-text');
      if (originalText) {
        const textNodes = getTranslatableNodes(element);
        textNodes.forEach(node => {
          if (node.textContent === translationInfo.translatedText) {
            node.textContent = originalText;
          }
        });
        element.removeAttribute('data-original-text');
      }

      // Restore attributes
      translateAttributes.forEach(attr => {
        const originalAttrKey = `data-original-${attr}`;
        const originalValue = element.getAttribute(originalAttrKey);
        if (originalValue) {
          element.setAttribute(attr, originalValue);
          element.removeAttribute(originalAttrKey);
        }
      });
    });

    translatedElements.current.clear();
  }, [getTranslatableNodes, translateAttributes]);

  // Debounced translation function
  const debouncedTranslate = useCallback(() => {
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }

    translationTimeoutRef.current = setTimeout(() => {
      translatePage();
    }, debounceMs);
  }, [translatePage, debounceMs]);

  // Handle language changes
  useEffect(() => {
    if (isEnabled && currentLanguage !== 'en') {
      restoreOriginalText();
      debouncedTranslate();
    } else {
      restoreOriginalText();
    }
  }, [currentLanguage, isEnabled, restoreOriginalText, debouncedTranslate]);

  // Set up mutation observer for dynamic content with throttling
  useEffect(() => {
    if (!enabled || !isEnabled || currentLanguage === 'en') {
      return;
    }

    let mutationTimeout: NodeJS.Timeout;
    const MUTATION_DEBOUNCE = 2000; // Increased debounce to 2 seconds

    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            // Only trigger for significant content changes
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Skip small elements or those likely to be UI components
              if (element.textContent && element.textContent.trim().length > 10) {
                shouldTranslate = true;
              }
            } else if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim();
              if (text && text.length > 5) {
                shouldTranslate = true;
              }
            }
          });
        } else if (mutation.type === 'characterData') {
          const text = mutation.target.textContent?.trim();
          if (text && text.length > 5) {
            shouldTranslate = true;
          }
        }
      });

      if (shouldTranslate) {
        // Clear existing timeout
        if (mutationTimeout) {
          clearTimeout(mutationTimeout);
        }
        
        // Debounce mutations more aggressively
        mutationTimeout = setTimeout(() => {
          debouncedTranslate();
        }, MUTATION_DEBOUNCE);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
    };
  }, [enabled, isEnabled, currentLanguage, debouncedTranslate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    translatePage,
    restoreOriginalText,
    translatedCount: translatedElements.current.size,
    isTranslating
  };
}