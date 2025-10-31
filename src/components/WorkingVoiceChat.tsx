'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Send, Loader2, BotMessageSquare, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isVoice?: boolean;
}

export function WorkingVoiceChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Initialize with welcome message
    useEffect(() => {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'Namaste! I am your Artisan Buddy. You can type or click the microphone to speak with me!',
            timestamp: new Date()
        }]);
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

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
            const response = await fetch('/api/artisan-buddy/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                    content: data.response || 'I received your message!',
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, assistantMessage]);

                // Speak response
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(assistantMessage.content);
                    utterance.lang = 'en-US';
                    utterance.rate = 0.9;
                    speechSynthesis.speak(utterance);
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: `error_${Date.now()}`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const startVoiceRecording = async () => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                toast({
                    title: "Voice Not Supported",
                    description: "Your browser doesn't support voice input. Try Chrome or Edge.",
                    variant: "destructive",
                });
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            setIsRecording(true);

            recognition.onstart = () => {
                console.log('🎤 Voice recording started');
                toast({
                    title: "Listening...",
                    description: "Speak now!",
                    duration: 2000,
                });
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('🎤 Voice recognized:', transcript);
                setIsRecording(false);

                // Send the voice message
                sendMessage(transcript, true);
            };

            recognition.onerror = (event: any) => {
                console.error('🎤 Voice error:', event.error);
                setIsRecording(false);

                let errorMessage = "Voice recognition failed";
                if (event.error === 'not-allowed') {
                    errorMessage = "Microphone access denied. Please allow microphone access.";
                } else if (event.error === 'no-speech') {
                    errorMessage = "No speech detected. Please try again.";
                }

                toast({
                    title: "Voice Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognition.start();
        } catch (error) {
            console.error('❌ Voice setup failed:', error);
            setIsRecording(false);
            toast({
                title: "Voice Setup Failed",
                description: "Could not initialize voice input",
                variant: "destructive",
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input, false);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BotMessageSquare className="h-6 w-6 text-primary" />
                    Artisan Buddy - WORKING VOICE CHAT
                </CardTitle>
                <div className="text-sm text-gray-600">
                    Click the microphone button to speak! 🎤
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
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                🎤 Voice
                                            </span>
                                        )}
                                        <span className="text-xs opacity-70">
                                            {message.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </div>
                                    {message.role === "assistant" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 mt-2"
                                            onClick={() => {
                                                if ('speechSynthesis' in window) {
                                                    const utterance = new SpeechSynthesisUtterance(message.content);
                                                    utterance.lang = 'en-US';
                                                    speechSynthesis.speak(utterance);
                                                }
                                            }}
                                            title="Play audio"
                                        >
                                            <Volume2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted border rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm text-gray-600">AI is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isRecording && (
                            <div className="flex justify-center">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-red-700 font-medium">🎤 Recording... Speak now!</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>

            <CardFooter>
                <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message or use the microphone..."
                        disabled={loading || isRecording}
                        className="flex-1"
                    />

                    {/* REAL WORKING MICROPHONE BUTTON */}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={startVoiceRecording}
                        disabled={loading || isRecording}
                        className={cn(
                            "transition-colors",
                            isRecording && "bg-red-500 text-white animate-pulse"
                        )}
                        title={isRecording ? "Recording... Please speak" : "Click to speak"}
                    >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>

                    <Button
                        type="submit"
                        size="icon"
                        disabled={loading || !input.trim() || isRecording}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}