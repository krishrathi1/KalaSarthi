"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, Upload, Sparkles, Mic, MicOff, Play, Pause } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { uploadToCloudinary } from "@/lib/cloudinary";

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
}

type WizardStep = 'image-upload' | 'audio-recording' | 'product-details' | 'pricing-engine';

export function SmartProductCreator() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('image-upload');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

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

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [enhancedTranscription, setEnhancedTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

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
    tags: []
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { toast } = useToast();
  const { userProfile } = useAuth();

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
    }
  }, [currentStep, imageAnalysis, transcription, productForm.name, pricingApproved, pricingAnalysis]);

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
        return audioBlob && transcription;
      case 'pricing-engine':
        return pricingAnalysis && pricingApproved;
      case 'product-details':
        return productForm.name && productForm.description && productForm.price > 0 && productForm.category;
      default:
        return false;
    }
  };

  // Step components
  const renderStepIndicator = () => {
    const steps = [
      { id: 'image-upload', title: 'Upload Image', icon: '📸' },
      { id: 'audio-recording', title: 'Record Story', icon: '🎙️' },
      { id: 'pricing-engine', title: 'Fair Pricing', icon: '💰' },
      { id: 'product-details', title: 'Product Details', icon: '📝' }
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id as WizardStep);
            const isCurrent = currentStep === step.id;
            const isAccessible = index === 0 || completedSteps.has(steps[index - 1].id as WizardStep);

            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                      ? 'bg-primary border-primary text-white'
                      : isAccessible
                        ? 'bg-muted border-muted-foreground text-muted-foreground hover:bg-muted/80'
                        : 'bg-muted/50 border-muted/50 text-muted-foreground/50'
                }`}>
                  {isCompleted ? '✓' : step.icon}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className={`text-sm font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
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
      throw error;
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
      tags: []
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
    setTranslations({});
    setImageAnalysis(null);
    setProductDescription("A handwoven Kanchipuram silk saree with traditional peacock motifs and a golden zari border.");
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

  // Cleanup audio when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  }, []);

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

        const response = await fetch('/api/image-enhance', {
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
        toast({
          title: "Enhancement failed",
          description: "Using original image. Enhancement will be available soon.",
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

  const startRecording = async () => {
    try {
      addDebugLog('🎙️ Starting recording process...');

      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media recording is not supported in this browser");
      }

      // Check if MediaRecorder is available
      if (typeof MediaRecorder === 'undefined') {
        throw new Error("MediaRecorder API is not available");
      }

      addDebugLog('📱 Requesting microphone access...');

      // Try with advanced constraints first, fallback to basic if needed
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });
        addDebugLog('✅ Advanced audio constraints successful');
      } catch (advancedError) {
        addDebugLog('⚠️ Advanced constraints failed, trying basic audio...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          addDebugLog('✅ Basic audio constraints successful');
        } catch (basicError) {
          addDebugLog('❌ Both audio constraint attempts failed');
          throw basicError;
        }
      }

      console.log('✅ Microphone access granted');

      // Check if we got audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("No audio tracks found");
      }

      console.log('🎵 Audio tracks found:', audioTracks.length);

      // Try different MIME types for better compatibility
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        } else {
          mimeType = ''; // Let browser choose
        }
      }

      console.log('🎬 Creating MediaRecorder with MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        addDebugLog(`📦 Received audio data: ${event.data.size} bytes`);
        console.log('📦 Received audio data:', event.data.size, 'bytes', event.data);

        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          addDebugLog(`✅ Added chunk to array. Total chunks: ${audioChunksRef.current.length}`);
        } else {
          addDebugLog('⚠️ Received empty audio data chunk');
        }
      };

      mediaRecorder.onstart = () => {
        console.log('🎙️ MediaRecorder started successfully');
        setRecordingTime(0);

        // Start recording timer
        const timer = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        // Store timer reference for cleanup
        (mediaRecorder as any)._timer = timer;

      };

      mediaRecorder.onstop = async () => {
        addDebugLog('🛑 MediaRecorder stopped');


        // Clear recording timer
        if ((mediaRecorder as any)._timer) {
          clearInterval((mediaRecorder as any)._timer);
        }
        setRecordingTime(0);

        addDebugLog(`📊 Final check: ${audioChunksRef.current.length} chunks collected`);

        try {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          console.log('🔇 Audio tracks stopped');

          if (audioChunksRef.current.length === 0) {
            throw new Error("No audio data recorded");
          }

          console.log('📊 Collected', audioChunksRef.current.length, 'audio chunks');

          // Clean up previous audio URL to prevent memory leaks
          if (audioRef.current && audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
            audioRef.current.src = '';
          }

          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm'
          });

          console.log('💾 Created audio blob:', audioBlob.size, 'bytes');

          setAudioBlob(audioBlob);
          setIsPlaying(false); // Reset playing state for new audio

          toast({
            title: "Recording completed",
            description: `Captured ${Math.round(audioBlob.size / 1024)} KB of audio data.`,
          });

          // If we don't have transcription from speech recognition, try server-side processing
          if (!transcription || transcription.trim() === '') {
            setIsTranscribing(true);
            setProcessingStep("Converting speech to text...");

            const formData = new FormData();
            formData.append('audio', audioBlob);

            console.log('🌐 Sending audio to speech-to-text API...');

            const response = await fetch('/api/speech-to-text', {
              method: 'POST',
              body: formData,
            });

            const result = await response.json();
            console.log('📝 Speech-to-text result:', result);

            if (result.success) {
              setTranscription(result.transcription);
              setEnhancedTranscription(result.enhancedTranscription || result.transcription);
              setProcessingStep("");
              toast({
                title: "Transcription completed",
                description: `Converted ${result.duration}s of audio to text.`,
              });
            } else {
              throw new Error(result.error || "Transcription failed");
            }
          } else {
            // We already have transcription from speech recognition
            setProcessingStep("");
            toast({
              title: "Transcription completed",
              description: "Gemini AI has processed your audio recording.",
            });
          }
        } catch (error) {
          console.error('Recording processing failed:', error);
          setProcessingStep("");
          toast({
            title: "Processing failed",
            description: error instanceof Error ? error.message : "Audio recorded but processing failed.",
            variant: "destructive",
          });
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        toast({
          title: "Recording error",
          description: "An error occurred during recording.",
          variant: "destructive",
        });
      };

      addDebugLog('▶️ Starting MediaRecorder with 100ms intervals...');
      mediaRecorder.start(100); // Collect data every 100ms for better responsiveness

      // Add a data collection check after 1 second
      setTimeout(() => {
        addDebugLog(`📊 After 1s: ${audioChunksRef.current.length} chunks collected`);
      }, 1000);
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Tell us about your product's cultural story...",
      });

    } catch (error) {
      console.error('Recording setup failed:', error);
      setIsRecording(false);

      let errorMessage = "Recording failed. ";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += "Please allow microphone access when prompted by your browser.";
        } else if (error.name === 'NotFoundError') {
          errorMessage += "No microphone found. Please check your audio devices.";
        } else if (error.name === 'NotReadableError') {
          errorMessage += "Microphone is already in use by another application.";
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += "Microphone doesn't support the requested audio quality.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage += "Your browser doesn't support audio recording.";
        } else {
          errorMessage += error.message;
        }
      }

      toast({
        title: "Recording failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        // Clear the timer when paused
        if ((mediaRecorderRef.current as any)._timer) {
          clearInterval((mediaRecorderRef.current as any)._timer);
        }
        addDebugLog('⏸️ Recording paused');
        toast({
          title: "Recording paused",
          description: "Click resume to continue recording.",
        });
      } catch (error) {
        console.error('Error pausing recording:', error);
        addDebugLog('❌ Error pausing recording');
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        // Restart the timer
        const timer = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        (mediaRecorderRef.current as any)._timer = timer;
        addDebugLog('▶️ Recording resumed');
        toast({
          title: "Recording resumed",
          description: "Continue sharing your story...",
        });
      } catch (error) {
        console.error('Error resuming recording:', error);
        addDebugLog('❌ Error resuming recording');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Clear recording timer
        if ((mediaRecorderRef.current as any)._timer) {
          clearInterval((mediaRecorderRef.current as any)._timer);
        }
        setRecordingTime(0);
        setIsPaused(false);

        mediaRecorderRef.current.stop();
        setIsRecording(false);


        // Clean up any interim transcription markers
        setTranscription(prev => {
          const cleaned = prev.replace(/\[INTERIM\].*$/, '').trim();
          console.log('🧹 Cleaned transcription:', cleaned);
          return cleaned;
        });

        addDebugLog('🛑 Recording stopped');
        toast({
          title: "Recording stopped",
          description: "Processing your audio...",
        });
      } catch (error) {
        console.error('Error stopping recording:', error);
        setIsRecording(false);
        setRecordingTime(0);
        setIsPaused(false);


        addDebugLog('❌ Error stopping recording');
        toast({
          title: "Recording error",
          description: "Error occurred while stopping recording.",
          variant: "destructive",
        });
      }
    }
  };

  const playAudio = async () => {
    if (!audioBlob) {
      toast({
        title: "No audio to play",
        description: "Please record audio first.",
        variant: "destructive",
      });
      return;
    }

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

  // Auto-generate product details from image analysis and transcription
  const generateProductDetails = async () => {
    if (!imageAnalysis) {
      throw new Error("Image analysis required");
    }

    // Intelligently weave transcription and image analysis into compelling story
    const storyText = await weaveStoryFromSources();

    // Auto-generate comprehensive product details
    const productDetails = {
      name: imageAnalysis.productType || "Handcrafted Artisan Product",
      description: storyText,
      price: calculatePriceFromAnalysis(imageAnalysis),
      category: imageAnalysis.category || "Handicrafts",
      materials: imageAnalysis.materials || ["Natural materials"],
      colors: imageAnalysis.colors || ["Natural"],
      tags: generateTagsFromAnalysis(imageAnalysis),
      culturalSignificance: imageAnalysis.culturalSignificance || "Preserves traditional Indian craftsmanship",
      artisanName: userProfile?.name || "Skilled Artisan",
      region: "India",
      estimatedValue: imageAnalysis.estimatedValue || "₹2,000 - ₹15,000",
      targetAudience: imageAnalysis.targetAudience || "Art and culture enthusiasts",
      occasion: imageAnalysis.occasion || ["Cultural events", "Festivals", "Home decor"],
      careInstructions: imageAnalysis.careInstructions || [
        "Keep away from direct sunlight",
        "Clean with soft cloth",
        "Store in cool, dry place"
      ]
    };

    return productDetails;
  };

  // Calculate price based on image analysis
  const calculatePriceFromAnalysis = (analysis: any): number => {
    if (analysis.estimatedValue) {
      // Extract price range and take average
      const priceMatch = analysis.estimatedValue.match(/₹([\d,]+)\s*-\s*₹([\d,]+)/);
      if (priceMatch) {
        const minPrice = parseInt(priceMatch[1].replace(/,/g, ''));
        const maxPrice = parseInt(priceMatch[2].replace(/,/g, ''));
        return Math.round((minPrice + maxPrice) / 2);
      }
    }

    // Default pricing based on category
    const categoryPricing: { [key: string]: number } = {
      'Textiles': 3500,
      'Jewelry': 8500,
      'Pottery': 2200,
      'Handicrafts': 1800,
      'Metalwork': 4200,
      'Woodwork': 3800
    };

    return categoryPricing[analysis.category] || 2500;
  };

  // Generate tags from image analysis
  const generateTagsFromAnalysis = (analysis: any): string[] => {
    const tags = ['handmade', 'traditional', 'artisanal', 'indian'];

    if (analysis.materials) {
      tags.push(...analysis.materials.slice(0, 2));
    }

    if (analysis.category) {
      tags.push(analysis.category.toLowerCase());
    }

    if (analysis.colors) {
      tags.push(...analysis.colors.slice(0, 1));
    }

    return [...new Set(tags)]; // Remove duplicates
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

  // Step 2: Audio Recording
  const renderAudioRecordingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 2: Record Your Story</h2>
        <p className="text-muted-foreground">Share the authentic story behind your handmade product</p>
      </div>

      {/* Audio Recording Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border-2 border-dashed border-primary/20">
        <div className="text-center space-y-4">
          <div className="relative">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              className={`w-24 h-24 rounded-full text-2xl font-bold transition-all duration-300 ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110'
                  : 'bg-primary hover:bg-primary/90 hover:scale-105'
                }`}
            >
              {isRecording ? <MicOff className="size-8" /> : <Mic className="size-8" />}
            </Button>

            {isRecording && !isPaused && (
              <div className="absolute -inset-4 border-4 border-red-500 rounded-full animate-ping opacity-20 pointer-events-none"></div>
            )}
          </div>

          {/* Recording Status & Timer */}
          {isRecording && (
            <div className={`border rounded-lg p-3 text-center ${isPaused
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
              }`}>
              <div className={`font-medium ${isPaused ? 'text-yellow-600' : 'text-red-600'
                }`}>
                {isPaused ? '⏸️ Recording Paused' : '🔴 Recording Active'}
              </div>
              <div className={`text-2xl font-bold mt-1 ${isPaused ? 'text-yellow-700' : 'text-red-700'
                }`}>
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {isRecording ? "🎙️ Recording..." : "🎙️ Share Your Story"}
            </h3>
            <p className="text-muted-foreground">
              {isRecording
                ? "Tell us about your product's story, cultural significance, and what makes it special..."
                : "Click the microphone to share your product's authentic story with the world"
              }
            </p>
          </div>

          {isRecording && (
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* Audio Playback Controls */}
      {audioBlob && !isRecording && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={playAudio}
                disabled={isLoadingAudio}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isLoadingAudio ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {isLoadingAudio ? "Loading..." : isPlaying ? "Pause" : "Play Recording"}
              </Button>
              <span className="text-sm text-muted-foreground">
                Audio recorded ({Math.round(audioBlob.size / 1024)} KB)
              </span>
            </div>
            <Button
              onClick={() => {
                setAudioBlob(null);
                setTranscription("");
              }}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Re-record
            </Button>
          </div>
        </div>
      )}

      {/* Transcribed Story */}
      {transcription && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            📝 Your Story (Edit if needed)
          </Label>
          <Textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Your product's cultural story..."
            className="min-h-[120px] text-base leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            💡 Tip: Your authentic voice makes the story special. Feel free to add more details about the cultural significance!
          </p>
        </div>
      )}

      {/* Processing Status */}
      {isTranscribing && (
        <div className="flex items-center gap-3 text-blue-600 bg-blue-50 p-3 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Converting your voice to text...</span>
        </div>
      )}
    </div>
  );

  // Step 3: Product Details Form
  const renderProductDetailsStep = () => {

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Step 3: Product Details</h2>
          <p className="text-muted-foreground">Review and customize the AI-generated product information</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Image Preview */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Product Image</Label>
            <div className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/50">
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
                  <Upload className="mx-auto size-12 mb-2" />
                  <p className="text-sm">No image uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name <span className="text-red-500">*</span></Label>
                <Input
                  id="product-name"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Handwoven Silk Saree"
                  className={!productForm.name ? "border-red-300" : ""}
                />
                {!productForm.name && (
                  <p className="text-xs text-red-600">Product name is required</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-price">Price (₹) <span className="text-red-500">*</span> {pricingApproved && <span className="text-green-600 text-xs">✓ Auto-filled from Fair Price Engine</span>}</Label>
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
              <Label htmlFor="product-category">Category <span className="text-red-500">*</span></Label>
              <Select
                value={productForm.category}
                onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className={!productForm.category ? "border-red-300" : ""}>
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
              <Label htmlFor="product-description">Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="product-description"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your product..."
                className={`min-h-[100px] ${!productForm.description ? "border-red-300" : ""}`}
              />
              {!productForm.description && (
                <p className="text-xs text-red-600">Description is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Materials</Label>
              <Input
                value={productForm.materials.join(', ')}
                onChange={(e) => setProductForm(prev => ({
                  ...prev,
                  materials: e.target.value.split(',').map(m => m.trim()).filter(m => m)
                }))}
                placeholder="e.g., Silk, Cotton, Gold thread"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={productForm.tags.join(', ')}
                onChange={(e) => setProductForm(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                }))}
                placeholder="e.g., handmade, traditional, cultural"
              />
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
  const renderPricingEngineStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 4: Fair Price Engine</h2>
        <p className="text-muted-foreground">Tell us about your effort and costs for realistic pricing</p>
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
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time-spent">⏰ Time Spent (hours)</Label>
                  <Input
                    id="time-spent"
                    type="number"
                    placeholder="e.g., 24"
                    value={artisanInputs.timeSpent}
                    onChange={(e) => setArtisanInputs(prev => ({ ...prev, timeSpent: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Total hours you spent making this product</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material-costs">🧵 Material Costs (₹)</Label>
                  <Input
                    id="material-costs"
                    type="number"
                    placeholder="e.g., 500"
                    value={artisanInputs.materialCosts}
                    onChange={(e) => setArtisanInputs(prev => ({ ...prev, materialCosts: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Cost of cloth, thread, dyes, etc.</p>
                </div>
              </div>


              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="other-costs">🔧 Other Costs (₹)</Label>
                  <Input
                    id="other-costs"
                    type="number"
                    placeholder="e.g., 100"
                    value={artisanInputs.otherCosts}
                    onChange={(e) => setArtisanInputs(prev => ({ ...prev, otherCosts: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Tools, transportation, packaging</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected-profit">💰 Desired Profit Margin (%)</Label>
                  <Input
                    id="expected-profit"
                    type="number"
                    placeholder="e.g., 30"
                    value={artisanInputs.expectedProfit}
                    onChange={(e) => setArtisanInputs(prev => ({ ...prev, expectedProfit: e.target.value }))}
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
          <div className="grid md:grid-cols-3 gap-6">
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

  // Step 1: Image Upload
  const renderImageUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 1: Upload Product Image</h2>
        <p className="text-muted-foreground">Upload or capture a photo of your handmade product</p>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {/* Image Preview with Slider */}
            <div className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/50">
              {!imageFile ? (
                <div className="text-center text-muted-foreground p-4">
                  <Upload className="mx-auto size-12 mb-2" />
                  <p className="text-sm">Upload or capture product image</p>
                </div>
              ) : !originalImage ? (
                <div className="text-center text-muted-foreground p-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm">Processing image...</p>
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 h-20"
                variant="outline"
              >
                <Upload className="size-6" />
                <span className="text-xs">Gallery</span>
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          Smart Product Creator
        </CardTitle>
        <CardDescription>
          Create compelling product stories with AI-enhanced images and authentic voice narration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            onClick={goToPreviousStep}
            disabled={currentStep === 'image-upload'}
            variant="outline"
          >
            ← Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {['image-upload', 'audio-recording', 'pricing-engine', 'product-details'].indexOf(currentStep) + 1} of 4
          </div>

          {currentStep === 'product-details' ? (
            <Button
              onClick={handleProductSubmit}
              disabled={!canProceedToNext() || uploadingProduct}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploadingProduct ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Product...
                </>
              ) : (
                <>
                  🎉 Create Product
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNextStep}
              disabled={!canProceedToNext()}
            >
              Next →
            </Button>
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
            {showDebug ? "Hide Debug Info" : "Show Debug Info"}
          </Button>

          {showDebug && (
            <div className="mt-2 p-3  border rounded text-xs font-mono">
              <div className="font-bold mb-2">🎯 Recording Debug Info:</div>
              <div>Browser Support: {browserSupported ? "✅" : "❌"}</div>
              <div>MediaDevices API: {typeof navigator.mediaDevices !== 'undefined' ? "✅" : "❌"}</div>
              <div>getUserMedia: {typeof navigator.mediaDevices?.getUserMedia === 'function' ? "✅" : "❌"}</div>
              <div>MediaRecorder: {typeof MediaRecorder !== 'undefined' ? "✅" : "❌"}</div>
              <div>Recording State: {isRecording ? (isPaused ? "⏸️ PAUSED" : "🎙️ ACTIVE") : "⏹️ INACTIVE"}</div>
              <div>Recording Time: {recordingTime}s</div>
              <div>Pause State: {isPaused ? "✅ PAUSED" : "❌ ACTIVE"}</div>
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
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              {!cameraPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Take Product Photo</h3>
                    <Button
                      onClick={closeCamera}
                      variant="ghost"
                      size="sm"
                    >
                      ✕
                    </Button>
                  </div>

                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
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
                      className="rounded-full w-16 h-16 bg-white border-4 border-gray-300 hover:bg-gray-100"
                    >
                      <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                    </Button>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Position your product and tap the circle to capture
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Preview Photo</h3>

                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={cameraPreview}
                      alt="Camera preview"
                      layout="fill"
                      objectFit="contain"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={finalizePhoto}
                      className="flex-1"
                      size="lg"
                    >
                      ✅ Finalize Photo
                    </Button>
                    <Button
                      onClick={retakePhoto}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      🔄 Retake
                    </Button>
                  </div>

                  <Button
                    onClick={closeCamera}
                    variant="ghost"
                    className="w-full"
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
         