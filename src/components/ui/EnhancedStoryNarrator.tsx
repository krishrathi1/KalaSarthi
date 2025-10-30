'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { Play, Pause, Volume2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedStoryNarratorProps {
    storyText: string;
    className?: string;
    languageCode?: string;
    voiceGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
}

export function EnhancedStoryNarrator({
    storyText,
    className = '',
    languageCode = 'en-IN',
    voiceGender = 'FEMALE'
}: EnhancedStoryNarratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    const generateNarration = async () => {
        if (!storyText || storyText.trim().length === 0) {
            toast({
                title: "No Story Text",
                description: "Please provide story text to narrate.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            console.log('🎤 Generating Google Cloud TTS narration...');

            const response = await fetch('/api/tts/google-cloud/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: storyText,
                    languageCode: languageCode,
                    gender: voiceGender,
                    speakingRate: 0.9, // Slightly slower for storytelling
                    pitch: 0.1, // Slightly higher for engaging narration
                    audioEncoding: 'MP3'
                }),
            });

            const result = await response.json();

            if (result.success && result.audio?.content) {
                // Create audio URL from base64
                const audioBlob = new Blob(
                    [Uint8Array.from(atob(result.audio.content), c => c.charCodeAt(0))],
                    { type: result.audio.mimeType || 'audio/mpeg' }
                );

                const newAudioUrl = URL.createObjectURL(audioBlob);

                // Clean up previous audio
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }

                setAudioUrl(newAudioUrl);

                toast({
                    title: "🎵 Narration Ready!",
                    description: `Story narrated with ${voiceGender.toLowerCase()} ${languageCode} voice`,
                });

                console.log('✅ Google Cloud TTS narration generated successfully');

            } else {
                throw new Error(result.error || 'Failed to generate narration');
            }

        } catch (error) {
            console.error('❌ Narration generation failed:', error);
            toast({
                title: "Narration Failed",
                description: error instanceof Error ? error.message : 'Could not generate narration',
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePlayback = () => {
        if (!audioUrl) {
            generateNarration();
            return;
        }

        // If audio is playing, pause it
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            setIsPlaying(false);
            return;
        }

        // If audio is paused, resume it
        if (currentAudio && currentAudio.paused) {
            currentAudio.play()
                .then(() => setIsPlaying(true))
                .catch((error) => {
                    console.error('❌ Audio playback failed:', error);
                    toast({
                        title: "Playback Failed",
                        description: "Could not play the narration. Please try again.",
                        variant: "destructive"
                    });
                });
            return;
        }

        // Create new audio instance
        const audio = new Audio(audioUrl);
        setCurrentAudio(audio);

        audio.onended = () => {
            setIsPlaying(false);
            setCurrentAudio(null);
        };

        audio.onerror = () => {
            setIsPlaying(false);
            setCurrentAudio(null);
            toast({
                title: "Playback Error",
                description: "Could not play the narration audio.",
                variant: "destructive"
            });
        };

        audio.play()
            .then(() => setIsPlaying(true))
            .catch((error) => {
                console.error('❌ Audio playback failed:', error);
                setIsPlaying(false);
                setCurrentAudio(null);
                toast({
                    title: "Playback Failed",
                    description: "Could not play the narration. Please try again.",
                    variant: "destructive"
                });
            });
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Button
                onClick={togglePlayback}
                disabled={isGenerating}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                    </>
                ) : isPlaying ? (
                    <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Narration
                    </>
                ) : audioUrl ? (
                    <>
                        <Play className="h-4 w-4 mr-2" />
                        Play Narration
                    </>
                ) : (
                    <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Narrate Story
                    </>
                )}
            </Button>

            {audioUrl && (
                <span className="text-xs text-gray-600">
                    {voiceGender.toLowerCase()} {languageCode} voice
                </span>
            )}
        </div>
    );
}