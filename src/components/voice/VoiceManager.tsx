'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Volume2, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VoiceConfig {
  name: string;
  gender: 'MALE' | 'FEMALE';
  quality: 'Standard' | 'Wavenet' | 'Neural2' | 'Chirp3-HD';
  description?: string;
}

interface Language {
  code: string;
  name: string;
}

interface VoiceManagerProps {
  onVoiceChange?: (voice: VoiceConfig, language: string) => void;
  initialLanguage?: string;
  initialVoice?: string;
  className?: string;
}

export function VoiceManager({ 
  onVoiceChange, 
  initialLanguage = 'hi-IN', 
  initialVoice,
  className 
}: VoiceManagerProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [voices, setVoices] = useState<VoiceConfig[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Load supported languages on mount
  useEffect(() => {
    loadLanguages();
  }, []);

  // Load voices when language changes
  useEffect(() => {
    if (selectedLanguage) {
      loadVoices(selectedLanguage);
    }
  }, [selectedLanguage]);

  // Set initial voice when voices are loaded
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      const defaultVoice = voices.find(v => v.name === initialVoice) || voices[0];
      setSelectedVoice(defaultVoice);
      if (onVoiceChange) {
        onVoiceChange(defaultVoice, selectedLanguage);
      }
    }
  }, [voices, initialVoice, selectedLanguage, onVoiceChange]);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/voices/languages');
      const data = await response.json();
      
      if (data.success) {
        setLanguages(data.languages);
      } else {
        throw new Error(data.error || 'Failed to load languages');
      }
    } catch (error) {
      console.error('Error loading languages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load supported languages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVoices = async (languageCode: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/voices/${languageCode}`);
      const data = await response.json();
      
      if (data.success) {
        setVoices(data.voices);
      } else {
        throw new Error(data.error || 'Failed to load voices');
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load voices for selected language',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setSelectedVoice(null);
    setVoices([]);
  };

  const handleVoiceChange = (voiceName: string) => {
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      setSelectedVoice(voice);
      if (onVoiceChange) {
        onVoiceChange(voice, selectedLanguage);
      }
    }
  };

  const testVoice = async () => {
    if (!selectedVoice) return;

    try {
      setLoading(true);
      const testText = selectedLanguage.startsWith('hi') 
        ? 'नमस्ते! मैं आपकी आवाज़ का परीक्षण कर रहा हूं।'
        : 'Hello! I am testing your voice.';

      const response = await fetch('/api/tts/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          language: selectedLanguage,
          voice: selectedVoice.name,
          gender: selectedVoice.gender,
          quality: selectedVoice.quality
        })
      });

      const data = await response.json();

      if (data.success) {
        // Stop any currently playing audio
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }

        // Create new audio element
        const audio = new Audio(`data:audio/mp3;base64,${data.audio.data}`);
        audio.onended = () => setIsPlaying(false);
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        
        setAudioElement(audio);
        await audio.play();
      } else {
        throw new Error(data.error || 'Voice test failed');
      }
    } catch (error) {
      console.error('Error testing voice:', error);
      toast({
        title: 'Error',
        description: 'Failed to test voice',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Neural2': return 'bg-green-100 text-green-800';
      case 'Wavenet': return 'bg-blue-100 text-blue-800';
      case 'Chirp3-HD': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGenderIcon = (gender: string) => {
    return gender === 'FEMALE' ? '👩' : '👨';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Voice Settings
        </CardTitle>
        <CardDescription>
          Select your preferred language and voice for text-to-speech
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <Select 
            value={selectedLanguage} 
            onValueChange={handleLanguageChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Selection */}
        {voices.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Voice</label>
            <Select 
              value={selectedVoice?.name || ''} 
              onValueChange={handleVoiceChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.name} value={voice.name}>
                    <div className="flex items-center gap-2">
                      <span>{getGenderIcon(voice.gender)}</span>
                      <span>{voice.name}</span>
                      <Badge className={getQualityColor(voice.quality)}>
                        {voice.quality}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Voice Info */}
        {selectedVoice && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedVoice.name}</p>
                <p className="text-sm text-gray-600">
                  {getGenderIcon(selectedVoice.gender)} {selectedVoice.gender} • {selectedVoice.quality}
                </p>
                {selectedVoice.description && (
                  <p className="text-xs text-gray-500 mt-1">{selectedVoice.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={isPlaying ? stopAudio : testVoice}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                {isPlaying && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={stopAudio}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Loading...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
