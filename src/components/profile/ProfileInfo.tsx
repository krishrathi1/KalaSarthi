'use client';

import { UserProfile } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, Briefcase } from 'lucide-react';
import { useMounted } from '@/hooks/use-mounted';

interface ProfileInfoProps {
    userProfile: UserProfile;
}

export default function ProfileInfo({ userProfile }: ProfileInfoProps) {
    const mounted = useMounted();

    const formatDate = (date: Date) => {
        if (!mounted) return 'Loading...';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    };
    const getFullAddress = () => {
        if (!userProfile.address) return null;
        const { street, city, state, zipCode, country } = userProfile.address;
        const parts = [street, city, state, zipCode, country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    return (
        <div className="space-y-6">
            {/* Contact Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Contact Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {userProfile.email && (
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{userProfile.email}</span>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{userProfile.phone}</span>
                    </div>

                    {getFullAddress() && (
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-sm">{getFullAddress()}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Professional Information */}
            {userProfile.role === 'artisan' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Professional Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Artistic Profession
                            </label>
                            <div className="mt-1">
                                <Badge variant="outline">
                                    {userProfile.artisticProfession}
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Role
                            </label>
                            <div className="mt-1">
                                <Badge>
                                    {userProfile.role === 'artisan' ? 'Artisan' : 'Buyer'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Member Since
                        </label>
                        <p className="text-sm mt-1">
                            {formatDate(userProfile.createdAt)}
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Last Updated
                        </label>
                        <p className="text-sm mt-1">
                            {formatDate(userProfile.updatedAt)}
                        </p>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}