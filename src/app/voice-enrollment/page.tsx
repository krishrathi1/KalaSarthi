'use client';

import { VoiceSchemeEnrollment } from '@/components/voice-scheme-enrollment';

export default function VoiceEnrollmentPage() {
  // Mock artisan profile - in real app, this would come from user authentication/context
  const mockArtisanProfile = {
    id: "artisan_123",
    name: "Rajesh Kumar",
    skills: ["pottery", "ceramics", "handicraft"],
    location: "Jaipur, Rajasthan",
    income: "₹50,000-1,00,000",
    businessType: "Handicraft manufacturing",
    experience: "5 years",
    contactInfo: {
      phone: "+91-9876543210",
      email: "rajesh@example.com",
      address: "123 Artisan Street, Jaipur"
    },
    documents: {
      aadhaar: "XXXX-XXXX-1234",
      pan: "ABCDE1234F",
      bankAccount: "1234567890"
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Voice Scheme Enrollment Guide</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Speak naturally to get step-by-step guidance for government scheme enrollment. Our AI assistant will explain
          scheme benefits in your regional language and provide clear, actionable instructions you can follow manually.
        </p>
      </div>

      <VoiceSchemeEnrollment artisanProfile={mockArtisanProfile} />

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>💡 Tip: Click the microphone button and speak clearly. The assistant will respond both visually and audibly.</p>
      </div>
    </div>
  );
}