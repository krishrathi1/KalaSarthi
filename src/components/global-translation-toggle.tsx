'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { useGlobalTranslation } from '@/hooks/use-global-translation';
import { useLanguage } from '@/context/language-context';
import { languages } from '@/lib/i18n';

export function GlobalTranslationToggle() {
  const { language } = useLanguage();
  const { isEnabled, isTranslating, toggleTranslation, translatedCount } = useGlobalTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  const currentLanguageName = languages[language as keyof typeof languages]?.name || language;

  return (
    <div className="relative">
      <Button
        onClick={toggleTranslation}
        disabled={isTranslating}
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-2"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isTranslating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Languages className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isEnabled ? 'Disable' : 'Enable'} Auto Translate
        </span>
        {isEnabled && translatedCount > 0 && (
          <span className="text-xs bg-primary-foreground text-primary px-1 py-0.5 rounded">
            {translatedCount}
          </span>
        )}
      </Button>

      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
          {isEnabled
            ? `Auto-translating page to ${currentLanguageName} (${translatedCount} items)`
            : `Click to auto-translate entire page to ${currentLanguageName}`
          }
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>
      )}
    </div>
  );
}