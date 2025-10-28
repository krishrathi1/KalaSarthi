"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BotMessageSquare, Send, Volume2, VolumeX, Mic, MicOff, Square, User, UserCircle, Play, Pause, Settings, Navigation, MessageSquare, Clock, Edit, CheckCircle, AlertCircle, Info, History, Search, Download, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    intent?: string;
    confidence?: number;
    shouldNavigate?: boolean;
    navigationTarget?: string;
    usedProfile?: boolean;
    language?: string;
    isTyping?: boolean;
}

interface TypingIndicatorProps {
    language: string;
}

interface VoiceStatus {
    isRecording: boolean;
    isPlaying: boolean;
    currentAudioId?: string;
    recordingDuration: number;
    error?: string;
}

interface ArtisanProfile {
    id: string;
    name: string;
    craft: string;
    experience: number;
    location: string;
    skills: string[];
    specialties: string[];
    businessType: string;
    languages: string[];
    completeness: number;
    challenges?: string[];
    goals?: string[];
}

interface ProfileEditData {
    name: string;
    craft: string;
    experience: number;
    location: string;
    skills: string;
    specialties: string;
    businessType: string;
    languages: string;
    challenges: string;
    goals: string;
}

interface ConversationHistory {
    id: string;
    title: string;
    timestamp: Date;
    messageCount: number;
    lastMessage: string;
}

interface ConversationSettings {
    autoSave: boolean;
    maxHistory: number;
    enableNotifications: boolean;
    responseLength: 'brief' | 'detailed' | 'comprehensive';
}

// Helper functions
const calculateProfileCompleteness = (userData: any): number => {
    let completeness = 0;
    const fields = ['name', 'artisticProfession', 'phone', 'address'];

    fields.forEach(field => {
        if (field === 'address') {
            if (userData.address?.city) completeness += 25;
        } else if (userData[field]) {
            completeness += 25;
        }
    });

    return completeness;
};

const getCompletenessColor = (completeness: number) => {
    if (completeness >= 80) return 'text-green-600';
    if (completeness >= 60) return 'text-yellow-600';
    return 'text-red-600';
};

const getCompletenessIcon = (completeness: number) => {
    if (completeness >= 80) return <CheckCircle className="h-4 w-4" />;
    if (completeness >= 60) return <AlertCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
};

