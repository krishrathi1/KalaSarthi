'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Volume2, SkipForward, Play, Pause } from 'lucide-react';
import { VoiceControl } from '@/components/ui/VoiceControl';
import { ConversationalVoiceProcessor } from '@/lib/service/ConversationalVoiceProcessor';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  voicePrompt: string;
  action: string;
  completed: boolean;
}

export function VoiceOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const conversationalProcessor = ConversationalVoiceProcessor.getInstance();
  const router = useRouter();
  const { toast } = useToast();

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to KalaBandhu! 🎨',
      description: 'Your AI-powered platform for artisans',
      voicePrompt: 'Namaste! Welcome to KalaBandhu. I am your voice assistant. Let me guide you through the platform. Say "continue" or "next" to proceed.',
      action: 'continue',
      completed: false
    },
    {
      id: 'voice-intro',
      title: 'Voice Commands 💬',
      description: 'You can control everything with your voice',
      voicePrompt: 'You can use voice commands to navigate, create products, and manage your business. Try saying "go to marketplace" or "create product". Say "next" to continue.',
      action: 'next',
      completed: false
    },
    {
      id: 'marketplace-tour',
      title: 'Explore Marketplace 🛍️',
      description: 'Discover products from fellow artisans',
      voicePrompt: 'The marketplace lets you browse and buy unique handcrafted products. Say "take me to marketplace" to explore.',
      action: 'marketplace',
      completed: false
    },
    {
      id: 'product-creation',
      title: 'Create Your Products 🎨',
      description: 'Use AI to create stunning product listings',
      voicePrompt: 'Create beautiful product listings with AI help. Just take a photo and describe your product. Say "create product" to try it.',
      action: 'create',
      completed: false
    },
    {
      id: 'profile-setup',
      title: 'Complete Your Profile 👤',
      description: 'Set up your artisan profile',
      voicePrompt: 'Complete your profile to showcase your craftsmanship. Say "go to profile" to set it up.',
      action: 'profile',
      completed: false
    },
    {
      id: 'finance-tools',
      title: 'Financial Tools 💰',
      description: 'Track sales and get financial insights',
      voicePrompt: 'Use our finance tools to track sales, analyze trends, and get insights. Say "show finance" to explore.',
      action: 'finance',
      completed: false
    },
    {
      id: 'support-features',
      title: 'Support & Resources 🆘',
      description: 'Government schemes and support',
      voicePrompt: 'Access government schemes, training, and support for your business. Say "government schemes" to learn more.',
      action: 'schemes',
      completed: false
    },
    {
      id: 'final-tips',
      title: 'Final Tips 💡',
      description: 'Make the most of KalaBandhu',
      voicePrompt: 'Remember, you can always say "help" for assistance. Try voice commands like "search for sarees" or "show my products". Enjoy using KalaBandhu!',
      action: 'finish',
      completed: false
    }
  ];

  const startOnboarding = () => {
    setIsActive(true);
    setCurrentStep(0);
    speakCurrentStep();
  };

  const speakCurrentStep = async () => {
    const step = onboardingSteps[currentStep];
    if (!step) return;

    setIsPlaying(true);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: step.voicePrompt,
          language: 'hi',
          voiceType: 'artisan_female',
          speed: 0.9
        })
      });

      const result = await response.json();
      if (result.success && result.audioData) {
        const audio = new Audio(result.audioData);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      }
    } catch (error) {
      console.error('Voice playback failed:', error);
      setIsPlaying(false);
    }
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setTimeout(() => speakCurrentStep(), 500);
    } else {
      finishOnboarding();
    }
  };

  const handleVoiceCommand = async (command: string) => {
    setIsListening(true);

    try {
      const textBuffer = new ArrayBuffer(command.length * 2);
      const result = await conversationalProcessor.processVoiceCommand(textBuffer, 'hi');

      const lowerCommand = command.toLowerCase();

      // Handle onboarding-specific commands
      if (lowerCommand.includes('continue') || lowerCommand.includes('next') || lowerCommand.includes('aage')) {
        nextStep();
      } else if (lowerCommand.includes('marketplace') || lowerCommand.includes('market')) {
        router.push('/marketplace');
        toast({ title: "🏪 Voice Navigation", description: "Taking you to marketplace" });
      } else if (lowerCommand.includes('create') || lowerCommand.includes('product')) {
        router.push('/smart-product-creator');
        toast({ title: "🎨 Voice Navigation", description: "Opening product creator" });
      } else if (lowerCommand.includes('profile')) {
        router.push('/profile');
        toast({ title: "👤 Voice Navigation", description: "Opening your profile" });
      } else if (lowerCommand.includes('finance') || lowerCommand.includes('money')) {
        router.push('/finance/dashboard');
        toast({ title: "💰 Voice Navigation", description: "Opening finance dashboard" });
      } else if (lowerCommand.includes('schemes') || lowerCommand.includes('government')) {
        router.push('/yojana-mitra');
        toast({ title: "🏛️ Voice Navigation", description: "Opening government schemes" });
      } else if (lowerCommand.includes('finish') || lowerCommand.includes('complete') || lowerCommand.includes('done')) {
        finishOnboarding();
      } else {
        // Handle general navigation
        handleGeneralNavigation(command);
      }

    } catch (error) {
      console.error('Voice command failed:', error);
    } finally {
      setIsListening(false);
    }
  };

  const handleGeneralNavigation = (command: string) => {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('home') || lowerCommand.includes('dashboard')) {
      router.push('/');
    } else if (lowerCommand.includes('help')) {
      speakCurrentStep(); // Replay current step
    }
  };

  const finishOnboarding = () => {
    setIsActive(false);
    toast({
      title: "🎉 Onboarding Complete!",
      description: "You're all set to explore KalaBandhu with voice commands!",
    });

    // Mark onboarding as completed in localStorage
    localStorage.setItem('kalaBandhu_onboarding_completed', 'true');
  };

  const skipOnboarding = () => {
    finishOnboarding();
  };

  if (!isActive) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice-Guided Tour
          </CardTitle>
          <CardDescription>
            Let me guide you through KalaBandhu with voice assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startOnboarding} className="w-full">
            <Play className="h-4 w-4 mr-2" />
            Start Voice Tour
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isPlaying ? <Volume2 className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
              Voice Onboarding
            </CardTitle>
            <CardDescription>
              Step {currentStep + 1} of {onboardingSteps.length}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <VoiceControl variant="inline" showSettings={false} />
            <Button variant="outline" size="sm" onClick={skipOnboarding}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Progress value={progress} className="w-full" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">{currentStepData.title}</h3>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm leading-relaxed">
            {currentStepData.voicePrompt}
          </p>
        </div>

        {isListening && (
          <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Listening for your response...</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={nextStep}
            className="flex-1"
            disabled={isPlaying}
          >
            {currentStep === onboardingSteps.length - 1 ? 'Finish Tour' : 'Continue'}
            <SkipForward className="h-4 w-4 ml-2" />
          </Button>

          <Button
            variant="outline"
            onClick={() => speakCurrentStep()}
            disabled={isPlaying}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          💡 Tip: Try voice commands like "next", "marketplace", "create product", or "help"
        </div>
      </CardContent>
    </Card>
  );
}