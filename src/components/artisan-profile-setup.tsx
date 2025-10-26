"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/i18n";
import { X, Plus } from "lucide-react";

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
    achievements: string[];
    certifications: string[];
    languages: string[];
    businessInfo: {
        established: string;
        employees: number;
        revenue: string;
        markets: string[];
    };
}

interface ArtisanProfileSetupProps {
    onProfileCreated?: (profile: ArtisanProfile) => void;
    existingProfile?: ArtisanProfile;
}

export function ArtisanProfileSetup({ onProfileCreated, existingProfile }: ArtisanProfileSetupProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();

    const [profile, setProfile] = useState<Partial<ArtisanProfile>>({
        id: existingProfile?.id || user?.uid || '',
        name: existingProfile?.name || '',
        craft: existingProfile?.craft || '',
        specialties: existingProfile?.specialties || [],
        experience: existingProfile?.experience || 0,
        location: existingProfile?.location || '',
        products: existingProfile?.products || [],
        skills: existingProfile?.skills || [],
        bio: existingProfile?.bio || '',
        achievements: existingProfile?.achievements || [],
        certifications: existingProfile?.certifications || [],
        languages: existingProfile?.languages || ['Hindi', 'English'],
        businessInfo: existingProfile?.businessInfo || {
            established: new Date().getFullYear().toString(),
            employees: 1,
            revenue: '',
            markets: ['India']
        }
    });

    const [newSpecialty, setNewSpecialty] = useState('');
    const [newProduct, setNewProduct] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [newAchievement, setNewAchievement] = useState('');
    const [newCertification, setNewCertification] = useState('');
    const [newMarket, setNewMarket] = useState('');
    const [loading, setLoading] = useState(false);

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
                    title: "Validation Error",
                    description: "Please fill in all required fields (Name, Craft, Location)",
                    variant: "destructive"
                });
                return;
            }

            const method = existingProfile ? 'PUT' : 'POST';
            const endpoint = '/api/artisan-buddy/profile';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Success",
                    description: existingProfile
                        ? "Profile updated successfully!"
                        : "Profile created successfully!",
                });

                if (onProfileCreated) {
                    onProfileCreated(data.profile);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save profile');
            }

        } catch (error) {
            console.error('Profile save error:', error);
            toast({
                title: "Error",
                description: "Failed to save profile. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>
                    {existingProfile ? 'Update Artisan Profile' : 'Create Artisan Profile'}
                </CardTitle>
                <CardDescription>
                    Set up your artisan profile to enable personalized AI assistance
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={profile.name || ''}
                                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Your full name"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="craft">Craft *</Label>
                            <Input
                                id="craft"
                                value={profile.craft || ''}
                                onChange={(e) => setProfile(prev => ({ ...prev, craft: e.target.value }))}
                                placeholder="e.g., Handloom Weaving, Pottery, Jewelry Making"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="location">Location *</Label>
                            <Input
                                id="location"
                                value={profile.location || ''}
                                onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="City, State"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="experience">Experience (Years)</Label>
                            <Input
                                id="experience"
                                type="number"
                                value={profile.experience || 0}
                                onChange={(e) => setProfile(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                                placeholder="Years of experience"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={profile.bio || ''}
                            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell us about yourself and your craft..."
                            rows={3}
                        />
                    </div>

                    {/* Specialties */}
                    <div>
                        <Label>Specialties</Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                value={newSpecialty}
                                onChange={(e) => setNewSpecialty(e.target.value)}
                                placeholder="Add a specialty"
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
                        <Label>Products</Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                value={newProduct}
                                onChange={(e) => setNewProduct(e.target.value)}
                                placeholder="Add a product"
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
                        <Label>Skills</Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                placeholder="Add a skill"
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
                        <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="established">Established Year</Label>
                                <Input
                                    id="established"
                                    value={profile.businessInfo?.established || ''}
                                    onChange={(e) => setProfile(prev => ({
                                        ...prev,
                                        businessInfo: { ...prev.businessInfo!, established: e.target.value }
                                    }))}
                                    placeholder="Year established"
                                />
                            </div>
                            <div>
                                <Label htmlFor="employees">Number of Employees</Label>
                                <Input
                                    id="employees"
                                    type="number"
                                    value={profile.businessInfo?.employees || 1}
                                    onChange={(e) => setProfile(prev => ({
                                        ...prev,
                                        businessInfo: { ...prev.businessInfo!, employees: parseInt(e.target.value) || 1 }
                                    }))}
                                    min="1"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="revenue">Annual Revenue</Label>
                                <Input
                                    id="revenue"
                                    value={profile.businessInfo?.revenue || ''}
                                    onChange={(e) => setProfile(prev => ({
                                        ...prev,
                                        businessInfo: { ...prev.businessInfo!, revenue: e.target.value }
                                    }))}
                                    placeholder="e.g., ₹5-10 lakhs annually"
                                />
                            </div>
                        </div>

                        {/* Markets */}
                        <div className="mt-4">
                            <Label>Markets</Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newMarket}
                                    onChange={(e) => setNewMarket(e.target.value)}
                                    placeholder="Add a market"
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
                            {loading ? 'Saving...' : (existingProfile ? 'Update Profile' : 'Create Profile')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}