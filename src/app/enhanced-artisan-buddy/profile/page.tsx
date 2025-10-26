"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

interface ArtisanProfile {
    id: string;
    name: string;
    craft: string;
    specialties: string[];
    experience: number;
    location: string;
    products: string[];
    skills: string[];
    bio: string;
    languages: string[];
    businessInfo: {
        established: string;
        revenue: string;
        markets: string[];
    };
}

export default function EnhancedProfilePage() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();

    const [profile, setProfile] = useState<Partial<ArtisanProfile>>({
        id: user?.uid || '',
        name: '',
        craft: '',
        specialties: [],
        experience: 0,
        location: '',
        products: [],
        skills: [],
        bio: '',
        languages: ['Hindi', 'English'],
        businessInfo: {
            established: new Date().getFullYear().toString(),
            revenue: '',
            markets: ['India']
        }
    });

    const [loading, setLoading] = useState(false);
    const [existingProfile, setExistingProfile] = useState<ArtisanProfile | null>(null);

    // Input states for adding arrays
    const [newSpecialty, setNewSpecialty] = useState('');
    const [newProduct, setNewProduct] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [newLanguage, setNewLanguage] = useState('');
    const [newMarket, setNewMarket] = useState('');

    useEffect(() => {
        if (user?.uid) {
            loadExistingProfile();
        }
    }, [user]);

    const loadExistingProfile = async () => {
        try {
            const response = await fetch(`/api/enhanced-artisan-buddy/profile?artisanId=${user?.uid}`);
            if (response.ok) {
                const data = await response.json();
                setExistingProfile(data.profile);
                setProfile(data.profile);
            }
        } catch (error) {
            console.error('Failed to load existing profile:', error);
        }
    };

    const addToArray = (field: keyof ArtisanProfile, value: string, setter: (value: string) => void) => {
        if (!value.trim()) return;

        const currentArray = profile[field] as string[] || [];
        if (!currentArray.includes(value.trim())) {
            setProfile(prev => ({
                ...prev,
                [field]: [...currentArray, value.trim()]
            }));
        }
        setter('');
    };

    const removeFromArray = (field: keyof ArtisanProfile, index: number) => {
        const currentArray = profile[field] as string[] || [];
        setProfile(prev => ({
            ...prev,
            [field]: currentArray.filter((_, i) => i !== index)
        }));
    };

    const addToBusinessArray = (field: keyof ArtisanProfile['businessInfo'], value: string, setter: (value: string) => void) => {
        if (!value.trim()) return;

        const currentArray = profile.businessInfo?.[field] as string[] || [];
        if (!currentArray.includes(value.trim())) {
            setProfile(prev => ({
                ...prev,
                businessInfo: {
                    ...prev.businessInfo!,
                    [field]: [...currentArray, value.trim()]
                }
            }));
        }
        setter('');
    };

    const removeFromBusinessArray = (field: keyof ArtisanProfile['businessInfo'], index: number) => {
        const currentArray = profile.businessInfo?.[field] as string[] || [];
        setProfile(prev => ({
            ...prev,
            businessInfo: {
                ...prev.businessInfo!,
                [field]: currentArray.filter((_, i) => i !== index)
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate required fields
            if (!profile.name || !profile.craft || !profile.location) {
                toast({
                    title: language === 'hi' ? 'त्रुटि' : 'Error',
                    description: language === 'hi'
                        ? 'कृपया सभी आवश्यक फील्ड भरें (नाम, क्राफ्ट, स्थान)'
                        : 'Please fill in all required fields (Name, Craft, Location)',
                    variant: "destructive"
                });
                return;
            }

            const response = await fetch('/api/enhanced-artisan-buddy/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: language === 'hi' ? 'सफलता' : 'Success',
                    description: language === 'hi'
                        ? 'आपकी प्रोफाइल सफलतापूर्वक सेव हो गई!'
                        : 'Your profile has been saved successfully!',
                });

                // Redirect back to chat
                setTimeout(() => {
                    window.location.href = '/enhanced-artisan-buddy';
                }, 1500);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save profile');
            }

        } catch (error) {
            console.error('Profile save error:', error);
            toast({
                title: language === 'hi' ? 'त्रुटि' : 'Error',
                description: language === 'hi'
                    ? 'प्रोफाइल सेव करने में असफल। कृपया दोबारा कोशिश करें।'
                    : 'Failed to save profile. Please try again.',
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
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

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>
                        {existingProfile
                            ? (language === 'hi' ? 'प्रोफाइल अपडेट करें' : 'Update Profile')
                            : (language === 'hi' ? 'प्रोफाइल बनाएं' : 'Create Profile')
                        }
                    </CardTitle>
                    <CardDescription>
                        {language === 'hi'
                            ? 'व्यक्तिगत AI सहायता के लिए अपनी कारीगर प्रोफाइल सेट करें'
                            : 'Set up your artisan profile for personalized AI assistance'
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">
                                    {language === 'hi' ? 'नाम *' : 'Name *'}
                                </Label>
                                <Input
                                    id="name"
                                    value={profile.name || ''}
                                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={language === 'hi' ? 'आपका पूरा नाम' : 'Your full name'}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="craft">
                                    {language === 'hi' ? 'क्राफ्ट *' : 'Craft *'}
                                </Label>
                                <Input
                                    id="craft"
                                    value={profile.craft || ''}
                                    onChange={(e) => setProfile(prev => ({ ...prev, craft: e.target.value }))}
                                    placeholder={language === 'hi' ? 'जैसे: हैंडलूम बुनाई, मिट्टी के बर्तन' : 'e.g., Handloom Weaving, Pottery'}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="location">
                                    {language === 'hi' ? 'स्थान *' : 'Location *'}
                                </Label>
                                <Input
                                    id="location"
                                    value={profile.location || ''}
                                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder={language === 'hi' ? 'शहर, राज्य' : 'City, State'}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="experience">
                                    {language === 'hi' ? 'अनुभव (वर्ष)' : 'Experience (Years)'}
                                </Label>
                                <Input
                                    id="experience"
                                    type="number"
                                    value={profile.experience || 0}
                                    onChange={(e) => setProfile(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                                    placeholder={language === 'hi' ? 'अनुभव के वर्ष' : 'Years of experience'}
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Bio */}
                        <div>
                            <Label htmlFor="bio">
                                {language === 'hi' ? 'बायो' : 'Bio'}
                            </Label>
                            <Textarea
                                id="bio"
                                value={profile.bio || ''}
                                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                                placeholder={language === 'hi'
                                    ? 'अपने और अपने क्राफ्ट के बारे में बताएं...'
                                    : 'Tell us about yourself and your craft...'
                                }
                                rows={3}
                            />
                        </div>

                        {/* Specialties */}
                        <div>
                            <Label>
                                {language === 'hi' ? 'विशेषताएं' : 'Specialties'}
                            </Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newSpecialty}
                                    onChange={(e) => setNewSpecialty(e.target.value)}
                                    placeholder={language === 'hi' ? 'विशेषता जोड़ें' : 'Add a specialty'}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('specialties', newSpecialty, setNewSpecialty))}
                                />
                                <Button
                                    type="button"
                                    onClick={() => addToArray('specialties', newSpecialty, setNewSpecialty)}
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.specialties?.map((specialty, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                        {specialty}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => removeFromArray('specialties', index)}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Products */}
                        <div>
                            <Label>
                                {language === 'hi' ? 'प्रोडक्ट्स' : 'Products'}
                            </Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newProduct}
                                    onChange={(e) => setNewProduct(e.target.value)}
                                    placeholder={language === 'hi' ? 'प्रोडक्ट जोड़ें' : 'Add a product'}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('products', newProduct, setNewProduct))}
                                />
                                <Button
                                    type="button"
                                    onClick={() => addToArray('products', newProduct, setNewProduct)}
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.products?.map((product, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                        {product}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => removeFromArray('products', index)}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Skills */}
                        <div>
                            <Label>
                                {language === 'hi' ? 'स्किल्स' : 'Skills'}
                            </Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    placeholder={language === 'hi' ? 'स्किल जोड़ें' : 'Add a skill'}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('skills', newSkill, setNewSkill))}
                                />
                                <Button
                                    type="button"
                                    onClick={() => addToArray('skills', newSkill, setNewSkill)}
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.skills?.map((skill, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                        {skill}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => removeFromArray('skills', index)}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Business Information */}
                        <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold mb-4">
                                {language === 'hi' ? 'बिज़नेस की जानकारी' : 'Business Information'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="established">
                                        {language === 'hi' ? 'स्थापना वर्ष' : 'Established Year'}
                                    </Label>
                                    <Input
                                        id="established"
                                        value={profile.businessInfo?.established || ''}
                                        onChange={(e) => setProfile(prev => ({
                                            ...prev,
                                            businessInfo: { ...prev.businessInfo!, established: e.target.value }
                                        }))}
                                        placeholder={language === 'hi' ? 'स्थापना वर्ष' : 'Year established'}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="revenue">
                                        {language === 'hi' ? 'वार्षिक आय' : 'Annual Revenue'}
                                    </Label>
                                    <Input
                                        id="revenue"
                                        value={profile.businessInfo?.revenue || ''}
                                        onChange={(e) => setProfile(prev => ({
                                            ...prev,
                                            businessInfo: { ...prev.businessInfo!, revenue: e.target.value }
                                        }))}
                                        placeholder={language === 'hi' ? 'जैसे: ₹5-10 लाख सालाना' : 'e.g., ₹5-10 lakhs annually'}
                                    />
                                </div>
                            </div>

                            {/* Markets */}
                            <div className="mt-4">
                                <Label>
                                    {language === 'hi' ? 'बाज़ार' : 'Markets'}
                                </Label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={newMarket}
                                        onChange={(e) => setNewMarket(e.target.value)}
                                        placeholder={language === 'hi' ? 'बाज़ार जोड़ें' : 'Add a market'}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToBusinessArray('markets', newMarket, setNewMarket))}
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => addToBusinessArray('markets', newMarket, setNewMarket)}
                                        size="sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {profile.businessInfo?.markets?.map((market, index) => (
                                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                            {market}
                                            <X
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() => removeFromBusinessArray('markets', index)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="submit" disabled={loading}>
                                {loading
                                    ? (language === 'hi' ? 'सेव कर रहे हैं...' : 'Saving...')
                                    : (existingProfile
                                        ? (language === 'hi' ? 'प्रोफाइल अपडेट करें' : 'Update Profile')
                                        : (language === 'hi' ? 'प्रोफाइल बनाएं' : 'Create Profile')
                                    )
                                }
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}