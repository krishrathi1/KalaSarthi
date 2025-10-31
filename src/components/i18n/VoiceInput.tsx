'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { voiceToText, VoiceRecognitionResult } from '@/lib/i18n/voice-to-text';
import { SupportedLanguage } from '@/lib/i18n/scheme-sahayak-translations';

interface VoiceInputProps {
  language: SupportedLanguage;
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function VoiceInput({
  language,
  onTranscript,
  onError,
  className = ''
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    setIsSupported(voiceToText.isSupported());
  }, []);

  const handleStart = async () => {
    if (!isSupported) {
      onError?.('Voice input is not supported in your browser');
      return;
    }

    const hasPermission = await voiceToText.requestPermission();
    if (!hasPermission) {
      onError?.('Microphone permission denied');
      return;
    }

    voiceToText.startListening(
      {
        language,
        continuous: false,
        interimResults: true,
        maxAlternatives: 1
      },
      (result: VoiceRecognitionResult) => {
        if (result.isFinal) {
          onTranscript(result.transcript);
          setInterimTranscript('');
          setIsListening(false);
        } else {
          setInterimTranscript(result.transcript);
        }
      },
      (error: string) => {
        setIsListening(false);
        setInterimTranscript('');
        onError?.(error);
      }
    );

    setIsListening(true);
  };

  const handleStop = () => {
    voiceToText.stopListening();
    setIsListening(false);
    setInterimTranscript('');
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        onClick={isListening ? handleStop : handleStart}
        variant={isListening ? 'destructive' : 'outline'}
        size="icon"
        className="min-h-[3rem] min-w-[3rem]"
      >
        {isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </Button>

      {interimTranscript && (
        <div className="text-sm text-muted-foreground italic p-2 bg-muted rounded">
          {interimTranscript}
        </div>
      )}
    </div>
  );
}
