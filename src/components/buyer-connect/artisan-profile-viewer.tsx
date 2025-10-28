"use client";

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Clock, 
  MessageCircle, 
  Heart, 
  Award, 
  Calendar,
  CheckCircle,
  ExternalLink,
  Play,
  Image as ImageIcon,
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface ArtisanProfileViewerProps {
  artisanId: string;
  onBack: () => void;
  onStartChat: (artisanId: string) => void;
  onToggleFavorite?: (artisanId: string) => void;
  isFavorite?: boolean;
}

interface ArtisanProfile {
  uid: string;
  name: string;
  artisticProfession: string;
  description: string;
  profileImage?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  artisanConnectProfile?: {
    specializations: string[];
    businessHours: {
      timezone: string;
      schedule: Array<{
        day: string;
        start: string;
        end: string;
        available: boolean;
      }>;
    };
    responseTimeAverage: number;
    acceptsCustomOrders: boolean;
    minimumOrderValue?: number;
    availabilityStatus: string;
    aiMetrics: {
      matchSuccessRate: number;
      customerSatisfactionScore: number;
      averageOrderValue: number;
      completionRate: number;
    };
    skillTags: Array<{
      skill: string;
      proficiency: number;
      verified: boolean;
    }>;
    culturalCertifications: Array<{
      name: string;
      issuer: string;
      dateIssued: string;
      verified: boolean;
    }>;
    portfolioHighlights: string[];
  };
}

interface VirtualShowroom {
  title: string;
  description: string;
  workspaceImages: Array<{
    id: string;
    url: string;
    type: string;
    caption: string;
  }>;
  processVideos: Array<{
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    duration: number;
    technique: string;
  }>;
  culturalStory: string;
}

