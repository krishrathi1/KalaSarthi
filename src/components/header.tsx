
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
import { languages, LanguageCode } from "@/lib/i18n";
import { cn } from '@/lib/utils';
import { useVoiceNavigation } from '@/hooks/use-voice-navigation';


export function Header() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const { isListening, transcript, startListening, stopListening, error } = useVoiceNavigation();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
      <SidebarTrigger className="md:hidden" />
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={isListening ? stopListening : startListening}
          className={cn('ml-auto', isListening && 'bg-primary text-primary-foreground animate-pulse')}
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
                ? languages[language].name
                : "Select language..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search language..." />
              <CommandList>
                <CommandEmpty>No language found.</CommandEmpty>
                <CommandGroup>
                  {Object.entries(languages).map(([code, lang]) => (
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
            <p className="text-sm text-muted-foreground">Kanchipuram Weaver</p>
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
