'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Volume2, 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  Settings, 
  Globe,
  Loader2,
  Zap,
  User,
  RotateCcw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { withCache, debounce, CACHE_TTL } from '@/lib/performance';

interface VoiceConfig {
  name: string;
  gender: 'MALE' | 'FEMALE';
  quality: 'Standard' | 'Wavenet' | 'Neural2' | 'Chirp3-HD';
  description?: string;
  accent?: string;
  age?: 'young' | 'adult' | 'senior';
  personality?: 'professional' | 'friendly' | 'warm' | 'authoritative';
}

interface VoiceIntegrationProps {
  text: string;
  language?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
  onVoiceChange?: (voice: VoiceConfig) => void;
  onLanguageChange?: (language: string) => void;
}

export function VoiceIntegration({
  text,
  language = 'en-US',
  autoPlay = false,
  showControls = true,
  className = '',
  onVoiceChange,
  onLanguageChange
}: VoiceIntegrationProps) {
  const [languages, setLanguages] = useState<Array<{code: string; name: string}>>([]);
  const [voices, setVoices] = useState<VoiceConfig[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Voice parameters
  const [speed, setSpeed] = useState([1.0]);
  const [pitch, setPitch] = useState([0.0]);
  const [volume, setVolume] = useState([1.0]);
  const [enableTranslation, setEnableTranslation] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Move loadVoices above this useMemo
    const loadVoices = useCallback(async (languageCode: string) => {
    try {
      setIsLoading(true);
      const data = await withCache(
        `voices-${languageCode}`,
        async () => {
          const response = await fetch(`/api/voices/${languageCode}`);
          const result = await response.json();
          if (!result.success) throw new Error(result.error);
          return result.voices;
        },
        { ttl: CACHE_TTL.MEDIUM }
      );
      setVoices(data);
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedLoadVoices = useMemo(
    () => debounce(loadVoices, 200),
    [loadVoices]
  );

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      debouncedLoadVoices(selectedLanguage);
      if (onLanguageChange) {
        onLanguageChange(selectedLanguage);
      }
    }
  }, [selectedLanguage, onLanguageChange, debouncedLoadVoices]);

  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      const defaultVoice = voices[0];
      setSelectedVoice(defaultVoice);
      if (onVoiceChange) {
        onVoiceChange(defaultVoice);
      }
    }
  }, [voices, selectedVoice, onVoiceChange]);

  useEffect(() => {
    if (autoPlay && text && selectedVoice) {
      playText();
    }
  }, [autoPlay, text, selectedVoice]);

  const loadLanguages = useCallback(async () => {
    try {
      const data = await withCache(
        'languages',
        async () => {
          const response = await fetch('/api/voices/languages');
          const result = await response.json();
          if (!result.success) throw new Error(result.error);
          return result.languages;
        },
        { ttl: CACHE_TTL.LONG }
      );
      setLanguages(data);
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  }, []);



  const playText = useCallback(async () => {
    if (!selectedVoice || !text.trim()) return;

    try {
      setIsLoading(true);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Create cache key for audio
      const audioCacheKey = `audio-${text}-${selectedLanguage}-${selectedVoice.name}-${speed[0]}-${pitch[0]}-${volume[0]}`;
      
      const data = await withCache(
        audioCacheKey,
        async () => {
          const response = await fetch('/api/tts/enhanced', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text,
              language: selectedLanguage,
              voice: selectedVoice.name,
              gender: selectedVoice.gender,
              quality: selectedVoice.quality,
              speed: speed[0],
              pitch: pitch[0],
              volume: volume[0],
              enableTranslation
            })
          });

          const result = await response.json();
          if (!result.success) throw new Error(result.error || 'Voice synthesis failed');
          return result;
        },
        { ttl: CACHE_TTL.VERY_LONG } // Cache audio for 24 hours
      );

      const audio = new Audio(`data:audio/mp3;base64,${data.audio.data}`);
      audio.onended = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      
      audioRef.current = audio;
      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error('Error playing text:', error);
      toast({
        title: 'Error',
        description: 'Failed to play text',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [text, selectedLanguage, selectedVoice, speed, pitch, volume, enableTranslation]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Debounced handlers for better performance
  const debouncedPlayText = useMemo(
    () => debounce(playText, 300),
    [playText]
  );

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
    <div className={`space-y-4 ${className}`}>
      {/* Main Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={isPlaying ? stopAudio : debouncedPlayText}
          disabled={isLoading || !selectedVoice || !text.trim()}
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        {showControls && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {selectedVoice && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{getGenderIcon(selectedVoice.gender)}</span>
            <span>{selectedVoice.name}</span>
            <Badge className={getQualityColor(selectedVoice.quality)}>
              {selectedVoice.quality}
            </Badge>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Settings</CardTitle>
            <CardDescription>
              Customize your voice experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Language
              </Label>
              <Select 
                value={selectedLanguage} 
                onValueChange={setSelectedLanguage}
                disabled={isLoading}
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
                <Label>Voice</Label>
                <Select 
                  value={selectedVoice?.name || ''} 
                  onValueChange={(voiceName) => {
                    const voice = voices.find(v => v.name === voiceName);
                    if (voice) {
                      setSelectedVoice(voice);
                      if (onVoiceChange) {
                        onVoiceChange(voice);
                      }
                    }
                  }}
                  disabled={isLoading}
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

            {/* Voice Parameters */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Speed: {speed[0].toFixed(1)}x
                </Label>
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={0.25}
                  max={4.0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Pitch: {pitch[0].toFixed(1)}
                </Label>
                <Slider
                  value={pitch}
                  onValueChange={setPitch}
                  min={-20.0}
                  max={20.0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Volume: {volume[0].toFixed(1)}
                </Label>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  min={0.0}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Translation Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="translation"
                checked={enableTranslation}
                onCheckedChange={setEnableTranslation}
              />
              <Label htmlFor="translation">Enable Translation</Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
