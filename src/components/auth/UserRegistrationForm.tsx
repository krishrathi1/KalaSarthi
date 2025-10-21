'use client'
import { useState, ChangeEvent, FormEvent } from 'react';
import { User } from 'firebase/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, User as UserIcon, Palette, ShoppingBag, Mail, Phone, MapPin } from 'lucide-react';

// Type definitions
type Step = 'role' | 'form';
type Role = 'artisan' | 'buyer';

interface FormData {
    name: string;
    email: string;
    artisticProfession: string;
    description: string;
    profileImage: string;
    role: Role | '';
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
}

interface UserData {
    name: string;
    role: Role;
    phone: string;
    profileImage: string;
    uid: string;
    email?: string;
    artisticProfession?: string;
    description?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
}

interface UserRegistrationFormProps {
    user: User;
    onRegistrationComplete: (userData: UserData) => void;
}

interface ApiResponse {
    success: boolean;
    error?: string;
}

const UserRegistrationForm: React.FC<UserRegistrationFormProps> = ({
    user,
    onRegistrationComplete
}) => {
    const [step, setStep] = useState<Step>('role');
    const [selectedRole, setSelectedRole] = useState<Role | ''>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [uploadingImage, setUploadingImage] = useState<boolean>(false);

    // Form data
    const [formData, setFormData] = useState<FormData>({
        name: user.displayName || '',
        email: user.email || '',
        artisticProfession: '',
        description: '',
        profileImage: '',
        role: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India'
        }
    });

    const handleRoleSelection = (role: Role): void => {
        setSelectedRole(role);
        setFormData(prev => ({ ...prev, role }));
        setStep('form');
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError('');
        }
    };

    const uploadProfileImage = async (): Promise<string | null> => {
        if (!imageFile) return null;

        setUploadingImage(true);
        try {
            const result = await uploadToCloudinary(imageFile, {
                folder: 'profile-images',
                tags: ['profile', 'user'],
                public_id: `${user.uid}_${Date.now()}`
            });
            return result.secure_url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }

        if (!formData.email.trim()) {
            setError('Email is required');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            setError('Please enter a valid email address');
            return;
        }

        if (!user.phoneNumber) {
            setError('Phone number is required. Please complete phone verification first.');
            return;
        }

        if (selectedRole === 'artisan' && !formData.artisticProfession.trim()) {
            setError('Artistic profession is required for artisans');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let profileImageUrl = '';

            // Upload image if provided
            if (imageFile) {
                const uploadedUrl = await uploadProfileImage();
                if (uploadedUrl) {
                    profileImageUrl = uploadedUrl;
                }
            }

            // Prepare user data according to backend model
            const userData: UserData = {
                uid: user.uid,
                email: formData.email.trim(),
                name: formData.name.trim(),
                phone: user.phoneNumber!,  // We validated this exists above
                role: selectedRole as Role,
                profileImage: profileImageUrl,
            };

            // Add artisan-specific fields
            if (selectedRole === 'artisan') {
                userData.artisticProfession = formData.artisticProfession.trim();
                userData.description = formData.description.trim();
            }

            // Add address if provided
            const hasAddress = Object.values(formData.address).some(value => value.trim());
            if (hasAddress) {
                userData.address = {
                    street: formData.address.street.trim() || undefined,
                    city: formData.address.city.trim() || undefined,
                    state: formData.address.state.trim() || undefined,
                    zipCode: formData.address.zipCode.trim() || undefined,
                    country: formData.address.country.trim() || undefined,
                };
            }

            // Save to MongoDB via API
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const result: ApiResponse = await response.json();

            if (result.success) {
                console.log('User registered successfully');
                onRegistrationComplete(userData);
            } else {
                setError(result.error || 'Failed to register user');
            }
        } catch (error) {
            console.error('Error registering user:', error);
            setError('Failed to register user. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'role') {
        return (
            <div className="max-w-2xl mx-auto">
                <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
                    <CardHeader className="text-center pb-8">
                        <CardTitle className="text-3xl font-headline text-foreground mb-2">
                            Welcome to KalaSarthi
                        </CardTitle>
                        <CardDescription className="text-lg text-muted-foreground">
                            Choose your role to get started on your artisan journey
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card
                                className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/50 group"
                                onClick={() => handleRoleSelection('artisan')}
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Palette className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">Artisan</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        Showcase and sell your handmade crafts. Connect with buyers who appreciate authentic artistry.
                                    </p>
                                    <Badge variant="secondary" className="mt-3">
                                        Create & Sell
                                    </Badge>
                                </CardContent>
                            </Card>

                            <Card
                                className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/50 group"
                                onClick={() => handleRoleSelection('buyer')}
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                                        <ShoppingBag className="w-8 h-8 text-accent-foreground" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">Buyer</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        Discover unique handmade items from talented artisans. Support local craftsmanship.
                                    </p>
                                    <Badge variant="outline" className="mt-3">
                                        Discover & Buy
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline text-foreground mb-2">
                        Complete Your Profile
                    </CardTitle>
                    <CardDescription>
                        <Badge variant="outline" className="mb-2">
                            {selectedRole === 'artisan' ? 'Artisan' : 'Buyer'} Account
                        </Badge>
                        <br />
                        Tell us more about yourself to get started
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Profile Image Upload */}
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
                                <Label htmlFor="profile-image" className="cursor-pointer">
                                    <div className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors">
                                        <Upload className="w-4 h-4" />
                                        <span className="text-sm">Upload Photo</span>
                                    </div>
                                </Label>
                                <input
                                    id="profile-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Optional • Max 5MB • JPG, PNG
                                </p>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name" className="text-sm font-medium">
                                    Full Name *
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter your full name"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email Address *
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter your email address"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Phone Number
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={user.phoneNumber || ''}
                                        disabled
                                        className="mt-1 bg-muted pr-20"
                                    />
                                    <Badge
                                        variant="secondary"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-800 border-green-200"
                                    >
                                        Verified
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Verified via SMS authentication
                                </p>
                            </div>

                            {/* Artisan-specific fields */}
                            {selectedRole === 'artisan' && (
                                <>
                                    <div>
                                        <Label htmlFor="artisticProfession" className="text-sm font-medium">
                                            Artistic Profession *
                                        </Label>
                                        <Select
                                            value={formData.artisticProfession}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, artisticProfession: value }))}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select your craft specialty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pottery">Pottery & Ceramics</SelectItem>
                                                <SelectItem value="jewelry">Jewelry Making</SelectItem>
                                                <SelectItem value="textiles">Textiles & Weaving</SelectItem>
                                                <SelectItem value="woodworking">Woodworking</SelectItem>
                                                <SelectItem value="metalwork">Metalwork</SelectItem>
                                                <SelectItem value="painting">Painting</SelectItem>
                                                <SelectItem value="sculpture">Sculpture</SelectItem>
                                                <SelectItem value="embroidery">Embroidery</SelectItem>
                                                <SelectItem value="leatherwork">Leather Work</SelectItem>
                                                <SelectItem value="glasswork">Glass Work</SelectItem>
                                                <SelectItem value="handicrafts">Traditional Handicrafts</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="description" className="text-sm font-medium">
                                            About Your Craft
                                        </Label>
                                        <Textarea
                                            id="description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows={3}
                                            placeholder="Tell buyers about your craft, experience, and what makes your work unique..."
                                            className="mt-1 resize-none"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Address (Optional)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="street" className="text-sm font-medium">
                                        Street Address
                                    </Label>
                                    <Input
                                        id="street"
                                        name="street"
                                        value={formData.address.street}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            address: { ...prev.address, street: e.target.value }
                                        }))}
                                        placeholder="Enter your street address"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="city" className="text-sm font-medium">
                                        City
                                    </Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        value={formData.address.city}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            address: { ...prev.address, city: e.target.value }
                                        }))}
                                        placeholder="City"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="state" className="text-sm font-medium">
                                        State
                                    </Label>
                                    <Input
                                        id="state"
                                        name="state"
                                        value={formData.address.state}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            address: { ...prev.address, state: e.target.value }
                                        }))}
                                        placeholder="State"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="zipCode" className="text-sm font-medium">
                                        ZIP Code
                                    </Label>
                                    <Input
                                        id="zipCode"
                                        name="zipCode"
                                        value={formData.address.zipCode}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            address: { ...prev.address, zipCode: e.target.value }
                                        }))}
                                        placeholder="ZIP Code"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="country" className="text-sm font-medium">
                                        Country
                                    </Label>
                                    <Input
                                        id="country"
                                        name="country"
                                        value={formData.address.country}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            address: { ...prev.address, country: e.target.value }
                                        }))}
                                        placeholder="Country"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep('role')}
                                className="flex-1"
                            >
                                Back
                            </Button>

                            <Button
                                type="submit"
                                disabled={loading || uploadingImage}
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating Profile...
                                    </>
                                ) : (
                                    'Complete Registration'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserRegistrationForm;