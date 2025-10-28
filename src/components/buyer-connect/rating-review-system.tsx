"use client";

import { useState } from 'react';
import { Star, Upload, X, ThumbsUp, Flag, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Review {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerImage?: string;
  orderId: string;
  productName: string;
  rating: number;
  reviewText: string;
  images?: string[];
  createdAt: Date;
  helpful: number;
  verified: boolean;
  response?: {
    text: string;
    createdAt: Date;
  };
}

interface RatingBreakdown {
  overall: number;
  quality: number;
  communication: number;
  timeliness: number;
  value: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface RatingReviewSystemProps {
  // For displaying reviews
  reviews?: Review[];
  ratingBreakdown?: RatingBreakdown;
  
  // For creating new review
  orderId?: string;
  artisanId?: string;
  productName?: string;
  onSubmitReview?: (review: {
    rating: number;
    reviewText: string;
    images: File[];
    breakdown: {
      quality: number;
      communication: number;
      timeliness: number;
      value: number;
    };
  }) => void;
  
  // For artisan response
  onRespondToReview?: (reviewId: string, response: string) => void;
  
  mode: 'display' | 'create' | 'respond';
}

export function RatingReviewSystem({
  reviews = [],
  ratingBreakdown,
  orderId,
  artisanId,
  productName,
  onSubmitReview,
  onRespondToReview,
  mode = 'display'
}: RatingReviewSystemProps) {
  // Review creation state
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Response state
  const [responseText, setResponseText] = useState('');
  const [respondingToReview, setRespondingToReview] = useState<string | null>(null);

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    readonly = false, 
    size = 'default' 
  }: { 
    rating: number; 
    onRatingChange?: (rating: number) => void; 
    readonly?: boolean;
    size?: 'small' | 'default' | 'large';
  }) => {
    const sizeClasses = {
      small: 'h-4 w-4',
      default: 'h-5 w-5',
      large: 'h-6 w-6'
    };

    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} cursor-pointer transition-colors ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            } ${readonly ? 'cursor-default' : ''}`}
            onClick={() => !readonly && onRatingChange?.(star)}
          />
        ))}
      </div>
    );
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + uploadedImages.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    setUploadedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (overallRating === 0) {
      alert('Please provide an overall rating');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitReview?.({
        rating: overallRating,
        reviewText,
        images: uploadedImages,
        breakdown: {
          quality: qualityRating,
          communication: communicationRating,
          timeliness: timelinessRating,
          value: valueRating
        }
      });

      // Reset form
      setOverallRating(0);
      setQualityRating(0);
      setCommunicationRating(0);
      setTimelinessRating(0);
      setValueRating(0);
      setReviewText('');
      setUploadedImages([]);
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondToReview = async (reviewId: string) => {
    if (!responseText.trim()) return;

    try {
      await onRespondToReview?.(reviewId, responseText);
      setResponseText('');
      setRespondingToReview(null);
    } catch (error) {
      console.error('Failed to respond to review:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Create Review Mode
  if (mode === 'create') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Rate Your Experience</CardTitle>
          <p className="text-muted-foreground">
            How was your experience with {productName}?
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Overall Rating */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Overall Rating</Label>
            <div className="flex items-center space-x-2">
              <StarRating rating={overallRating} onRatingChange={setOverallRating} size="large" />
              <span className="text-sm text-muted-foreground ml-2">
                {overallRating > 0 && `${overallRating} star${overallRating !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Rate Different Aspects</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Quality</Label>
                <StarRating rating={qualityRating} onRatingChange={setQualityRating} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Communication</Label>
                <StarRating rating={communicationRating} onRatingChange={setCommunicationRating} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Timeliness</Label>
                <StarRating rating={timelinessRating} onRatingChange={setTimelinessRating} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Value for Money</Label>
                <StarRating rating={valueRating} onRatingChange={setValueRating} />
              </div>
            </div>
          </div>

          {/* Written Review */}
          <div className="space-y-2">
            <Label htmlFor="review-text">Write a Review (Optional)</Label>
            <Textarea
              id="review-text"
              placeholder="Share your experience with other buyers..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Add Photos (Optional)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={uploadedImages.length >= 5}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photos ({uploadedImages.length}/5)
                </Button>
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadedImages.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={submitting || overallRating === 0}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display Reviews Mode
  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {ratingBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">{ratingBreakdown.overall.toFixed(1)}</div>
                  <StarRating rating={ratingBreakdown.overall} readonly size="large" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on {ratingBreakdown.totalReviews} reviews
                  </p>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center space-x-2">
                    <span className="text-sm w-8">{stars}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{
                          width: `${(ratingBreakdown.distribution[stars as keyof typeof ratingBreakdown.distribution] / ratingBreakdown.totalReviews) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">
                      {ratingBreakdown.distribution[stars as keyof typeof ratingBreakdown.distribution]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Ratings */}
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{ratingBreakdown.quality.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Quality</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{ratingBreakdown.communication.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Communication</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{ratingBreakdown.timeliness.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Timeliness</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{ratingBreakdown.value.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
              <p className="text-muted-foreground">
                Be the first to review this artisan's work
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={review.buyerImage} alt={review.buyerName} />
                        <AvatarFallback>{getInitials(review.buyerName)}</AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.buyerName}</span>
                          {review.verified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <StarRating rating={review.rating} readonly size="small" />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Product Name */}
                  <div className="text-sm text-muted-foreground">
                    Product: {review.productName}
                  </div>

                  {/* Review Text */}
                  {review.reviewText && (
                    <p className="text-sm leading-relaxed">{review.reviewText}</p>
                  )}

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex space-x-2">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review image ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                        />
                      ))}
                    </div>
                  )}

                  {/* Helpful Button */}
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Helpful ({review.helpful})
                    </Button>
                    
                    {mode === 'respond' && !review.response && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRespondingToReview(review.id)}
                      >
                        Respond
                      </Button>
                    )}
                  </div>

                  {/* Artisan Response */}
                  {review.response && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">Artisan Response</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.response.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{review.response.text}</p>
                    </div>
                  )}

                  {/* Response Form */}
                  {respondingToReview === review.id && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Write your response..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRespondingToReview(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRespondToReview(review.id)}
                          disabled={!responseText.trim()}
                        >
                          Post Response
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}