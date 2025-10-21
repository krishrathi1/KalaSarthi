'use client';

import { useState, ChangeEvent } from 'react';
import { UserProfile, useAuth } from '@/context/auth-context';
import { uploadToCloudinary } from '@/lib/cloudinary';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EditProfileDialogProps {
    userProfile: UserProfile;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({
    userProfile,
    open,
    onOpenChange,
}: EditProfileDialogProps) {
    const { refreshUserProfile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(userProfile.profileImage || '');
    const [uploadingImage, setUploadingImage] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        artisticProfession: userProfile.artisticProfession || '',
        description: userProfile.description || '',
        profileImage: userProfile.profileImage || '',
        address: {
            street: userProfile.address?.street || '',
            city: userProfile.address?.city || '',
            state: userProfile.address?.state || '',
            zipCode: userProfile.address?.zipCode || '',
            country: userProfile.address?.country || '',
        },
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAddressChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value,
            },
        }));
    };

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Image size should be less than 5MB',
                    variant: 'destructive',
                });
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Invalid file type',
                    description: 'Please select a valid image file',
                    variant: 'destructive',
                });
                return;
            }

            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadProfileImage = async (): Promise<string | null> => {
        if (!imageFile) return null;

        setUploadingImage(true);
        try {
            const result = await uploadToCloudinary(imageFile, {
                folder: 'profile-images',
                tags: ['profile', 'user'],
                public_id: `${userProfile.uid}_${Date.now()}`
            });
            return result.secure_url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let profileImageUrl = formData.profileImage;

            // Upload new image if one was selected
            if (imageFile) {
                const uploadedUrl = await uploadProfileImage();
                if (uploadedUrl) {
                    profileImageUrl = uploadedUrl;
                }
            }

            const updatedFormData = {
                ...formData,
                profileImage: profileImageUrl,
            };

            const response = await fetch(`/api/users/${userProfile.uid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedFormData),
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Profile Updated',
                    description: 'Your profile has been successfully updated.',
                });
                await refreshUserProfile();
                onOpenChange(false);
            } else {
                toast({
                    title: 'Update Failed',
                    description: result.error || 'Failed to update profile.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                title: 'Update Failed',
                description: 'An error occurred while updating your profile.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Basic Information</h3>

                        {/* Profile Image Upload */}
                        <div className="space-y-4">
                            <Label>Profile Image</Label>
                            <div className="flex flex-col items-center space-y-4">
                                <div className="relative">
                                    <Avatar className="w-24 h-24 border-4 border-primary/20">
                                        <AvatarImage src={imagePreview} alt="Profile preview" />
                                        <AvatarFallback className="bg-muted">
                                            <UserIcon className="w-8 h-8 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    {uploadingImage && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-center">
                                    <Label htmlFor="profile-image-edit" className="cursor-pointer">
                                        <div className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors">
                                            <Upload className="w-4 h-4" />
                                            <span className="text-sm">Upload New Photo</span>
                                        </div>
                                    </Label>
                                    <input
                                        id="profile-image-edit"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Max 5MB • JPG, PNG
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Full Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="artisticProfession">Artistic Profession</Label>
                                <Input
                                    id="artisticProfession"
                                    value={formData.artisticProfession}
                                    onChange={(e) => handleInputChange('artisticProfession', e.target.value)}
                                    placeholder="e.g., Potter, Weaver, Sculptor"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Tell us about yourself and your craft..."
                                rows={3}
                            />
                        </div>

                        
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Address Information</h3>

                        <div>
                            <Label htmlFor="street">Street Address</Label>
                            <Input
                                id="street"
                                value={formData.address.street}
                                onChange={(e) => handleAddressChange('street', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={formData.address.city}
                                    onChange={(e) => handleAddressChange('city', e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    value={formData.address.state}
                                    onChange={(e) => handleAddressChange('state', e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="zipCode">ZIP Code</Label>
                                <Input
                                    id="zipCode"
                                    value={formData.address.zipCode}
                                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    value={formData.address.country}
                                    onChange={(e) => handleAddressChange('country', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}