'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Volume2, 
  Play, 
  Pause, 
  RotateCcw, 
  Loader2, 
  Globe, 
  Mic, 
  Settings,
  Zap,
  User,
  Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VoiceManager } from './VoiceManager';

interface VoiceConfig {
  name: string;
  gender: 'MALE' | 'FEMALE';
  quality: 'Standard' | 'Wavenet' | 'Neural2' | 'Chirp3-HD';
  description?: string;
  accent?: string;
  age?: 'young' | 'adult' | 'senior';
  personality?: 'professional' | 'friendly' | 'warm' | 'authoritative';
}

interface Language {
  code: string;
  name: string;
}

export function VoiceDemo() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [voices, setVoices] = useState<VoiceConfig[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig | null>(null);
  const [customText, setCustomText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Voice settings
  const [speed, setSpeed] = useState([1.0]);
  const [pitch, setPitch] = useState([0.0]);
  const [volume, setVolume] = useState([1.0]);
  const [enableTranslation, setEnableTranslation] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');

  // Demo texts for different languages
  const demoTexts = {
    'en-US': 'Hello! Welcome to our voice demonstration. This is a high-quality text-to-speech system powered by Google Cloud.',
    'en-GB': 'Good day! Welcome to our voice demonstration. This is a high-quality text-to-speech system powered by Google Cloud.',
    'en-IN': 'Namaste! Welcome to our voice demonstration. This is a high-quality text-to-speech system powered by Google Cloud.',
    'hi-IN': 'नमस्ते! हमारे वॉइस डेमो में आपका स्वागत है। यह Google Cloud द्वारा संचालित एक उच्च गुणवत्ता वाला टेक्स्ट-टू-स्पीच सिस्टम है।',
    'bn-IN': 'নমস্কার! আমাদের ভয়েস ডেমোতে স্বাগতম। এটি Google Cloud দ্বারা চালিত একটি উচ্চ-মানের টেক্সট-টু-স্পিচ সিস্টেম।',
    'ta-IN': 'வணக்கம்! எங்கள் குரல் டெமோவிற்கு வரவேற்கிறோம். இது Google Cloud மூலம் இயக்கப்படும் உயர் தரமான உரை-க்குரல் அமைப்பு.',
    'te-IN': 'నమస్కారం! మా వాయిస్ డెమోకు స్వాగతం. ఇది Google Cloud ద్వారా నడపబడే అధిక-నాణ్యత టెక్స్ట్-టు-స్పీచ్ సిస్టమ్.',
    'gu-IN': 'નમસ્કાર! અમારા વૉઇસ ડેમોમાં આપનું સ્વાગત છે. આ Google Cloud દ્વારા સંચાલિત એક ઉચ્ચ-ગુણવત્તાની ટેક્સ્ટ-ટુ-સ્પીચ સિસ્ટમ છે.',
    'kn-IN': 'ನಮಸ್ಕಾರ! ನಮ್ಮ ವಾಯ್ಸ್ ಡೆಮೋಗೆ ಸ್ವಾಗತ. ಇದು Google Cloud ನಿಂದ ನಡೆಸಲ್ಪಡುವ ಉನ್ನತ-ಗುಣಮಟ್ಟದ ಟೆಕ್ಸ್ಟ್-ಟು-ಸ್ಪೀಚ್ ಸಿಸ್ಟಮ್.',
    'ml-IN': 'നമസ്കാരം! ഞങ്ങളുടെ വോയ്സ് ഡെമോയിലേക്ക് സ്വാഗതം. ഇത് Google Cloud ഉപയോഗിച്ച് പ്രവർത്തിക്കുന്ന ഉയർന്ന-നിലവാരമുള്ള ടെക്സ്റ്റ്-ടു-സ്പീച്ച് സിസ്റ്റമാണ്.',
    'mr-IN': 'नमस्कार! आमच्या व्हॉइस डेमोमध्ये आपले स्वागत आहे. ही Google Cloud द्वारा चालविलेली उच्च-गुणवत्तेची टेक्स्ट-टू-स्पीच सिस्टम आहे.',
    'pa-IN': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਸਾਡੇ ਵੌਇਸ ਡੈਮੋ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਇਹ Google Cloud ਦੁਆਰਾ ਚਲਾਇਆ ਗਿਆ ਇੱਕ ਉੱਚ-ਗੁਣਵੱਤਾ ਵਾਲਾ ਟੈਕਸਟ-ਟੂ-ਸਪੀਚ ਸਿਸਟਮ ਹੈ।',
    'or-IN': 'ନମସ୍କାର! ଆମର ଭଏସ୍ ଡେମୋରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ଏହା Google Cloud ଦ୍ୱାରା ଚାଳିତ ଏକ ଉଚ୍ଚ-ଗୁଣବତ୍ତାର ଟେକ୍ସଟ-ଟୁ-ସ୍ପିଚ୍ ସିଷ୍ଟମ୍।',
    'as-IN': 'নমস্কাৰ! আমাৰ ভয়চ ডেমোলৈ স্বাগতম। এই Google Cloud ৰ দ্বাৰা পৰিচালিত এটা উচ্চ-গুণমানৰ টেক্সট-টু-স্পিচ ছিষ্টেম।',
    'ur-PK': 'السلام علیکم! ہمارے وائس ڈیمو میں خوش آمدید۔ یہ Google Cloud کے ذریعے چلایا جانے والا ایک اعلیٰ معیار کا ٹیکسٹ-ٹو-اسپیچ سسٹم ہے۔',
    'ne-NP': 'नमस्कार! हाम्रो भ्वाइस डेमोमा स्वागत छ। यो Google Cloud द्वारा सञ्चालित एक उच्च-गुणस्तरको टेक्स्ट-टु-स्पिच प्रणाली हो।'
  };

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      loadVoices(selectedLanguage);
      setCustomText(demoTexts[selectedLanguage as keyof typeof demoTexts] || demoTexts['en-US']);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      setSelectedVoice(voices[0]);
    }
  }, [voices, selectedVoice]);

  const loadLanguages = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const loadVoices = async (languageCode: string) => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const testVoice = async () => {
    if (!selectedVoice || !customText.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/tts/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: customText,
          language: selectedLanguage,
          voice: selectedVoice.name,
          gender: selectedVoice.gender,
          quality: selectedVoice.quality,
          speed: speed[0],
          pitch: pitch[0],
          volume: volume[0],
          enableTranslation,
          sourceLanguage
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
      setIsLoading(false);
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

  const getPersonalityIcon = (personality?: string) => {
    switch (personality) {
      case 'professional': return '💼';
      case 'friendly': return '😊';
      case 'warm': return '🤗';
      case 'authoritative': return '👔';
      default: return '🎭';
    }
  };

  const getAgeIcon = (age?: string) => {
    switch (age) {
      case 'young': return '🧑‍🎓';
      case 'adult': return '👨‍💼';
      case 'senior': return '👴';
      default: return '👤';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Volume2 className="h-8 w-8 text-blue-600" />
          Google Cloud Voice Demo
        </h1>
        <p className="text-gray-600">
          Experience high-quality text-to-speech with multiple languages and voices
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Voice Settings
            </CardTitle>
            <CardDescription>
              Select your preferred language and voice
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
                    if (voice) setSelectedVoice(voice);
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
                          {voice.personality && (
                            <span title={`Personality: ${voice.personality}`}>
                              {getPersonalityIcon(voice.personality)}
                            </span>
                          )}
                          {voice.age && (
                            <span title={`Age: ${voice.age}`}>
                              {getAgeIcon(voice.age)}
                            </span>
                          )}
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{selectedVoice.name}</p>
                    <div className="flex gap-1">
                      <Badge className={getQualityColor(selectedVoice.quality)}>
                        {selectedVoice.quality}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{getGenderIcon(selectedVoice.gender)} {selectedVoice.gender}</span>
                    {selectedVoice.accent && (
                      <>
                        <span>•</span>
                        <span>{selectedVoice.accent}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {selectedVoice.personality && (
                      <span title={`Personality: ${selectedVoice.personality}`}>
                        {getPersonalityIcon(selectedVoice.personality)} {selectedVoice.personality}
                      </span>
                    )}
                    {selectedVoice.age && (
                      <span title={`Age: ${selectedVoice.age}`}>
                        {getAgeIcon(selectedVoice.age)} {selectedVoice.age}
                      </span>
                    )}
                  </div>
                  {selectedVoice.description && (
                    <p className="text-xs text-gray-500">{selectedVoice.description}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Text Input and Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Text Input & Controls
            </CardTitle>
            <CardDescription>
              Enter text and adjust voice parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Input */}
            <div className="space-y-2">
              <Label htmlFor="text-input">Text to Speak</Label>
              <textarea
                id="text-input"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none"
                disabled={isLoading}
              />
            </div>

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

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={isPlaying ? stopAudio : testVoice}
                disabled={isLoading || !selectedVoice || !customText.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
              {isPlaying && (
                <Button
                  variant="outline"
                  onClick={stopAudio}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{languages.length}</p>
              <p className="text-sm text-gray-600">Languages</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{voices.length}</p>
              <p className="text-sm text-gray-600">Voices Available</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {voices.filter(v => v.quality === 'Neural2').length}
              </p>
              <p className="text-sm text-gray-600">Neural2 Voices</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {voices.filter(v => v.gender === 'FEMALE').length}
              </p>
              <p className="text-sm text-gray-600">Female Voices</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
