'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Mic, MicOff, Volume2, Settings, Languages } from 'lucide-react';
import { VoiceNavigationService } from '@/lib/service/VoiceNavigationService';
import { cn } from '@/lib/utils';

interface VoiceControlProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'floating' | 'inline';
  showSettings?: boolean;
  autoStart?: boolean;
}

export function VoiceControl({
  className,
  size = 'md',
  variant = 'default',
  showSettings = true,
  autoStart = false
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const voiceServiceRef = useRef<VoiceNavigationService | null>(null);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  useEffect(() => {
    // Initialize voice service
    const initVoiceService = async () => {
      try {
        voiceServiceRef.current = VoiceNavigationService.getInstance({
          language: currentLanguage,
          feedbackEnabled: true
        });

        // Set up event listeners
        voiceServiceRef.current.on('listening', (data: any) => {
          setIsListening(data.active);
        });

        voiceServiceRef.current.on('command', (data: any) => {
          setLastCommand(data.command.command);
          setIsProcessing(true);
        });

        voiceServiceRef.current.on('action', () => {
          setIsProcessing(false);
        });

        voiceServiceRef.current.on('error', (data: any) => {
          console.error('Voice service error:', data.error);
          setIsProcessing(false);
        });

        if (autoStart) {
          await voiceServiceRef.current.start();
        }
      } catch (error) {
        console.error('Failed to initialize voice service:', error);
        // Set fallback state
        setLastCommand('Voice service unavailable - configure API keys');
      }
    };

    initVoiceService();

    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.destroy();
      }
    };
  }, [currentLanguage, autoStart]);

  const handleToggleListening = async () => {
    if (!voiceServiceRef.current) {
      console.warn('Voice service not available');
      setLastCommand('Voice service not available - configure API keys');
      return;
    }

    try {
      if (isListening) {
        await voiceServiceRef.current.stop();
      } else {
        await voiceServiceRef.current.start();
      }
    } catch (error) {
      console.error('Failed to toggle voice listening:', error);
      setLastCommand('Voice service error - check configuration');
    }
  };

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    setShowLanguageSelector(false);
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setLanguage(language);
    }
  };

  const supportedLanguages = [
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'hi-IN', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'te-IN', name: 'தెలుగు', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'मराठी', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'മലയാളം', flag: '🇮🇳' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' }
  ];

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleToggleListening}
                disabled={isProcessing}
                className={cn(
                  sizeClasses[size],
                  'rounded-full transition-all duration-200',
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600',
                  isProcessing && 'opacity-50'
                )}
              >
                {isProcessing ? (
                  <Volume2 className={iconSizes[size]} />
                ) : isListening ? (
                  <MicOff className={iconSizes[size]} />
                ) : (
                  <Mic className={iconSizes[size]} />
                )}
              </Button>

              {showSettings && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                  >
                    <Languages className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {lastCommand && (
              <div className="mt-2 text-xs text-muted-foreground max-w-48 truncate">
                "{lastCommand}"
              </div>
            )}

            {showLanguageSelector && (
              <div className="absolute bottom-full right-0 mb-2 bg-background border rounded-lg shadow-lg p-2 min-w-48">
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded hover:bg-accent',
                      currentLanguage === lang.code && 'bg-accent'
                    )}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          onClick={handleToggleListening}
          disabled={isProcessing}
          variant={isListening ? 'destructive' : 'default'}
          className={cn(
            sizeClasses[size],
            'rounded-full',
            isProcessing && 'opacity-50'
          )}
        >
          {isProcessing ? (
            <Volume2 className={iconSizes[size]} />
          ) : isListening ? (
            <MicOff className={iconSizes[size]} />
          ) : (
            <Mic className={iconSizes[size]} />
          )}
        </Button>

        {isListening && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Listening...
          </div>
        )}

        {lastCommand && (
          <div className="text-sm text-muted-foreground max-w-64 truncate">
            "{lastCommand}"
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <Button
        onClick={handleToggleListening}
        disabled={isProcessing}
        className={cn(
          sizeClasses[size],
          'rounded-full transition-all duration-200',
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600'
        )}
      >
        {isProcessing ? (
          <Volume2 className={iconSizes[size]} />
        ) : isListening ? (
          <MicOff className={iconSizes[size]} />
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </Button>

      <div className="text-center">
        <div className="text-sm font-medium">
          {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Voice Control'}
        </div>
        {lastCommand && (
          <div className="text-xs text-muted-foreground mt-1 max-w-48 truncate">
            "{lastCommand}"
          </div>
        )}
      </div>

      {showSettings && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
          >
            <Languages className="h-4 w-4 mr-2" />
            Language
          </Button>
        </div>
      )}

      {showLanguageSelector && (
        <Card className="w-full max-w-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    'p-2 text-sm rounded border hover:bg-accent transition-colors',
                    currentLanguage === lang.code && 'bg-accent border-primary'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}