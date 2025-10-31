/**
 * Language Selector Component
 * Dropdown for selecting translation language
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import { LanguageCode, languages, translateAsync } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  className?: string;
  showSearch?: boolean;
  groupByRegion?: boolean;
}

export function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  className,
  showSearch = true,
  groupByRegion = true
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [translatedLanguageName, setTranslatedLanguageName] = useState('');

  // Filter languages based on search query
  const filteredLanguages = Object.entries(languages).filter(([code, lang]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lang.name.toLowerCase().includes(query) ||
      code.toLowerCase().includes(query)
    );
  });

  // Group languages by region if enabled
  const groupedLanguages = groupByRegion
    ? filteredLanguages.reduce((groups, [code, lang]) => {
      const region = lang.region || 'other';
      if (!groups[region]) groups[region] = [];
      groups[region].push([code, lang]);
      return groups;
    }, {} as Record<string, [string, typeof languages[keyof typeof languages]][]>)
    : { all: filteredLanguages };

  // Translate the current language name
  useEffect(() => {
    const translateLanguageName = async () => {
      const originalName = languages[currentLanguage]?.name || currentLanguage;

      // If current language is English, show original name
      if (currentLanguage === 'en') {
        setTranslatedLanguageName(originalName);
        return;
      }

      try {
        // Translate the language name to the current language
        const translated = await translateAsync(originalName, currentLanguage);
        setTranslatedLanguageName(translated);
      } catch (error) {
        console.error('Failed to translate language name:', error);
        setTranslatedLanguageName(originalName);
      }
    };

    translateLanguageName();
  }, [currentLanguage]);

  const currentLanguageName = translatedLanguageName || languages[currentLanguage]?.name || currentLanguage;

  const handleLanguageSelect = (languageCode: LanguageCode) => {
    onLanguageChange(languageCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-medium',
          'bg-white border border-gray-300 rounded-md shadow-sm',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
          'transition-colors duration-200'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="truncate max-w-32">{currentLanguageName}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Search Input */}
          {showSearch && (
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Language List */}
          <div className="max-h-64 overflow-y-auto">
            {Object.entries(groupedLanguages).map(([region, languageList]) => (
              <div key={region}>
                {/* Region Header */}
                {groupByRegion && Object.keys(groupedLanguages).length > 1 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                    {region === 'indian' ? 'Indian Languages' :
                      region === 'foreign' ? 'International Languages' :
                        'Other Languages'}
                  </div>
                )}

                {/* Language Options */}
                {languageList.map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageSelect(code as LanguageCode)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm text-left',
                      'hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
                      'transition-colors duration-150',
                      currentLanguage === code && 'bg-blue-50 text-blue-700'
                    )}
                    role="option"
                    aria-selected={currentLanguage === code}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-xs text-gray-500 uppercase">{code}</span>
                    </span>
                    {currentLanguage === code && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            ))}

            {/* No Results */}
            {filteredLanguages.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No languages found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default LanguageSelector;