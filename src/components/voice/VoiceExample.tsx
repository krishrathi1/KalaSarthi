'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceIntegration } from './VoiceIntegration';
import { Volume2, Mic } from 'lucide-react';

interface VoiceConfig {
  name: string;
  gender: string;
  quality: string;
  accent?: string;
  age?: string;
  personality?: string;
  description?: string;
}

export function VoiceExample() {
  const [text, setText] = useState('Hello! This is a demonstration of Google Cloud Text-to-Speech with multiple voices and languages.');
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');

  const sampleTexts = [
    {
      language: 'en-US',
      text: 'Hello! Welcome to our voice demonstration. This is a high-quality text-to-speech system powered by Google Cloud.',
      label: 'English (US)'
    },
    {
      language: 'hi-IN',
      text: 'नमस्ते! हमारे वॉइस डेमो में आपका स्वागत है। यह Google Cloud द्वारा संचालित एक उच्च गुणवत्ता वाला टेक्स्ट-टू-स्पीच सिस्टम है।',
      label: 'Hindi'
    },
    {
      language: 'bn-IN',
      text: 'নমস্কার! আমাদের ভয়েস ডেমোতে স্বাগতম। এটি Google Cloud দ্বারা চালিত একটি উচ্চ-মানের টেক্সট-টু-স্পিচ সিস্টেম।',
      label: 'Bengali'
    },
    {
      language: 'ta-IN',
      text: 'வணக்கம்! எங்கள் குரல் டெமோவிற்கு வரவேற்கிறோம். இது Google Cloud மூலம் இயக்கப்படும் உயர் தரமான உரை-க்குரல் அமைப்பு.',
      label: 'Tamil'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Volume2 className="h-6 w-6 text-blue-600" />
          Voice Integration Example
        </h2>
        <p className="text-gray-600">
          Try different voices and languages with Google Cloud TTS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Text Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Text Input
            </CardTitle>
            <CardDescription>
              Enter or select text to convert to speech
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="min-h-[120px]"
            />
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Sample Texts:</p>
              <div className="grid grid-cols-2 gap-2">
                {sampleTexts.map((sample, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setText(sample.text);
                      setSelectedLanguage(sample.language);
                    }}
                    className="text-left justify-start"
                  >
                    {sample.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Controls</CardTitle>
            <CardDescription>
              Play the text with different voices and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceIntegration
              text={text}
              language={selectedLanguage}
              showControls={true}
              onVoiceChange={setSelectedVoice}
              onLanguageChange={setSelectedLanguage}
            />
          </CardContent>
        </Card>
      </div>

      {/* Voice Information */}
      {selectedVoice && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Voice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedVoice.name}</p>
              <p><strong>Gender:</strong> {selectedVoice.gender}</p>
              <p><strong>Quality:</strong> {selectedVoice.quality}</p>
              {selectedVoice.accent && <p><strong>Accent:</strong> {selectedVoice.accent}</p>}
              {selectedVoice.age && <p><strong>Age:</strong> {selectedVoice.age}</p>}
              {selectedVoice.personality && <p><strong>Personality:</strong> {selectedVoice.personality}</p>}
              {selectedVoice.description && <p><strong>Description:</strong> {selectedVoice.description}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
