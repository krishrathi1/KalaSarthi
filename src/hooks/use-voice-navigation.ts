
"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { menuItems, LanguageCode, t, translateAsync, languages } from '@/lib/i18n';
import { useLanguage } from '@/context/language-context';

// Declare browser speech recognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// Mapping from app language codes to browser speech recognition language codes
const speechLangMap: { [key in LanguageCode]?: string } = {
  // Indian Languages
  en: 'en-US',
  hi: 'hi-IN',
  ta: 'ta-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  as: 'as-IN', // Assamese
  bho: 'bho-IN', // Bhojpuri
  doi: 'doi-IN', // Dogri
  gu: 'gu-IN', // Gujarati
  kn: 'kn-IN', // Kannada
  ks: 'ks-IN', // Kashmiri
  kok: 'kok-IN', // Konkani
  mai: 'mai-IN', // Maithili
  ml: 'ml-IN', // Malayalam
  mr: 'mr-IN', // Marathi
  raj: 'hi-IN', // Marwari/Rajasthani (fallback to Hindi)
  mni: 'mni-IN', // Manipuri
  ne: 'ne-NP', // Nepali
  or: 'or-IN', // Odia
  pa: 'pa-IN', // Punjabi
  sa: 'sa-IN', // Sanskrit
  sat: 'sat-IN', // Santali
  sd: 'sd-IN', // Sindhi
  ur: 'ur-IN', // Urdu
  // Foreign Languages
  es: 'es-ES', // Spanish
  fr: 'fr-FR', // French
  de: 'de-DE', // German
  zh: 'zh-CN', // Chinese (Mandarin)
  ja: 'ja-JP', // Japanese
  ar: 'ar-SA', // Arabic
  pt: 'pt-BR', // Portuguese (Brazil)
  ru: 'ru-RU', // Russian
  it: 'it-IT', // Italian
  ko: 'ko-KR', // Korean
  nl: 'nl-NL', // Dutch
  sv: 'sv-SE', // Swedish
  da: 'da-DK', // Danish
  no: 'no-NO', // Norwegian
  fi: 'fi-FI', // Finnish
  pl: 'pl-PL', // Polish
  tr: 'tr-TR', // Turkish
  th: 'th-TH', // Thai
  vi: 'vi-VN', // Vietnamese
};

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
    const key = t(item.label.en || "", 'en')!.toLowerCase().replace(/\.?/g, '').replace(/ /g, '-');
    const keywords: { [K in LanguageCode]?: string[] } = {};
    for (const langCode in languages) {
        const code = langCode as LanguageCode;
        const translatedLabel = t(item.label as { [key: string]: string }, code);
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
    commandKeywords['dashboard'].keywords.en?.push('home', 'main page', 'go to dashboard', 'open dashboard');
    commandKeywords['dashboard'].keywords.hi?.push('होम', 'मुख्य पृष्ठ', 'डैशबोर्ड खोलें', 'डैशबोर्ड पर जाएं');
    commandKeywords['dashboard'].keywords.ta?.push('முகப்பு', 'முதன்மை பக்கம்', 'டாஷ்போர்ட் திற');
    commandKeywords['dashboard'].keywords.bn?.push('হোম', 'মূল পৃষ্ঠা', 'ড্যাশবোর্ড খুলুন');
    commandKeywords['dashboard'].keywords.te?.push('హోమ్', 'ముఖ్య పేజీ', 'డాష్‌బోర్డ్ తెరవండి');
    // Add for other languages
    commandKeywords['dashboard'].keywords.gu?.push('હોમ', 'મુખ્ય પૃષ્ઠ', 'ડેશબોર્ડ ખોલો');
    commandKeywords['dashboard'].keywords.mr?.push('होम', 'मुख्य पृष्ठ', 'डॅशबोर्ड उघडा');
}
if (commandKeywords['artisan-buddy']) {
    commandKeywords['artisan-buddy'].keywords.en?.push('buddy', 'chat', 'artisan chat', 'talk to buddy');
    commandKeywords['artisan-buddy'].keywords.hi?.push('बडी', 'चैट', 'कारीगर चैट');
    commandKeywords['artisan-buddy'].keywords.ta?.push('நண்பன்', 'அரட்டை', 'கைவினைஞர் அரட்டை');
    commandKeywords['artisan-buddy'].keywords.bn?.push('বন্ধু', 'চ্যাট', 'শিল্পী চ্যাট');
    commandKeywords['artisan-buddy'].keywords.te?.push('బడ్డీ', 'చాట్', 'ఆర్టిసాన్ చాట్');
    commandKeywords['artisan-buddy'].keywords.gu?.push('બડી', 'ચેટ', 'કલાકાર ચેટ');
    commandKeywords['artisan-buddy'].keywords.mr?.push('साथी', 'चॅट', 'कला चॅट');
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
    try {
      const langCode = speechLangMap[language as LanguageCode] || language + '-US' || 'en-US';
      rec.lang = langCode;
    } catch (e) {
      console.warn(`Language ${language} not supported, falling back to en-US`);
      rec.lang = 'en-US';
    }

    const handleResult = async (event: any) => {
      const currentTranscript = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(currentTranscript);
      
      // Check if we're on the artisan buddy page - if so, only emit voice input event
      const currentPath = window.location.pathname;
      if (currentPath === '/artisan-buddy') {
        // On artisan buddy page, only emit voice input event and let the chat handle it
        const voiceInputEvent = new CustomEvent('voiceInput', {
          detail: {
            transcript: currentTranscript,
            isVoice: true,
            timestamp: new Date()
          }
        });
        window.dispatchEvent(voiceInputEvent);
        stopListening();
        return;
      }
      
      // Emit voice input event for speech assistant
      const voiceInputEvent = new CustomEvent('voiceInput', {
        detail: {
          transcript: currentTranscript,
          isVoice: true,
          timestamp: new Date()
        }
      });
      window.dispatchEvent(voiceInputEvent);
      
      await processCommand(currentTranscript);
      stopListening();
    };

    const handleError = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      stopListening();
    };

    const handleEnd = () => {
        setIsListening(false);
        // Emit voice end event
        const voiceEndEvent = new CustomEvent('voiceEnd');
        window.dispatchEvent(voiceEndEvent);
    }

    rec.addEventListener('result', handleResult as EventListener);
    rec.addEventListener('error', handleError as EventListener);
    rec.addEventListener('end', handleEnd);

    return () => {
      rec.removeEventListener('result', handleResult as EventListener);
      rec.removeEventListener('error', handleError as EventListener);
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
      
      // Emit voice start event
      const voiceStartEvent = new CustomEvent('voiceStart');
      window.dispatchEvent(voiceStartEvent);
      
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
    
    // Emit voice end event
    const voiceEndEvent = new CustomEvent('voiceEnd');
    window.dispatchEvent(voiceEndEvent);
  };

  const processCommand = async (command: string) => {
    // Check if we're on the artisan buddy page - if so, don't process navigation at all
    const currentPath = window.location.pathname;
    if (currentPath === '/artisan-buddy') {
      // On artisan buddy page, completely skip navigation processing
      // Let the Artisan Buddy handle all voice input
      return;
    }

    // Check for explicit navigation intent
    const navigationIntentKeywords = [
      'go to', 'navigate to', 'take me to', 'show me', 'open',
      'switch to', 'visit', 'access'
    ];
    
    const hasNavigationIntent = navigationIntentKeywords.some(keyword => 
      command.toLowerCase().includes(keyword)
    );

    // Additional check for conversational patterns that should NOT trigger navigation
    const conversationalPatterns = [
      'mera naam', 'my name is', 'i am', 'i am from', 'i live in',
      'how are you', 'what is', 'tell me about', 'can you help',
      'i want to know', 'explain', 'describe', 'hello', 'hi', 'namaste'
    ];
    
    const isConversational = conversationalPatterns.some(pattern => 
      command.toLowerCase().includes(pattern)
    );

    if (isConversational) {
      // This is conversational input, don't process as navigation
      return;
    }

    // First try with existing static keywords
    for (const key in commandKeywords) {
      const commandData = commandKeywords[key];
      const keywords = commandData.keywords[language] || commandData.keywords['en'] || [];
      if (keywords.some(kw => command.includes(kw))) {
        router.push(commandData.path);
        const pageName = await translateAsync(key.replace(/-/g, ' '), language);
        toast({
          title: "Navigating...",
          description: `Going to ${pageName || key}.`,
        });
        return;
      }
    }

    // Try dynamic translation matching for menu items
    for (const item of menuItems) {
      try {
        const filteredLabel: { [key: string]: string } = Object.fromEntries(
          Object.entries(item.label).filter(([_, v]) => typeof v === 'string' && v !== undefined)
            .map(([k, v]) => [k, v as string])
        );
        const translatedLabel = await translateAsync(filteredLabel, language);
        if (translatedLabel && command.includes(translatedLabel.toLowerCase())) {
          router.push(item.path);
          toast({
            title: "Navigating...",
            description: `Going to ${translatedLabel}.`,
          });
          return;
        }
      } catch (error) {
        console.error('Voice command translation failed:', error);
      }
    }

    // Show error for unrecognized commands (only on non-artisan-buddy pages)
    toast({
      title: "Command not recognized",
      description: `I heard "${command}", but didn't understand.`,
      variant: "destructive",
    });
  };

  return { isListening, transcript, startListening, stopListening, error };
};

// Types are declared at the top
