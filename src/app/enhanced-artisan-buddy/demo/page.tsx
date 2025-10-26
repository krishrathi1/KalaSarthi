"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";

export default function EnhancedArtisanBuddyDemo() {
    const { language } = useLanguage();
    const [selectedProfile, setSelectedProfile] = useState<string>('default_user');

    const demoProfiles = [
        {
            id: 'default_user',
            name: 'Demo Artisan',
            craft: 'Mixed Traditional Crafts',
            experience: 5,
            location: 'India',
            specialties: ['Traditional Arts', 'Handmade Items', 'Cultural Crafts']
        },
        {
            id: 'user_rajesh_001',
            name: 'Rajesh Kumar',
            craft: 'Handloom Weaving',
            experience: 15,
            location: 'Varanasi, Uttar Pradesh',
            specialties: ['Silk Sarees', 'Cotton Fabrics', 'Traditional Patterns', 'Banarasi Weaving']
        },
        {
            id: 'user_priya_002',
            name: 'Priya Sharma',
            craft: 'Pottery & Ceramics',
            experience: 10,
            location: 'Jaipur, Rajasthan',
            specialties: ['Terracotta', 'Glazed Ceramics', 'Decorative Items', 'Blue Pottery']
        }
    ];

    const sampleQuestions = [
        {
            en: "Tell me about my profile",
            hi: "मेरी प्रोफाइल के बारे में बताएं"
        },
        {
            en: "What products should I create?",
            hi: "मुझे कौन से प्रोडक्ट्स बनाने चाहिए?"
        },
        {
            en: "How can I improve my craft skills?",
            hi: "मैं अपने क्राफ्ट स्किल्स कैसे सुधार सकता हूं?"
        },
        {
            en: "Help me find buyers",
            hi: "मुझे बायर्स ढूंढने में मदद करें"
        },
        {
            en: "Show me trending designs",
            hi: "मुझे ट्रेंडिंग डिज़ाइन दिखाएं"
        }
    ];

    const startChatWithProfile = (profileId: string) => {
        // Store selected profile in localStorage for demo
        localStorage.setItem('demo_profile_id', profileId);
        window.location.href = '/enhanced-artisan-buddy';
    };

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <Link href="/enhanced-artisan-buddy">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {language === 'hi' ? 'चैट पर वापस जाएं' : 'Back to Chat'}
                    </Button>
                </Link>
            </div>

            <div className="max-w-6xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {language === 'hi' ? 'Enhanced Artisan Buddy डेमो' : 'Enhanced Artisan Buddy Demo'}
                        </CardTitle>
                        <CardDescription>
                            {language === 'hi'
                                ? 'विभिन्न कारीगर प्रोफाइल्स के साथ व्यक्तिगत AI सहायता का अनुभव करें'
                                : 'Experience personalized AI assistance with different artisan profiles'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {demoProfiles.map((profile) => (
                                <Card
                                    key={profile.id}
                                    className={`cursor-pointer transition-all hover:shadow-md ${selectedProfile === profile.id ? 'ring-2 ring-primary' : ''
                                        }`}
                                    onClick={() => setSelectedProfile(profile.id)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                                <User className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{profile.name}</CardTitle>
                                                <CardDescription className="text-sm">
                                                    {profile.craft}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    {language === 'hi' ? 'अनुभव:' : 'Experience:'}
                                                </span>
                                                <span>{profile.experience} {language === 'hi' ? 'साल' : 'years'}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">
                                                    {language === 'hi' ? 'स्थान:' : 'Location:'}
                                                </span>
                                                <span className="ml-2">{profile.location}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {profile.specialties.slice(0, 2).map((specialty, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        {specialty}
                                                    </Badge>
                                                ))}
                                                {profile.specialties.length > 2 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{profile.specialties.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="text-center">
                            <Button
                                onClick={() => startChatWithProfile(selectedProfile)}
                                size="lg"
                                className="mb-4"
                            >
                                {language === 'hi'
                                    ? `${demoProfiles.find(p => p.id === selectedProfile)?.name} के रूप में चैट शुरू करें`
                                    : `Start Chat as ${demoProfiles.find(p => p.id === selectedProfile)?.name}`
                                }
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {language === 'hi' ? 'नमूना प्रश्न' : 'Sample Questions'}
                        </CardTitle>
                        <CardDescription>
                            {language === 'hi'
                                ? 'इन प्रश्नों को आज़माकर देखें कि AI कैसे व्यक्तिगत जवाब देता है'
                                : 'Try these questions to see how the AI provides personalized responses'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sampleQuestions.map((question, index) => (
                                <div key={index} className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-medium">
                                        {language === 'hi' ? question.hi : question.en}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {language === 'hi' ? 'मुख्य विशेषताएं' : 'Key Features'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                        <span className="text-blue-600 font-semibold text-sm">🧠</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">
                                            {language === 'hi' ? 'वेक्टर स्टोर इंटीग्रेशन' : 'Vector Store Integration'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'hi'
                                                ? 'आपकी प्रोफाइल जानकारी को AI मेमोरी में स्टोर करके व्यक्तिगत जवाब देता है'
                                                : 'Stores your profile information in AI memory for personalized responses'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                        <span className="text-green-600 font-semibold text-sm">🎯</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">
                                            {language === 'hi' ? 'DialogFlow स्टाइल इंटेंट्स' : 'DialogFlow Style Intents'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'hi'
                                                ? 'स्मार्ट इंटेंट रिकग्निशन और ऐप नेवीगेशन'
                                                : 'Smart intent recognition and app navigation'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                                        <span className="text-purple-600 font-semibold text-sm">🗣</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">
                                            {language === 'hi' ? 'आवाज़ नेवीगेशन' : 'Voice Navigation'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'hi'
                                                ? 'आवाज़ कमांड्स के साथ ऐप के विभिन्न सेक्शन्स में जाएं'
                                                : 'Navigate to different app sections with voice commands'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                                        <span className="text-orange-600 font-semibold text-sm">💬</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">
                                            {language === 'hi' ? 'कॉन्टेक्स्चुअल चैट' : 'Contextual Chat'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'hi'
                                                ? 'आपके क्राफ्ट और अनुभव के आधार पर सलाह और मार्गदर्शन'
                                                : 'Advice and guidance based on your craft and experience'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}