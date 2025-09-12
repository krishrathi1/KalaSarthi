'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceManager } from '@/components/voice/VoiceManager';
import { Loader2, Volume2, Play, Pause, RotateCcw, Download, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VoiceConfig {
  name: string;
  gender: 'MALE' | 'FEMALE';
  quality: 'Standard' | 'Wavenet' | 'Neural2' | 'Chirp3-HD';
  description?: string;
}

interface TTSResult {
  success: boolean;
  audio?: {
    data: string;
    format: string;
    language: string;
    voice: string;
  };
  translation?: {
    original: string;
    translated: string;
    sourceLanguage: string;
    targetLanguage: string;
  };
  processing?: {
    time: number;
    cached: boolean;
  };
  error?: string;
}

export default function VoiceDemoPage() {
  const [text, setText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsResult, setTtsResult] = useState<TTSResult | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [enableTranslation, setEnableTranslation] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const audioRef = useRef<HTMLAudioElement>(null);

  const sampleTexts = {
    'hi-IN': 'नमस्ते! मैं कलामित्र का आर्टिफिशियल इंटेलिजेंस सहायक हूं। मैं आपकी कला और व्यवसाय में आपकी मदद कर सकता हूं।',
    'en-IN': 'Hello! I am KalaMitra\'s AI assistant. I can help you with your art and business.',
    'bn-IN': 'নমস্কার! আমি কলামিত্রের কৃত্রিম বুদ্ধিমত্তার সহায়ক। আমি আপনার শিল্প এবং ব্যবসায় আপনাকে সাহায্য করতে পারি।',
    'ta-IN': 'வணக்கம்! நான் கலாமித்ராவின் செயற்கை நுண்ணறிவு உதவியாளர். உங்கள் கலை மற்றும் வணிகத்தில் உங்களுக்கு உதவ முடியும்.',
    'te-IN': 'నమస్కారం! నేను కళామిత్ర యొక్క కృత్రిమ మేధస్సు సహాయకుడిని. మీ కళ మరియు వ్యాపారంలో మీకు సహాయం చేయగలను.',
    'gu-IN': 'નમસ્તે! હું કલામિત્રનો કૃત્રિમ બુદ્ધિમત્તા સહાયક છું. હું તમારી કલા અને વ્યવસાયમાં તમારી મદદ કરી શકું છું.',
    'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ಕಲಾಮಿತ್ರದ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯ ಸಹಾಯಕ. ನಿಮ್ಮ ಕಲೆ ಮತ್ತು ವ್ಯಾಪಾರದಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಹುದು.',
    'ml-IN': 'നമസ്കാരം! ഞാൻ കലാമിത്രയുടെ കൃത്രിമബുദ്ധി സഹായകനാണ്. നിങ്ങളുടെ കലയിലും വ്യാപാരത്തിലും നിങ്ങളെ സഹായിക്കാം.',
    'mr-IN': 'नमस्कार! मी कलामित्राचा कृत्रिम बुद्धिमत्ता सहायक आहे. मी तुमच्या कला आणि व्यवसायात तुमची मदत करू शकतो.',
    'pa-IN': 'ਨਮਸਤੇ! ਮੈਂ ਕਲਾਮਿਤਰ ਦਾ ਕ੍ਰਿਤਰਿਮ ਬੁੱਧੀ ਸਹਾਇਕ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਕਲਾ ਅਤੇ ਵਪਾਰ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।',
    'or-IN': 'ନମସ୍କାର! ମୁଁ କଲାମିତ୍ରର କୃତ୍ରିମ ବୁଦ୍ଧିମତ୍ତା ସହାୟକ। ମୁଁ ତୁମର କଳା ଏବଂ ବ୍ୟବସାୟରେ ତୁମକୁ ସହାୟତା କରିପାରେ।',
    'as-IN': 'নমস্কাৰ! মই কলামিত্ৰৰ কৃত্ৰিম বুদ্ধিমত্তাৰ সহায়ক। মই আপোনাৰ কলা আৰু ব্যৱসায়ত আপোনাক সহায় কৰিব পাৰো।',
    'ur-PK': 'السلام علیکم! میں کلامیترا کا مصنوعی ذہانت کا معاون ہوں۔ میں آپ کی فن اور کاروبار میں آپ کی مدد کر سکتا ہوں۔',
    'ne-NP': 'नमस्कार! म कलामित्रको कृत्रिम बुद्धिमत्ता सहायक हुँ। म तपाईंको कला र व्यापारमा तपाईंलाई मद्दत गर्न सक्छु।'
  };

  const handleVoiceChange = (voice: VoiceConfig, language: string) => {
    setSelectedVoice(voice);
    setSelectedLanguage(language);
  };

  const handleSynthesize = async () => {
    if (!text.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some text to synthesize',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedVoice) {
      toast({
        title: 'Error',
        description: 'Please select a voice',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
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
          enableTranslation,
          sourceLanguage: enableTranslation ? sourceLanguage : undefined
        })
      });

      const result: TTSResult = await response.json();
      setTtsResult(result);

      if (result.success && result.audio) {
        // Stop any currently playing audio
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }

        // Create new audio element
        const audio = new Audio(`data:audio/mp3;base64,${result.audio.data}`);
        audio.onended = () => setIsPlaying(false);
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        
        setAudioElement(audio);
        await audio.play();
      } else {
        throw new Error(result.error || 'TTS synthesis failed');
      }
    } catch (error) {
      console.error('TTS synthesis error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to synthesize speech',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
    }
  };

  const handleStop = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (ttsResult?.audio?.data) {
      const link = document.createElement('a');
      link.href = `data:audio/mp3;base64,${ttsResult.audio.data}`;
      link.download = `tts-${selectedLanguage}-${Date.now()}.mp3`;
      link.click();
    }
  };

  const handleCopyText = () => {
    if (ttsResult?.translation?.translated) {
      navigator.clipboard.writeText(ttsResult.translation.translated);
      toast({
        title: 'Copied',
        description: 'Translated text copied to clipboard'
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard'
      });
    }
  };

  const handleSampleText = () => {
    const sample = sampleTexts[selectedLanguage as keyof typeof sampleTexts];
    if (sample) {
      setText(sample);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Enhanced Text-to-Speech Demo</h1>
        <p className="text-gray-600">
          Experience high-quality multilingual text-to-speech with intelligent voice selection
        </p>
      </div>

      <Tabs defaultValue="synthesize" className="space-y-6">
        <TabsList>
          <TabsTrigger value="synthesize">Synthesize Speech</TabsTrigger>
          <TabsTrigger value="voice-settings">Voice Settings</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="synthesize" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>Text Input</CardTitle>
                <CardDescription>
                  Enter text to synthesize or use sample text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Text to Synthesize</label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text to synthesize..."
                    rows={6}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSampleText}
                    disabled={!sampleTexts[selectedLanguage as keyof typeof sampleTexts]}
                  >
                    Use Sample Text
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyText}
                    disabled={!text}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Translation Options</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableTranslation"
                      checked={enableTranslation}
                      onChange={(e) => setEnableTranslation(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="enableTranslation" className="text-sm">
                      Enable translation
                    </label>
                  </div>
                  {enableTranslation && (
                    <div>
                      <label className="text-sm font-medium">Source Language</label>
                      <select
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="bn">Bengali</option>
                        <option value="ta">Tamil</option>
                        <option value="te">Telugu</option>
                        <option value="gu">Gujarati</option>
                        <option value="kn">Kannada</option>
                        <option value="ml">Malayalam</option>
                        <option value="mr">Marathi</option>
                        <option value="pa">Punjabi</option>
                        <option value="or">Odia</option>
                        <option value="as">Assamese</option>
                        <option value="ur">Urdu</option>
                        <option value="ne">Nepali</option>
                      </select>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSynthesize}
                  disabled={isLoading || !text.trim() || !selectedVoice}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Synthesize Speech
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card>
              <CardHeader>
                <CardTitle>Audio Output</CardTitle>
                <CardDescription>
                  Play, pause, or download the synthesized audio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ttsResult?.success && ttsResult.audio ? (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{ttsResult.audio.voice}</p>
                          <p className="text-sm text-gray-600">
                            {ttsResult.audio.language} • {ttsResult.audio.format}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {ttsResult.processing?.cached ? 'Cached' : 'Live'}
                        </Badge>
                      </div>
                      {ttsResult.processing && (
                        <p className="text-xs text-gray-500">
                          Processing time: {ttsResult.processing.time}ms
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handlePlayPause}
                        disabled={!audioElement}
                        className="flex-1"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleStop}
                        disabled={!audioElement}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDownload}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>

                    {ttsResult.translation && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-2">Translation</h4>
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Original ({ttsResult.translation.sourceLanguage}):</strong><br />
                          {ttsResult.translation.original}
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Translated ({ttsResult.translation.targetLanguage}):</strong><br />
                          {ttsResult.translation.translated}
                        </p>
                      </div>
                    )}
                  </>
                ) : ttsResult?.error ? (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-700 font-medium">Error</p>
                    <p className="text-red-600 text-sm">{ttsResult.error}</p>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audio generated yet</p>
                    <p className="text-sm">Enter text and click synthesize to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="voice-settings">
          <VoiceManager
            onVoiceChange={handleVoiceChange}
            initialLanguage={selectedLanguage}
            className="max-w-2xl"
          />
        </TabsContent>

        <TabsContent value="features">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Intelligent Voice Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Automatically selects the best voice based on language, gender preference, and quality requirements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multiple Voice Qualities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Choose from Standard, Wavenet, Neural2, and Chirp3-HD voices for different quality levels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audio Caching</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Frequently used audio is cached for faster playback and reduced API costs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automatic Translation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Seamlessly translate text before synthesis for multilingual support.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>High-Quality Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  24kHz sample rate and optimized audio settings for crystal clear speech.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-time Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Fast synthesis with real-time feedback and progress indicators.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}