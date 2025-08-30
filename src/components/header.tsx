
'use client';
import React from 'react';
import { ChevronsUpDown, Check, Mic } from 'lucide-react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useLanguage } from "@/context/language-context";
import { languages, LanguageCode, t, translateAsync } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { GlobalTranslationToggle } from "./global-translation-toggle";

// Group languages by region
const indianLanguages = Object.entries(languages).filter(([_, lang]) => lang.region === 'indian');
const foreignLanguages = Object.entries(languages).filter(([_, lang]) => lang.region === 'foreign');
import { cn } from '@/lib/utils';
import { useVoiceNavigation } from '@/hooks/use-voice-navigation';


export function Header() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [translatedTitle, setTranslatedTitle] = useState('Kanchipuram Weaver');
  const { isListening, transcript, startListening, stopListening, error } = useVoiceNavigation();

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const title = await translateAsync('artisanTitle', language);
        setTranslatedTitle(title);
      } catch (error) {
        console.error('Header translation loading failed:', error);
        // Fallback to static translation
        setTranslatedTitle(t('artisanTitle', language) || 'Kanchipuram Weaver');
      }
    };

    loadTranslations();
  }, [language]);

  const mapCustomLanguage = (code: string): LanguageCode => {
    // Map common custom codes to known ones
    const customMap: { [key: string]: LanguageCode } = {
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'chinese': 'zh',
      'japanese': 'ja',
      'arabic': 'ar',
      'portuguese': 'pt',
      'russian': 'ru',
      'italian': 'it',
      'korean': 'ko',
      // Add more mappings
    };
    return customMap[code.toLowerCase()] || 'en';
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
      <SidebarTrigger className="md:hidden" />
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <GlobalTranslationToggle />
        <Button
          variant="outline"
          size="icon"
          onClick={isListening ? stopListening : startListening}
          className={cn('', isListening && 'bg-primary text-primary-foreground animate-pulse')}
        >
          <Mic className="size-4" />
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {language
                ? (languages[language as keyof typeof languages]?.name || language)
                : "Select language..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput
                placeholder="Search or type language..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>
                  {searchValue && (
                    <CommandItem
                      onSelect={() => {
                        // Handle custom language input
                        const customCode = searchValue.toLowerCase();
                        if (customCode in languages) {
                          setLanguage(customCode as LanguageCode);
                        } else {
                          // For custom, try to map common codes or fallback to en
                          const mappedCode = mapCustomLanguage(customCode);
                          setLanguage(mappedCode);
                        }
                        setOpen(false);
                      }}
                    >
                      Use "{searchValue}" as custom language
                    </CommandItem>
                  )}
                </CommandEmpty>
                <CommandGroup heading="Indian Languages">
                  {indianLanguages.map(([code, lang]) => (
                    <CommandItem
                      key={code}
                      value={lang.name}
                      onSelect={() => {
                        setLanguage(code as LanguageCode);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          language === code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Foreign Languages">
                  {foreignLanguages.map(([code, lang]) => (
                    <CommandItem
                      key={code}
                      value={lang.name}
                      onSelect={() => {
                        setLanguage(code as LanguageCode);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          language === code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex-1 sm:flex-initial max-w-fit">
          <div className="relative font-headline text-right">
            <p className="font-semibold">Ramu</p>
            <p className="text-sm text-muted-foreground">{translatedTitle}</p>
          </div>
        </div>
        <Avatar>
          <AvatarImage src="https://placehold.co/100x100.png" alt="Artisan Ramu" data-ai-hint="indian man artisan" />
          <AvatarFallback>R</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
