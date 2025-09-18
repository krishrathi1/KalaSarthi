'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { translateAsync, fillMissingTranslations, languages, LanguageCode } from '@/lib/i18n';
import { useLanguage } from '@/context/language-context';

export function TranslationTest() {
  const { language } = useLanguage();
  const [testText, setTestText] = useState('Hello, welcome to KalaSarthi!');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFilling, setIsFilling] = useState(false);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const result = await translateAsync(testText, language);
      setTranslatedText(result);
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslatedText('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFillMissing = async () => {
    setIsFilling(true);
    try {
      await fillMissingTranslations(language);
      alert(`Auto-filled missing translations for ${languages[language as keyof typeof languages]?.name || language}`);
    } catch (error) {
      console.error('Failed to fill missing translations:', error);
      alert('Failed to fill missing translations');
    } finally {
      setIsFilling(false);
    }
  };

  useEffect(() => {
    if (testText) {
      handleTranslate();
    }
  }, [language]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Translation Service Test</CardTitle>
        <CardDescription>
          Test the Google Cloud Translation API integration for {languages[language as keyof typeof languages]?.name || language}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Text (English)</label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Enter text to translate..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Translated Text ({languages[language as keyof typeof languages]?.name || language})
          </label>
          <div className="w-full p-2 border rounded-md  min-h-[60px]">
            {isTranslating ? 'Translating...' : translatedText}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !testText}
          >
            {isTranslating ? 'Translating...' : 'Translate'}
          </Button>

          <Button
            onClick={handleFillMissing}
            disabled={isFilling}
            variant="outline"
          >
            {isFilling ? 'Filling...' : 'Auto-fill Missing Translations'}
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Note:</strong> This component tests the Google Cloud Translation API integration.</p>
          <p>• Make sure your google-credentials.json file is in the project root</p>
          <p>• The translation service uses caching to avoid repeated API calls</p>
          <p>• Auto-fill will attempt to translate all missing translations for the current language</p>
        </div>
      </CardContent>
    </Card>
  );
}