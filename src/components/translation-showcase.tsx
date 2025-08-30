'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TranslationShowcase() {
  const [showOriginal, setShowOriginal] = useState(true);

  const sampleTexts = [
    "Welcome to KalaMitra - Your Artisan Digital Twin",
    "Empowering artisans with AI-powered tools",
    "From traditional crafts to modern marketplaces",
    "Supporting 40+ languages including regional dialects",
    "Voice navigation and real-time translation",
    "Blockchain-backed product certification",
    "Multi-marketplace integration made simple",
    "Government scheme alerts and financial tracking",
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Translation Showcase</span>
          <Badge
            variant="outline"
            className="cursor-pointer"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            {showOriginal ? 'Show Translated' : 'Show Original'}
          </Badge>
        </CardTitle>
        <CardDescription>
          This text will be automatically translated when you enable global translation and switch languages.
          Try switching to Maithili, Marathi, or any other language!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sampleTexts.map((text, index) => (
            <div key={index} className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Sample Text {index + 1}:
              </p>
              <p className="text-base leading-relaxed">
                {text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to Test Global Translation:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Click the "Enable Auto Translate" button in the header</li>
            <li>Switch to any language using the language dropdown</li>
            <li>Watch as all text on this page gets translated automatically</li>
            <li>Try Maithili, Marathi, Rajasthani, or any of the 40+ supported languages</li>
            <li>Click "Disable Auto Translate" to restore original text</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
            Supported Languages Include:
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Maithili (mai)', 'Marathi (mr)', 'Rajasthani (raj)', 'Hindi (hi)',
              'Tamil (ta)', 'Bengali (bn)', 'Telugu (te)', 'Gujarati (gu)',
              'Kannada (kn)', 'Malayalam (ml)', 'Punjabi (pa)', 'Odia (or)',
              'Assamese (as)', 'Nepali (ne)', 'Urdu (ur)', 'Sanskrit (sa)',
              'English (en)', 'Spanish (es)', 'French (fr)', 'German (de)',
              'Chinese (zh)', 'Japanese (ja)', 'Arabic (ar)', 'Portuguese (pt)',
              'Russian (ru)', 'Italian (it)', 'Korean (ko)', 'Dutch (nl)',
              'Swedish (sv)', 'Danish (da)', 'Norwegian (no)', 'Finnish (fi)',
              'Polish (pl)', 'Turkish (tr)', 'Thai (th)', 'Vietnamese (vi)'
            ].map((lang) => (
              <Badge key={lang} variant="secondary" className="text-xs">
                {lang}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}