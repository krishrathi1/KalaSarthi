"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, Upload, Sparkles, Mic, MicOff, Play, Pause } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export function SmartProductCreator() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [transcription, setTranscription] = useState<string>("");
  const [enhancedTranscription, setEnhancedTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en', 'es', 'fr']);
  const [isTranslating, setIsTranslating] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('artisan_female');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonSlider, setComparisonSlider] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { toast } = useToast();

  const addDebugLog = (message: string) => {
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Check browser compatibility and setup audio event listeners on component mount
  useEffect(() => {
    const checkBrowserSupport = () => {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasFileReader = typeof FileReader !== 'undefined';
      const hasFormData = typeof FormData !== 'undefined';

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

          // Start speech-to-text conversion
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
              title: "Transcription completed with AI enhancement",
              description: `Converted ${result.duration}s of audio to refined text.`,
            });
          } else {
            throw new Error(result.error || "Transcription failed");
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

    setProcessingStep("Enhancing image with Nano Banana AI...");
    setProgress(10);

    try {
      // Step 1: Image enhancement (already done during upload)
      setProcessingStep("Processing audio content...");
      setProgress(30);

      // Step 2: Speech-to-text (already done during recording)
      setProcessingStep("Generating translations...");
      setProgress(50);

      // Step 3: Translation (already done if requested)
      setProcessingStep("Creating cultural storytelling...");
      setProgress(70);

      // Step 4: Store in vector database
      setProcessingStep("Storing in vector database...");
      setProgress(90);

      // Prepare product data for storage
      const productData = {
        productId: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        artisanId: `artisan_demo_${Date.now()}`, // In production, get from user session
        imageData: imagePreview,
        audioData: audioBlob ? await blobToBase64(audioBlob) : null,
        transcription: transcription,
        translations: translations,
        metadata: {
          title: "Handcrafted Product", // Could be extracted from transcription
          description: transcription,
          price: 2500, // Could be calculated based on category
          category: "handicraft", // Could be detected from image
          tags: ["handmade", "traditional", "cultural"],
          culturalSignificance: "Preserves ancient craftsmanship techniques",
          artisanName: "Demo Artisan",
          region: "India"
        }
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
      setProcessingStep("Generating marketplace listings...");
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
        title: "Product created successfully! 🎉",
        description: `Generated ${listingResult.summary.totalListings} marketplace listings across ${listingResult.summary.platforms.join(', ')}`,
      });

      // Reset form for next product
      setImagePreview(null);
      setImageFile(null);
      setAudioBlob(null);
      setTranscription("");
      setTranslations({});

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

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

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

        {/* Image Upload Section */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Step 1: Upload Product Image</Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
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
                    <p className="text-sm">Upload or capture product image</p>
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

              {/* Alternative upload option for when camera fails */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Or drag and drop an image here
                </p>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-primary/50');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary/50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary/50');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      handleFileSelect(files[0]);
                    }
                  }}
                >
                  <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop image here or click to browse
                  </p>
                </div>
              </div>

              {/* AI Image Analysis Button */}
              {imageFile && (
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzingImage}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  size="sm"
                >
                  {isAnalyzingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      🤖 AI Analyze Image
                    </>
                  )}
                </Button>
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

        {/* AI Image Analysis Results */}
        {imageAnalysis && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              🔍 AI Image Analysis Results
            </Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Product Type:</span> {imageAnalysis.productType}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Category:</span> {imageAnalysis.category}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Materials:</span> {imageAnalysis.materials?.join(', ')}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Estimated Value:</span> {imageAnalysis.estimatedValue}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Colors:</span> {imageAnalysis.colors?.join(', ')}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Patterns:</span> {imageAnalysis.patterns?.join(', ')}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Craftsmanship:</span> {imageAnalysis.craftsmanship?.join(', ')}
                </div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-white/50 rounded text-sm">
              <span className="font-medium">AI Description:</span> {imageAnalysis.description}
            </div>
          </div>
        )}

        {/* Image Comparison Section */}
        {showComparison && originalImage && enhancedImage && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Before vs After - Nano Banana Enhancement
              </Label>
              <Button
                onClick={() => setShowComparison(false)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>💡 How to use:</strong> Drag the slider left/right to compare original (left) vs enhanced (right) images.
              The blue line shows the split point. Choose which version you prefer!
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="relative aspect-video w-full max-w-2xl mx-auto bg-black rounded-lg overflow-hidden">
                {/* Original Image (Background) */}
                <Image
                  src={originalImage}
                  alt="Original image"
                  layout="fill"
                  objectFit="contain"
                  className="absolute inset-0"
                />

                {/* Enhanced Image (Foreground with clip-path) */}
                <div
                  className="absolute inset-0"
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

                {/* Slider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                  style={{ left: `${comparisonSlider}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center">
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  </div>
                </div>

                {/* Slider Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={comparisonSlider}
                  onChange={(e) => setComparisonSlider(Number(e.target.value))}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onTouchStart={(e) => {
                    setIsDragging(true);
                    // Handle touch for mobile
                    const touch = e.touches[0];
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percentage = ((touch.clientX - rect.left) / rect.width) * 100;
                    setComparisonSlider(Math.max(0, Math.min(100, percentage)));
                  }}
                  onTouchMove={(e) => {
                    if (isDragging) {
                      const touch = e.touches[0];
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percentage = ((touch.clientX - rect.left) / rect.width) * 100;
                      setComparisonSlider(Math.max(0, Math.min(100, percentage)));
                    }
                  }}
                  onTouchEnd={() => setIsDragging(false)}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider touch-none"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${comparisonSlider}%, #ffffff20 ${comparisonSlider}%, #ffffff20 100%)`
                  }}
                />
              </div>

              {/* Labels */}
              <div className="flex justify-between items-center mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="font-medium">Original</span>
                </div>

                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    Drag slider to compare
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {comparisonSlider}%
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Enhanced</span>
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
              </div>

              {/* Enhancement Details */}
              <div className="mt-4 p-3 bg-white/50 rounded text-sm">
                <div className="font-medium mb-2 flex items-center gap-2">
                  🤖 Gemini AI Enhancements:
                </div>
                <div className="grid md:grid-cols-2 gap-2 text-xs">
                  <div>• 🎨 Professional styling analysis</div>
                  <div>• 🌈 Color authenticity preserved</div>
                  <div>• 📸 Marketplace-ready optimization</div>
                  <div>• ✨ Cultural pattern recognition</div>
                  <div>• 🔍 Product detail enhancement</div>
                  <div>• 📝 Commercial appeal boost</div>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  💡 Using Google's Gemini Vision API for intelligent image analysis and enhancement
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    setImagePreview(originalImage);
                    setShowComparison(false);
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
                    setShowComparison(false);
                    toast({
                      title: "Using enhanced image ✨",
                      description: "Nano Banana enhancement applied successfully!",
                    });
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Use Enhanced ✨
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="mt-3 text-xs text-muted-foreground text-center">
                Current view: {comparisonSlider < 50 ? 'More Original' : comparisonSlider > 50 ? 'More Enhanced' : 'Balanced View'}
              </div>
            </div>
          </div>
        )}

        {/* Voice Recording Section */}
        <div className="space-y-6">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Mic className="size-5 text-primary" />
            Step 2: Record Your Cultural Story
          </Label>

          {/* Prominent Recording Interface */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border-2 border-dashed border-primary/20">
            <div className="text-center space-y-4">
              <div className="relative">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  size="lg"
                  className={`w-24 h-24 rounded-full text-2xl font-bold transition-all duration-300 ${
                    isRecording
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

              {/* Pause/Resume Button */}
              {isRecording && (
                <div className="relative z-20 mt-4">
                  <Button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-white shadow-lg hover:bg-gray-50 border-2"
                  >
                    {isPaused ? (
                      <>
                        <Play className="size-4" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="size-4" />
                        Pause
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {isRecording ? "🎙️ Recording..." : "🎙️ Ready to Record"}
                </h3>
                <p className="text-muted-foreground">
                  {isRecording
                    ? "Tell us about your product's story, cultural significance, and what makes it special..."
                    : "Click the microphone to share your product's authentic story with the world"
                  }
                </p>

                {/* Recording Status & Timer */}
                {isRecording && (
                  <div className={`border rounded-lg p-3 text-center ${
                    isPaused
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`font-medium ${
                      isPaused ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {isPaused ? '⏸️ Recording Paused' : '🔴 Recording Active'}
                    </div>
                    <div className={`text-2xl font-bold mt-1 ${
                      isPaused ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isPaused ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {isPaused
                        ? 'Click resume to continue recording'
                        : 'Speak clearly - we\'re capturing your voice!'
                      }
                    </div>
                  </div>
                )}
              </div>

              {isRecording && (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
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
                    setTranslations({});
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

          {/* Processing Status */}
          {isTranscribing && (
            <div className="flex items-center gap-3 text-blue-600 bg-blue-50 p-3 rounded-lg">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Converting your voice to text...</span>
            </div>
          )}

          {/* Transcribed Story */}
          {transcription && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                📝 Your Story (Edit if needed)
              </Label>
              <Textarea
                id="transcription"
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Your product's cultural story..."
                className="min-h-[120px] text-base leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Your authentic voice makes the story special. Feel free to add more details about the cultural significance!
              </p>

              {/* Enhanced Transcription Comparison */}
              {enhancedTranscription && enhancedTranscription !== transcription && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    ✨ AI-Enhanced Version (Recommended)
                  </Label>
                  <div className="space-y-3">
                    <div className="p-3 bg-white/70 rounded text-sm">
                      <div className="font-medium text-green-700 mb-1">AI Enhanced:</div>
                      <p className="text-gray-800 leading-relaxed">{enhancedTranscription}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setTranscription(enhancedTranscription)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✅ Use Enhanced Version
                      </Button>
                      <Button
                        onClick={() => setEnhancedTranscription("")}
                        variant="outline"
                        size="sm"
                      >
                        Keep Original
                      </Button>
                    </div>
                    <p className="text-xs text-green-600">
                      🎯 AI enhancements: Fixed grammar, removed noise artifacts, added cultural context, optimized for marketplace appeal
                    </p>
                  </div>
                </div>
              )}

              {/* AI Voice Synthesis Section */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  🔊 AI Voice Synthesis
                </Label>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm bg-background"
                  >
                    <option value="artisan_female">Artisan Female Voice</option>
                    <option value="artisan_male">Artisan Male Voice</option>
                    <option value="storyteller">Professional Storyteller</option>
                    <option value="artisan_hindi_female">Indian Artisan (Hindi)</option>
                  </select>

                  <Button
                    onClick={generateAudioStory}
                    disabled={isGeneratingAudio}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isGeneratingAudio ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        🎵 Generate Voice
                      </>
                    )}
                  </Button>
                </div>

                {generatedAudio && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => {
                          const audio = new Audio(generatedAudio);
                          audio.play();
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Play className="size-4" />
                        Play AI Voice
                      </Button>
                      <span className="text-sm text-green-700">
                        ✅ AI voice narration generated successfully!
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      This realistic voice narration combines your story with AI enhancement for maximum emotional impact.
                    </p>
                  </div>
                )}
              </div>

              {/* Language Selection and Translation */}
              <div className="space-y-2 pt-4">
                <Label className="text-sm font-medium">🌍 Translate for Global Buyers</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'en', name: 'English' },
                    { code: 'es', name: 'Español' },
                    { code: 'fr', name: 'Français' },
                    { code: 'de', name: 'Deutsch' },
                    { code: 'zh', name: '中文' },
                    { code: 'ja', name: '日本語' },
                    { code: 'ar', name: 'العربية' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguages(prev =>
                          prev.includes(lang.code)
                            ? prev.filter(l => l !== lang.code)
                            : [...prev, lang.code]
                        );
                      }}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedLanguages.includes(lang.code)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted/80'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={translateStory}
                  disabled={isTranslating}
                  variant="outline"
                  size="sm"
                >
                  {isTranslating ? "Translating..." : "Translate Story"}
                </Button>
              </div>

              {/* Translation Results */}
              {Object.keys(translations).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">📚 Translated Stories</Label>
                  {Object.entries(translations).map(([lang, text]) => (
                    <div key={lang} className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1 uppercase">
                        {lang === 'en' ? 'English' :
                         lang === 'es' ? 'Spanish' :
                         lang === 'fr' ? 'French' :
                         lang === 'de' ? 'German' :
                         lang === 'zh' ? 'Chinese' :
                         lang === 'ja' ? 'Japanese' :
                         lang === 'ar' ? 'Arabic' : lang}
                      </div>
                      <p className="text-sm">{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Processing Progress */}
        {processingStep && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Processing...</Label>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{processingStep}</p>
          </div>
        )}

        {/* Process Button */}
        <Button
          onClick={processProduct}
          disabled={!imageFile || !audioBlob || processingStep !== ""}
          className="w-full"
          size="lg"
        >
          <Sparkles className="mr-2 size-4" />
          Create Smart Product
        </Button>

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
            <div className="mt-2 p-3 bg-gray-50 border rounded text-xs font-mono">
              <div className="font-bold mb-2">🎯 Recording Debug Info:</div>
              <div>Browser Support: {browserSupported ? "✅" : "❌"}</div>
              <div>MediaDevices API: {typeof navigator.mediaDevices !== 'undefined' ? "✅" : "❌"}</div>
              <div>getUserMedia: {typeof navigator.mediaDevices?.getUserMedia === 'function' ? "✅" : "❌"}</div>
              <div>MediaRecorder: {typeof MediaRecorder !== 'undefined' ? "✅" : "❌"}</div>
              <div>Recording State: {isRecording ? (isPaused ? "⏸️ PAUSED" : "🎙️ ACTIVE") : "⏹️ INACTIVE"}</div>
              <div>Recording Time: {recordingTime}s</div>
              <div>Pause State: {isPaused ? "✅ PAUSED" : "❌ ACTIVE"}</div>
              <div>Audio Blob: {audioBlob ? `${Math.round(audioBlob.size / 1024)} KB` : "None"}</div>
              <div>Transcription: {transcription ? "✅ Available" : "❌ None"}</div>
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