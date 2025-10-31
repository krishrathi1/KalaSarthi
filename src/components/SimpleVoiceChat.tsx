'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Mic,
    MicOff,
    Send,
    Volume2,
    VolumeX,
    Loader2,
    BotMessageSquare,
    User,
    Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isVoice?: boolean;
}

export function SimpleVoiceChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);

    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);

    // Initialize with welcome message
    useEffect(() => {
        const welcomeMessage: Message = {
            id: 'welcome',
            role: 'assistant',
            content: 'Namaste! I am your Artisan Buddy. You can type or use the microphone button to speak with me. I can help you with crafts, business, and more!',
            timestamp: new Date()
        };
        setMessages([welcomeMessage]);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onstart = () => {
                    console.log('🎤 Speech recognition started');
                    setIsRecording(true);
                };

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    console.log('🎤 Speech recognized:', transcript);
                    setInput(transcript);
                    setIsRecording(false);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('🎤 Speech recognition error:', event.error);
                    setIsRecording(false);
                    toast({
                        title: "Voice Input Error",
                        description: `Speech recognition failed: ${event.error}`,
                        variant: "destructive",
                        duration: 3000,
                    });
                };

                recognitionRef.current.onend = () => {
                    console.log('🎤 Speech recognition ended');
                    setIsRecording(false);
                };
            }
        }
    }, [toast]);

    const startVoiceRecording = async () => {
        try {
            if (!voiceEnabled) {
                toast({
                    title: "Voice Disabled",
                    description: "Please enable voice input first",
                    duration: 3000,
                });
                return;
            }

            // Try Web Speech API first (simpler and more reliable)
            if (recognitionRef.current) {
                console.log('🎤 Starting speech recognition...');
                recognitionRef.current.start();
                return;
            }

            // Fallback to MediaRecorder
            console.log('🎤 Starting MediaRecorder...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('🎤 Recording stopped, processing...');
                setIsProcessing(true);

                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    await processAudioBlob(audioBlob);
                } catch (error) {
                    console.error('❌ Audio processing failed:', error);
                    toast({
                        title: "Processing Failed",
                        description: "Could not process audio. Please try again.",
                        variant: "destructive",
                        duration: 3000,
                    });
                } finally {
                    setIsProcessing(false);
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Auto-stop after 10 seconds
            setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }, 10000);

        } catch (error) {
            console.error('❌ Voice recording failed:', error);
            setIsRecording(false);

            let errorMessage = "Could not access microphone.";
            if (error.name === 'NotAllowedError') {
                errorMessage = "Microphone access denied. Please allow microphone access and try again.";
            } else if (error.name === 'NotFoundError') {
                errorMessage = "No microphone found. Please connect a microphone and try again.";
            }

            toast({
                title: "Microphone Error",
                description: errorMessage,
                variant: "destructive",
                duration: 5000,
            });
        }
    };

    const stopVoiceRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        setIsRecording(false);
    };

    const processAudioBlob = async (audioBlob: Blob) => {
        // For now, just show a placeholder message
        // In a real implementation, you would send this to a speech-to-text service
        const placeholderText = "Voice input processed (placeholder)";
        setInput(placeholderText);

        toast({
            title: "Voice Processed",
            description: "Voice input has been converted to text",
            duration: 3000,
        });
    };

    const handleVoiceToggle = () => {
        if (isRecording) {
            stopVoiceRecording();
        } else {
            startVoiceRecording();
        }
    };

    const sendMessage = async (messageText: string, isVoiceInput = false) => {
        if (!messageText.trim() || loading) return;

        const userMessage: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: messageText.trim(),
            timestamp: new Date(),
            isVoice: isVoiceInput
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Call your existing API
            const response = await fetch('/api/artisan-buddy/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageText,
                    language: 'en',
                    isVoice: isVoiceInput
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMessage: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: data.response || 'I received your message. How can I help you?',
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, assistantMessage]);

                // Play audio response if enabled
                if (audioEnabled && data.response) {
                    speakText(data.response);
                }
            } else {
                throw new Error('Failed to get response');
            }
        } catch (error) {
            console.error('❌ Chat error:', error);
            const errorMessage: Message = {
                id: `error_${Date.now()}`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const speakText = (text: string) => {
        if (!audioEnabled || !('speechSynthesis' in window)) return;

        try {
            // Stop any ongoing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;

            utterance.onstart = () => console.log('🔊 Speech started');
            utterance.onend = () => console.log('🔊 Speech ended');
            utterance.onerror = (e) => console.error('🔊 Speech error:', e);

            speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('❌ Speech synthesis failed:', error);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input, false);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BotMessageSquare className="h-6 w-6 text-primary" />
                        Artisan Buddy
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={cn(
                                "flex items-center gap-2",
                                voiceEnabled ? "bg-blue-500 text-white" : ""
                            )}
                        >
                            <Mic className="h-4 w-4" />
                            Voice {voiceEnabled ? 'On' : 'Off'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            className={cn(
                                "flex items-center gap-2",
                                audioEnabled ? "bg-green-500 text-white" : ""
                            )}
                        >
                            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                            Audio {audioEnabled ? 'On' : 'Off'}
                        </Button>
                    </div>
                </div>
                <div className="text-sm text-gray-600">
                    Chat with your AI assistant using voice or text
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex items-start gap-3",
                                    message.role === "user" && "justify-end"
                                )}
                            >
                                {message.role === "assistant" && (
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                            <Bot className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div
                                    className={cn(
                                        "max-w-xs md:max-w-md rounded-lg p-3 text-sm shadow-sm",
                                        message.role === "assistant"
                                            ? "bg-muted border"
                                            : "bg-primary text-primary-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {message.isVoice && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Mic className="h-3 w-3 mr-1" />
                                                Voice
                                            </Badge>
                                        )}
                                        <span className="text-xs opacity-70">
                                            {formatTime(message.timestamp)}
                                        </span>
                                    </div>
                                    <div className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </div>
                                    {message.role === "assistant" && audioEnabled && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 mt-2"
                                            onClick={() => speakText(message.content)}
                                            title="Play audio"
                                        >
                                            <Volume2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                {message.role === "user" && (
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback className="bg-green-100 text-green-600">
                                            <User className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                            <Bot className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="bg-muted border rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm text-gray-600">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="flex justify-center">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    <span className="text-sm text-blue-700">Processing voice...</span>
                                </div>
                            </div>
                        )}

                        {isRecording && (
                            <div className="flex justify-center">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-red-700">Recording... Speak now</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>

            <CardFooter>
                <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
                    <div className="flex-1 relative">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message or use the microphone..."
                            disabled={loading || isRecording}
                            className="pr-12"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleVoiceToggle}
                        disabled={!voiceEnabled || loading || isProcessing}
                        className={cn(
                            "transition-colors",
                            isRecording && "bg-red-500 text-white animate-pulse",
                            isProcessing && "bg-blue-500 text-white"
                        )}
                        title={
                            !voiceEnabled
                                ? "Voice input disabled"
                                : isRecording
                                    ? "Recording... Click to stop"
                                    : isProcessing
                                        ? "Processing voice..."
                                        : "Click to start voice input"
                        }
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isRecording ? (
                            <MicOff className="h-4 w-4" />
                        ) : (
                            <Mic className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        type="submit"
                        size="icon"
                        disabled={loading || !input.trim() || isRecording}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}