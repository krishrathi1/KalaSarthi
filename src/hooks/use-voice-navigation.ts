
"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { menuItems, LanguageCode, t, languages } from '@/lib/i18n';
import { useLanguage } from '@/context/language-context';

let recognition: SpeechRecognition | null = null;
if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
}

// Dynamically build command keywords from menuItems
const commandKeywords: { [key: string]: { path: string, keywords: { [K in LanguageCode]?: string[] } } } = {};

menuItems.forEach(item => {
    const key = t(item.label, 'en').toLowerCase().replace(/\.?/g, '').replace(/ /g, '-');
    const keywords: { [K in LanguageCode]?: string[] } = {};
    for (const langCode in languages) {
        const code = langCode as LanguageCode;
        const translatedLabel = t(item.label, code);
        if (translatedLabel) {
            keywords[code] = [translatedLabel.toLowerCase()];
        }
    }
    
    commandKeywords[key] = {
        path: item.path,
        keywords: keywords
    };
});

// Add more generic aliases
if (commandKeywords['dashboard']) {
    commandKeywords['dashboard'].keywords.en?.push('home', 'main page');
    commandKeywords['dashboard'].keywords.hi?.push('होम', 'मुख्य पृष्ठ');
}
if (commandKeywords['artisan-buddy']) {
    commandKeywords['artisan-buddy'].keywords.en?.push('buddy', 'chat');
}


export const useVoiceNavigation = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const recognitionRef = useRef(recognition);

  useEffect(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    const rec = recognitionRef.current;
    rec.lang = language;

    const handleResult = (event: SpeechRecognitionEvent) => {
      const currentTranscript = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(currentTranscript);
      processCommand(currentTranscript);
      stopListening();
    };

    const handleError = (event: SpeechRecognitionError) => {
      setError(`Speech recognition error: ${event.error}`);
      stopListening();
    };

    const handleEnd = () => {
        setIsListening(false);
    }
    
    rec.addEventListener('result', handleResult);
    rec.addEventListener('error', handleError);
    rec.addEventListener('end', handleEnd);

    return () => {
      rec.removeEventListener('result', handleResult);
      rec.removeEventListener('error', handleError);
      rec.removeEventListener('end', handleEnd);
    };
  }, [language]);

  const startListening = () => {
    if (isListening || !recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
      setTranscript('');
      toast({
        title: "Listening...",
        description: "Please say a command.",
      });
    } catch (e) {
      setError("Could not start speech recognition. It might already be active.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (!isListening || !recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const processCommand = (command: string) => {
    for (const key in commandKeywords) {
      const commandData = commandKeywords[key];
      const keywords = commandData.keywords[language] || commandData.keywords['en'] || [];
      if (keywords.some(kw => command.includes(kw))) {
        router.push(commandData.path);
        toast({
          title: "Navigating...",
          description: `Going to ${t(commandData.path, language)}.`,
        });
        return;
      }
    }
    toast({
      title: "Command not recognized",
      description: `I heard "${command}", but didn't understand.`,
      variant: "destructive",
    });
  };

  return { isListening, transcript, startListening, stopListening, error };
};

// Add SpeechRecognition types to the global window object
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  interface SpeechRecognitionError extends Event {
    error: string;
  }
}
