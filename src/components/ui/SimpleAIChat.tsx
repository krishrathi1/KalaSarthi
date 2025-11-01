"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Wifi, WifiOff, Database, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSimpleAI } from '@/hooks/use-simple-ai';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: number;
    source?: 'online' | 'cache' | 'fallback';
    confidence?: number;
    intent?: string;
}

interface SimpleAIChatProps {
    className?: string;
    placeholder?: string;
    maxHeight?: string;
}

export function SimpleAIChat({
    className = "",
    placeholder = "Ask me anything about your craft or business...",
    maxHeight = "400px"
}: SimpleAIChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { askAI, isLoading, isOnline } = useSimpleAI();

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Add welcome message
    useEffect(() => {
        if (messages.length === 0) {
            const welcomeMessage: Message = {
                id: 'welcome',
                text: '🙏 नमस्ते! I\'m your Artisan Buddy. Ask me about your business, crafts, marketing, or government schemes. I can help in Hindi or English!',
                isUser: false,
                timestamp: Date.now(),
                source: 'fallback',
                confidence: 1.0,
                intent: 'greeting'
            };
            setMessages([welcomeMessage]);
        }
    }, [messages.length]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            text: inputValue,
            isUser: true,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');

        // Get AI response
        const response = await askAI(inputValue);

        if (response) {
            const aiMessage: Message = {
                id: `ai-${Date.now()}`,
                text: response.text,
                isUser: false,
                timestamp: response.timestamp,
                source: response.source,
                confidence: response.confidence,
                intent: response.intent
            };

            setMessages(prev => [...prev, aiMessage]);
        } else {
            // Fallback message
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                text: 'Sorry, I couldn\'t process your request right now. Please try again.',
                isUser: false,
                timestamp: Date.now(),
                source: 'fallback',
                confidence: 0.1,
                intent: 'error'
            };

            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getSourceIcon = (source?: string) => {
        switch (source) {
            case 'online':
                return <Wifi className="h-3 w-3 text-green-600" />;
            case 'cache':
                return <Database className="h-3 w-3 text-blue-600" />;
            case 'fallback':
                return <Clock className="h-3 w-3 text-orange-600" />;
            default:
                return null;
        }
    };

    const getSourceLabel = (source?: string) => {
        switch (source) {
            case 'online':
                return 'Live AI';
            case 'cache':
                return 'Cached';
            case 'fallback':
                return 'Offline';
            default:
                return '';
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <span>Artisan Buddy</span>
                    <div className="flex items-center gap-2">
                        <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
                            {isOnline ? (
                                <>
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Online
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-3 w-3 mr-1" />
                                    Offline
                                </>
                            )}
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Messages */}
                <ScrollArea style={{ height: maxHeight }} className="pr-4">
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${message.isUser
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                >
                                    <div className="text-sm whitespace-pre-wrap">
                                        {message.text}
                                    </div>

                                    {!message.isUser && (
                                        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                            <div className="flex items-center gap-1">
                                                {getSourceIcon(message.source)}
                                                <span>{getSourceLabel(message.source)}</span>
                                                {message.confidence && (
                                                    <span>• {Math.round(message.confidence * 100)}%</span>
                                                )}
                                            </div>
                                            <span>{formatTime(message.timestamp)}</span>
                                        </div>
                                    )}

                                    {message.isUser && (
                                        <div className="text-xs opacity-70 mt-1 text-right">
                                            {formatTime(message.timestamp)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={placeholder}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !inputValue.trim()}
                        size="icon"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Status Info */}
                {!isOnline && (
                    <div className="text-xs text-muted-foreground text-center">
                        📴 Offline mode - Using cached responses and basic fallbacks
                    </div>
                )}
            </CardContent>
        </Card>
    );
}