// Typing indicator component
function TypingIndicator({ language }: TypingIndicatorProps) {
    return (
        <div className="flex items-start gap-3 mb-4">
            <Avatar className="size-8 border shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    AB
                </AvatarFallback>
            </Avatar>
            <div className="max-w-xs md:max-w-md rounded-lg p-3 text-sm bg-muted border shadow-sm">
                <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                        {language === 'hi' ? 'सोच रहा हूं...' : 'Thinking...'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function EnhancedArtisanChat() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [profileInfo, setProfileInfo] = useState<ArtisanProfile | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
        isRecording: false,
        isPlaying: false,
        recordingDuration: 0
    });
    const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [conversationSettings, setConversationSettings] = useState<ConversationSettings>({
        autoSave: true,
        maxHistory: 50,
        enableNotifications: true,
        responseLength: 'detailed'
    });
    const [showProfileSheet, setShowProfileSheet] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showHistorySheet, setShowHistorySheet] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ProfileEditData>({
        name: '',
        craft: '',
        experience: 0,
        location: '',
        skills: '',
        specialties: '',
        businessType: '',
        languages: '',
        challenges: '',
        goals: ''
    });
    const [isListening, setIsListening] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize with welcome message
        const welcomeMessage: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: language === 'hi'
                ? 'नमस्ते! मैं आपका Enhanced Artisan Buddy हूं। मैं आपके क्राफ्ट बिज़नेस, ऐप नेवीगेशन और कारीगर जीवन के बारे में मदद कर सकता हूं।'
                : 'Hello! I\'m your Enhanced Artisan Buddy. I can help you with your craft business, app navigation, and artisan life.',
            timestamp: new Date(),
            intent: 'greeting',
            confidence: 1.0,
            language: language
        };

        setMessages([welcomeMessage]);
        loadUserProfile();

        // Load saved settings
        const savedSettings = localStorage.getItem('artisan-chat-settings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                setConversationSettings(settings);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }, [language]);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    // Cleanup voice resources on unmount
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
            }
            if (mediaRecorderRef.current && voiceStatus.isRecording) {
                mediaRecorderRef.current.stop();
            }
        };
    }, [voiceStatus.isRecording]);

    const loadUserProfile = async () => {
        try {
            const userId = user?.uid || 'default_user';

            if (user?.uid) {
                const response = await fetch(`/api/users/${user.uid}`);
                if (response.ok) {
                    const userData = await response.json();
                    if (userData.success && userData.data) {
                        const artisanProfile: ArtisanProfile = {
                            id: userData.data.uid,
                            name: userData.data.name || 'Artisan',
                            craft: userData.data.artisticProfession || 'General Craft',
                            experience: 1,
                            location: userData.data.address?.city || 'India',
                            skills: userData.data.artisticProfession ? [userData.data.artisticProfession] : [],
                            specialties: [],
                            businessType: 'individual',
                            languages: ['English'],
                            completeness: calculateProfileCompleteness(userData.data),
                            challenges: [],
                            goals: []
                        };
                        setProfileInfo(artisanProfile);
                    }
                }
            }
        } catch (error) {
            console.error('Profile load error:', error);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: new Date(),
            language: language
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput("");
        setLoading(true);
        setIsTyping(true);

        try {
            const response = await fetch('/api/enhanced-artisan-buddy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: currentInput,
                    userId: (typeof window !== 'undefined' ? localStorage.getItem('demo_profile_id') : null) || user?.uid || 'default_user',
                    enableVoice: isVoiceEnabled
                }),
            });

            if (response.ok) {
                const data = await response.json();

                const assistantMessage: ChatMessage = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date(data.timestamp),
                    intent: data.intent,
                    confidence: data.confidence,
                    shouldNavigate: data.shouldNavigate,
                    navigationTarget: data.navigationTarget,
                    usedProfile: data.usedProfile,
                    language: data.language
                };

                setMessages(prev => [...prev, assistantMessage]);
                setIsTyping(false);

                // Handle navigation if needed
                if (data.shouldNavigate && data.navigationTarget) {
                    toast({
                        title: language === 'hi' ? 'नेवीगेट कर रहे हैं...' : 'Navigating...',
                        description: language === 'hi'
                            ? `${data.navigationTarget} पर जा रहे हैं`
                            : `Going to ${data.navigationTarget}`,
                    });

                    setTimeout(() => {
                        window.location.href = data.navigationTarget;
                    }, 1500);
                }

            } else {
                throw new Error('Failed to get response');
            }

        } catch (error) {
            console.error('Chat error:', error);

            const errorMessage: ChatMessage = {
                id: `error_${Date.now()}`,
                role: 'assistant',
                content: language === 'hi'
                    ? 'क्षमा करें, मुझे कुछ तकनीकी समस्या हो रही है। कृपया दोबारा कोशिश करें।'
                    : 'Sorry, I\'m experiencing some technical difficulties. Please try again.',
                timestamp: new Date(),
                intent: 'error',
                confidence: 0.1,
                language: language
            };

            setMessages(prev => [...prev, errorMessage]);
            setIsTyping(false);

            toast({
                title: language === 'hi' ? 'त्रुटि' : 'Error',
                description: language === 'hi'
                    ? 'जवाब पाने में असफल। कृपया दोबारा कोशिश करें।'
                    : 'Failed to get response. Please try again.',
                variant: "destructive",
            });
        }

        setLoading(false);
        setIsTyping(false);
    };

    const handleVoiceToggle = () => {
        setIsVoiceEnabled(!isVoiceEnabled);

        // Stop any ongoing recording or playback
        if (voiceStatus.isRecording) {
            stopRecording();
        }
        if (voiceStatus.isPlaying) {
            stopAudio();
        }

        toast({
            title: language === 'hi' ? 'आवाज़' : 'Voice',
            description: isVoiceEnabled
                ? (language === 'hi' ? 'आवाज़ बंद कर दी गई' : 'Voice disabled')
                : (language === 'hi' ? 'आवाज़ चालू कर दी गई' : 'Voice enabled'),
        });
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                await processVoiceInput(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setVoiceStatus(prev => ({ ...prev, isRecording: true, recordingDuration: 0, error: undefined }));
            setIsListening(true);

            // Start recording timer
            recordingTimerRef.current = setInterval(() => {
                setVoiceStatus(prev => ({ ...prev, recordingDuration: prev.recordingDuration + 1 }));
            }, 1000);

            toast({
                title: language === 'hi' ? 'रिकॉर्डिंग शुरू' : 'Recording Started',
                description: language === 'hi' ? 'बोलना शुरू करें...' : 'Start speaking...',
            });

        } catch (error) {
            console.error('Recording error:', error);
            setVoiceStatus(prev => ({
                ...prev,
                error: language === 'hi' ? 'माइक्रोफोन एक्सेस नहीं मिला' : 'Microphone access denied'
            }));
            toast({
                title: language === 'hi' ? 'त्रुटि' : 'Error',
                description: language === 'hi' ? 'माइक्रोफोन एक्सेस नहीं मिला' : 'Microphone access denied',
                variant: "destructive",
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && voiceStatus.isRecording) {
            mediaRecorderRef.current.stop();
            setVoiceStatus(prev => ({ ...prev, isRecording: false }));
            setIsListening(false);

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const processVoiceInput = async (audioBlob: Blob) => {
        try {
            setLoading(true);
            setIsTyping(true);

            // Simple audio processing for basic STT
            
            const userId = (typeof window !== 'undefined' ? localStorage.getItem('demo_profile_id') : null) || user?.uid || 'default_user';

            // Use basic STT API
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            formData.append('userId', userId);
            
            const sttResponse = await fetch('/api/speech-to-text', {
                method: 'POST',
                body: formData,
            });

            if (sttResponse && sttResponse.ok) {
                const sttData = await sttResponse.json();

                // Handle basic STT API response
                let transcribedText = '';
                if (sttData.success && sttData.data?.transcription) {
                    transcribedText = sttData.data.transcription;
                } else if (sttData.transcription) {
                    transcribedText = sttData.transcription;
                } else if (typeof sttData === 'string') {
                    transcribedText = sttData;
                }

                if (transcribedText && transcribedText.trim()) {
                    // Add user message
                    const userMessage: ChatMessage = {
                        id: `user_${Date.now()}`,
                        role: 'user',
                        content: transcribedText,
                        timestamp: new Date(),
                        language: language
                    };
                    setMessages(prev => [...prev, userMessage]);

                    // Process with chat API
                    const chatResponse = await fetch('/api/enhanced-artisan-buddy', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: transcribedText,
                            userId: (typeof window !== 'undefined' ? localStorage.getItem('demo_profile_id') : null) || user?.uid || 'default_user',
                            enableVoice: isVoiceEnabled
                        }),
                    });

                    if (chatResponse.ok) {
                        const chatData = await chatResponse.json();

                        const assistantMessage: ChatMessage = {
                            id: `assistant_${Date.now()}`,
                            role: 'assistant',
                            content: chatData.response,
                            timestamp: new Date(chatData.timestamp),
                            intent: chatData.intent,
                            confidence: chatData.confidence,
                            shouldNavigate: chatData.shouldNavigate,
                            navigationTarget: chatData.navigationTarget,
                            usedProfile: chatData.usedProfile,
                            language: chatData.language
                        };

                        setMessages(prev => [...prev, assistantMessage]);

                        // Play TTS response if voice is enabled
                        if (isVoiceEnabled && chatData.response) {
                            await playTTSResponse(chatData.response, assistantMessage.id);
                        }

                        // Handle navigation
                        if (chatData.shouldNavigate && chatData.navigationTarget) {
                            toast({
                                title: language === 'hi' ? 'नेवीगेट कर रहे हैं...' : 'Navigating...',
                                description: language === 'hi'
                                    ? `${chatData.navigationTarget} पर जा रहे हैं`
                                    : `Going to ${chatData.navigationTarget}`,
                            });

                            setTimeout(() => {
                                window.location.href = chatData.navigationTarget;
                            }, 1500);
                        }
                    }
                } else {
                    console.log('STT Response data:', sttData);
                    toast({
                        title: language === 'hi' ? 'कोई आवाज़ नहीं सुनी गई' : 'No speech detected',
                        description: language === 'hi' ? 'कृपया दोबारा कोशिश करें या ज़ोर से बोलें' : 'Please try again or speak louder',
                        variant: "destructive",
                    });
                }
            } else {
                // STT service failed - get error details
                let errorMessage = 'Speech recognition service unavailable';
                try {
                    const errorData = await sttResponse.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('Could not parse STT error response');
                }

                console.error('STT API failed:', {
                    status: sttResponse.status,
                    statusText: sttResponse.statusText,
                    error: errorMessage
                });

                toast({
                    title: language === 'hi' ? 'आवाज़ पहचान त्रुटि' : 'Speech Recognition Error',
                    description: language === 'hi' ? 'आवाज़ पहचान सेवा उपलब्ध नहीं है। कृपया टेक्स्ट इनपुट का उपयोग करें।' : 'Speech recognition service unavailable. Please use text input.',
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Voice processing error:', error);
            toast({
                title: language === 'hi' ? 'आवाज़ प्रोसेसिंग त्रुटि' : 'Voice Processing Error',
                description: language === 'hi' ? 'कृपया दोबारा कोशिश करें' : 'Please try again',
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setIsTyping(false);
        }
    };

    const playTTSResponse = async (text: string, messageId: string) => {
        try {
            setVoiceStatus(prev => ({ ...prev, isPlaying: true, currentAudioId: messageId }));

            let ttsResponse: Response | null = null;
            let lastError: string = '';

            // Use basic TTS API
            try {
                ttsResponse = await fetch('/api/text-to-speech', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        language: language === 'hi' ? 'hi-IN' : 'en-US'
                    }),
                });

                if (!ttsResponse.ok) {
                    const errorData = await ttsResponse.json();
                    lastError = errorData.error || 'TTS failed';
                    ttsResponse = null;
                }
            } catch (error) {
                console.warn('TTS failed:', error);
                lastError = 'TTS service unavailable';
                ttsResponse = null;
            }

            if (ttsResponse && ttsResponse.ok) {
                const responseData = await ttsResponse.json();

                if (responseData.success && responseData.data?.audio) {
                    // Basic TTS API response format
                    const audioBase64 = responseData.data.audio;
                    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
                    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

                    const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                currentAudioRef.current = audio;

                audio.onended = () => {
                    setVoiceStatus(prev => ({ ...prev, isPlaying: false, currentAudioId: undefined }));
                    URL.revokeObjectURL(audioUrl);
                    currentAudioRef.current = null;
                };

                audio.onerror = (error) => {
                    console.error('Audio playback error:', error);
                    setVoiceStatus(prev => ({ ...prev, isPlaying: false, currentAudioId: undefined }));
                    URL.revokeObjectURL(audioUrl);
                    currentAudioRef.current = null;
                };

                audio.onpause = () => {
                    setVoiceStatus(prev => ({ ...prev, isPlaying: false }));
                };

                audio.onplay = () => {
                    setVoiceStatus(prev => ({ ...prev, isPlaying: true, currentAudioId: messageId }));
                };

                await audio.play();
            } else {
                // TTS failed, just show a message
                console.warn('TTS service unavailable');
                toast({
                    title: language === 'hi' ? 'आवाज़ सेवा' : 'Voice Service',
                    description: language === 'hi' 
                        ? 'आवाज़ प्लेबैक उपलब्ध नहीं है।' 
                        : 'Voice playback not available.',
                    variant: "default",
                });
                return;
            }
        } catch (error) {
            console.error('TTS playback error:', error);

            // Final fallback: Use browser's built-in speech synthesis
            try {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
                    utterance.rate = 0.9;
                    utterance.pitch = 1.0;

                    utterance.onstart = () => {
                        setVoiceStatus(prev => ({ ...prev, isPlaying: true, currentAudioId: messageId }));
                    };

                    utterance.onend = () => {
                        setVoiceStatus(prev => ({ ...prev, isPlaying: false, currentAudioId: undefined }));
                    };

                    utterance.onerror = () => {
                        setVoiceStatus(prev => ({ ...prev, isPlaying: false, currentAudioId: undefined }));
                    };

                    window.speechSynthesis.speak(utterance);

                    toast({
                        title: language === 'hi' ? 'ब्राउज़र TTS' : 'Browser TTS',
                        description: language === 'hi' ? 'ब्राउज़र की आवाज़ का उपयोग कर रहे हैं' : 'Using browser voice synthesis',
                    });

                    return; // Don't show error if browser TTS works
                }
            } catch (browserError) {
                console.error('Browser TTS also failed:', browserError);
            }

            setVoiceStatus(prev => ({ ...prev, isPlaying: false, currentAudioId: undefined }));

            toast({
                title: language === 'hi' ? 'TTS त्रुटि' : 'TTS Error',
                description: language === 'hi' ? 'आवाज़ चलाने में समस्या' : 'Failed to play audio',
                variant: "destructive",
            });
        }
    };

    const stopAudio = () => {
        // Stop regular audio
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            setVoiceStatus(prev => ({ ...prev, isPlaying: false, currentAudioId: undefined }));
        }

        // Stop browser speech synthesis
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setVoiceStatus(prev => ({ ...prev, isPlaying: false, currentAudioId: undefined }));
        }
    };

    const pauseAudio = () => {
        // Pause regular audio
        if (currentAudioRef.current && !currentAudioRef.current.paused) {
            currentAudioRef.current.pause();
            setVoiceStatus(prev => ({ ...prev, isPlaying: false }));
        }

        // Pause browser speech synthesis
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            setVoiceStatus(prev => ({ ...prev, isPlaying: false }));
        }
    };

    const resumeAudio = () => {
        // Resume regular audio
        if (currentAudioRef.current && currentAudioRef.current.paused) {
            currentAudioRef.current.play();
            setVoiceStatus(prev => ({ ...prev, isPlaying: true }));
        }

        // Resume browser speech synthesis
        if ('speechSynthesis' in window && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setVoiceStatus(prev => ({ ...prev, isPlaying: true }));
        }
    };

    const handleVoiceButtonClick = () => {
        if (!isVoiceEnabled) {
            toast({
                title: language === 'hi' ? 'आवाज़ बंद है' : 'Voice Disabled',
                description: language === 'hi' ? 'पहले आवाज़ चालू करें' : 'Enable voice first',
                variant: "destructive",
            });
            return;
        }

        if (voiceStatus.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const openEditProfile = () => {
        if (profileInfo) {
            setEditingProfile({
                name: profileInfo.name || '',
                craft: profileInfo.craft || '',
                experience: profileInfo.experience || 0,
                location: profileInfo.location || '',
                skills: profileInfo.skills?.join(', ') || '',
                specialties: profileInfo.specialties?.join(', ') || '',
                businessType: profileInfo.businessType || '',
                languages: profileInfo.languages?.join(', ') || '',
                challenges: profileInfo.challenges?.join(', ') || '',
                goals: profileInfo.goals?.join(', ') || ''
            });
        }
        setShowEditDialog(true);
    };

    const saveProfile = async () => {
        try {
            const userId = (typeof window !== 'undefined' ? localStorage.getItem('demo_profile_id') : null) || user?.uid || 'default_user';

            const profileData = {
                ...editingProfile,
                skills: editingProfile.skills.split(',').map(s => s.trim()).filter(s => s),
                specialties: editingProfile.specialties.split(',').map(s => s.trim()).filter(s => s),
                languages: editingProfile.languages.split(',').map(s => s.trim()).filter(s => s),
                challenges: editingProfile.challenges.split(',').map(s => s.trim()).filter(s => s),
                goals: editingProfile.goals.split(',').map(s => s.trim()).filter(s => s)
            };

            // Update enhanced artisan buddy profile
            const enhancedProfileData = {
                id: userId,
                userId: userId,
                personalInfo: {
                    name: profileData.name,
                    location: profileData.location,
                    languages: profileData.languages,
                    experience: profileData.experience
                },
                skills: {
                    primary: profileData.skills,
                    secondary: [],
                    certifications: []
                },
                products: {
                    categories: [],
                    specialties: profileData.specialties,
                    priceRange: { min: 100, max: 1000, currency: 'USD' }
                },
                preferences: {
                    communicationStyle: 'casual',
                    responseLength: 'detailed',
                    topics: profileData.skills
                },
                businessInfo: {
                    businessType: profileData.businessType,
                    targetMarket: ['local'],
                    challenges: profileData.challenges,
                    goals: profileData.goals
                },
                metadata: {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    completeness: calculateProfileCompleteness({
                        name: profileData.name,
                        artisticProfession: profileData.craft,
                        phone: 'existing',
                        address: { city: profileData.location }
                    })
                }
            };

            const response = await fetch('/api/enhanced-artisan-buddy/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(enhancedProfileData),
            });

            // Also update the user profile in the users database if we have a real user
            if (user?.uid) {
                const userUpdateData = {
                    name: profileData.name,
                    artisticProfession: profileData.craft,
                    description: `${profileData.experience} years of experience in ${profileData.craft}`,
                    address: {
                        city: profileData.location
                    }
                };

                await fetch(`/api/users/${user.uid}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userUpdateData),
                });
            }

            if (response.ok) {
                const data = await response.json();

                // Update local profile state
                const updatedProfile: ArtisanProfile = {
                    id: userId,
                    name: profileData.name,
                    craft: profileData.craft,
                    experience: profileData.experience,
                    location: profileData.location,
                    skills: profileData.skills,
                    specialties: profileData.specialties,
                    businessType: profileData.businessType,
                    languages: profileData.languages,
                    completeness: enhancedProfileData.metadata.completeness,
                    challenges: profileData.challenges,
                    goals: profileData.goals
                };

                setProfileInfo(updatedProfile);
                setShowEditDialog(false);

                toast({
                    title: language === 'hi' ? 'प्रोफाइल अपडेट हुई' : 'Profile Updated',
                    description: language === 'hi' ? 'आपकी प्रोफाइल सफलतापूर्वक अपडेट हो गई है।' : 'Your profile has been updated successfully.',
                });
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            toast({
                title: language === 'hi' ? 'त्रुटि' : 'Error',
                description: language === 'hi' ? 'प्रोफाइल अपडेट नहीं हो सकी' : 'Failed to update profile',
                variant: "destructive",
            });
        }
    };

    const getCompletenessColor = (completeness: number) => {
        if (completeness >= 80) return 'text-green-600';
        if (completeness >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getCompletenessIcon = (completeness: number) => {
        if (completeness >= 80) return <CheckCircle className="h-4 w-4" />;
        if (completeness >= 60) return <AlertCircle className="h-4 w-4" />;
        return <AlertCircle className="h-4 w-4" />;
    };

    const loadConversationHistory = async () => {
        try {
            const userId = (typeof window !== 'undefined' ? localStorage.getItem('demo_profile_id') : null) || user?.uid || 'default_user';
            const response = await fetch(`/api/enhanced-artisan-buddy/conversations?userId=${userId}`);

            if (response.ok) {
                const data = await response.json();
                setConversationHistory(data.conversations || []);
            }
        } catch (error) {
            console.error('Failed to load conversation history:', error);
        }
    };

    const exportConversation = () => {
        const conversationData = {
            timestamp: new Date().toISOString(),
            messages: messages,
            profile: profileInfo,
            settings: conversationSettings
        };

        const dataStr = JSON.stringify(conversationData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `artisan-chat-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: language === 'hi' ? 'बातचीत निर्यात की गई' : 'Conversation Exported',
            description: language === 'hi' ? 'बातचीत फ़ाइल डाउनलोड हो गई है।' : 'Conversation file has been downloaded.',
        });
    };

    const deleteConversation = async (conversationId: string) => {
        try {
            const userId = (typeof window !== 'undefined' ? localStorage.getItem('demo_profile_id') : null) || user?.uid || 'default_user';
            const response = await fetch(`/api/enhanced-artisan-buddy/conversations/${conversationId}?userId=${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setConversationHistory(prev => prev.filter(conv => conv.id !== conversationId));
                toast({
                    title: language === 'hi' ? 'बातचीत हटाई गई' : 'Conversation Deleted',
                    description: language === 'hi' ? 'बातचीत सफलतापूर्वक हटा दी गई है।' : 'Conversation has been deleted successfully.',
                });
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            toast({
                title: language === 'hi' ? 'त्रुटि' : 'Error',
                description: language === 'hi' ? 'बातचीत हटाने में असफल' : 'Failed to delete conversation',
                variant: "destructive",
            });
        }
    };

    const saveConversationSettings = () => {
        localStorage.setItem('artisan-chat-settings', JSON.stringify(conversationSettings));
        setShowSettingsDialog(false);

        toast({
            title: language === 'hi' ? 'सेटिंग्स सहेजी गईं' : 'Settings Saved',
            description: language === 'hi' ? 'आपकी प्राथमिकताएं सहेज दी गई हैं।' : 'Your preferences have been saved.',
        });
    };

    const filteredHistory = conversationHistory.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const clearHistory = async () => {
        try {
            await fetch(`/api/enhanced-artisan-buddy?userId=${user?.uid}&action=clear-history`, {
                method: 'DELETE'
            });

            setMessages([{
                id: 'welcome_new',
                role: 'assistant',
                content: language === 'hi'
                    ? 'नमस्ते! मैं आपका Enhanced Artisan Buddy हूं। मैं आपके क्राफ्ट बिज़नेस, ऐप नेवीगेशन और कारीगर जीवन के बारे में मदद कर सकता हूं।'
                    : 'Hello! I\'m your Enhanced Artisan Buddy. I can help you with your craft business, app navigation, and artisan life.',
                timestamp: new Date(),
                intent: 'greeting',
                confidence: 1.0,
                language: language
            }]);

            toast({
                title: language === 'hi' ? 'इतिहास साफ़ किया गया' : 'History Cleared',
                description: language === 'hi'
                    ? 'बातचीत का इतिहास साफ़ कर दिया गया है।'
                    : 'Conversation history has been cleared.',
            });
        } catch (error) {
            console.error('Clear history error:', error);
        }
    };



    return (
        <Card className="h-full flex flex-col max-w-4xl mx-auto">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <BotMessageSquare className="size-8 text-primary" />
                            {isTyping && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            )}
                        </div>
                        <div>
                            <CardTitle className="font-headline text-lg sm:text-xl">
                                {language === 'hi' ? 'Enhanced Artisan Buddy' : 'Enhanced Artisan Buddy'}
                            </CardTitle>
                            <CardDescription className="text-sm">
                                {language === 'hi'
                                    ? 'आपका स्मार्ट कारीगर असिस्टेंट'
                                    : 'Your Smart Artisan Assistant'
                                }
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleVoiceToggle}
                            className={cn(
                                "flex items-center gap-2 text-xs sm:text-sm",
                                isVoiceEnabled ? "bg-primary text-primary-foreground" : ""
                            )}
                        >
                            {isVoiceEnabled ? <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" /> : <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />}
                            <span className="hidden sm:inline">{language === 'hi' ? 'आवाज़' : 'Voice'}</span>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    title={language === 'hi' ? 'मेनू' : 'Menu'}
                                >
                                    <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                    loadConversationHistory();
                                    setShowHistorySheet(true);
                                }}>
                                    <History className="h-4 w-4 mr-2" />
                                    {language === 'hi' ? 'बातचीत का इतिहास' : 'Conversation History'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportConversation}>
                                    <Download className="h-4 w-4 mr-2" />
                                    {language === 'hi' ? 'बातचीत निर्यात करें' : 'Export Conversation'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    {language === 'hi' ? 'सेटिंग्स' : 'Settings'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={clearHistory} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {language === 'hi' ? 'इतिहास साफ़ करें' : 'Clear History'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    title={language === 'hi' ? 'प्रोफाइल देखें' : 'View Profile'}
                                >
                                    <UserCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[400px] sm:w-[540px]">
                                <SheetHeader>
                                    <SheetTitle className="flex items-center gap-2">
                                        <UserCircle className="h-5 w-5" />
                                        {language === 'hi' ? 'आर्टिज़न प्रोफाइल' : 'Artisan Profile'}
                                    </SheetTitle>
                                    <SheetDescription>
                                        {language === 'hi'
                                            ? 'अपनी प्रोफाइल की जानकारी देखें और संपादित करें'
                                            : 'View and edit your profile information'
                                        }
                                    </SheetDescription>
                                </SheetHeader>

                                <div className="mt-6 space-y-6">
                                    {profileInfo ? (
                                        <>
                                            {/* Profile completeness */}
                                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    {getCompletenessIcon(profileInfo.completeness)}
                                                    <span className="font-medium">
                                                        {language === 'hi' ? 'प्रोफाइल पूर्णता' : 'Profile Completeness'}
                                                    </span>
                                                </div>
                                                <div className={cn("font-bold", getCompletenessColor(profileInfo.completeness))}>
                                                    {profileInfo.completeness}%
                                                </div>
                                            </div>

                                            {/* Basic Info */}
                                            <div className="space-y-4">
                                                <h3 className="font-semibold flex items-center gap-2">
                                                    <Info className="h-4 w-4" />
                                                    {language === 'hi' ? 'बुनियादी जानकारी' : 'Basic Information'}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">{language === 'hi' ? 'नाम:' : 'Name:'}</span>
                                                        <p className="font-medium">{profileInfo.name}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">{language === 'hi' ? 'शिल्प:' : 'Craft:'}</span>
                                                        <p className="font-medium">{profileInfo.craft}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">{language === 'hi' ? 'अनुभव:' : 'Experience:'}</span>
                                                        <p className="font-medium">{profileInfo.experience} {language === 'hi' ? 'साल' : 'years'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">{language === 'hi' ? 'स्थान:' : 'Location:'}</span>
                                                        <p className="font-medium">{profileInfo.location}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Skills */}
                                            {profileInfo.skills && profileInfo.skills.length > 0 && (
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold">{language === 'hi' ? 'कौशल' : 'Skills'}</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {profileInfo.skills.map((skill, index) => (
                                                            <Badge key={index} variant="secondary">{skill}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Specialties */}
                                            {profileInfo.specialties && profileInfo.specialties.length > 0 && (
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold">{language === 'hi' ? 'विशेषताएं' : 'Specialties'}</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {profileInfo.specialties.map((specialty, index) => (
                                                            <Badge key={index} variant="outline">{specialty}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Business Type */}
                                            {profileInfo.businessType && (
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold">{language === 'hi' ? 'व्यवसाय प्रकार' : 'Business Type'}</h3>
                                                    <p className="text-sm text-muted-foreground">{profileInfo.businessType}</p>
                                                </div>
                                            )}

                                            {/* Languages */}
                                            {profileInfo.languages && profileInfo.languages.length > 0 && (
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold">{language === 'hi' ? 'भाषाएं' : 'Languages'}</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {profileInfo.languages.map((lang, index) => (
                                                            <Badge key={index} variant="default">{lang}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Edit Button */}
                                            <Button onClick={openEditProfile} className="w-full">
                                                <Edit className="h-4 w-4 mr-2" />
                                                {language === 'hi' ? 'प्रोफाइल संपादित करें' : 'Edit Profile'}
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">
                                                {language === 'hi' ? 'कोई प्रोफाइल जानकारी उपलब्ध नहीं है' : 'No profile information available'}
                                            </p>
                                            <Button onClick={openEditProfile} className="mt-4">
                                                <Edit className="h-4 w-4 mr-2" />
                                                {language === 'hi' ? 'प्रोफाइल बनाएं' : 'Create Profile'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('/enhanced-artisan-buddy/diagnostics', '_blank')}
                            title={language === 'hi' ? 'API डायग्नोस्टिक्स' : 'API Diagnostics'}
                        >
                            🔧
                        </Button>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            <span>{messages.length}</span>
                        </div>
                    </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="default" className="text-xs">
                        {profileInfo
                            ? (language === 'hi' ? `✓ ${profileInfo.name} - ${profileInfo.craft}` : `✓ ${profileInfo.name} - ${profileInfo.craft}`)
                            : (language === 'hi' ? '✓ डिफ़ॉल्ट प्रोफाइल' : '✓ Default Profile')
                        }
                    </Badge>
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                        {language === 'hi' ? '🧠 AI + वेक्टर स्टोर' : '🧠 AI + Vector Store'}
                    </Badge>
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                        {language === 'hi' ? '🗣 आवाज़ नेवीगेशन' : '🗣 Voice Navigation'}
                    </Badge>
                    {isTyping && (
                        <Badge variant="secondary" className="text-xs animate-pulse">
                            <Clock className="h-3 w-3 mr-1" />
                            {language === 'hi' ? 'टाइप कर रहा है...' : 'Typing...'}
                        </Badge>
                    )}
                    {voiceStatus.isRecording && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                            <Mic className="h-3 w-3 mr-1" />
                            {language === 'hi' ? `रिकॉर्डिंग... ${voiceStatus.recordingDuration}s` : `Recording... ${voiceStatus.recordingDuration}s`}
                        </Badge>
                    )}
                    {voiceStatus.isPlaying && (
                        <Badge variant="default" className="text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            {language === 'hi' ? 'बजा रहा है...' : 'Playing...'}
                        </Badge>
                    )}
                    {voiceStatus.error && (
                        <Badge variant="destructive" className="text-xs">
                            {voiceStatus.error}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0 px-3 sm:px-6">
                <ScrollArea className="flex-1 pr-2 sm:pr-4 -mr-2 sm:-mr-4" ref={scrollAreaRef}>
                    <div className="space-y-3 sm:space-y-4 pb-4">
                        {/* Welcome tips */}
                        {messages.length === 1 && messages[0].intent === 'greeting' && (
                            <div className="space-y-2">
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        <strong>
                                            {language === 'hi' ? '🎯 मैं क्या कर सकता हूं:' : '🎯 What I can do:'}
                                        </strong>
                                    </p>
                                    <ul className="text-sm text-blue-600 mt-1 space-y-1">
                                        <li>• {language === 'hi' ? 'प्रोडक्ट बनाने में मदद' : 'Help create products'}</li>
                                        <li>• {language === 'hi' ? 'सेल्स ट्रैकिंग' : 'Sales tracking'}</li>
                                        <li>• {language === 'hi' ? 'ट्रेंड एनालिसिस' : 'Trend analysis'}</li>
                                        <li>• {language === 'hi' ? 'बायर कनेक्शन' : 'Buyer connections'}</li>
                                        <li>• {language === 'hi' ? 'ऐप नेवीगेशन' : 'App navigation'}</li>
                                        <li>• {language === 'hi' ? 'कारीगरी सलाह' : 'Craft advice'}</li>
                                    </ul>
                                </div>

                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-700">
                                        <strong>
                                            {language === 'hi' ? '🎯 व्यक्तिगत सहायता:' : '🎯 Personalized Assistance:'}
                                        </strong>
                                    </p>
                                    <p className="text-sm text-green-600 mt-1">
                                        {profileInfo
                                            ? (language === 'hi'
                                                ? `मैं ${profileInfo.name} के रूप में आपकी ${profileInfo.craft} में ${profileInfo.experience} साल के अनुभव के साथ मदद कर रहा हूं।`
                                                : `I'm assisting you as ${profileInfo.name} with ${profileInfo.experience} years of experience in ${profileInfo.craft}.`
                                            )
                                            : (language === 'hi'
                                                ? 'मैं आपकी व्यक्तिगत प्रोफाइल के आधार पर सहायता प्रदान कर रहा हूं।'
                                                : 'I\'m providing assistance based on your personal profile.'
                                            )
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Chat messages */}
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4",
                                    message.role === "user" && "justify-end"
                                )}
                            >
                                {message.role === "assistant" && (
                                    <Avatar className="size-6 sm:size-8 border shrink-0 mt-1">
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                                            AB
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                                <div
                                    className={cn(
                                        "max-w-[85%] sm:max-w-xs md:max-w-md rounded-lg p-2 sm:p-3 text-sm shadow-sm transition-all duration-200 hover:shadow-md",
                                        message.role === "assistant"
                                            ? "bg-muted border"
                                            : "bg-primary text-primary-foreground"
                                    )}
                                >
                                    {/* Message metadata - only show on assistant messages */}
                                    {message.role === "assistant" && (
                                        <div className="flex items-center gap-1 sm:gap-2 mb-2 flex-wrap">
                                            {message.intent && message.intent !== 'generic_chat' && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {message.intent}
                                                </Badge>
                                            )}

                                            {message.confidence && message.confidence > 0.8 && (
                                                <Badge variant="default" className="text-xs">
                                                    {language === 'hi' ? '🎯 उच्च विश्वास' : '🎯 High Confidence'}
                                                </Badge>
                                            )}

                                            {message.usedProfile && (
                                                <Badge variant="outline" className="text-xs">
                                                    {language === 'hi' ? '👤 प्रोफाइल' : '👤 Profile'}
                                                </Badge>
                                            )}

                                            {message.shouldNavigate && (
                                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                                    <Navigation className="h-3 w-3" />
                                                    {language === 'hi' ? 'नेवीगेट' : 'Navigate'}
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {/* Message content */}
                                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                                        {message.content}
                                    </div>

                                    {/* Audio controls for assistant messages */}
                                    {message.role === "assistant" && isVoiceEnabled && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (voiceStatus.isPlaying && voiceStatus.currentAudioId === message.id) {
                                                            pauseAudio();
                                                        } else if (voiceStatus.currentAudioId === message.id && currentAudioRef.current?.paused) {
                                                            resumeAudio();
                                                        } else {
                                                            playTTSResponse(message.content, message.id);
                                                        }
                                                    }}
                                                    className="h-6 px-2 text-xs"
                                                    disabled={loading}
                                                >
                                                    {voiceStatus.isPlaying && voiceStatus.currentAudioId === message.id ? (
                                                        <Pause className="h-3 w-3 mr-1" />
                                                    ) : (
                                                        <Play className="h-3 w-3 mr-1" />
                                                    )}
                                                    {voiceStatus.isPlaying && voiceStatus.currentAudioId === message.id
                                                        ? (language === 'hi' ? 'रोकें' : 'Pause')
                                                        : (language === 'hi' ? 'सुनें' : 'Play')
                                                    }
                                                </Button>

                                                {voiceStatus.currentAudioId === message.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={stopAudio}
                                                        className="h-6 px-2 text-xs"
                                                        disabled={loading}
                                                    >
                                                        <Square className="h-3 w-3 mr-1" />
                                                        {language === 'hi' ? 'बंद' : 'Stop'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <div className="text-xs opacity-70 mt-2 text-right">
                                        {message.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>

                                {message.role === "user" && (
                                    <Avatar className="size-6 sm:size-8 border shrink-0 mt-1">
                                        <AvatarFallback className="bg-green-100 text-green-600 font-semibold">
                                            <User className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && <TypingIndicator language={language} />}

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </CardContent>

            <CardFooter className="p-3 sm:p-6 pt-3">
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                    <div className="flex-1 relative">
                        <Input
                            placeholder={language === 'hi'
                                ? "अपना सवाल पूछें या मदद मांगें..."
                                : "Ask your question or request help..."
                            }
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                            className="pr-12 text-sm"
                            maxLength={500}
                        />
                        {input.length > 0 && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                                {input.length}/500
                            </div>
                        )}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={loading || !isVoiceEnabled}
                        onClick={handleVoiceButtonClick}
                        className={cn(
                            "transition-colors shrink-0 relative",
                            voiceStatus.isRecording && "bg-red-100 border-red-300 text-red-600 animate-pulse",
                            !isVoiceEnabled && "opacity-50"
                        )}
                        title={
                            !isVoiceEnabled
                                ? (language === 'hi' ? 'आवाज़ बंद है' : 'Voice disabled')
                                : voiceStatus.isRecording
                                    ? (language === 'hi' ? 'रिकॉर्डिंग बंद करें' : 'Stop recording')
                                    : (language === 'hi' ? 'आवाज़ इनपुट' : 'Voice input')
                        }
                    >
                        {voiceStatus.isRecording ? (
                            <Square className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
                        ) : (
                            <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}

                        {/* Recording indicator */}
                        {voiceStatus.isRecording && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        )}
                    </Button>

                    <Button
                        type="submit"
                        size="icon"
                        disabled={loading || !input.trim()}
                        className="shrink-0"
                    >
                        <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                </form>
            </CardFooter>

            {/* Conversation History Sheet */}
            <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            {language === 'hi' ? 'बातचीत का इतिहास' : 'Conversation History'}
                        </SheetTitle>
                        <SheetDescription>
                            {language === 'hi'
                                ? 'पिछली बातचीत देखें और प्रबंधित करें'
                                : 'View and manage previous conversations'
                            }
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={language === 'hi' ? 'बातचीत खोजें...' : 'Search conversations...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* History List */}
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {filteredHistory.length > 0 ? (
                                    filteredHistory.map((conversation) => (
                                        <div key={conversation.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium truncate">{conversation.title}</h4>
                                                    <p className="text-sm text-muted-foreground truncate mt-1">
                                                        {conversation.lastMessage}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                        <MessageSquare className="h-3 w-3" />
                                                        <span>{conversation.messageCount} {language === 'hi' ? 'संदेश' : 'messages'}</span>
                                                        <Clock className="h-3 w-3 ml-2" />
                                                        <span>{conversation.timestamp.toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteConversation(conversation.id)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">
                                            {searchQuery
                                                ? (language === 'hi' ? 'कोई बातचीत नहीं मिली' : 'No conversations found')
                                                : (language === 'hi' ? 'कोई बातचीत का इतिहास नहीं है' : 'No conversation history')
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            {language === 'hi' ? 'बातचीत सेटिंग्स' : 'Conversation Settings'}
                        </DialogTitle>
                        <DialogDescription>
                            {language === 'hi'
                                ? 'अपनी बातचीत की प्राथमिकताएं कॉन्फ़िगर करें'
                                : 'Configure your conversation preferences'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium">
                                        {language === 'hi' ? 'स्वचालित सहेजना' : 'Auto Save'}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        {language === 'hi' ? 'बातचीत स्वचालित रूप से सहेजें' : 'Automatically save conversations'}
                                    </p>
                                </div>
                                <Button
                                    variant={conversationSettings.autoSave ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setConversationSettings(prev => ({ ...prev, autoSave: !prev.autoSave }))}
                                >
                                    {conversationSettings.autoSave ? (language === 'hi' ? 'चालू' : 'On') : (language === 'hi' ? 'बंद' : 'Off')}
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {language === 'hi' ? 'अधिकतम इतिहास' : 'Max History'}
                                </label>
                                <Input
                                    type="number"
                                    value={conversationSettings.maxHistory}
                                    onChange={(e) => setConversationSettings(prev => ({
                                        ...prev,
                                        maxHistory: parseInt(e.target.value) || 50
                                    }))}
                                    min="10"
                                    max="200"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {language === 'hi' ? 'सहेजी जाने वाली अधिकतम बातचीत' : 'Maximum conversations to keep'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {language === 'hi' ? 'जवाब की लंबाई' : 'Response Length'}
                                </label>
                                <div className="flex gap-2">
                                    {(['brief', 'detailed', 'comprehensive'] as const).map((length) => (
                                        <Button
                                            key={length}
                                            variant={conversationSettings.responseLength === length ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setConversationSettings(prev => ({ ...prev, responseLength: length }))}
                                        >
                                            {language === 'hi'
                                                ? (length === 'brief' ? 'संक्षिप्त' : length === 'detailed' ? 'विस्तृत' : 'व्यापक')
                                                : (length.charAt(0).toUpperCase() + length.slice(1))
                                            }
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium">
                                        {language === 'hi' ? 'सूचनाएं' : 'Notifications'}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        {language === 'hi' ? 'सिस्टम सूचनाएं सक्षम करें' : 'Enable system notifications'}
                                    </p>
                                </div>
                                <Button
                                    variant={conversationSettings.enableNotifications ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setConversationSettings(prev => ({ ...prev, enableNotifications: !prev.enableNotifications }))}
                                >
                                    {conversationSettings.enableNotifications ? (language === 'hi' ? 'चालू' : 'On') : (language === 'hi' ? 'बंद' : 'Off')}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                        </Button>
                        <Button onClick={saveConversationSettings}>
                            {language === 'hi' ? 'सहेजें' : 'Save'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Profile Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            {language === 'hi' ? 'प्रोफाइल संपादित करें' : 'Edit Profile'}
                        </DialogTitle>
                        <DialogDescription>
                            {language === 'hi'
                                ? 'अपनी प्रोफाइल की जानकारी अपडेट करें। यह जानकारी बेहतर सहायता प्रदान करने में मदद करती है।'
                                : 'Update your profile information. This helps provide better assistance.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {language === 'hi' ? 'नाम' : 'Name'}
                                </label>
                                <Input
                                    value={editingProfile.name}
                                    onChange={(e) => setEditingProfile(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={language === 'hi' ? 'आपका नाम' : 'Your name'}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {language === 'hi' ? 'शिल्प/व्यवसाय' : 'Craft/Business'}
                                </label>
                                <Input
                                    value={editingProfile.craft}
                                    onChange={(e) => setEditingProfile(prev => ({ ...prev, craft: e.target.value }))}
                                    placeholder={language === 'hi' ? 'जैसे: मिट्टी के बर्तन, कपड़े' : 'e.g: Pottery, Textiles'}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {language === 'hi' ? 'अनुभव (साल)' : 'Experience (Years)'}
                                </label>
                                <Input
                                    type="number"
                                    value={editingProfile.experience}
                                    onChange={(e) => setEditingProfile(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {language === 'hi' ? 'स्थान' : 'Location'}
                                </label>
                                <Input
                                    value={editingProfile.location}
                                    onChange={(e) => setEditingProfile(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder={language === 'hi' ? 'शहर, राज्य' : 'City, State'}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {language === 'hi' ? 'कौशल (कॉमा से अलग करें)' : 'Skills (comma separated)'}
                            </label>
                            <Input
                                value={editingProfile.skills}
                                onChange={(e) => setEditingProfile(prev => ({ ...prev, skills: e.target.value }))}
                                placeholder={language === 'hi' ? 'हाथ से बुनाई, रंगाई, डिज़ाइन' : 'Hand weaving, Dyeing, Design'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {language === 'hi' ? 'विशेषताएं (कॉमा से अलग करें)' : 'Specialties (comma separated)'}
                            </label>
                            <Input
                                value={editingProfile.specialties}
                                onChange={(e) => setEditingProfile(prev => ({ ...prev, specialties: e.target.value }))}
                                placeholder={language === 'hi' ? 'पारंपरिक डिज़ाइन, आधुनिक शैली' : 'Traditional designs, Modern style'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {language === 'hi' ? 'व्यवसाय प्रकार' : 'Business Type'}
                            </label>
                            <Input
                                value={editingProfile.businessType}
                                onChange={(e) => setEditingProfile(prev => ({ ...prev, businessType: e.target.value }))}
                                placeholder={language === 'hi' ? 'व्यक्तिगत, सहकारी, कंपनी' : 'Individual, Cooperative, Company'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {language === 'hi' ? 'भाषाएं (कॉमा से अलग करें)' : 'Languages (comma separated)'}
                            </label>
                            <Input
                                value={editingProfile.languages}
                                onChange={(e) => setEditingProfile(prev => ({ ...prev, languages: e.target.value }))}
                                placeholder={language === 'hi' ? 'हिंदी, अंग्रेजी, स्थानीय भाषा' : 'Hindi, English, Local language'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {language === 'hi' ? 'चुनौतियां (कॉमा से अलग करें)' : 'Challenges (comma separated)'}
                            </label>
                            <Input
                                value={editingProfile.challenges}
                                onChange={(e) => setEditingProfile(prev => ({ ...prev, challenges: e.target.value }))}
                                placeholder={language === 'hi' ? 'मार्केटिंग, कच्चा माल, वित्त' : 'Marketing, Raw materials, Finance'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {language === 'hi' ? 'लक्ष्य (कॉमा से अलग करें)' : 'Goals (comma separated)'}
                            </label>
                            <Input
                                value={editingProfile.goals}
                                onChange={(e) => setEditingProfile(prev => ({ ...prev, goals: e.target.value }))}
                                placeholder={language === 'hi' ? 'बिक्री बढ़ाना, नए बाज़ार, ऑनलाइन उपस्थिति' : 'Increase sales, New markets, Online presence'}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                        </Button>
                        <Button onClick={saveProfile}>
                            {language === 'hi' ? 'सहेजें' : 'Save'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}