'use client';

import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SupportedLanguage,
  getAllLanguages,
  getLanguageInfo
} from '@/lib/i18n/scheme-sahayak-translations';

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  className?: string;
}

export function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  className = ''
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const languages = getAllLanguages();
  const currentLangInfo = getLanguageInfo(currentLanguage);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`min-h-[3rem] px-4 ${className}`}
        >
          <Globe className="w-4 h-4 mr-2" />
          <span className="font-medium">{currentLangInfo.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 max-h-[400px] overflow-y-auto"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => {
              onLanguageChange(lang.code);
              setOpen(false);
            }}
            className="flex items-center justify-between min-h-[3rem] cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">{lang.name}</span>
            </div>
            {currentLanguage === lang.code && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
