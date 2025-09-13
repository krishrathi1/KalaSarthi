'use client';

import { UserProfile } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, MapPin, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useMounted } from '@/hooks/use-mounted';
import EditProfileDialog from './EditProfileDialog';

interface ProfileHeaderProps {
    userProfile: UserProfile;
}

export default function ProfileHeader({ userProfile }: ProfileHeaderProps) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const mounted = useMounted();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (date: Date) => {
        if (!mounted) return 'Loading...';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long'
        }).format(new Date(date));
    };

    const getLocationString = () => {
        if (!userProfile.address) return null;
        const { city, state, country } = userProfile.address;
        const parts = [city, state, country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    return (
        <>
            <div className="bg-card rounded-lg border p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* Avatar */}
                    <Avatar className="h-24 w-24">
                        <AvatarImage 
                            src={userProfile.profileImage} 
                            alt={userProfile.name}
                        />
                        <AvatarFallback className="text-2xl">
                            {getInitials(userProfile.name)}
                        </AvatarFallback>
                    </Avatar>

                    {/* Profile Info */}
                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold">{userProfile.name}</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={userProfile.role === 'artisan' ? 'default' : 'secondary'}>
                                        {userProfile.role === 'artisan' ? 'Artisan' : 'Buyer'}
                                    </Badge>
                                    {userProfile.artisticProfession && (
                                        <Badge variant="outline">
                                            {userProfile.artisticProfession}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <Button 
                                variant="outline" 
                                onClick={() => setIsEditDialogOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Edit className="h-4 w-4" />
                                Edit Profile
                            </Button>
                        </div>

                        {/* Description */}
                        {userProfile.description && (
                            <p className="text-muted-foreground mt-4 max-w-2xl">
                                {userProfile.description}
                            </p>
                        )}

                        {/* Meta Information */}
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                            {getLocationString() && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {getLocationString()}
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Joined {formatDate(userProfile.createdAt)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <EditProfileDialog
                userProfile={userProfile}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
            />
        </>
    );
}