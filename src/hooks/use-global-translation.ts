'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/context/language-context';
import { translationService } from '@/lib/translation-service';
import { LanguageCode } from '@/lib/i18n';

interface TranslationNode {
  element: Element;
  originalText: string;
  translatedText: string;
  language: LanguageCode;
}

export function useGlobalTranslation() {
  const { language } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedNodes, setTranslatedNodes] = useState<Map<Element, TranslationNode>>(new Map());
  const translatedNodesRef = useRef<Map<Element, TranslationNode>>(new Map());

  // Function to get all text nodes from an element
  const getTextNodes = useCallback((element: Element): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and other non-visible elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_SKIP;

          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'code', 'pre'].includes(tagName)) {
            return NodeFilter.FILTER_SKIP;
          }

          // Skip if text is only whitespace
          if (node.textContent?.trim() === '') {
            return NodeFilter.FILTER_SKIP;
          }

          // Skip if parent has data-no-translate attribute
          if (parent.hasAttribute('data-no-translate')) {
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
  }, []);

  // Function to translate all text on the page
  const translatePage = useCallback(async () => {
    if (!isEnabled || isTranslating) return;

    setIsTranslating(true);

    try {
      const body = document.body;
      const textNodes = getTextNodes(body);

      // Group text nodes by their text content to avoid duplicate translations
      const textGroups = new Map<string, Text[]>();

      textNodes.forEach(node => {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          if (!textGroups.has(text)) {
            textGroups.set(text, []);
          }
          textGroups.get(text)!.push(node);
        }
      });

      // Translate unique texts
      const translationPromises = Array.from(textGroups.entries()).map(async ([originalText, nodes]) => {
        try {
          // Skip if already translated for this language
          const parentElement = nodes[0].parentElement;
          if (!parentElement) return;

          const existingTranslation = translatedNodes.get(parentElement);
          if (existingTranslation && existingTranslation.language === language) {
            return;
          }

          const translatedText = await translationService.translateText(originalText, language, 'en');

          // Update all nodes with this text
          nodes.forEach(node => {
            const translationNode: TranslationNode = {
              element: node.parentElement!,
              originalText,
              translatedText,
              language
            };

            // Store original text as data attribute
            if (!node.parentElement!.hasAttribute('data-original-text')) {
              node.parentElement!.setAttribute('data-original-text', originalText);
            }

            // Update text content
            node.textContent = translatedText;

            // Store translation info
            translatedNodesRef.current.set(node.parentElement!, translationNode);
            setTranslatedNodes(prev => new Map(prev.set(node.parentElement!, translationNode)));
          });
        } catch (error) {
          console.warn('Failed to translate text:', originalText, error);
        }
      });

      await Promise.all(translationPromises);

    } catch (error) {
      console.error('Page translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [isEnabled, isTranslating, language, getTextNodes]);

  // Function to restore original text
  const restoreOriginalText = useCallback(() => {
    translatedNodesRef.current.forEach((translationNode) => {
      const originalText = translationNode.element.getAttribute('data-original-text');
      if (originalText) {
        // Find text nodes within this element
        const textNodes = getTextNodes(translationNode.element);
        textNodes.forEach(node => {
          if (node.textContent === translationNode.translatedText) {
            node.textContent = originalText;
          }
        });
      }
    });

    translatedNodesRef.current.clear();
    setTranslatedNodes(new Map());
  }, [getTextNodes]);

  // Toggle translation on/off
  const toggleTranslation = useCallback(() => {
    if (isEnabled) {
      // Disable translation - restore original text
      translatedNodesRef.current.forEach((translationNode) => {
        const originalText = translationNode.element.getAttribute('data-original-text');
        if (originalText) {
          // Find text nodes within this element
          const textNodes = getTextNodes(translationNode.element);
          textNodes.forEach(node => {
            if (node.textContent === translationNode.translatedText) {
              node.textContent = originalText;
            }
          });
        }
      });

      translatedNodesRef.current.clear();
      setTranslatedNodes(new Map());
      setIsEnabled(false);
    } else {
      // Enable translation
      setIsEnabled(true);
    }
  }, [isEnabled, getTextNodes]);

  // Effect to handle language changes
  useEffect(() => {
    if (isEnabled && language !== 'en') {
      // Clear previous translations when language changes
      restoreOriginalText();
      // Translate with new language
      setTimeout(() => translatePage(), 100);
    } else if (!isEnabled || language === 'en') {
      // Restore original text for English or when disabled
      restoreOriginalText();
    }
  }, [language, isEnabled, translatePage, restoreOriginalText]);

  // Effect to translate page when enabled
  useEffect(() => {
    if (isEnabled && language !== 'en') {
      const timeoutId = setTimeout(() => translatePage(), 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isEnabled, language, translatePage]);

  // Keep ref in sync with state
  useEffect(() => {
    translatedNodesRef.current = new Map(translatedNodes);
  }, [translatedNodes]);

  return {
    isEnabled,
    isTranslating,
    toggleTranslation,
    translatePage,
    restoreOriginalText,
    translatedCount: translatedNodesRef.current.size
  };
}
