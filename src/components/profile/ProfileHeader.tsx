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
            <div className="bg-card rounded-lg border p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
                            <AvatarImage 
                                src={userProfile.profileImage} 
                                alt={userProfile.name}
                            />
                            <AvatarFallback className="text-lg sm:text-xl lg:text-2xl">
                                {getInitials(userProfile.name)}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
                                    {userProfile.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge 
                                        variant={userProfile.role === 'artisan' ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {userProfile.role === 'artisan' ? 'Artisan' : 'Buyer'}
                                    </Badge>
                                    {userProfile.artisticProfession && (
                                        <Badge variant="outline" className="text-xs">
                                            {userProfile.artisticProfession}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsEditDialogOpen(true)}
                                className="flex items-center gap-2 flex-shrink-0"
                            >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Edit Profile</span>
                                <span className="sm:hidden">Edit</span>
                            </Button>
                        </div>

                        {/* Description */}
                        {userProfile.description && (
                            <p className="text-muted-foreground mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed">
                                {userProfile.description}
                            </p>
                        )}

                        {/* Meta Information */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                            {getLocationString() && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="truncate">{getLocationString()}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>Joined {formatDate(userProfile.createdAt)}</span>
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