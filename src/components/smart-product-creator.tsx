"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, Upload, Sparkles, Mic, MicOff, Play, Pause } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { safeFetch, handleFileUploadError } from "@/lib/error-handler";
import { useAuth } from "@/context/auth-context";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// Voice processor removed - using new voice navigation system
import { StoryRecordingMic } from "@/components/ui/StoryRecordingMic";
import { useRouter } from "next/navigation";

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  materials: string[];
  colors: string[];
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  quantity: number;
  tags: string[];
  weight: number;
  careInstructions: string;
}

type WizardStep = 'image-upload' | 'audio-recording' | 'product-details' | 'pricing-engine';

export function SmartProductCreator() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('image-upload');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const router = useRouter();

  // Pricing approval state
  const [pricingApproved, setPricingApproved] = useState(false);

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonSlider, setComparisonSlider] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Audio recording and voice features state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [enhancedTranscription, setEnhancedTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showStoryEnhancement, setShowStoryEnhancement] = useState(false);
  const [isEnhancingStory, setIsEnhancingStory] = useState(false);
  const [finalizedStory, setFinalizedStory] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [finalTranscript, setFinalTranscript] = useState<string>("");
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Voice command recognition state
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [lastCommandTime, setLastCommandTime] = useState<number>(0);
  const [commandCooldown, setCommandCooldown] = useState(2000); // 2 seconds cooldown
  const [lastRecognizedCommand, setLastRecognizedCommand] = useState<string>("");
  const [commandFeedbackVisible, setCommandFeedbackVisible] = useState(false);

  // Text input state
  const [textInput, setTextInput] = useState<string>("");
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');

  // Product form state
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    category: "",
    materials: [],
    colors: [],
    dimensions: { length: 0, width: 0, height: 0, weight: 0 },
    quantity: 1,
    tags: [],
    weight: 0,
    careInstructions: ""
  });

  // Pricing engine state
  const [pricingAnalysis, setPricingAnalysis] = useState<any>(null);
  const [isAnalyzingPricing, setIsAnalyzingPricing] = useState(false);

  // Artisan input state for realistic pricing
  const [artisanInputs, setArtisanInputs] = useState({
    timeSpent: '', // hours
    materialCosts: '', // cost of materials
    otherCosts: '', // tools, transportation, etc.
    expectedProfit: '', // desired profit margin
  });
  const [showPricingInputs, setShowPricingInputs] = useState(true);

  // UI state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [uploadingProduct, setUploadingProduct] = useState(false);

  // Enhanced Voice-guided workflow state
  const [voiceWorkflowStep, setVoiceWorkflowStep] = useState<'welcome' | 'image_upload' | 'audio_recording' | 'pricing_setup' | 'product_details' | 'review_publish'>('welcome');
  const [voiceWorkflowActive, setVoiceWorkflowActive] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string>("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [voiceStepHistory, setVoiceStepHistory] = useState<string[]>([]);
  const [voiceErrors, setVoiceErrors] = useState<string[]>([]);
  const [voiceHints, setVoiceHints] = useState<string[]>([]);
  const [voiceErrorHelp, setVoiceErrorHelp] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  // Additional state for compatibility
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en', 'es', 'fr']);
  const [isTranslating, setIsTranslating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('artisan_female');
  const [processingStep, setProcessingStep] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<String>("");
  const [productDescription, setProductDescription] = useState("A handwoven Kanchipuram silk saree with traditional peacock motifs and a golden zari border.");

  // Vector-based story to description state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [autoGeneratedDescription, setAutoGeneratedDescription] = useState<string>("");
  const [descriptionKeywords, setDescriptionKeywords] = useState<string[]>([]);
  const [useVectorDescription, setUseVectorDescription] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  const { toast } = useToast();
  const { userProfile } = useAuth();

  // Voice processor removed - using new voice navigation system

  // Story enhancement function
  const enhanceStory = async () => {
    if (!transcription) return;

    setIsEnhancingStory(true);
    try {
      // Create a comprehensive prompt that includes image analysis and story enhancement
      const imageAnalysisContext = imageAnalysis ? `
Image Analysis Context:
- Product Type: ${imageAnalysis.productType || 'Unknown'}
- Category: ${imageAnalysis.category || 'Unknown'}
- Materials: ${imageAnalysis.materials?.join(', ') || 'Not specified'}
- Colors: ${imageAnalysis.colors?.join(', ') || 'Not specified'}
- Description: ${imageAnalysis.description || 'No description available'}
- Cultural Elements: ${imageAnalysis.culturalElements?.join(', ') || 'Not specified'}
- Craft Techniques: ${imageAnalysis.craftTechniques?.join(', ') || 'Not specified'}
` : 'No image analysis available.';

      const enhancementPrompt = `You are a professional marketing copywriter specializing in handmade and artisanal products. Your task is to transform a basic product story into a compelling, customer-attracting narrative.

${imageAnalysisContext}

Original Story from Artisan: "${transcription}"

Please enhance this story by:

1. **Analyzing the Product**: Use the image analysis to understand the product's unique characteristics, materials, and cultural significance.

2. **Creating Emotional Connection**: Write in a way that makes customers feel connected to the artisan's journey and the product's cultural heritage.

3. **Highlighting Craftsmanship**: Emphasize the skill, time, and dedication that went into creating this piece.

4. **Adding Sensory Details**: Include descriptions that appeal to the senses (sight, touch, smell, sound).

5. **Cultural Storytelling**: Weave in cultural significance, traditions, and the artisan's personal connection to their craft.

6. **Customer Benefits**: Explain why this product is special and what makes it worth purchasing.

7. **Call to Action**: End with a compelling reason for customers to buy this unique piece.

Requirements:
- Write in an engaging, conversational tone
- Keep it between 150-300 words
- Make it specific to this product (not generic)
- Use vivid, descriptive language
- Include the artisan's personal touch
- Make it irresistible to potential customers
- Write in the same language as the original story (Hindi/English)

Return only the enhanced story, no additional commentary.`;

      const requestData = {
        story: transcription,
        imageUrl: imagePreview, // Pass the actual image URL
        language: /[\u0900-\u097F]/.test(transcription) ? 'hi-IN' : 'en-US', // Detect language from transcription
        voiceStyle: 'default' // Default voice style, can be enhanced later
      };

      console.log('Sending story enhancement request:', {
        storyLength: transcription.length,
        hasImageUrl: !!imagePreview,
        language: requestData.language,
        imageUrlType: typeof imagePreview
      });

      const response = await fetch('/api/story-enhancement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      console.log('Story enhancement response:', result);

      if (result.success && result.enhancedStory) {
        setEnhancedTranscription(result.enhancedStory);
        setShowStoryEnhancement(false);

        toast({
          title: "Story Enhanced!",
          description: "Your story has been transformed into a compelling customer-attracting narrative.",
        });
      } else {
        console.error('Story enhancement failed:', result.error);
        throw new Error(result.error || 'Failed to enhance story');
      }
    } catch (error) {
      console.error('Story enhancement failed:', error);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance your story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancingStory(false);
    }
  };

  // Story recording handlers
  const handleStoryRecorded = (transcript: string, audioBlob: Blob) => {
    setTranscription(transcript);
    setAudioBlob(audioBlob);
    setShowStoryEnhancement(true);
    addDebugLog(`🎤 Story recorded: "${transcript}"`);

    toast({
      title: "Story Captured!",
      description: "Your story has been recorded. Would you like to enhance it?",
    });
  };

  const handleStoryCleared = () => {
    setTranscription('');
    setAudioBlob(null);
    setShowStoryEnhancement(false);
    addDebugLog('🎤 Story recording cleared');
  };

  const handleFinalizedStory = (finalStory: string, audioBlob: Blob | null) => {
    console.log('Finalized story:', finalStory);
    console.log('Audio blob:', audioBlob);

    // Update the transcription to the finalized story
    setTranscription(finalStory);
    setFinalizedStory(finalStory);

    // Update product description with story summary
    if (finalStory && finalStory.length > 0) {
      const storySummary = finalStory.length > 200 ? finalStory.substring(0, 200) + '...' : finalStory;
      setProductForm(prev => ({
        ...prev,
        description: storySummary
      }));
    }

    // Show success message
    toast({
      title: "Story Finalized!",
      description: "Your story is ready for voice generation. Check the voice options below.",
    });
  };

  // Helper functions
  const calculatePriceFromAnalysis = (analysis: any): number => {
    if (!analysis) return 0;

    // Basic price calculation based on analysis
    let basePrice = 100; // Base price

    if (analysis.materials) {
      const materialMultiplier = analysis.materials.length * 10;
      basePrice += materialMultiplier;
    }

    if (analysis.dimensions) {
      const volume = (analysis.dimensions.length || 0) * (analysis.dimensions.width || 0) * (analysis.dimensions.height || 0);
      basePrice += volume * 0.1;
    }

    return Math.round(basePrice);
  };

  const generateTagsFromAnalysis = (analysis: any): string[] => {
    if (!analysis) return [];

    const tags: string[] = [];

    if (analysis.category) tags.push(analysis.category);
    if (analysis.materials) tags.push(...analysis.materials);
    if (analysis.colors) tags.push(...analysis.colors);
    if (analysis.productType) tags.push(analysis.productType);

    return [...new Set(tags)]; // Remove duplicates
  };

  // Auto-fill product form when data becomes available
  useEffect(() => {
    if (currentStep === 'product-details' && imageAnalysis && !productForm.name) {
      const calculatedPrice = calculatePriceFromAnalysis(imageAnalysis);
      const finalPrice = pricingApproved && pricingAnalysis ? pricingAnalysis.suggestedPrice : calculatedPrice;

      setProductForm(prev => ({
        ...prev,
        name: prev.name || imageAnalysis.productType || '',
        description: prev.description || transcription || imageAnalysis.description || '',
        price: prev.price || finalPrice,
        category: prev.category || imageAnalysis.category || '',
        materials: prev.materials.length > 0 ? prev.materials : (imageAnalysis.materials || []),
        colors: prev.colors.length > 0 ? prev.colors : (imageAnalysis.colors || []),
        dimensions: prev.dimensions.length || prev.dimensions.width || prev.dimensions.height || prev.dimensions.weight
          ? prev.dimensions
          : { length: 0, width: 0, height: 0, weight: 0 },
        quantity: prev.quantity || 1,
        tags: prev.tags.length > 0 ? prev.tags : generateTagsFromAnalysis(imageAnalysis)
      }));

      // Voice confirmation for auto-filled data
      if (voiceWorkflowActive && voiceWorkflowStep === 'product_details') {
        setTimeout(() => {
          speakVoiceFeedback("I've automatically filled in some details from your image and story. Please review and add any missing information.");
        }, 1000);
      }
    }
  }, [currentStep, imageAnalysis, transcription, productForm.name, pricingApproved, pricingAnalysis, voiceWorkflowActive, voiceWorkflowStep]);

  // Voice confirmations for step completions
  useEffect(() => {
    if (voiceWorkflowActive) {
      // Image upload completion
      if (voiceWorkflowStep === 'image_upload' && imageFile && !isAnalyzingImage) {
        speakVoiceFeedback("Great! Image uploaded successfully. I'm analyzing it now.");
      }

      // Audio recording completion
      if (voiceWorkflowStep === 'audio_recording' && audioBlob && transcription) {
        speakVoiceFeedback("Perfect! Your story has been recorded and transcribed. Moving to pricing.");
      }

      // Pricing completion
      if (voiceWorkflowStep === 'pricing_setup' && pricingAnalysis) {
        speakVoiceFeedback(`Fair price calculated: ₹${pricingAnalysis.suggestedPrice}. Moving to product details.`);
      }

      // Product details completion
      if (voiceWorkflowStep === 'product_details' && productForm.name && productForm.description && productForm.category) {
        speakVoiceFeedback("Excellent! All product details are complete. Ready for final review.");
      }
    }
  }, [imageFile, audioBlob, transcription, pricingAnalysis, productForm, voiceWorkflowActive, voiceWorkflowStep, isAnalyzingImage]);

  // Merge real-time transcription with server results
  const mergeTranscriptions = (realtimeText: string, serverText: string): string => {
    if (!realtimeText) return serverText;
    if (!serverText) return realtimeText;

    // Simple merge: prefer server result but append any additional real-time content
    const serverWords = serverText.split(' ');
    const realtimeWords = realtimeText.split(' ');

    // If real-time has significantly more content, it might be more complete
    if (realtimeWords.length > serverWords.length * 1.5) {
      return realtimeText;
    }

    // Otherwise, prefer the server result as it's more accurate
    return serverText;
  };

  // Enhance story with emotional connect and branding
  const enhanceStoryWithEmotion = async (story: string): Promise<string> => {
    if (!story || story.trim().length === 0) return story;

    try {
      const response = await fetch('/api/story-to-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story: story,
          language: /[\u0900-\u097F]/.test(story) ? 'hi-IN' : 'en-US', // Detect language from story
          category: productForm.category || 'handicrafts',
          artisanId: userProfile?.uid,
          enhanceEmotion: true, // Flag to add emotional enhancement
          addBranding: true // Flag to add emotional branding
        }),
      });

      const result = await response.json();

      if (result.success && result.enhancedDescription) {
        return result.enhancedDescription;
      }
    } catch (error) {
      console.error('Story enhancement failed:', error);
    }

    // Fallback: Add basic emotional enhancement
    return addBasicEmotionalEnhancement(story);
  };

  // Add basic emotional enhancement if API fails
  const addBasicEmotionalEnhancement = (story: string): string => {
    const emotionalPhrases = [
      "This piece carries the warmth of traditional craftsmanship",
      "Each stitch tells a story of dedication and passion",
      "Made with love and centuries of artisanal wisdom",
      "A testament to the beautiful tradition of handmade excellence",
      "Crafted with the soul of an artisan who pours heart into every creation"
    ];

    const randomPhrase = emotionalPhrases[Math.floor(Math.random() * emotionalPhrases.length)];
    return `${story}\n\n${randomPhrase}`;
  };

  // Auto-update product description when transcription changes
  const updateProductDescription = async (newTranscription: string, inputType: 'text' | 'voice' = 'text') => {
    if (!newTranscription || newTranscription.trim().length === 0) return;

    try {
      // Get artisan profession from user profile or use default
      // For now, we'll derive profession from the category or use a default
      const artisanProfession = productForm.category ?
        (productForm.category === 'textiles' ? 'weaver' :
          productForm.category === 'pottery' ? 'potter' :
            productForm.category === 'jewelry' ? 'jeweler' :
              productForm.category === 'metalwork' ? 'blacksmith' :
                productForm.category === 'woodwork' ? 'carpenter' : 'artisan')
        : 'artisan';

      // Determine input type for vector database storage
      const inputType = 'text'; // Since this is from text input, could be 'voice' for voice inputs

      // Call the enhanced API with profession-specific processing
      const response = await fetch('/api/story-to-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story: newTranscription,
          language: /[\u0900-\u097F]/.test(newTranscription) ? 'hi-IN' : 'en-US', // Detect language from story
          category: productForm.category || 'handicrafts',
          artisanId: userProfile?.uid,
          enhanceEmotion: true,
          addBranding: true,
          artisanProfession: artisanProfession,
          inputType: inputType
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Auto-populate the product description with enhanced version
        setProductForm(prev => ({
          ...prev,
          description: result.enhancedDescription || result.description,
          tags: result.generatedTags || prev.tags // Auto-populate tags
        }));

        // Show success message with tag count
        toast({
          title: "✨ Story Enhanced with Tags!",
          description: `Generated ${result.generatedTags?.length || 0} profession-specific tags and enhanced description.`,
        });
      } else {
        // Fallback to basic enhancement
        const enhancedStory = await enhanceStoryWithEmotion(newTranscription);
        setProductForm(prev => ({
          ...prev,
          description: enhancedStory
        }));

        toast({
          title: "✨ Story Enhanced!",
          description: "Your story has been automatically enhanced with emotional connect.",
        });
      }
    } catch (error) {
      console.error('Auto-enhancement failed:', error);

      // Fallback to basic enhancement
      const enhancedStory = await enhanceStoryWithEmotion(newTranscription);
      setProductForm(prev => ({
        ...prev,
        description: enhancedStory
      }));

      toast({
        title: "✨ Story Enhanced!",
        description: "Your story has been automatically enhanced with emotional connect.",
      });
    }
  };

  const addDebugLog = (message: string) => {
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Wizard navigation functions
  const goToNextStep = () => {
    const steps: WizardStep[] = ['image-upload', 'audio-recording', 'pricing-engine', 'product-details'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
  };

  const goToPreviousStep = () => {
    const steps: WizardStep[] = ['image-upload', 'audio-recording', 'pricing-engine', 'product-details'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'image-upload':
        return imageFile && imagePreview;
      case 'audio-recording':
        return (audioBlob && transcription) || (inputMode === 'text' && textInput.trim());
      case 'pricing-engine':
        return true; // Allow proceeding even without entering anything in fair price engine
      case 'product-details':
        return productForm.name && productForm.description && productForm.price > 0 && productForm.category;
      default:
        return false;
    }
  };

  // Step components
  const renderStepIndicator = () => {
    const steps = [
      { id: 'image-upload', title: 'Upload Image', icon: '📸', shortTitle: 'Image' },
      { id: 'audio-recording', title: 'Record Story', icon: '🎙️', shortTitle: 'Story' },
      { id: 'pricing-engine', title: 'Fair Pricing', icon: '💰', shortTitle: 'Price' },
      { id: 'product-details', title: 'Product Details', icon: '📝', shortTitle: 'Details' }
    ];

    return (
      <div className="flex items-center justify-center mb-4 sm:mb-6 lg:mb-8">
        <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id as WizardStep);
            const isCurrent = currentStep === step.id;
            const isAccessible = index === 0 || completedSteps.has(steps[index - 1].id as WizardStep);

            return (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full border-2 transition-all duration-300 ${isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                      ? 'bg-primary border-primary text-white'
                      : isAccessible
                        ? 'bg-muted border-muted-foreground text-muted-foreground hover:bg-muted/80'
                        : 'bg-muted/50 border-muted/50 text-muted-foreground/50'
                    }`}>
                    <span className="text-xs sm:text-sm lg:text-base">
                      {isCompleted ? '✓' : step.icon}
                    </span>
                  </div>
                  <div className="mt-1 sm:mt-2 text-center">
                    <div className={`text-xs sm:text-sm font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <span className="sm:hidden">{step.shortTitle}</span>
                      <span className="hidden sm:inline">{step.title}</span>
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-6 sm:w-8 lg:w-12 h-0.5 mx-2 sm:mx-4 ${isCompleted ? 'bg-green-500' : 'bg-muted'} flex-shrink-0`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const uploadProductImages = async (): Promise<string[]> => {
    if (!imageFile || !userProfile) return [];

    try {
      const result = await uploadToCloudinary(imageFile);
      return [result.secure_url];
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);

      // For development, return a placeholder image URL instead of throwing
      console.warn('Using placeholder image for development');
      return ['https://via.placeholder.com/800x600?text=Product+Image'];
    }
  };

  const handleProductSubmit = async () => {
    if (!userProfile) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a product.",
        variant: "destructive",
      });
      return;
    }

    if (!productForm.name || !productForm.description || !productForm.price || !productForm.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setUploadingProduct(true);

    try {
      // Upload images
      const imageUrls = await uploadProductImages();

      if (imageUrls.length === 0) {
        throw new Error("Failed to upload product images");
      }

      // Prepare product data
      const productData = {
        artisanId: userProfile.uid,
        name: productForm.name,
        description: productForm.description,
        price: productForm.price,
        category: productForm.category,
        images: imageUrls,
        story: transcription || enhancedTranscription || undefined,
        specifications: {
          materials: productForm.materials,
          colors: productForm.colors,
          dimensions: productForm.dimensions
        },
        inventory: {
          quantity: productForm.quantity,
          isAvailable: true
        },
        tags: productForm.tags,
        status: "draft" as const
      };

      // Submit to API
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const result_api = await response.json();

      if (result_api.success) {
        toast({
          title: "Product Created",
          description: "Your product has been created successfully!",
        });

        resetForm();
        router.push("/dashboard/inventory");
      } else {
        throw new Error(result_api.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setUploadingProduct(false);
    }
  };

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: 0,
      category: "",
      materials: [],
      colors: [],
      dimensions: { length: 0, width: 0, height: 0, weight: 0 },
      quantity: 1,
      tags: [],
      weight: 0,
      careInstructions: ""
    });
    setPricingApproved(false);
    setPricingAnalysis(null);
    setShowPricingInputs(true);
    setArtisanInputs({
      timeSpent: '',
      materialCosts: '',
      otherCosts: '',
      expectedProfit: '',
    });
    setCurrentStep('image-upload');
    setCompletedSteps(new Set());
    setResult("");
    setImagePreview(null);
    setImageFile(null);
    setAudioBlob(null);
    setTranscription("");
    setEnhancedTranscription("");
    setTranslations({});

    // Reset real-time transcription state
    setInterimTranscript("");
    setFinalTranscript("");

    // Reset text input state
    setTextInput("");
    setInputMode('voice');

    setImageAnalysis(null);
    setProductDescription("A handwoven Kanchipuram silk saree with traditional peacock motifs and a golden zari border.");
  };

  // Initialize Web Speech API
  const initializeSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.log('Web Speech API not supported');
        return null;
      }

      // Check network connectivity before initializing
      if (!navigator.onLine) {
        console.warn('No internet connection, skipping Web Speech API initialization');
        return null;
      }

      const recognition = new SpeechRecognition();

      // Configure for Indian languages and real-time feedback
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN'; // Default to Hindi, can be changed
      recognition.maxAlternatives = 1;

      // Event handlers
      recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update state
        if (interimTranscript) {
          setInterimTranscript(interimTranscript);
        }

        if (finalTranscript) {
          setFinalTranscript((prev: string) => prev + finalTranscript);
          setInterimTranscript(''); // Clear interim when we get final
        }
      };

      recognition.onerror = (event: any) => {
        // Don't log network errors to console to avoid error spam
        if (event.error !== 'network') {
          console.error('Speech recognition error:', event.error);
        }

        // Handle different error types gracefully
        let errorMessage = 'Real-time transcription disabled.';
        let errorTitle = 'Speech Recognition Error';

        switch (event.error) {
          case 'network':
            errorMessage = 'Network error - real-time transcription disabled. Recording will still work with server-side processing.';
            errorTitle = 'Network Error';
            // Don't show toast for network errors to avoid spam
            return;
          case 'not-allowed':
            errorMessage = 'Microphone access denied - real-time transcription disabled.';
            errorTitle = 'Access Denied';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected - real-time transcription disabled.';
            errorTitle = 'No Speech Detected';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition aborted - real-time transcription disabled.';
            errorTitle = 'Recognition Aborted';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed - real-time transcription disabled.';
            errorTitle = 'Audio Capture Error';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech service not allowed - real-time transcription disabled.';
            errorTitle = 'Service Not Allowed';
            break;
          default:
            errorMessage = `Error: ${event.error}. Real-time transcription disabled.`;
        }

        // Only show toast for critical errors, not network issues
        if (event.error !== 'network') {
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          // For network errors, just log and continue silently
          console.warn('Speech recognition network error - continuing with server-side processing only');
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
      };

      speechRecognitionRef.current = recognition;

      return recognition;
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      return null;
    }
  };

  // Check browser compatibility and setup audio event listeners on component mount
  useEffect(() => {
    const checkBrowserSupport = () => {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasFileReader = typeof FileReader !== 'undefined';
      const hasFormData = typeof FormData !== 'undefined';
      const hasSpeechRecognition = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

      const supported = hasMediaDevices && hasMediaRecorder && hasFileReader && hasFormData;
      setBrowserSupported(supported);

      // Initialize speech recognition only if online and supported
      if (hasSpeechRecognition && navigator.onLine) {
        initializeSpeechRecognition();
      } else if (hasSpeechRecognition && !navigator.onLine) {
        console.warn('Offline mode - skipping Web Speech API initialization');
      }

      if (!supported) {
        toast({
          title: "Browser Compatibility Issue",
          description: "Some features may not work in this browser. Please use Chrome, Firefox, or Safari for best experience.",
          variant: "destructive",
        });
      }

    };

    checkBrowserSupport();

    // Setup audio event listeners
    const audioElement = audioRef.current;
    if (audioElement) {
      const handleEnded = () => {
        setIsPlaying(false);
        setIsLoadingAudio(false);
      };

      const handleError = (e: Event) => {
        try {
          const audioElement = e.target as HTMLAudioElement;

          // Safely log error details
          const errorDetails = {
            error: audioElement?.error || null,
            src: audioElement?.src || 'none',
            currentSrc: audioElement?.currentSrc || 'none',
            networkState: audioElement?.networkState || 'unknown',
            readyState: audioElement?.readyState || 'unknown',
            timestamp: new Date().toISOString()
          };

          console.error('Audio element error:', errorDetails);

          // Reset audio state
          setIsPlaying(false);
          setIsLoadingAudio(false);

          let errorMessage = "There was an error playing the audio.";
          if (audioElement?.error) {
            switch (audioElement.error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = "Audio playback was aborted.";
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = "Network error while loading audio.";
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = "Audio format not supported or corrupted.";
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = "Audio source not supported.";
                break;
              default:
                errorMessage = "Unknown audio error occurred.";
            }
          }

          toast({
            title: "Audio Error",
            description: errorMessage,
            variant: "destructive",
          });
        } catch (handlerError) {
          // Fallback error handling if the main handler fails
          console.error('Error in audio error handler:', handlerError);
          setIsPlaying(false);
          setIsLoadingAudio(false);
          toast({
            title: "Audio Error",
            description: "An unexpected error occurred while playing audio.",
            variant: "destructive",
          });
        }
      };

      const handleLoadStart = () => {
        setIsLoadingAudio(true);
      };

      const handleCanPlay = () => {
        setIsLoadingAudio(false);
      };

      audioElement.addEventListener('ended', handleEnded);
      audioElement.addEventListener('error', handleError);
      audioElement.addEventListener('loadstart', handleLoadStart);
      audioElement.addEventListener('canplay', handleCanPlay);

      // Cleanup function
      return () => {
        if (audioElement) {
          audioElement.removeEventListener('ended', handleEnded);
          audioElement.removeEventListener('error', handleError);
          audioElement.removeEventListener('loadstart', handleLoadStart);
          audioElement.removeEventListener('canplay', handleCanPlay);
          // Clean up any playing audio
          if (!audioElement.paused) {
            audioElement.pause();
          }
          // Clean up object URL to prevent memory leaks
          if (audioElement.src && audioElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioElement.src);
          }
        }
      };
    }
  }, [toast]);

  // Cleanup audio and voice recognition when component unmounts
  useEffect(() => {
    return () => {
      // Stop continuous listening
      if (isContinuousListening) {
        stopContinuousListening();
      }

      // Cleanup audio
      if (audioRef.current) {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  }, [isContinuousListening]);

  const handleFileSelect = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const originalImageData = reader.result as string;
        setOriginalImage(originalImageData);
        setImagePreview(originalImageData);
      };
      reader.readAsDataURL(file);

      // Start image enhancement process
      setProcessingStep("Enhancing image with Nano Banana AI...");
      setProgress(10);

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await safeFetch('/api/image-enhance', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          setEnhancedImage(result.enhancedImage);
          setImagePreview(result.enhancedImage);
          setProgress(100);
          setProcessingStep("");
          setShowComparison(true);
          setComparisonSlider(50); // Reset slider to middle
          toast({
            title: "🎨 Image enhanced with Gemini AI!",
            description: "Professional styling applied with background optimization. Colors and patterns preserved!",
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Image enhancement failed:', error);
        setProcessingStep("");
        setProgress(0);
        setShowComparison(false);

        // Show user-friendly error message
        const errorMessage = handleFileUploadError(error, file.name);
        toast({
          title: "Enhancement failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const openCamera = async () => {
    try {
      // Detect if we're on mobile or desktop
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      let constraints: MediaStreamConstraints;

      if (isMobile) {
        // Mobile: prefer back camera
        constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
      } else {
        // Desktop: use default camera (usually front-facing webcam)
        constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
      }

      console.log('🎥 Requesting camera with constraints:', constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('✅ Camera access granted');
      console.log('📹 Video tracks:', stream.getVideoTracks().length);

      setCameraStream(stream);
      setShowCamera(true);

      toast({
        title: "Camera ready",
        description: isMobile ? "Using back camera for product photos" : "Using webcam for product photos",
      });

    } catch (error) {
      console.error('Camera access failed:', error);

      let errorMessage = "Unable to access camera.";
      let errorDescription = "Please check camera permissions and try again.";

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera permission denied";
          errorDescription = "Please allow camera access in your browser settings and try again.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No camera found";
          errorDescription = "Please connect a camera or check if another application is using it.";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Camera in use";
          errorDescription = "Camera is being used by another application. Please close other apps and try again.";
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = "Camera constraints not supported";
          errorDescription = "Your camera doesn't support the requested settings. Using basic camera instead.";
          // Try fallback with basic constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(fallbackStream);
            setShowCamera(true);
            toast({
              title: "Camera ready (basic mode)",
              description: "Using basic camera settings",
            });
            return;
          } catch (fallbackError) {
            console.error('Fallback camera also failed:', fallbackError);
          }
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Camera not supported";
          errorDescription = "Your browser doesn't support camera access. Please use a modern browser.";
        }
      }

      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!cameraStream) return;

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    video.srcObject = cameraStream;
    video.play();

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCameraPreview(imageDataUrl);
    };
  };

  const finalizePhoto = () => {
    if (cameraPreview) {
      // Convert data URL to File
      fetch(cameraPreview)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          handleFileSelect(file);
          closeCamera();
        });
    }
  };

  const retakePhoto = () => {
    setCameraPreview(null);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setCameraPreview(null);
  };

  // Audio playback function
  const playAudio = async (audioBlob: Blob) => {
    // Check if audio element is available
    if (!audioRef.current) {
      toast({
        title: "Audio player not ready",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isPlaying) {
        // Pause current playback
        audioRef.current.pause();
        setIsPlaying(false);
        setIsLoadingAudio(false);
        return;
      }

      // Start new playback
      setIsLoadingAudio(true);

      // Create new blob URL for this playback session
      const blobUrl = URL.createObjectURL(audioBlob);

      // Check if we need to load new audio or if current src is different
      const currentSrc = audioRef.current.src;
      const needsNewSrc = !currentSrc || currentSrc !== blobUrl;

      if (needsNewSrc) {
        // Stop any current playback before loading new source
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }

        // Clear any existing event listeners to prevent conflicts
        audioRef.current.oncanplay = null;
        audioRef.current.onerror = null;
        audioRef.current.onended = null;
        audioRef.current.onloadstart = null;

        // Load new audio blob
        audioRef.current.src = blobUrl;

        // Wait for audio to be ready with proper error handling
        await new Promise((resolve, reject) => {
          const onCanPlay = () => {
            cleanup();
            resolve(void 0);
          };

          const onError = (e: Event) => {
            cleanup();
            reject(new Error('Audio failed to load'));
          };

          const cleanup = () => {
            if (audioRef.current) {
              audioRef.current.removeEventListener('canplay', onCanPlay);
              audioRef.current.removeEventListener('error', onError);
            }
          };

          audioRef.current?.addEventListener('canplay', onCanPlay);
          audioRef.current?.addEventListener('error', onError);

          // Timeout after 5 seconds
          setTimeout(() => {
            cleanup();
            reject(new Error('Audio load timeout'));
          }, 5000);
        });
      }

      // Now play the loaded audio
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoadingAudio(false);

      // Set up ended event listener
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setIsLoadingAudio(false);
      };

    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
      setIsLoadingAudio(false);

      // Handle specific error types
      let errorMessage = "Unable to play audio.";
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Playback was interrupted. Please try again.";
        } else if (error.name === 'NotAllowedError') {
          errorMessage = "Audio playback is blocked. Please check your browser settings.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Audio format not supported. Please try recording again.";
        } else if (error.message.includes('interrupted') || error.message.includes('load request')) {
          errorMessage = "Playback was interrupted. Please wait a moment and try again.";
        }
      }

      toast({
        title: "Playback failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const pauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) {
      toast({
        title: "No image to analyze",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingImage(true);
    setProcessingStep("🤖 AI analyzing your product image...");

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setImageAnalysis(result.analysis);
        setProcessingStep("");
        toast({
          title: "Image analyzed successfully!",
          description: `Detected: ${result.analysis.productType}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Image analysis failed:', error);
      setProcessingStep("");
      toast({
        title: "Analysis failed",
        description: "AI analysis will be available soon.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const generateAudioStory = async () => {
    const textToSpeak = transcription || (imageAnalysis ? imageAnalysis.description : "");

    if (!textToSpeak) {
      toast({
        title: "No content to speak",
        description: "Please record audio or analyze image first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAudio(true);
    setProcessingStep("🎵 Generating realistic voice narration...");

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak,
          language: 'en',
          voiceType: selectedVoice,
          speed: 1.0
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedAudio(result.audioData);
        setProcessingStep("");
        toast({
          title: "Voice generated successfully!",
          description: `Created ${result.metadata.duration}s of narration`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('TTS failed:', error);
      setProcessingStep("");
      toast({
        title: "Voice generation failed",
        description: "TTS will be available soon.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const translateStory = async () => {
    if (!transcription) {
      toast({
        title: "No text to translate",
        description: "Please record audio and get transcription first.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    setProcessingStep("Translating story to multiple languages...");

    try {
      const response = await fetch('/api/translate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcription,
          targetLanguages: selectedLanguages,
          sourceLanguage: 'hi'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTranslations(result.translations);
        setProcessingStep("");
        toast({
          title: "Translation completed",
          description: `Story translated to ${selectedLanguages.length} languages.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      setProcessingStep("");
      toast({
        title: "Translation failed",
        description: "Translations will be available soon.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Generate description from story using vector embeddings
  const generateDescriptionFromStory = async () => {
    if (!transcription) {
      toast({
        title: "No story available",
        description: "Please record audio and get transcription first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDescription(true);
    setProcessingStep("🤖 AI generating marketplace description from your story...");

    try {
      const response = await fetch('/api/story-to-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story: transcription,
          language: /[\u0900-\u097F]/.test(transcription) ? 'hi-IN' : 'en-US', // Detect language from story
          category: productForm.category || 'handicrafts',
          artisanId: userProfile?.uid
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAutoGeneratedDescription(result.description);
        setDescriptionKeywords(result.keywords);
        setProcessingStep("");

        // Auto-populate the description field if empty
        if (!productForm.description || productForm.description.trim() === '') {
          setProductForm(prev => ({
            ...prev,
            description: result.description
          }));
          setUseVectorDescription(true);
        }

        toast({
          title: "✨ Description generated!",
          description: `AI created a compelling marketplace description with ${result.keywords.length} keywords.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Description generation failed:', error);
      setProcessingStep("");
      toast({
        title: "Generation failed",
        description: "AI description generation will be available soon.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Enhanced speech-to-speech processing
  const processSpeechToSpeech = async () => {
    if (!audioBlob) {
      toast({
        title: "No audio to process",
        description: "Please record audio first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAudio(true);
    setProcessingStep("🎵 Converting speech with enhanced AI models...");

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('targetLanguage', 'en');
      formData.append('voiceType', selectedVoice);
      formData.append('enhancementType', 'cultural');

      const response = await fetch('/api/speech-to-speech', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedAudio(result.generatedAudio.data);
        setProcessingStep("");

        // Update transcription with enhanced version
        if (result.transcription.final) {
          setTranscription(result.transcription.final);
        }

        toast({
          title: "🎵 Speech-to-speech completed!",
          description: `Enhanced audio generated with ${result.enhancement.improvements.length} improvements.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Speech-to-speech failed:', error);
      setProcessingStep("");
      toast({
        title: "Processing failed",
        description: "Speech-to-speech conversion will be available soon.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const processProduct = async () => {
    if (!imageFile) {
      toast({
        title: "Missing content",
        description: "Please upload an image.",
        variant: "destructive",
      });
      return;
    }

    setProcessingStep("🤖 AI analyzing your product...");
    setProgress(10);

    try {
      // Step 1: Analyze image if not already done
      if (!imageAnalysis) {
        setProcessingStep("🔍 Analyzing product image...");
        await analyzeImage();
        setProgress(30);
      }

      // Step 2: Process audio if available
      if (audioBlob && !transcription) {
        setProcessingStep("🎙️ Converting speech to text...");
        // Speech-to-text processing already handled in recording
        setProgress(50);
      }

      // Step 3: Auto-generate product details from image analysis
      setProcessingStep("✨ Auto-generating product details...");
      setProgress(70);

      // Generate product details from image analysis
      const autoGeneratedDetails = await generateProductDetails();

      // Step 4: Store in vector database
      setProcessingStep("💾 Creating your smart product...");
      setProgress(90);

      // Prepare product data with auto-generated details
      const productData = {
        productId: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        artisanId: userProfile?.uid || `artisan_demo_${Date.now()}`,
        imageData: imagePreview,
        audioData: audioBlob ? await blobToBase64(audioBlob) : null,
        transcription: transcription,
        translations: translations,
        metadata: autoGeneratedDetails
      };

      // Store in vector database
      const storeResponse = await fetch('/api/store-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const storeResult = await storeResponse.json();

      if (!storeResult.success) {
        throw new Error(storeResult.error);
      }

      // Generate marketplace listings
      setProcessingStep("🏪 Creating marketplace listings...");
      setProgress(95);

      const listingResponse = await fetch('/api/generate-listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const listingResult = await listingResponse.json();

      if (!listingResult.success) {
        throw new Error(listingResult.error);
      }

      setProgress(100);
      setProcessingStep("");

      toast({
        title: "🎉 Smart Product Created Successfully!",
        description: `AI generated ${listingResult.summary.totalListings} marketplace listings. Your authentic artisan story is now ready for global buyers!`,
      });

      // Reset form for next product
      resetForm();

    } catch (error) {
      console.error('Product processing failed:', error);
      setProcessingStep("");
      setProgress(0);
      toast({
        title: "Processing failed",
        description: "Product creation encountered an error. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Intelligently weave transcription and image analysis into compelling story
  const weaveStoryFromSources = async (): Promise<string> => {
    if (!imageAnalysis) {
      throw new Error("Image analysis required for story weaving");
    }

    // If we have transcription, use it as the foundation
    if (transcription) {
      try {
        // Use AI to enhance the transcription with visual insights
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcription: transcription,
            imageAnalysis: imageAnalysis,
            enhanceStory: true
          }),
        });

        const result = await response.json();

        if (result.success && result.enhancedStory) {
          return result.enhancedStory;
        } else if (result.success && result.combinedDescription) {
          return result.combinedDescription;
        }
      } catch (error) {
        console.error('Story enhancement failed:', error);
        // Fall back to original transcription
        return transcription;
      }
    }

    // If no transcription, use image analysis description
    return imageAnalysis.description || "A beautiful handcrafted product showcasing traditional craftsmanship.";
  };


  // Analyze pricing using Fair Price Engine with artisan inputs
  const analyzePricing = async () => {
    // Note: We don't need product details for pricing calculation
    // The pricing is based only on artisan inputs

    setIsAnalyzingPricing(true);
    setProcessingStep("🤖 Calculating fair price based on your costs...");

    try {
      // Validate inputs
      const timeSpent = parseFloat(artisanInputs.timeSpent);
      const materialCosts = parseFloat(artisanInputs.materialCosts);
      const otherCosts = parseFloat(artisanInputs.otherCosts) || 0;
      const expectedProfitPercent = parseFloat(artisanInputs.expectedProfit) || 30;

      // Check for invalid inputs
      if (isNaN(timeSpent) || timeSpent <= 0) {
        throw new Error("Please enter a valid time spent (greater than 0 hours)");
      }
      if (isNaN(materialCosts) || materialCosts < 0) {
        throw new Error("Please enter valid material costs (0 or greater)");
      }
      if (isNaN(otherCosts) || otherCosts < 0) {
        throw new Error("Please enter valid other costs (0 or greater)");
      }
      if (isNaN(expectedProfitPercent) || expectedProfitPercent < 0 || expectedProfitPercent > 100) {
        throw new Error("Please enter a valid profit margin (0-100%)");
      }

      // Calculate hourly rate (simplified - average artisan rate)
      const hourlyRate = 150; // ₹150 per hour as a fair average rate

      // Calculate time value
      const timeValue = timeSpent * hourlyRate;

      // Calculate total cost
      const totalCost = materialCosts + otherCosts + timeValue;

      // Calculate profit amount
      const profitAmount = (totalCost * expectedProfitPercent) / 100;

      // Calculate suggested price
      const suggestedPrice = Math.round(totalCost + profitAmount);

      // Calculate market position (simplified)
      const marketPosition = Math.min(95, Math.max(60, 70 + (expectedProfitPercent - 30) * 0.5));

      // Generate realistic recommendations
      const recommendations = [
        `Your fair price is ₹${suggestedPrice} based on ${timeSpent} hours of work and ₹${materialCosts} in materials`,
        expectedProfitPercent < 25 ? "Consider increasing your profit margin for sustainability" : "Great profit margin for a sustainable business!",
        `At this price, you're ${marketPosition}% above market average - perfect for premium handmade products`,
        "Highlight your craftsmanship and the time invested in your product descriptions",
        "Consider offering different quality tiers at different price points"
      ];

      const pricingResult = {
        suggestedPrice,
        totalCost,
        timeValue,
        profitAmount,
        profitMargin: expectedProfitPercent,
        marketPosition,
        recommendations,
        costBreakdown: {
          materials: materialCosts,
          other: otherCosts,
          labor: timeValue
        }
      };

      setPricingAnalysis(pricingResult);
      setProcessingStep("");

      toast({
        title: "Fair Price Calculated! 💰",
        description: `Your product should be priced at ₹${suggestedPrice}`,
      });

    } catch (error) {
      console.error('Pricing analysis failed:', error);
      setProcessingStep("");
      toast({
        title: "Analysis Failed",
        description: "Fair Price calculation failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingPricing(false);
    }
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Enhanced Voice workflow functions
  const startVoiceWorkflow = () => {
    setVoiceWorkflowActive(true);
    setVoiceWorkflowStep('welcome');
    setVoiceProgress(0);
    setVoiceStepHistory([]);
    setVoiceErrors([]);
    setVoiceHints([]);
    setVoiceFeedback("🎤 Voice-guided product creation started. Say 'start' to begin creating your product.");
    speakVoiceFeedback("Voice-guided product creation started. Say 'start' to begin creating your product.");
  };

  const stopVoiceWorkflow = () => {
    setVoiceWorkflowActive(false);
    setVoiceWorkflowStep('welcome');
    setVoiceProgress(0);
    setVoiceFeedback("");
  };

  // Voice step guidance system
  const getVoiceGuidanceForStep = (step: typeof voiceWorkflowStep): { message: string; hints: string[]; actions: string[] } => {
    switch (step) {
      case 'welcome':
        return {
          message: "Welcome to voice-guided product creation! I'll help you create your product step by step. Say 'start' when you're ready to begin.",
          hints: ["Say 'start' to begin", "Say 'help' for assistance", "Say 'stop' to exit voice guidance"],
          actions: ['start', 'help', 'stop']
        };

      case 'image_upload':
        return {
          message: "Let's start with uploading a photo of your product. You can either upload from gallery or take a new photo with your camera.",
          hints: ["Say 'upload image' to open gallery", "Say 'take photo' to use camera", "Say 'next' if you already have an image"],
          actions: ['upload_image', 'take_photo', 'next']
        };

      case 'audio_recording':
        return {
          message: "Great! Now let's record the story behind your product. Tell us about your craftsmanship, materials, and what makes this product special.",
          hints: ["Say 'start recording' to begin", "Say 'play' to listen to your recording", "Say 'next' when story is complete"],
          actions: ['start_recording', 'play_audio', 'next']
        };

      case 'pricing_setup':
        return {
          message: "Now let's set a fair price for your product. Tell me about your time spent, material costs, and desired profit margin.",
          hints: ["Say 'set time' to enter hours worked", "Say 'set materials' for material costs", "Say 'calculate price' when ready"],
          actions: ['set_time', 'set_materials', 'calculate_price']
        };

      case 'product_details':
        return {
          message: "Almost done! Let's add the final details like product name, category, and description.",
          hints: ["Say 'set name' for product name", "Say 'set category' for category", "Say 'confirm' when details are complete"],
          actions: ['set_name', 'set_category', 'confirm']
        };

      case 'review_publish':
        return {
          message: "Perfect! Review your product details and say 'publish' when you're ready to create your product.",
          hints: ["Say 'review' to check details", "Say 'edit' to make changes", "Say 'publish' to create product"],
          actions: ['review', 'edit', 'publish']
        };

      default:
        return {
          message: "How can I help you with your product creation?",
          hints: ["Say 'help' for available commands"],
          actions: ['help']
        };
    }
  };

  const speakVoiceFeedback = async (text: string) => {
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          language: /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-US', // Detect language from text
          voiceType: 'artisan_female',
          speed: 1.0
        })
      });

      const result = await response.json();
      if (result.success && result.audioData) {
        const audio = new Audio(result.audioData);
        audio.play();
      }
    } catch (error) {
      console.error('Voice feedback failed:', error);
    }
  };

  const handleVoiceWorkflowCommand = (command: string) => {
    setIsProcessingVoice(true);
    setVoiceStepHistory(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${command}`]);

    // Update progress based on current step
    const stepProgress = {
      'welcome': 0,
      'image_upload': 25,
      'audio_recording': 50,
      'pricing_setup': 75,
      'product_details': 90,
      'review_publish': 100
    };
    setVoiceProgress(stepProgress[voiceWorkflowStep] || 0);

    // Clear previous error help
    setVoiceErrorHelp("");

    // Check for voice shortcuts first (available in all steps)
    if (handleVoiceShortcut(command)) {
      setTimeout(() => setIsProcessingVoice(false), 1000);
      return;
    }

    switch (command) {
      case 'start':
        if (voiceWorkflowStep === 'welcome') {
          setVoiceWorkflowStep('image_upload');
          setCurrentStep('image-upload');
          setVoiceStepHistory(prev => [...prev, 'Started product creation']);
          const guidance = getVoiceGuidanceForStep('image_upload');
          setVoiceFeedback(guidance.message);
          setVoiceHints(guidance.hints);
          speakVoiceFeedback(guidance.message);
        }
        break;

      case 'upload_image':
      case 'upload':
        if (voiceWorkflowStep === 'image_upload') {
          fileInputRef.current?.click();
          setVoiceFeedback("Opening gallery. Please select a photo of your product.");
          speakVoiceFeedback("Opening gallery. Please select a photo of your product.");
        }
        break;

      case 'take_photo':
      case 'camera':
        if (voiceWorkflowStep === 'image_upload') {
          openCamera();
          setVoiceFeedback("Opening camera. Position your product and take a clear photo.");
          speakVoiceFeedback("Opening camera. Position your product and take a clear photo.");
        }
        break;

      case 'next':
        handleVoiceNext();
        break;

      case 'back':
      case 'previous':
        handleVoiceBack();
        break;

      case 'start_recording':
      case 'record':
        if (voiceWorkflowStep === 'audio_recording') {
          setVoiceFeedback("Please type your story in the text field.");
          speakVoiceFeedback("Please type your story in the text field.");
        }
        break;

      case 'stop_recording':
        if (voiceWorkflowStep === 'audio_recording') {
          setVoiceFeedback("Please type your story in the text field.");
          speakVoiceFeedback("Please type your story in the text field.");
        }
        break;

      case 'play_audio':
      case 'play':
        if (voiceWorkflowStep === 'audio_recording' && audioBlob) {
          playAudio(audioBlob);
          setVoiceFeedback("Playing your recorded story...");
          speakVoiceFeedback("Playing your recorded story...");
        }
        break;

      case 'set_time':
      case 'time':
        if (voiceWorkflowStep === 'pricing_setup') {
          // Focus on time input
          setVoiceFeedback("Please tell me how many hours you spent making this product.");
          speakVoiceFeedback("Please tell me how many hours you spent making this product.");
        }
        break;

      case 'set_materials':
      case 'materials':
        if (voiceWorkflowStep === 'pricing_setup') {
          setVoiceFeedback("Please tell me the total cost of materials used.");
          speakVoiceFeedback("Please tell me the total cost of materials used.");
        }
        break;

      case 'calculate_price':
        if (voiceWorkflowStep === 'pricing_setup') {
          if (artisanInputs.timeSpent && artisanInputs.materialCosts) {
            analyzePricing();
            setVoiceFeedback("Calculating your fair price...");
            speakVoiceFeedback("Calculating your fair price...");
          } else {
            setVoiceFeedback("Please provide time spent and material costs first.");
            speakVoiceFeedback("Please provide time spent and material costs first.");
          }
        }
        break;

      case 'set_name':
      case 'name':
        if (voiceWorkflowStep === 'product_details') {
          setVoiceFeedback("Please tell me the name of your product.");
          speakVoiceFeedback("Please tell me the name of your product.");
        }
        break;

      case 'set_category':
      case 'category':
        if (voiceWorkflowStep === 'product_details') {
          setVoiceFeedback("Please tell me the category of your product.");
          speakVoiceFeedback("Please tell me the category of your product.");
        }
        break;

      case 'confirm':
      case 'save_product':
      case 'publish':
        if (voiceWorkflowStep === 'review_publish' || (voiceWorkflowStep === 'product_details' && canProceedToNext())) {
          handleProductSubmit();
          setVoiceFeedback("Creating your product... This may take a moment.");
          speakVoiceFeedback("Creating your product... This may take a moment.");
        } else {
          setVoiceFeedback("Please complete all required fields first.");
          speakVoiceFeedback("Please complete all required fields first.");
        }
        break;

      case 'help':
        const guidance = getVoiceGuidanceForStep(voiceWorkflowStep);
        setVoiceFeedback(`Available commands: ${guidance.actions.join(', ')}`);
        setVoiceHints(guidance.hints);
        speakVoiceFeedback(`You can say: ${guidance.actions.join(', or ')}`);
        break;

      case 'status':
      case 'progress':
        const currentGuidance = getVoiceGuidanceForStep(voiceWorkflowStep);
        setVoiceFeedback(`Current step: ${voiceWorkflowStep.replace('_', ' ')}. ${currentGuidance.message}`);
        speakVoiceFeedback(`You're currently at the ${voiceWorkflowStep.replace('_', ' ')} step. ${currentGuidance.message}`);
        break;

      default:
        // Handle unrecognized commands with helpful suggestions
        incrementRetryCount();
        const suggestions = getVoiceGuidanceForStep(voiceWorkflowStep);
        setVoiceErrors(prev => [...prev.slice(-2), `Unrecognized command: ${command}`]);

        let errorMessage = `I didn't understand '${command}'.`;
        let helpMessage = "";

        if (retryCount >= 2) {
          errorMessage += " Let me show you what you can say.";
          helpMessage = `Available commands: ${suggestions.actions.join(', ')}. You can also say 'help' anytime.`;
          setVoiceHints(suggestions.hints);
        } else {
          errorMessage += ` Try: ${suggestions.actions.slice(0, 3).join(', ')}`;
          helpMessage = `Try saying: ${suggestions.actions.slice(0, 3).join(', or ')}`;
        }

        setVoiceFeedback(errorMessage);
        speakVoiceFeedback(helpMessage);
    }

    // Reset retry count on successful command
    resetRetryCount();

    setTimeout(() => setIsProcessingVoice(false), 1000);
  };

  // Voice shortcuts for common actions (available in all steps)
  const handleVoiceShortcut = (command: string) => {
    const shortcuts = {
      'repeat': () => {
        const guidance = getVoiceGuidanceForStep(voiceWorkflowStep);
        setVoiceFeedback(guidance.message);
        speakVoiceFeedback(guidance.message);
      },
      'clear': () => {
        setVoiceErrors([]);
        setVoiceHints([]);
        setVoiceErrorHelp("");
        setVoiceFeedback("Cleared all messages and hints.");
        speakVoiceFeedback("All messages and hints have been cleared.");
      },
      'faster': () => {
        // Could adjust speech rate here
        setVoiceFeedback("I'll speak a bit faster now.");
        speakVoiceFeedback("Speaking faster now.");
      },
      'slower': () => {
        // Could adjust speech rate here
        setVoiceFeedback("I'll speak a bit slower now.");
        speakVoiceFeedback("Speaking slower now.");
      },
      'louder': () => {
        setVoiceFeedback("I'll speak louder now.");
        speakVoiceFeedback("Speaking louder now.");
      },
      'quieter': () => {
        setVoiceFeedback("I'll speak quieter now.");
        speakVoiceFeedback("Speaking quieter now.");
      },
      'skip': () => {
        if (voiceWorkflowStep !== 'review_publish') {
          handleVoiceNext();
        } else {
          setVoiceFeedback("Cannot skip the final review step.");
          speakVoiceFeedback("Cannot skip the final review step.");
        }
      },
      'restart': () => {
        startVoiceWorkflow();
        setVoiceFeedback("Voice workflow restarted from the beginning.");
        speakVoiceFeedback("Voice workflow restarted from the beginning.");
      }
    };

    const shortcutAction = shortcuts[command as keyof typeof shortcuts];
    if (shortcutAction) {
      shortcutAction();
      return true;
    }
    return false;
  };

  const handleVoiceNext = () => {
    const currentIndex = ['welcome', 'image_upload', 'audio_recording', 'pricing_setup', 'product_details', 'review_publish'].indexOf(voiceWorkflowStep);

    if (currentIndex < 5) {
      const nextStep = ['welcome', 'image_upload', 'audio_recording', 'pricing_setup', 'product_details', 'review_publish'][currentIndex + 1] as typeof voiceWorkflowStep;

      // Validate current step before proceeding
      if (validateStepCompletion(voiceWorkflowStep)) {
        setVoiceWorkflowStep(nextStep);
        setCurrentStep(nextStep === 'audio_recording' ? 'audio-recording' :
          nextStep === 'pricing_setup' ? 'pricing-engine' :
            nextStep === 'product_details' ? 'product-details' : 'image-upload');

        const guidance = getVoiceGuidanceForStep(nextStep);
        setVoiceFeedback(guidance.message);
        setVoiceHints(guidance.hints);
        speakVoiceFeedback(guidance.message);
      } else {
        const errorMsg = getStepValidationError(voiceWorkflowStep);
        setVoiceFeedback(errorMsg);
        speakVoiceFeedback(errorMsg);
      }
    }
  };

  const handleVoiceBack = () => {
    const currentIndex = ['welcome', 'image_upload', 'audio_recording', 'pricing_setup', 'product_details', 'review_publish'].indexOf(voiceWorkflowStep);

    if (currentIndex > 0) {
      const prevStep = ['welcome', 'image_upload', 'audio_recording', 'pricing_setup', 'product_details', 'review_publish'][currentIndex - 1] as typeof voiceWorkflowStep;

      setVoiceWorkflowStep(prevStep);
      setCurrentStep(prevStep === 'audio_recording' ? 'audio-recording' :
        prevStep === 'pricing_setup' ? 'pricing-engine' :
          prevStep === 'product_details' ? 'product-details' : 'image-upload');

      const guidance = getVoiceGuidanceForStep(prevStep);
      setVoiceFeedback(guidance.message);
      setVoiceHints(guidance.hints);
      speakVoiceFeedback(`Going back to ${prevStep.replace('_', ' ')} step. ${guidance.message}`);
    }
  };

  const validateStepCompletion = (step: typeof voiceWorkflowStep): boolean => {
    switch (step) {
      case 'image_upload':
        return !!imageFile;
      case 'audio_recording':
        return !!(audioBlob && transcription);
      case 'pricing_setup':
        return !!pricingAnalysis;
      case 'product_details':
        return !!(productForm.name && productForm.description && productForm.category);
      default:
        return true;
    }
  };

  const getStepValidationError = (step: typeof voiceWorkflowStep): string => {
    switch (step) {
      case 'image_upload':
        return "Please upload or take a photo of your product first.";
      case 'audio_recording':
        return "Please record your product's story before proceeding.";
      case 'pricing_setup':
        return "Please calculate your fair price before continuing.";
      case 'product_details':
        return "Please fill in product name, description, and category.";
      default:
        return "Please complete the current step.";
    }
  };

  // Voice error detection and help system
  const detectVoiceErrors = () => {
    const errors: string[] = [];
    const help: string[] = [];

    // Image upload errors
    if (voiceWorkflowStep === 'image_upload') {
      if (!imageFile) {
        errors.push("No image uploaded");
        help.push("Try saying 'upload image' to open gallery or 'take photo' to use camera");
      }
      if (isAnalyzingImage) {
        help.push("Image is being analyzed by AI. Please wait...");
      }
    }

    // Audio recording errors
    if (voiceWorkflowStep === 'audio_recording') {
      if (!audioBlob) {
        errors.push("No audio recorded");
        help.push("Say 'start recording' to begin recording your story");
      }
      if (transcription && transcription.length > 1000) { // Long story
        errors.push("Story is very long");
        help.push("Consider shortening your story for better customer engagement");
      }
      if (!transcription && audioBlob) {
        errors.push("Audio transcription failed");
        help.push("Try recording again in a quieter environment");
      }
    }

    // Pricing errors
    if (voiceWorkflowStep === 'pricing_setup') {
      if (!artisanInputs.timeSpent) {
        errors.push("Time not specified");
        help.push("Say 'set time' followed by number of hours");
      }
      if (!artisanInputs.materialCosts) {
        errors.push("Material costs not specified");
        help.push("Say 'set materials' followed by cost amount");
      }
      if (isAnalyzingPricing) {
        help.push("Calculating fair price. Please wait...");
      }
    }

    // Product details errors
    if (voiceWorkflowStep === 'product_details') {
      if (!productForm.name) {
        errors.push("Product name missing");
        help.push("Say 'set name' followed by your product name");
      }
      if (!productForm.description) {
        errors.push("Description missing");
        help.push("Say 'set description' followed by product description");
      }
      if (!productForm.category) {
        errors.push("Category not selected");
        help.push("Say 'set category' followed by category name");
      }
    }

    // General errors
    if (retryCount > 3) {
      errors.push("Multiple command failures");
      help.push("Try saying 'help' for available commands or 'status' for current progress");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      errors.push("Microphone not supported");
      help.push("Voice features require microphone access. Please use a modern browser.");
    }

    setVoiceErrors(errors);
    setVoiceHints(help);

    // Provide voice help for critical errors
    if (errors.length > 0 && voiceWorkflowActive) {
      const criticalError = errors.find(e =>
        e.includes("No image") || e.includes("No audio") || e.includes("missing") || e.includes("not supported")
      );
      if (criticalError && help.length > 0) {
        setVoiceErrorHelp(`Issue detected: ${criticalError}. ${help[0]}`);
        speakVoiceFeedback(`I notice an issue: ${criticalError}. ${help[0]}`);
      }
    }

    return { errors, help };
  };

  // Monitor for errors and provide help
  useEffect(() => {
    if (voiceWorkflowActive) {
      const errorCheck = setInterval(() => {
        detectVoiceErrors();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(errorCheck);
    }
  }, [voiceWorkflowActive, voiceWorkflowStep, imageFile, audioBlob, transcription, productForm, artisanInputs, retryCount]);

  // Reset retry count on successful commands
  const resetRetryCount = () => {
    setRetryCount(0);
  };

  // Increment retry count on failed commands
  const incrementRetryCount = () => {
    setRetryCount(prev => prev + 1);
  };

  // Voice command recognition functions
  const voiceCommands = {
    // Navigation commands
    next: ['next', 'aage jao', 'aage', 'forward', 'proceed', 'continue', ' आगे', 'नेक्स्ट', 'अगला', 'जाओ', 'चलो'],
    back: ['back', 'previous', 'peeche', 'पीछे', 'वापस', 'बैक', 'go back', 'वापस जाओ'],
    start: ['start', 'begin', 'शुरू', 'शुरू करें', 'बEGIN', 'start creating'],

    // Image commands
    upload_image: ['upload image', 'upload', 'image', 'gallery', 'तस्वीर अपलोड', 'फोटो अपलोड', 'गैलरी'],
    take_photo: ['take photo', 'camera', 'photo', 'फोटो लें', 'कैमरा', 'take picture'],

    // Audio commands
    start_recording: ['start recording', 'record', 'record story', 'रिकॉर्ड', 'रिकॉर्डिंग शुरू', 'record audio'],
    stop_recording: ['stop recording', 'stop', 'रिकॉर्डिंग बंद', 'stop record'],
    play_audio: ['play', 'play audio', 'listen', 'play recording', 'बजाओ', 'सुनो'],

    // Pricing commands
    set_time: ['set time', 'time', 'hours', 'समय', 'घंटे', 'time spent'],
    set_materials: ['set materials', 'materials', 'cost', 'सामग्री', 'मटेरियल', 'material cost'],
    calculate_price: ['calculate price', 'price', 'कीमत', 'मूल्य', 'calculate'],

    // Product details commands
    set_name: ['set name', 'product name', 'name is', 'नाम', 'नाम है', 'प्रोडक्ट नाम'],
    set_description: ['set description', 'description is', 'विवरण', 'विवरण है', 'डिस्क्रिप्शन'],
    set_price: ['set price', 'price is', 'मूल्य', 'मूल्य है', 'कीमत', 'दाम'],
    set_category: ['set category', 'category is', 'श्रेणी', 'श्रेणी है', 'कैटेगरी'],

    // Action commands
    confirm: ['confirm', 'yes', 'okay', 'upload', 'save', 'done', 'हाँ', 'ठीक', 'अपलोड', 'सेव', 'हो गया'],
    save_product: ['save product', 'save', 'create', 'publish', 'सेव', 'बनाएं', 'create product', 'publish product'],
    help: ['help', 'मदद', 'सहायता', 'क्या कर सकता है', 'what can you do'],
    status: ['status', 'progress', 'where am i', 'स्थिति', 'प्रगति', 'कहाँ हूँ'],
    review: ['review', 'check', 'verify', 'जाँच', 'समीक्षा'],
    edit: ['edit', 'change', 'modify', 'संपादित', 'बदलो']
  };

  const recognizeVoiceCommand = async (text: string): Promise<string | null> => {
    const lowerText = text.toLowerCase().trim();

    // First check for exact keyword matches (faster)
    for (const [command, keywords] of Object.entries(voiceCommands)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return command;
        }
      }
    }

    // If no exact match, use conversational processor for natural language understanding
    try {
      // Create a text-based audio buffer simulation for conversational processing
      const textBuffer = new ArrayBuffer(text.length * 2);
      const result = await conversationalProcessor.processVoiceCommand(textBuffer, 'hi');

      // Update conversational context with current page
      conversationalProcessor.updateContext({
        currentPage: '/smart-product-creator',
        recentActions: ['product_creation', 'voice_interaction']
      });

      // Check if conversational processor has a meaningful response
      if (result && result.intent && result.intent.confidence > 0.3) {
        // Handle conversational intents
        if (result.intent.type === 'action' && result.intent.target === 'create_product') {
          return 'start';
        }
        if (result.intent.type === 'navigate' && result.intent.target === '/') {
          return 'back';
        }
        if (result.intent.type === 'action' && result.intent.target === 'next') {
          return 'next';
        }
        if (result.intent.type === 'action' && result.intent.target === 'confirm') {
          return 'confirm';
        }
      }

      return null;
    } catch (error) {
      console.error('Conversational processing failed:', error);
      return null;
    }
  };

  const executeVoiceCommand = async (command: string) => {
    const now = Date.now();

    // Prevent command spam with cooldown
    if (now - lastCommandTime < commandCooldown) {
      return;
    }

    setLastCommandTime(now);
    setLastRecognizedCommand(command);
    setCommandFeedbackVisible(true);

    // Hide feedback after 2 seconds
    setTimeout(() => {
      setCommandFeedbackVisible(false);
    }, 2000);

    // Handle voice workflow commands first
    if (voiceWorkflowActive) {
      handleVoiceWorkflowCommand(command);
      return;
    }

    // Handle regular smart product creator commands
    switch (command) {
      case 'next':
        if (canProceedToNext()) {
          goToNextStep();
          toast({
            title: "🎯 Voice Command: Next",
            description: "Proceeding to next step...",
          });
        } else {
          toast({
            title: "Cannot Proceed",
            description: "Please complete the current step first.",
            variant: "destructive",
          });
        }
        break;

      case 'back':
        goToPreviousStep();
        toast({
          title: "🎯 Voice Command: Back",
          description: "Going back to previous step...",
        });
        break;

      case 'confirm':
        if (currentStep === 'product-details') {
          handleProductSubmit();
          toast({
            title: "🎯 Voice Command: Confirm",
            description: "Creating your product...",
          });
        } else {
          toast({
            title: "🎯 Voice Command: Confirm",
            description: "Confirmation received!",
          });
        }
        break;

      case 'start':
        if (!voiceWorkflowActive) {
          startVoiceWorkflow();
          toast({
            title: "🎯 Voice Workflow Started",
            description: "Voice-guided product creation activated!",
          });
        }
        break;

      default:
        // Try conversational processing for unrecognized commands
        try {
          const emptyBuffer = new ArrayBuffer(0);
          const result = await conversationalProcessor.processVoiceCommand(emptyBuffer, 'hi');

          if (result.response) {
            // Provide voice feedback for conversational responses
            speakVoiceFeedback(result.response);
            toast({
              title: "🤖 AI Assistant",
              description: result.response,
            });
          }
        } catch (error) {
          console.error('Conversational processing failed:', error);
        }
        break;
    }
  };

  // Continuous voice listening for commands
  const startContinuousListening = async () => {
    if (!speechRecognitionRef.current) {
      toast({
        title: "Voice Commands Not Available",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Stop any existing recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }

      // Configure for command recognition
      speechRecognitionRef.current.continuous = true;
      speechRecognitionRef.current.interimResults = true;
      speechRecognitionRef.current.lang = 'hi-IN'; // Primary: Hindi, will fallback to English

      speechRecognitionRef.current.onstart = () => {
        setIsContinuousListening(true);
        console.log('🎤 Continuous voice listening started for commands');
      };

      speechRecognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Check for voice commands in both interim and final results
        if (finalTranscript) {
          recognizeVoiceCommand(finalTranscript).then(command => {
            if (command) {
              executeVoiceCommand(command);
            }
          }).catch(error => {
            console.error('Voice command recognition failed:', error);
          });
        }

        if (interimTranscript) {
          recognizeVoiceCommand(interimTranscript).then(command => {
            if (command) {
              executeVoiceCommand(command);
            }
          }).catch(error => {
            console.error('Voice command recognition failed:', error);
          });
        }
      };

      speechRecognitionRef.current.onerror = (event: any) => {
        console.error('Continuous listening error:', event.error);
        setIsContinuousListening(false);

        // Try to restart if it's a recoverable error
        if (event.error !== 'not-allowed' && event.error !== 'network') {
          setTimeout(() => {
            if (isContinuousListening) {
              startContinuousListening();
            }
          }, 2000);
        }
      };

      speechRecognitionRef.current.onend = () => {
        // Auto-restart if continuous listening is still enabled
        if (isContinuousListening) {
          setTimeout(() => {
            startContinuousListening();
          }, 1000);
        }
      };

      speechRecognitionRef.current.start();

    } catch (error) {
      console.error('Failed to start continuous listening:', error);
      setIsContinuousListening(false);
      toast({
        title: "Voice Listening Failed",
        description: "Could not start continuous voice listening.",
        variant: "destructive",
      });
    }
  };

  const stopContinuousListening = () => {
    setIsContinuousListening(false);
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'image-upload':
        return renderImageUploadStep();
      case 'audio-recording':
        return renderAudioRecordingStep();
      case 'pricing-engine':
        return renderPricingEngineStep();
      case 'product-details':
        return renderProductDetailsStep();
      default:
        return renderImageUploadStep();
    }
  };

  // Step 2: Audio Recording (Dedicated Story Mic)
  const renderAudioRecordingStep = () => {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Share Your Story</h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4">Tell us about your product's craftsmanship and inspiration</p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex justify-center">
          <div className="bg-muted rounded-lg p-1 flex gap-1 w-full max-w-xs">
            <Button
              onClick={() => setInputMode('voice')}
              variant={inputMode === 'voice' ? 'default' : 'ghost'}
              size="sm"
              className="flex items-center justify-center gap-1 sm:gap-2 flex-1 text-xs sm:text-sm"
            >
              <Mic className="size-3 sm:size-4" />
              <span>Voice</span>
            </Button>
            <Button
              onClick={() => setInputMode('text')}
              variant={inputMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              className="flex items-center justify-center gap-1 sm:gap-2 flex-1 text-xs sm:text-sm"
            >
              <span className="text-sm sm:text-base">📝</span>
              <span>Text</span>
            </Button>
          </div>
        </div>

        {/* Voice Input Section */}
        {inputMode === 'voice' && (
          <div className="text-center space-y-6">
            {/* Story Mic Component */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <StoryRecordingMic
                  size="lg"
                  onStoryRecorded={handleStoryRecorded}
                  onStoryCleared={handleStoryCleared}
                  enhancedStory={enhancedTranscription}
                  onFinalizedStory={handleFinalizedStory}
                  finalizedStoryFromParent={finalizedStory}
                />
              </div>
            </div>

            {/* Recording Status */}
            {isTranscribing && (
              <div className="text-green-600 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Recording your story...</span>
                </div>
              </div>
            )}

            {/* Story Display */}
            {transcription && (
              <div className="bg-white border rounded-lg p-3 sm:p-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-800 text-sm sm:text-base">Your Story:</h4>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto">
                    {transcription.length} characters
                  </Badge>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{transcription}</p>

                {/* Story Enhancement */}
                {showStoryEnhancement && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        onClick={enhanceStory}
                        disabled={isEnhancingStory}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isEnhancingStory ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4 mr-2" />
                            Enhance with AI
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowStoryEnhancement(false)}
                        variant="outline"
                        size="sm"
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                )}

                {/* Enhanced Story Display */}
                {enhancedTranscription && enhancedTranscription !== transcription && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-green-800 flex items-center gap-2">
                        <Sparkles className="size-4" />
                        Enhanced Story
                      </h4>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                        {enhancedTranscription.length} chars
                      </Badge>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 leading-relaxed font-medium">{enhancedTranscription}</p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => {
                          setEnhancedTranscription('');
                          // Trigger story finalization for audio generation with original story
                          handleFinalizedStory(transcription, null);
                        }}
                        size="sm"
                        variant="outline"
                        className="text-gray-600"
                      >
                        Keep Original
                      </Button>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Instructions when no story */}
            {!transcription && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎤</div>
                <p className="text-gray-600">
                  Click the microphone button in the header to start recording your story
                </p>
              </div>
            )}
          </div>
        )}

        {/* Text Input Section */}
        {inputMode === 'text' && (
          <div className="space-y-4">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Tell us about your product's craftsmanship, materials, and cultural significance..."
              className="min-h-[150px] text-base leading-relaxed"
            />

            {textInput && (
              <div className="text-right text-sm text-muted-foreground">
                {textInput.length} characters
              </div>
            )}

            <div className="text-center">
              <Button
                onClick={async () => {
                  if (textInput.trim()) {
                    const storyText = textInput.trim();
                    setTranscription(storyText);
                    setEnhancedTranscription(storyText);
                    await updateProductDescription(storyText);
                  } else {
                    toast({
                      title: "Please write something",
                      description: "Enter your product's story before continuing.",
                      variant: "destructive",
                    });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!textInput.trim()}
              >
                Save Story
              </Button>
            </div>
          </div>
        )}

        {/* Audio controls removed - voice features disabled */}
      </div>
    );
  };

  // Auto-generate product details when reaching step 3
  useEffect(() => {
    if (currentStep === 'product-details' && imagePreview && transcription && !productForm.name) {
      // Auto-generate after a short delay to let the UI settle
      const timer = setTimeout(() => {
        generateProductDetails();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentStep, imagePreview, transcription, productForm.name]);

  // AI-powered product details generation
  const generateProductDetails = async () => {
    if (!imagePreview || !transcription) {
      toast({
        title: "Missing Information",
        description: "Please ensure you have uploaded an image and recorded a story first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingDescription(true);

    try {
      const response = await fetch('/api/generate-product-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imagePreview,
          story: transcription,
          language: /[\u0900-\u097F]/.test(transcription) ? 'hi-IN' : 'en-US' // Detect language from story
        })
      });

      const result = await response.json();

      if (result.success && result.productDetails) {
        const details = result.productDetails;

        // Auto-fill all product form fields
        setProductForm(prev => ({
          ...prev,
          name: details.name || prev.name,
          category: details.category || prev.category,
          description: details.description || prev.description,
          materials: details.materials || prev.materials,
          tags: details.tags || prev.tags,
          dimensions: details.dimensions || prev.dimensions,
          weight: details.weight || prev.weight,
          careInstructions: details.careInstructions || prev.careInstructions
        }));

        toast({
          title: "Product Details Generated!",
          description: "AI has analyzed your image and story to fill in the product details. Please review and customize as needed.",
        });
      } else {
        throw new Error(result.error || 'Failed to generate product details');
      }
    } catch (error) {
      console.error('Error generating product details:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate product details. Please fill them manually.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Step 3: Product Details Form
  const renderProductDetailsStep = () => {

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Step 3: Product Details</h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4">AI will automatically fill product details based on your image and story</p>
          {isContinuousListening && (
            <div className="mt-2 text-xs sm:text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full inline-block">
              💡 Voice commands active - say "confirm" or "upload" to create product
            </div>
          )}
        </div>

        {/* AI Generation Button */}
        <div className="text-center">
          <Button
            onClick={generateProductDetails}
            disabled={isGeneratingDescription || !imagePreview || !transcription}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            {isGeneratingDescription ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                AI is analyzing your product...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" />
                Generate Product Details with AI
              </>
            )}
          </Button>
          {(!imagePreview || !transcription) && (
            <p className="text-xs text-muted-foreground mt-2">
              Upload an image and record a story to enable AI generation
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Product Image Preview */}
          <div className="space-y-4 order-2 lg:order-1">
            <Label className="text-base sm:text-lg font-semibold">Product Image</Label>
            <div className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/50 min-h-[200px] sm:min-h-[250px]">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Product preview"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <Upload className="mx-auto size-8 sm:size-12 mb-2" />
                  <p className="text-xs sm:text-sm">No image uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Form */}
          <div className="space-y-4 order-1 lg:order-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Label htmlFor="product-name" className="text-sm sm:text-base">Product Name <span className="text-red-500">*</span></Label>
                  {productForm.name && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 self-start sm:self-auto">
                      ✨ AI Generated
                    </Badge>
                  )}
                </div>
                <Input
                  id="product-name"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Handwoven Silk Saree"
                  className={!productForm.name ? "border-red-300" : productForm.name ? "border-green-300 bg-green-50" : ""}
                />
                {!productForm.name && (
                  <p className="text-xs text-red-600">Product name is required</p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="product-price" className="text-sm sm:text-base">Price (₹) <span className="text-red-500">*</span></Label>
                  {pricingApproved && <span className="text-green-600 text-xs">✓ Auto-filled from Fair Price Engine</span>}
                </div>
                <Input
                  id="product-price"
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="0"
                  className={pricingApproved ? "border-green-500 bg-green-50" : (productForm.price <= 0 ? "border-red-300" : "")}
                />
                {pricingApproved && (
                  <p className="text-xs text-green-600">
                    💰 This price was calculated based on your time and material costs for fair compensation.
                  </p>
                )}
                {productForm.price <= 0 && (
                  <p className="text-xs text-red-600">Price must be greater than 0</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="product-category">Category <span className="text-red-500">*</span></Label>
                {productForm.category && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    ✨ AI Generated
                  </Badge>
                )}
              </div>
              <Select
                value={productForm.category}
                onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className={!productForm.category ? "border-red-300" : productForm.category ? "border-green-300 bg-green-50" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="textiles">Textiles</SelectItem>
                  <SelectItem value="jewelry">Jewelry</SelectItem>
                  <SelectItem value="pottery">Pottery</SelectItem>
                  <SelectItem value="handicrafts">Handicrafts</SelectItem>
                  <SelectItem value="metalwork">Metalwork</SelectItem>
                  <SelectItem value="woodwork">Woodwork</SelectItem>
                </SelectContent>
              </Select>
              {!productForm.category && (
                <p className="text-xs text-red-600">Please select a category</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="product-description">Description <span className="text-red-500">*</span></Label>
                {transcription && !autoGeneratedDescription && (
                  <Button
                    onClick={generateDescriptionFromStory}
                    disabled={isGeneratingDescription}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1"></div>
                        Generating...
                      </>
                    ) : (
                      <>✨ Auto-Generate</>
                    )}
                  </Button>
                )}
              </div>

              <Textarea
                id="product-description"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your product..."
                className={`min-h-[100px] ${!productForm.description ? "border-red-300" : ""}`}
              />

              {/* Auto-generated description preview */}
              {autoGeneratedDescription && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">AI-Generated Description:</Label>
                    <Button
                      onClick={() => {
                        setProductForm(prev => ({
                          ...prev,
                          description: autoGeneratedDescription
                        }));
                        setUseVectorDescription(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Use This
                    </Button>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">{autoGeneratedDescription}</p>
                    {descriptionKeywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {descriptionKeywords.slice(0, 5).map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!productForm.description && (
                <p className="text-xs text-red-600">Description is required</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Materials</Label>
                {productForm.materials.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    ✨ AI Generated
                  </Badge>
                )}
              </div>
              <Input
                value={productForm.materials.join(', ')}
                onChange={(e) => setProductForm(prev => ({
                  ...prev,
                  materials: e.target.value.split(',').map(m => m.trim()).filter(m => m)
                }))}
                placeholder="e.g., Silk, Cotton, Gold thread"
                className={productForm.materials.length > 0 ? "border-green-300 bg-green-50" : ""}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Tags {productForm.tags.length > 0 && <span className="text-sm text-muted-foreground">({productForm.tags.length} tags)</span>}</Label>
                {productForm.tags.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    ✨ AI Generated
                  </Badge>
                )}
              </div>
              <Input
                value={productForm.tags.join(', ')}
                onChange={(e) => setProductForm(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                }))}
                placeholder="e.g., handmade, traditional, cultural"
                className={productForm.tags.length > 0 ? "border-green-300 bg-green-50" : ""}
              />
              {productForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {productForm.tags.slice(0, 8).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                  {productForm.tags.length > 8 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{productForm.tags.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs">ℹ️</span>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-1">AI-Generated Information</h4>
              <p className="text-sm text-blue-700">
                The form has been pre-filled with information extracted from your image and voice recording.
                You can edit any field to better reflect your product's unique characteristics.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 4: Pricing Engine
  const renderPricingEngineStep = () => {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Step 4: Fair Price Engine</h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4">Tell us about your effort and costs for realistic pricing</p>
          {isContinuousListening && (
            <div className="mt-2 text-xs sm:text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full inline-block">
              💡 Voice commands active - say "next" to proceed or "back" to return
            </div>
          )}
        </div>

        {showPricingInputs ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🛠️ Your Craftsmanship Input</CardTitle>
                <CardDescription>
                  Help us calculate a fair price by sharing details about your time, materials, and costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time-spent" className="text-sm sm:text-base">⏰ Time Spent (hours)</Label>
                    <Input
                      id="time-spent"
                      type="number"
                      placeholder="e.g., 24"
                      value={artisanInputs.timeSpent}
                      onChange={(e) => setArtisanInputs(prev => ({ ...prev, timeSpent: e.target.value }))}
                      className="text-sm sm:text-base"
                    />
                    <p className="text-xs text-muted-foreground">Total hours you spent making this product</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="material-costs" className="text-sm sm:text-base">🧵 Material Costs (₹)</Label>
                    <Input
                      id="material-costs"
                      type="number"
                      placeholder="e.g., 500"
                      value={artisanInputs.materialCosts}
                      onChange={(e) => setArtisanInputs(prev => ({ ...prev, materialCosts: e.target.value }))}
                      className="text-sm sm:text-base"
                    />
                    <p className="text-xs text-muted-foreground">Cost of cloth, thread, dyes, etc.</p>
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="other-costs" className="text-sm sm:text-base">🔧 Other Costs (₹)</Label>
                    <Input
                      id="other-costs"
                      type="number"
                      placeholder="e.g., 100"
                      value={artisanInputs.otherCosts}
                      onChange={(e) => setArtisanInputs(prev => ({ ...prev, otherCosts: e.target.value }))}
                      className="text-sm sm:text-base"
                    />
                    <p className="text-xs text-muted-foreground">Tools, transportation, packaging</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected-profit" className="text-sm sm:text-base">💰 Desired Profit Margin (%)</Label>
                    <Input
                      id="expected-profit"
                      type="number"
                      placeholder="e.g., 30"
                      value={artisanInputs.expectedProfit}
                      onChange={(e) => setArtisanInputs(prev => ({ ...prev, expectedProfit: e.target.value }))}
                      className="text-sm sm:text-base"
                    />
                    <p className="text-xs text-muted-foreground">How much profit do you want to make?</p>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => {
                      if (!artisanInputs.timeSpent || !artisanInputs.materialCosts) {
                        toast({
                          title: "Missing Information",
                          description: "Please fill in at least time spent and material costs.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setShowPricingInputs(false);
                      analyzePricing();
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                    size="lg"
                  >
                    🚀 Calculate Fair Price
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !pricingAnalysis ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Calculating your fair price...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>💰 Your Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Materials:</span> ₹{artisanInputs.materialCosts || 0}
                  </div>
                  <div>
                    <span className="font-medium">Other Costs:</span> ₹{artisanInputs.otherCosts || 0}
                  </div>
                  <div>
                    <span className="font-medium">Time Value:</span> ₹{pricingAnalysis.timeValue || 0}
                  </div>
                  <div>
                    <span className="font-medium">Profit Margin:</span> {artisanInputs.expectedProfit || 0}%
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Cost:</span>
                    <span>₹{pricingAnalysis.totalCost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Analysis Results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    💰 Fair Price
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ₹{pricingAnalysis.suggestedPrice}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on your actual costs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    📈 Your Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{pricingAnalysis.profitAmount}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {pricingAnalysis.profitMargin}% margin
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🎯 Market Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {pricingAnalysis.marketPosition}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Above market average
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 Pricing Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pricingAnalysis.recommendations?.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowPricingInputs(true)}
                variant="outline"
                className="flex-1"
              >
                ← Edit Costs
              </Button>
              <Button
                onClick={() => {
                  setPricingApproved(true);
                  // Auto-fill the price in product form
                  setProductForm(prev => ({
                    ...prev,
                    price: pricingAnalysis.suggestedPrice
                  }));
                  toast({
                    title: "Price Approved! ✅",
                    description: `₹${pricingAnalysis.suggestedPrice} will be used for your product.`,
                  });
                  // Auto-advance to next step
                  goToNextStep();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                ✅ Approve Price & Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Step 1: Image Upload
  const renderImageUploadStep = () => {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Step 1: Upload Product Image</h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4">Upload or capture a photo of your handmade product</p>
          {isContinuousListening && (
            <div className="mt-2 text-xs sm:text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
              💡 Voice commands active - say "next" when ready
            </div>
          )}
        </div>

        {/* Image Upload Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              {/* Image Preview with Slider */}
              <div className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/50 min-h-[200px] sm:min-h-[300px]">
                {!imageFile ? (
                  <div className="text-center text-muted-foreground p-4">
                    <Upload className="mx-auto size-8 sm:size-12 mb-2" />
                    <p className="text-xs sm:text-sm">Upload or capture product image</p>
                  </div>
                ) : !originalImage ? (
                  <div className="text-center text-muted-foreground p-4">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs sm:text-sm">Processing image...</p>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {/* Original Image (Background) */}
                    <Image
                      src={originalImage}
                      alt="Original image"
                      layout="fill"
                      objectFit="contain"
                      className="absolute inset-0 rounded-lg"
                    />

                    {/* Enhanced Image (Foreground with clip-path) */}
                    {enhancedImage && (
                      <div
                        className="absolute inset-0 rounded-lg"
                        style={{
                          clipPath: `inset(0 ${100 - comparisonSlider}% 0 0)`
                        }}
                      >
                        <Image
                          src={enhancedImage}
                          alt="Enhanced image"
                          layout="fill"
                          objectFit="contain"
                        />
                      </div>
                    )}

                    {/* Slider Line */}
                    {enhancedImage && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                        style={{ left: `${comparisonSlider}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center">
                          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        </div>
                      </div>
                    )}

                    {/* Slider Input */}
                    {enhancedImage && (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={comparisonSlider}
                        onChange={(e) => setComparisonSlider(Number(e.target.value))}
                        onMouseDown={() => setIsDragging(true)}
                        onMouseUp={() => setIsDragging(false)}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-white/30 rounded appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #6b7280 0%, #6b7280 ${comparisonSlider}%, #ffffff30 ${comparisonSlider}%, #ffffff30 100%)`
                        }}
                      />
                    )}

                    {/* Labels */}
                    {enhancedImage && (
                      <div className="absolute top-2 left-2 right-2 flex justify-between text-xs text-white/80 font-medium">
                        <span>Original</span>
                        <span>Enhanced</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1 sm:gap-2 h-16 sm:h-20 text-xs sm:text-sm"
                  variant="outline"
                >
                  <Upload className="size-4 sm:size-6" />
                  <span>Gallery</span>
                </Button>
                <Button
                  onClick={openCamera}
                  className="flex flex-col items-center gap-2 h-20"
                  variant="outline"
                >
                  <Camera className="size-6" />
                  <span className="text-xs">Camera</span>
                </Button>
              </div>

              {/* AI Enhancement Button */}
              {imageFile && !enhancedImage && (
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzingImage}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  size="sm"
                >
                  {isAnalyzingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Enhancing...
                    </>
                  ) : (
                    <>
                      ✨ Enhance with AI
                    </>
                  )}
                </Button>
              )}

              {/* Enhancement Action Buttons */}
              {enhancedImage && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setImagePreview(originalImage);
                      // Set basic imageAnalysis if not already set
                      if (!imageAnalysis) {
                        setImageAnalysis({
                          productType: 'Handcrafted Product',
                          category: 'Handicrafts',
                          materials: ['Various'],
                          colors: ['Natural'],
                          description: 'A beautiful handcrafted product',
                          estimatedValue: '₹2,000 - ₹15,000'
                        });
                      }
                      toast({
                        title: "Using original image",
                        description: "You can always re-enable enhancement later.",
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Use Original
                  </Button>
                  <Button
                    onClick={() => {
                      setImagePreview(enhancedImage);
                      // Set basic imageAnalysis if not already set
                      if (!imageAnalysis) {
                        setImageAnalysis({
                          productType: 'Enhanced Handcrafted Product',
                          category: 'Handicrafts',
                          materials: ['Various'],
                          colors: ['Natural'],
                          description: 'An AI-enhanced handcrafted product with professional styling',
                          estimatedValue: '₹2,000 - ₹15,000'
                        });
                      }
                      toast({
                        title: "Using enhanced image ✨",
                        description: "AI enhancement applied successfully!",
                      });
                    }}
                    className="flex-1"
                    size="sm"
                  >
                    Use Enhanced
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryUpload}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full max-w-7xl mx-auto">
      <CardHeader className="px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="font-headline flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
              <Sparkles className="size-5 sm:size-6 text-primary flex-shrink-0" />
              <span className="truncate">Smart Product Creator</span>
            </CardTitle>
            <CardDescription className="mt-1 text-sm sm:text-base text-muted-foreground">
              Create compelling product stories with AI-enhanced images and authentic voice narration
            </CardDescription>
          </div>

          {/* Voice Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={isContinuousListening ? stopContinuousListening : startContinuousListening}
              variant={isContinuousListening ? "default" : "outline"}
              size="sm"
              className={`flex items-center justify-center gap-2 text-xs sm:text-sm ${isContinuousListening ? 'bg-green-600 hover:bg-green-700' : ''}`}
              disabled={!speechRecognitionRef.current}
            >
              {isContinuousListening ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">🎤 Listening</span>
                  <span className="sm:hidden">🎤</span>
                </>
              ) : (
                <>
                  <Mic className="size-3 sm:size-4" />
                  <span className="hidden sm:inline">Voice Commands</span>
                  <span className="sm:hidden">Voice</span>
                </>
              )}
            </Button>

            <Button
              onClick={voiceWorkflowActive ? stopVoiceWorkflow : startVoiceWorkflow}
              variant={voiceWorkflowActive ? "default" : "outline"}
              size="sm"
              className={`flex items-center justify-center gap-2 text-xs sm:text-sm ${voiceWorkflowActive ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
            >
              {voiceWorkflowActive ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">🗣️ Voice Guide</span>
                  <span className="sm:hidden">🗣️</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3 sm:size-4" />
                  <span className="hidden sm:inline">Voice Guide</span>
                  <span className="sm:hidden">Guide</span>
                </>
              )}
            </Button>

            {isContinuousListening && (
              <div className="text-xs text-muted-foreground mt-2 sm:mt-0 sm:ml-2 text-center sm:text-left">
                <div className="hidden sm:block">
                  {voiceWorkflowActive
                    ? `Voice Guide: ${voiceWorkflowStep.replace('_', ' ')}`
                    : 'Say "next", "aage jao", "confirm", or "back"'
                  }
                </div>
                <div className="sm:hidden">
                  {voiceWorkflowActive ? 'Voice Guide Active' : 'Voice Commands Active'}
                </div>
              </div>
            )}

            {/* Enhanced Voice Workflow Display */}
            {voiceWorkflowActive && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 sm:p-4 mt-2 space-y-2 sm:space-y-3 w-full">
                {/* Progress Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-purple-700 mb-1">
                      <span className="truncate">Voice Workflow Progress</span>
                      <span className="ml-2">{voiceProgress}%</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${voiceProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-600 font-medium text-center sm:text-left">
                    Step {['welcome', 'image_upload', 'audio_recording', 'pricing_setup', 'product_details', 'review_publish'].indexOf(voiceWorkflowStep) + 1}/6
                  </div>
                </div>

                {/* Current Step Indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-purple-800 capitalize">
                    {voiceWorkflowStep.replace('_', ' ')} Step
                  </span>
                  {isProcessingVoice && (
                    <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                {/* Voice Feedback */}
                {voiceFeedback && (
                  <div className="bg-white/70 rounded-lg p-3">
                    <span className="text-sm text-purple-800">
                      {voiceFeedback}
                    </span>
                  </div>
                )}

                {/* Voice Hints */}
                {voiceHints.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                    <div className="text-xs font-medium text-blue-800 mb-2">💡 Try saying:</div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {voiceHints.map((hint, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                          "{hint}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voice Errors */}
                {voiceErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-red-800 mb-1">⚠️ Recent Issues:</div>
                    <div className="text-xs text-red-700">
                      {voiceErrors[voiceErrors.length - 1]}
                    </div>
                  </div>
                )}

                {/* Voice Error Help */}
                {voiceErrorHelp && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-yellow-800 mb-1">💡 Help:</div>
                    <div className="text-xs text-yellow-700">
                      {voiceErrorHelp}
                    </div>
                  </div>
                )}

                {/* Voice Shortcuts Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                  <div className="text-xs font-medium text-gray-800 mb-2">🎯 Shortcuts (always available):</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-600">
                    <div>• "repeat" - Repeat current guidance</div>
                    <div>• "clear" - Clear messages</div>
                    <div>• "status" - Show current progress</div>
                    <div>• "help" - Show available commands</div>
                    <div>• "restart" - Restart workflow</div>
                    <div>• "skip" - Skip current step</div>
                  </div>
                </div>

                {/* Step History */}
                {voiceStepHistory.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-800 mb-2">📝 Recent Commands:</div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {voiceStepHistory.slice(-3).map((cmd, index) => (
                        <div key={index} className="text-xs text-gray-600">
                          {cmd}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Voice Command Feedback */}
            {commandFeedbackVisible && lastRecognizedCommand && (
              <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="font-medium">
                    🎤 Heard: "{lastRecognizedCommand}"
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="min-h-[400px] sm:min-h-[500px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 sm:pt-6 border-t">
          <Button
            onClick={goToPreviousStep}
            disabled={currentStep === 'image-upload'}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">← Previous</span>
            <span className="sm:hidden">← Back</span>
          </Button>

          <div className="text-sm text-muted-foreground text-center order-first sm:order-none">
            Step {['image-upload', 'audio-recording', 'pricing-engine', 'product-details'].indexOf(currentStep) + 1} of 4
          </div>

          {currentStep === 'product-details' ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={handleProductSubmit}
                disabled={!canProceedToNext() || uploadingProduct}
                className="bg-green-600 hover:bg-green-700 w-full sm:flex-1"
              >
                {uploadingProduct ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="hidden sm:inline">Creating Product...</span>
                    <span className="sm:hidden">Creating...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">🎉 Create Product</span>
                    <span className="sm:hidden">🎉 Create</span>
                  </>
                )}
              </Button>

              {isContinuousListening && (
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">Say "confirm" or "upload" to proceed</span>
                  <span className="sm:hidden">Say "confirm"</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={goToNextStep}
                disabled={!canProceedToNext()}
                className="w-full sm:flex-1"
              >
                <span className="hidden sm:inline">Next →</span>
                <span className="sm:hidden">Next</span>
              </Button>

              {isContinuousListening && (
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">Say "next" or "aage jao"</span>
                  <span className="sm:hidden">Say "next"</span>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Browser Compatibility Warning */}
        {!browserSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⚠️</span>
              </div>
              <div>
                <h4 className="font-medium">Browser Compatibility Notice</h4>
                <p className="text-sm">
                  Some features may not work properly in this browser. For best experience, please use Chrome, Firefox, or Safari.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hidden audio element for playback */}
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

        {/* Debug Panel */}
        <div className="mt-4">
          <Button
            onClick={() => setShowDebug(!showDebug)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {/* {showDebug ? "Hide Debug Info" : "Show Debug Info"} */}
          </Button>

          {showDebug && (
            <div className="mt-2 p-3  border rounded text-xs font-mono">
              <div className="font-bold mb-2">🎯 Recording Debug Info:</div>
              <div>Browser Support: {browserSupported ? "✅" : "❌"}</div>
              <div>MediaDevices API: {typeof navigator.mediaDevices !== 'undefined' ? "✅" : "❌"}</div>
              <div>getUserMedia: {typeof navigator.mediaDevices?.getUserMedia === 'function' ? "✅" : "❌"}</div>
              <div>MediaRecorder: {typeof MediaRecorder !== 'undefined' ? "✅" : "❌"}</div>
              <div>Voice Recording: Disabled (text-only mode)</div>
              <div>Story Length: {transcription ? transcription.length : 0} characters</div>
              <div>Story Status: {transcription ? "✅ Captured" : "❌ Not captured"}</div>
              <div>Audio Blob: {audioBlob ? `${Math.round(audioBlob.size / 1024)} KB` : "None"}</div>
              <div>AI Processing: {isListening ? "🤖 ACTIVE" : "⏸️ INACTIVE"}</div>
              <div>Transcription: {transcription ? "✅ Available" : "❌ None"}</div>
              <div>Transcription Length: {transcription ? `${transcription.replace(/\[LIVE\].*$/, '').length} chars` : "N/A"}</div>
              <div>AI Processing: {isListening ? "🔄 Active" : "⏸️ Paused"}</div>
              <div className="mt-2 font-bold">Recent Logs:</div>
              <div className="max-h-20 overflow-y-auto">
                {debugInfo.slice(-5).map((log, i) => (
                  <div key={i} className="text-xs">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom Styles for Slider */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .slider::-webkit-slider-thumb {
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: white;
              border: 2px solid #3b82f6;
              cursor: grab;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }

            .slider::-webkit-slider-thumb:active {
              cursor: grabbing;
              transform: scale(1.1);
            }

            .slider::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: white;
              border: 2px solid #3b82f6;
              cursor: grab;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }

            .slider::-moz-range-thumb:active {
              cursor: grabbing;
              transform: scale(1.1);
            }
          `
        }} />

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              {!cameraPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold">Take Product Photo</h3>
                    <Button
                      onClick={closeCamera}
                      variant="ghost"
                      size="sm"
                      className="text-lg"
                    >
                      ✕
                    </Button>
                  </div>

                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden min-h-[200px]">
                    <video
                      ref={(video) => {
                        if (video && cameraStream) {
                          video.srcObject = cameraStream;
                          video.play();
                        }
                      }}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="rounded-full w-12 h-12 sm:w-16 sm:h-16 bg-white border-4 border-gray-300 hover:bg-gray-100"
                    >
                      <div className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full"></div>
                    </Button>
                  </div>

                  <p className="text-center text-xs sm:text-sm text-muted-foreground">
                    Position your product and tap the circle to capture
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Preview Photo</h3>

                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden min-h-[200px]">
                    <Image
                      src={cameraPreview}
                      alt="Camera preview"
                      layout="fill"
                      objectFit="contain"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={finalizePhoto}
                      className="flex-1 text-sm sm:text-base"
                      size="lg"
                    >
                      ✅ Finalize Photo
                    </Button>
                    <Button
                      onClick={retakePhoto}
                      variant="outline"
                      className="flex-1 text-sm sm:text-base"
                      size="lg"
                    >
                      🔄 Retake
                    </Button>
                  </div>

                  <Button
                    onClick={closeCamera}
                    variant="ghost"
                    className="w-full text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

    </Card>
  );
}