"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedChatInterface } from '@/components/enhanced-chat/EnhancedChatInterface';

interface ChatParticipant {
    id: string;
    name: string;
    role: 'buyer' | 'artisan';
    language: string;
    profileImage?: string;
    isOnline: boolean;
    specialization?: string;
}

export default function EnhancedChatPage() {
    const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [currentUser] = useState({
        id: 'artisan_1', // Changed to artisan for testing
        role: 'artisan' as const,
        language: 'en'
    });

    // Mock chat sessions using seeded test data
    const [chatSessions] = useState([
        {
            sessionId: 'session_001',
            otherParticipant: {
                id: 'buyer_001',
                name: 'Anita Mehta',
                role: 'buyer' as const,
                language: 'hi',
                profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
                isOnline: true,
                specialization: undefined
            },
            lastMessage: 'मुझे अपने घर के लिए कुछ सुंदर मिट्टी के बर्तन चाहिए।',
            lastMessageTime: new Date(Date.now() - 300000),
            unreadCount: 2
        },
        {
            sessionId: 'session_002',
            otherParticipant: {
                id: 'buyer_002',
                name: 'Rohit Kapoor',
                role: 'buyer' as const,
                language: 'en',
                profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
                isOnline: true,
                specialization: undefined
            },
            lastMessage: 'I need some unique pottery pieces for my interior design project.',
            lastMessageTime: new Date(Date.now() - 600000),
            unreadCount: 1
        },
        {
            sessionId: 'session_003',
            otherParticipant: {
                id: 'buyer_003',
                name: 'Sneha Iyer',
                role: 'buyer' as const,
                language: 'en',
                profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                isOnline: false,
                specialization: undefined
            },
            lastMessage: 'Can you create custom pottery for my boutique display?',
            lastMessageTime: new Date(Date.now() - 3600000),
            unreadCount: 0
        },
        {
            sessionId: 'session_004',
            otherParticipant: {
                id: 'buyer_004',
                name: 'Vikram Singh',
                role: 'buyer' as const,
                language: 'hi',
                profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                isOnline: true,
                specialization: undefined
            },
            lastMessage: 'होटल के लिए पारंपरिक मिट्टी के बर्तन बनवाने हैं।',
            lastMessageTime: new Date(Date.now() - 7200000),
            unreadCount: 0
        }
    ]);

    const handleStartChat = (sessionId: string) => {
        setSelectedSession(sessionId);
        setCurrentView('chat');
    };

    const handleBackToList = () => {
        setCurrentView('list');
        setSelectedSession(null);
    };

    const getSelectedSession = () => {
        return chatSessions.find(session => session.sessionId === selectedSession);
    };

    if (currentView === 'chat' && selectedSession) {
        const session = getSelectedSession();
        if (!session) return null;

        return (
            <div className="h-screen flex flex-col">
                {/* Back Button */}
                <div className="p-4 border-b">
                    <Button
                        variant="ghost"
                        onClick={handleBackToList}
                        className="flex items-center"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Chats
                    </Button>
                </div>

                {/* Chat Interface */}
                <div className="flex-1">
                    <EnhancedChatInterface
                        sessionId={selectedSession}
                        currentUserId={currentUser.id}
                        currentUserRole={currentUser.role}
                        otherParticipant={session.otherParticipant}
                        onClose={handleBackToList}
                    />
                </div>
            </div>
        );
    }

    // Chat List View
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold flex items-center justify-center">
                        <MessageCircle className="h-8 w-8 mr-3 text-primary" />
                        Enhanced Multilingual Chat
                    </h1>
                    <p className="text-muted-foreground">
                        Connect with artisans using voice, translation, and AI-powered tools
                    </p>
                </div>

                {/* Features Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                            <h3 className="font-medium">Voice & Translation</h3>
                            <p className="text-sm text-muted-foreground">
                                Speak in your language, auto-translated for seamless communication
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 text-center">
                            <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <h3 className="font-medium">AI Design Tools</h3>
                            <p className="text-sm text-muted-foreground">
                                Generate and share designs directly in chat conversations
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 text-center">
                            <Users className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                            <h3 className="font-medium">Smart Order Management</h3>
                            <p className="text-sm text-muted-foreground">
                                Automatic deal detection and order processing
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Chat Sessions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Conversations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {chatSessions.map((session) => (
                            <div
                                key={session.sessionId}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => handleStartChat(session.sessionId)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                            <span className="text-lg">
                                                {session.otherParticipant.name.split(' ').map(n => n[0]).join('')}
                                            </span>
                                        </div>
                                        {session.otherParticipant.isOnline && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-medium">{session.otherParticipant.name}</h3>
                                            <Badge variant="outline" className="text-xs">
                                                {session.otherParticipant.specialization}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                                {session.otherParticipant.language.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate max-w-md">
                                            {session.lastMessage}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {session.lastMessageTime.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {session.unreadCount > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                            {session.unreadCount}
                                        </Badge>
                                    )}
                                    <Button variant="outline" size="sm">
                                        Open Chat
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Demo Instructions */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <h3 className="font-medium text-blue-900 mb-2">🚀 Demo Features</h3>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Click on a conversation to start chatting</li>
                            <li>• Use the microphone button for voice input</li>
                            <li>• Artisans can access design tools from the chat interface</li>
                            <li>• AI automatically detects when deals are completed</li>
                            <li>• Order forms are generated automatically for finalized deals</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}