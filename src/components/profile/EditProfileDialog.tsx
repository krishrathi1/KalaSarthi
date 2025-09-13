'use client';

import { useState } from 'react';
import { UserProfile, useAuth } from '@/context/auth-context';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`/api/users/${userProfile.uid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
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

                        <div>
                            <Label htmlFor="profileImage">Profile Image URL</Label>
                            <Input
                                id="profileImage"
                                value={formData.profileImage}
                                onChange={(e) => handleInputChange('profileImage', e.target.value)}
                                placeholder="https://example.com/your-image.jpg"
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