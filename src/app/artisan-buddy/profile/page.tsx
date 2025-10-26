"use client";

import { useState, useEffect } from "react";
import { ArtisanProfileSetup } from "@/components/artisan-profile-setup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Edit } from "lucide-react";
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

export default function ArtisanProfilePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [profile, setProfile] = useState<ArtisanProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            const response = await fetch(`/api/artisan-buddy/profile?artisanId=${user?.uid}`);
            if (response.ok) {
                const data = await response.json();
                setProfile(data.profile);
            } else if (response.status === 404) {
                // Profile doesn't exist, show setup form
                setEditing(true);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            toast({
                title: "Error",
                description: "Failed to load profile. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileCreated = (newProfile: ArtisanProfile) => {
        setProfile(newProfile);
        setEditing(false);
        toast({
            title: "Success",
            description: "Your artisan profile has been saved successfully!",
        });
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p>Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (editing || !profile) {
        return (
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <Link href="/artisan-buddy">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Artisan Buddy
                        </Button>
                    </Link>
                </div>
                <ArtisanProfileSetup
                    onProfileCreated={handleProfileCreated}
                    existingProfile={profile || undefined}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <Link href="/artisan-buddy">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Artisan Buddy
                    </Button>
                </Link>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Profile Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl">{profile.name}</CardTitle>
                                    <CardDescription className="text-lg">
                                        {profile.craft} • {profile.location}
                                    </CardDescription>
                                </div>
                            </div>
                            <Button onClick={() => setEditing(true)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        </div>
                    </CardHeader>
                    {profile.bio && (
                        <CardContent>
                            <p className="text-muted-foreground">{profile.bio}</p>
                        </CardContent>
                    )}
                </Card>

                {/* Experience & Skills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Experience & Skills</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2">Experience</h4>
                                <p>{profile.experience} years in {profile.craft}</p>
                            </div>
                            {profile.specialties.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">Specialties</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.specialties.map((specialty, index) => (
                                            <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                                                {specialty}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {profile.skills.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.skills.map((skill, index) => (
                                            <span key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {profile.products.length > 0 ? (
                                <div className="space-y-2">
                                    {profile.products.map((product, index) => (
                                        <div key={index} className="p-2 bg-muted rounded-md">
                                            {product}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No products listed</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Business Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Business Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <h4 className="font-semibold mb-1">Established</h4>
                                <p className="text-muted-foreground">{profile.businessInfo.established}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Employees</h4>
                                <p className="text-muted-foreground">{profile.businessInfo.employees}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Revenue</h4>
                                <p className="text-muted-foreground">{profile.businessInfo.revenue || 'Not specified'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Markets</h4>
                                <div className="flex flex-wrap gap-1">
                                    {profile.businessInfo.markets.map((market, index) => (
                                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                                            {market}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Achievements & Certifications */}
                {(profile.achievements.length > 0 || profile.certifications.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {profile.achievements.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Achievements</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {profile.achievements.map((achievement, index) => (
                                            <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                                🏆 {achievement}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {profile.certifications.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Certifications</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {profile.certifications.map((certification, index) => (
                                            <div key={index} className="p-2 bg-green-50 border border-green-200 rounded-md">
                                                📜 {certification}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Languages */}
                <Card>
                    <CardHeader>
                        <CardTitle>Languages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {profile.languages.map((lang, index) => (
                                <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                    {lang}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}