export function ArtisanProfileViewer({ 
  artisanId, 
  onBack, 
  onStartChat, 
  onToggleFavorite,
  isFavorite = false 
}: ArtisanProfileViewerProps) {
  const [profile, setProfile] = useState<ArtisanProfile | null>(null);
  const [showroom, setShowroom] = useState<VirtualShowroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadArtisanProfile();
  }, [artisanId]);

  const loadArtisanProfile = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real implementation, fetch from API
      const mockProfile: ArtisanProfile = {
        uid: artisanId,
        name: 'Rajesh Kumar',
        artisticProfession: 'Traditional Pottery',
        description: 'Master potter with over 20 years of experience in traditional Indian pottery. Specializes in terracotta, ceramic glazing, and decorative pottery for both functional and artistic purposes.',
        profileImage: '/sample-images/artisan-profile.jpg',
        address: {
          city: 'Khurja',
          state: 'Uttar Pradesh',
          country: 'India'
        },
        artisanConnectProfile: {
          specializations: ['Pottery', 'Ceramics', 'Terracotta', 'Glazing'],
          businessHours: {
            timezone: 'Asia/Kolkata',
            schedule: [
              { day: 'Monday', start: '09:00', end: '18:00', available: true },
              { day: 'Tuesday', start: '09:00', end: '18:00', available: true },
              { day: 'Wednesday', start: '09:00', end: '18:00', available: true },
              { day: 'Thursday', start: '09:00', end: '18:00', available: true },
              { day: 'Friday', start: '09:00', end: '18:00', available: true },
              { day: 'Saturday', start: '10:00', end: '16:00', available: true },
              { day: 'Sunday', start: '10:00', end: '14:00', available: false }
            ]
          },
          responseTimeAverage: 45,
          acceptsCustomOrders: true,
          minimumOrderValue: 500,
          availabilityStatus: 'available',
          aiMetrics: {
            matchSuccessRate: 0.85,
            customerSatisfactionScore: 4.6,
            averageOrderValue: 2500,
            completionRate: 0.92
          },
          skillTags: [
            { skill: 'Wheel Throwing', proficiency: 0.95, verified: true },
            { skill: 'Glazing Techniques', proficiency: 0.88, verified: true },
            { skill: 'Kiln Firing', proficiency: 0.90, verified: false },
            { skill: 'Decorative Painting', proficiency: 0.82, verified: true }
          ],
          culturalCertifications: [
            {
              name: 'Traditional Pottery Master',
              issuer: 'Uttar Pradesh Handicrafts Board',
              dateIssued: '2018-03-15',
              verified: true
            },
            {
              name: 'Heritage Craft Specialist',
              issuer: 'Ministry of Textiles',
              dateIssued: '2020-07-22',
              verified: true
            }
          ],
          portfolioHighlights: [
            'Featured in National Handicrafts Exhibition 2023',
            'Supplied pottery for 5-star hotel chain',
            'Winner of State Artisan Award 2021'
          ]
        }
      };

      const mockShowroom: VirtualShowroom = {
        title: 'Traditional Pottery Workshop',
        description: 'Step into our traditional pottery workshop where ancient techniques meet modern creativity',
        workspaceImages: [
          {
            id: '1',
            url: '/sample-images/pottery-workshop-1.jpg',
            type: '360',
            caption: 'Main pottery wheel area'
          },
          {
            id: '2',
            url: '/sample-images/pottery-workshop-2.jpg',
            type: 'standard',
            caption: 'Kiln and firing area'
          },
          {
            id: '3',
            url: '/sample-images/pottery-workshop-3.jpg',
            type: 'standard',
            caption: 'Finished pottery display'
          }
        ],
        processVideos: [
          {
            id: '1',
            title: 'Wheel Throwing Basics',
            description: 'Learn the fundamentals of pottery wheel throwing',
            thumbnailUrl: '/sample-images/video-thumb-1.jpg',
            duration: 180,
            technique: 'Wheel Throwing'
          },
          {
            id: '2',
            title: 'Glazing Techniques',
            description: 'Traditional glazing methods for pottery',
            thumbnailUrl: '/sample-images/video-thumb-2.jpg',
            duration: 240,
            technique: 'Glazing'
          }
        ],
        culturalStory: 'Our pottery tradition spans three generations, preserving ancient techniques passed down through our family. Each piece tells a story of heritage and craftsmanship.'
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfile(mockProfile);
      setShowroom(mockShowroom);
    } catch (error) {
      console.error('Failed to load artisan profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'busy': return 'text-yellow-600 bg-yellow-50';
      case 'unavailable': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>

        {/* Profile Header Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">Failed to load artisan profile</div>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </Button>
        
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleFavorite(artisanId)}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              {isFavorite ? 'Favorited' : 'Add to Favorites'}
            </Button>
          )}
          
          <Button onClick={() => onStartChat(artisanId)} className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Start Chat
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={!imageError ? profile.profileImage : undefined} 
                alt={profile.name}
                onError={() => setImageError(true)}
              />
              <AvatarFallback className="text-2xl">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  <Badge className={getAvailabilityColor(profile.artisanConnectProfile?.availabilityStatus || 'available')}>
                    {profile.artisanConnectProfile?.availabilityStatus || 'available'}
                  </Badge>
                </div>
                
                <p className="text-xl text-muted-foreground mb-2">{profile.artisticProfession}</p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {profile.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.address.city}, {profile.address.state}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Responds in {profile.artisanConnectProfile?.responseTimeAverage}m
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {profile.artisanConnectProfile?.aiMetrics.customerSatisfactionScore.toFixed(1)}
                  </div>
                </div>
              </div>
              
              <p className="text-muted-foreground leading-relaxed">{profile.description}</p>
              
              {/* Specializations */}
              <div className="flex flex-wrap gap-2">
                {profile.artisanConnectProfile?.specializations.map((spec, index) => (
                  <Badge key={index} variant="secondary">{spec}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="showroom">Showroom</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(profile.artisanConnectProfile!.aiMetrics.matchSuccessRate * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Match Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(profile.artisanConnectProfile!.aiMetrics.completionRate * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Completion Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        ₹{profile.artisanConnectProfile!.aiMetrics.averageOrderValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Order Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {profile.artisanConnectProfile!.responseTimeAverage}m
                      </div>
                      <div className="text-sm text-muted-foreground">Response Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Highlights */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {profile.artisanConnectProfile?.portfolioHighlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Custom Orders</div>
                      <div className="text-sm text-muted-foreground">
                        {profile.artisanConnectProfile?.acceptsCustomOrders ? 'Accepted' : 'Not Available'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Minimum Order</div>
                      <div className="text-sm text-muted-foreground">
                        ₹{profile.artisanConnectProfile?.minimumOrderValue?.toLocaleString() || 'No minimum'}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-2">Business Hours</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {profile.artisanConnectProfile?.businessHours.schedule.map((day, index) => (
                        <div key={index} className="flex justify-between">
                          <span className={day.available ? '' : 'text-muted-foreground'}>
                            {day.day}
                          </span>
                          <span className={day.available ? '' : 'text-muted-foreground'}>
                            {day.available ? `${day.start} - ${day.end}` : 'Closed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.artisanConnectProfile?.skillTags.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{skill.skill}</span>
                          {skill.verified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(skill.proficiency * 100)}%
                        </span>
                      </div>
                      <Progress value={skill.proficiency * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Cultural Certifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.artisanConnectProfile?.culturalCertifications.map((cert, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cert.name}</span>
                          {cert.verified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Issued by {cert.issuer} • {new Date(cert.dateIssued).getFullYear()}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="showroom" className="space-y-6">
              {showroom && (
                <>
                  {/* Showroom Header */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{showroom.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{showroom.description}</p>
                      <p className="text-sm leading-relaxed">{showroom.culturalStory}</p>
                    </CardContent>
                  </Card>

                  {/* Workspace Images */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Workshop Gallery
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {showroom.workspaceImages.map((image) => (
                          <div key={image.id} className="space-y-2">
                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{image.caption}</span>
                                {image.type === '360' && (
                                  <Badge variant="secondary" className="text-xs">360°</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Process Videos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Process Videos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {showroom.processVideos.map((video) => (
                          <div key={video.id} className="space-y-2">
                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative">
                              <Play className="h-12 w-12 text-muted-foreground" />
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {formatDuration(video.duration)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{video.title}</div>
                              <div className="text-xs text-muted-foreground">{video.description}</div>
                              <Badge variant="outline" className="text-xs">
                                {video.technique}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-muted-foreground mb-4">
                    Reviews feature coming soon
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Customer reviews and testimonials will be displayed here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full gap-2" 
                onClick={() => onStartChat(artisanId)}
              >
                <MessageCircle className="h-4 w-4" />
                Start Conversation
              </Button>
              
              <Button variant="outline" className="w-full gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Consultation
              </Button>
              
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View Full Portfolio
              </Button>
            </CardContent>
          </Card>

          {/* Rating Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Rating Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {profile.artisanConnectProfile?.aiMetrics.customerSatisfactionScore.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Quality</span>
                  <span>4.8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Communication</span>
                  <span>4.6</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Timeliness</span>
                  <span>4.4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Value</span>
                  <span>4.5</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similar Artisans */}
          <Card>
            <CardHeader>
              <CardTitle>Similar Artisans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-4">
                Similar artisan recommendations will appear here
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}