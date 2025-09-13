'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConversationMessage {
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

interface VoiceEnrollmentProps {
  artisanProfile?: {
    id: string;
    name: string;
    skills: string[];
    location: string;
    income: string;
    businessType: string;
    experience: string;
    contactInfo: {
      phone: string;
      email: string;
      address: string;
    };
    documents: {
      aadhaar?: string;
      pan?: string;
      bankAccount?: string;
    };
  };
}

export function VoiceSchemeEnrollment({ artisanProfile }: VoiceEnrollmentProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<'greeting' | 'scheme_info' | 'eligibility_check' | 'document_collection' | 'confirmation' | 'registration' | 'complete'>('greeting');
  const [suggestedSchemes, setSuggestedSchemes] = useState<string[]>([]);
  const [collectedData, setCollectedData] = useState({
    interestedSchemes: [] as string[],
    missingDocuments: [] as string[],
    confirmationGiven: false,
  });
  const [textInput, setTextInput] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Detect Windows and prefer text input
    const isWindows = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win');
    if (isWindows) {
      console.log('Windows detected - preferring text input for better compatibility');
      setUseTextInput(true);
    }

    // Check browser compatibility
    const checkCompatibility = () => {
      if (typeof window === 'undefined') return false;
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        handleAssistantResponse("Your browser doesn't support speech recognition. Please try using Chrome, Edge, or Safari for the best experience.", 'error');
        return false;
      }
      if (!('speechSynthesis' in window)) {
        handleAssistantResponse("Your browser doesn't support text-to-speech. Voice responses won't be available.", 'error');
      }
      return true;
    };

    if (!checkCompatibility()) return;

    // Initialize speech recognition with error handling
    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Indian English

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleUserMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);

        // For Windows users, immediately switch to text input on any error
        if (isWindows) {
          setUseTextInput(true);
          handleAssistantResponse('🔄 Windows detected - switching to text input for better compatibility. The text input works perfectly!', 'greeting');
          return;
        }

        // Provide user-friendly error messages with Windows-specific solutions
        let errorMessage = '';
        let troubleshootingSteps = '';

        switch (event.error) {
          case 'network':
            errorMessage = 'Network connection issue with speech recognition service.';
            troubleshootingSteps = `
🔧 Windows Troubleshooting Steps:
1. **Check Windows Firewall:**
   - Open Windows Security → Firewall & network protection
   - Click "Allow an app through firewall"
   - Allow speech recognition services

2. **Disable Antivirus Temporarily:**
   - Some antivirus blocks speech recognition
   - Temporarily disable and test

3. **Use HTTPS:**
   - Speech recognition works better with HTTPS
   - Try accessing with https://localhost:9002

4. **Check Windows Speech Services:**
   - Search for "Services" in Windows
   - Find "Windows Speech Recognition" service
   - Make sure it's running

5. **Browser Settings:**
   - Use Google Chrome or Microsoft Edge
   - Go to Settings → Privacy → Microphone → Allow

💡 Alternative: Use the text input option - it works perfectly!`;
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied.';
            troubleshootingSteps = `
🎤 Fix microphone permissions:
1. Click the lock/camera icon in address bar (left of URL)
2. Set microphone to "Allow"
3. Or go to browser settings → Privacy → Microphone → Allow
4. Refresh the page and try again

🔄 If still not working, try:
- Restarting your browser
- Using a different browser (Chrome/Edge)
- Checking Windows privacy settings`;
            break;
          case 'no-speech':
            errorMessage = 'No speech detected.';
            troubleshootingSteps = `
🎙️ Microphone troubleshooting:
1. Check if microphone is connected and working
2. Go to Windows Settings → Sound → Test microphone
3. Make sure correct microphone is selected as default
4. Try speaking louder and closer to microphone
5. Test microphone in Windows Sound settings`;
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was cancelled.';
            troubleshootingSteps = 'Try starting the voice recognition again by clicking "Start Speaking".';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found.';
            troubleshootingSteps = `
🎧 Microphone setup:
1. Check if microphone/headset is properly connected
2. Go to Windows Settings → Sound → Input devices
3. Select your microphone as default input device
4. Test microphone in Sound settings
5. Try using a different microphone or USB headset`;
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed.';
            troubleshootingSteps = `
🌐 Browser compatibility:
1. **Use Google Chrome or Microsoft Edge** (Safari doesn't work well on Windows)
2. **Enable HTTPS:** Speech recognition requires secure connection
3. **Disable browser extensions** temporarily
4. **Check browser settings** for speech recognition permissions
5. **Try incognito/private mode** to rule out extension conflicts

💡 Pro tip: The text input works perfectly as an alternative!`;
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
            troubleshootingSteps = `
🔧 General troubleshooting:
1. Try refreshing the page
2. Use Google Chrome browser
3. Check your internet connection
4. Try the text input option instead

If problems persist, the text input feature works perfectly!`;
        }

        const fullMessage = `${errorMessage}\n\n${troubleshootingSteps}`;
        handleAssistantResponse(fullMessage, currentStep);

        // Auto-switch to text input for Windows users with network errors
        if (event.error === 'network') {
          setTimeout(() => {
            setUseTextInput(true);
            handleAssistantResponse('🔄 I\'ve switched to text input mode for you. The text input works perfectly and you can type your questions in Hindi or English!', currentStep);
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      // On initialization error, immediately switch to text input
      setUseTextInput(true);
      handleAssistantResponse("Voice recognition initialization failed. I've switched to text input mode for you. The text input works perfectly!", 'greeting');
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Start with greeting
    if (conversation.length === 0) {
      handleAssistantResponse("Hello! I'm here to help you enroll in government schemes for artisans. Would you like me to tell you about available schemes that might benefit your business?", 'greeting');
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speak = (text: string) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN'; // Indian English
      utterance.rate = 0.9; // Slightly slower for clarity
      synthRef.current.speak(utterance);
    }
  };

  const handleUserMessage = async (message: string) => {
    const userMessage: ConversationMessage = {
      role: 'user',
      message,
      timestamp: new Date().toISOString(),
    };

    setConversation(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/voice-enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: message,
          conversationHistory: conversation,
          artisanProfile,
          currentStep,
        }),
      });

      if (!response.ok) {
        throw new Error('Voice enrollment API failed');
      }

      const result = await response.json();

      // Update state with response
      setCurrentStep(result.nextStep);
      setSuggestedSchemes(result.suggestedSchemes || []);
      setCollectedData(result.collectedData || collectedData);

      // Add assistant response to conversation
      handleAssistantResponse(result.response, result.nextStep);

      // Speak the response (only if not using text input)
      if (!useTextInput) {
        speak(result.response);
      }

      // Provide guidance instead of automation
      if (result.shouldTriggerAutomation && result.collectedData?.interestedSchemes) {
        const scheme = result.collectedData.interestedSchemes[0];
        provideEnrollmentGuidance(scheme);
      }

    } catch (error) {
      console.error('Voice enrollment error:', error);
      handleAssistantResponse("I'm sorry, I encountered an error. Please try again.", currentStep);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleUserMessage(textInput.trim());
      setTextInput('');
    }
  };

  const handleAssistantResponse = (message: string, nextStep: string) => {
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      message,
      timestamp: new Date().toISOString(),
    };

    setConversation(prev => [...prev, assistantMessage]);
    setCurrentStep(nextStep as any);
  };

  const provideEnrollmentGuidance = (scheme: string) => {
    // Instead of automation, provide detailed guidance
    const guidance = getSchemeGuidance(scheme);
    handleAssistantResponse(
      `Perfect! मैं आपको ${scheme} scheme में enrollment के लिए step-by-step guide देता हूं।\n\n${guidance}\n\nक्या आप ये steps follow करना चाहेंगे?`,
      'step_by_step_guide'
    );
  };

  const getSchemeGuidance = (scheme: string): string => {
    const guidance: { [key: string]: string } = {
      'MUDRA': `MUDRA Loan के लिए ये steps follow करें:

1. mudra.org.in पर जाएं
2. "Apply for Loan" पर click करें
3. अपना Aadhaar number enter करें
4. Business details भरें:
   - Business type
   - Monthly income
   - Loan amount needed
5. Documents upload करें:
   - Aadhaar card
   - PAN card
   - Bank statement (last 6 months)
   - Business plan (if any)
6. Form submit करें और confirmation number note करें

Helpline: 1800-180-1111
Expected time: 7-10 days`,

      'PMEGP': `PMEGP के लिए ये steps follow करें:

1. kviconline.gov.in पर जाएं
2. "PMEGP Login" पर click करें
3. New registration करें
4. Project details भरें:
   - Project cost (₹5-25 lakh)
   - Employment generation
   - Business type
5. Personal details भरें:
   - Age proof
   - Education qualification
   - Bank details
6. Documents upload करें:
   - Aadhaar card
   - PAN card
   - Project report
   - Caste certificate (if applicable)

Helpline: 1800-180-6763
Expected time: 30-45 days`,

      'Skill India': `Skill India के लिए ये steps follow करें:

1. skillindia.gov.in पर जाएं
2. "Register" पर click करें
3. अपना mobile number और email enter करें
4. OTP verify करें
5. Profile complete करें:
   - Personal details
   - Education background
   - Skill interests
6. Course select करें
7. Training center choose करें

Helpline: 1800-123-9626
Training is FREE!`
    };

    return guidance[scheme] || 'इस scheme के लिए कृपया हमारे customer care से contact करें।';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="size-5" />
          Voice Scheme Enrollment
        </CardTitle>
        <CardDescription>
          Speak naturally to get step-by-step guidance for government scheme enrollment. I'll explain benefits and provide clear instructions in your regional language.
        </CardDescription>

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <h4 className="font-semibold mb-2">💡 How to use:</h4>
          <ul className="space-y-1">
            <li>• <strong>Voice:</strong> Click "🎤 Voice Input" and allow microphone permission</li>
            <li>• <strong>Text:</strong> Click "✍️ Text Input" for typing your questions</li>
            <li>• <strong>Language:</strong> Speak in Hindi or English - I understand both!</li>
            <li>• <strong>Examples:</strong> "मैं artisan हूं, कौन सी schemes मिल सकती हैं?" or "Tell me about MUDRA loan"</li>
          </ul>

          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              <strong>💻 Windows Users:</strong> If voice doesn't work, use text input - it works perfectly!
              Voice issues are usually due to Windows Firewall or browser settings.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input Method Toggle */}
        <div className="flex justify-center gap-4 mb-4">
          <Button
            onClick={() => setUseTextInput(false)}
            variant={!useTextInput ? "default" : "outline"}
            size="sm"
          >
            🎤 Voice Input
          </Button>
          <Button
            onClick={() => setUseTextInput(true)}
            variant={useTextInput ? "default" : "outline"}
            size="sm"
          >
            ✍️ Text Input
          </Button>
        </div>

        {/* Voice Controls */}
        {!useTextInput && (
          <div className="flex justify-center gap-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              variant={isListening ? "destructive" : "default"}
              size="lg"
              className="flex items-center gap-2"
            >
              {isListening ? (
                <>
                  <MicOff className="size-5" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="size-5" />
                  Start Speaking
                </>
              )}
            </Button>

            <Button
              onClick={() => speak(conversation[conversation.length - 1]?.message || "")}
              disabled={conversation.length === 0}
              variant="outline"
              size="lg"
            >
              <Volume2 className="size-5 mr-2" />
              Repeat Last Message
            </Button>
          </div>
        )}

        {/* Text Input */}
        {useTextInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Type your message here..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <Button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textInput.trim()}
              size="lg"
            >
              Send
            </Button>
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex justify-center gap-2">
          <Badge variant={isListening ? "default" : "secondary"}>
            {isListening ? "🎤 Listening" : "🔇 Not Listening"}
          </Badge>
          <Badge variant={isProcessing ? "default" : "secondary"}>
            {isProcessing ? "⚡ Processing" : "✅ Ready"}
          </Badge>
          <Badge variant="outline">
            Step: {currentStep.replace('_', ' ')}
          </Badge>
        </div>

        {/* Suggested Schemes */}
        {suggestedSchemes.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Suggested Schemes:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedSchemes.map((scheme, index) => (
                <Badge key={index} variant="secondary">
                  {scheme}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Conversation History */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {conversation.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-100 ml-8'
                  : 'bg-gray-100 mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm">{msg.message}</p>
            </div>
          ))}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="text-center text-sm text-gray-600">
            Processing your request...
          </div>
        )}
      </CardContent>
    </Card>
  );
}