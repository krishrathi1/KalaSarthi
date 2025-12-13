
"use client";

import Link from "next/link";
import {
  BotMessageSquare,
  Sparkles,
  Palette,
  Users,
  ShieldCheck,
  Package,
  ScrollText,
  IndianRupee,
  ArrowRight,
  Calculator,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useLanguage } from "@/context/language-context";
import { features, t, translateAsync } from "@/lib/i18n";
import { useAuth } from "@/context/auth-context";

export function Dashboard() {
  const { language, isTranslating } = useLanguage();
  const [translatedGreeting, setTranslatedGreeting] = useState('Namaste');
  const [translatedWelcome, setTranslatedWelcome] = useState('Welcome to KalaSarthi...');
  const { userProfile } = useAuth();
  
  // Use mock name "Ramu" for unauthenticated users
  // Enhanced user display name handling
  const displayName = userProfile?.name || 'Ramu';
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const greeting = await translateAsync('greeting', language);
        const welcome = await translateAsync('welcome', language);
        setTranslatedGreeting(greeting);
        setTranslatedWelcome(welcome);
      } catch (error) {
        console.error('Translation loading failed:', error);
        // Fallback to static translations
        setTranslatedGreeting(t('greeting', language) || 'Namaste');
        setTranslatedWelcome(t('welcome', language) || 'Welcome to KalaSarthi...');
      }
    };

    loadTranslations();
  }, [language]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold leading-tight">
          {translatedGreeting}, {displayName}!
          {isTranslating && (
            <span className="ml-2 inline-flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </span>
          )}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          {translatedWelcome}
          {isTranslating && (
            <span className="ml-2 text-xs text-blue-500 animate-pulse">
              Translating...
            </span>
          )}
        </p>
      </div>
      
      {/* Responsive grid with better mobile layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {features.filter(feature => !feature.hidden).map((feature) => (
          <Card key={feature.title.en} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <feature.icon className={`size-6 sm:size-8 ${feature.color} flex-shrink-0`} />
                <CardTitle className="font-headline text-sm sm:text-base leading-tight">
                  {t(feature.title as { [key: string]: string }, language)}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0 pb-3 sm:pb-4">
              <CardDescription className="text-xs sm:text-sm leading-relaxed">
                {t(feature.description as { [key: string]: string }, language)}
              </CardDescription>
            </CardContent>
            <div className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button asChild variant="outline" className="w-full text-xs sm:text-sm h-8 sm:h-9">
                <Link href={feature.path}>
                  <span className="truncate">{t('open', language)}</span>
                  <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
