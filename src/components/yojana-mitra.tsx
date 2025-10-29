
'use client';

import { ScrollText, Zap, CheckCircle, Clock, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const schemes = [
  {
    id: "mudra",
    title: "Pradhan Mantri MUDRA Yojana (PMMY)",
    description: "Provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises. Artisans can avail this for working capital and expansion.",
    eligibility: "Any Indian Citizen who has a business plan for a non-farm sector income generating activity such as manufacturing, processing, trading or service sector.",
    link: "https://www.mudra.org.in/",
    category: "mudra"
  },
  {
    id: "sfurti",
    title: "Scheme of Fund for Regeneration of Traditional Industries (SFURTI)",
    description: "Organizes traditional industries and artisans into clusters to make them competitive and provide support for long-term sustainability.",
    eligibility: "Artisans, NGOs, institutions of the Central and State Governments and semi-Government institutions, field functionaries of State and Central Govt., Panchayati Raj institutions (PRIs).",
    link: "https://sfurti.msme.gov.in/",
    category: "cluster"
  },
  {
    id: "ahvy",
    title: "Ambedkar Hastshilp Vikas Yojana (AHVY)",
    description: "Aims at promoting Indian handicrafts by developing artisans' clusters into professionally managed and self-reliant community enterprises.",
    eligibility: "Handicraft artisans who are members of a self-help group or a cooperative society.",
    link: "https://handicrafts.nic.in/",
    category: "handicraft"
  }
];

export function YojanaMitra() {
  const [autoRegistering, setAutoRegistering] = useState<string | null>(null);
  const [registeredSchemes, setRegisteredSchemes] = useState<Set<string>>(new Set());

  const handleAutoRegister = async (schemeId: string) => {
    setAutoRegistering(schemeId);

    try {
      // Mock artisan profile - in real app, this would come from user context
      const mockArtisanProfile = {
        id: "artisan_123",
        name: "Rajesh Kumar",
        skills: ["pottery", "ceramics"],
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
          pan: "ABCDE1234F"
        }
      };

      console.log('Starting auto-registration for scheme:', schemeId);

      // Call the government schemes API
      const response = await fetch('/api/govt-schemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artisanProfile: mockArtisanProfile,
          targetLanguage: 'hi',
          notificationMethods: ['push'],
          autoRegister: true,
          selectedSchemes: [schemeId],
          lastChecked: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Auto-registration result:', result);

      // Check if registration was successful
      if (result.registrations && result.registrations.some((reg: any) => reg.status === 'success')) {
        setRegisteredSchemes(prev => new Set([...prev, schemeId]));
        console.log('Registration successful for scheme:', schemeId);
      } else {
        console.error('Registration failed:', result.registrations);
        alert('Registration failed. Check console for details.');
      }

    } catch (error) {
      console.error('Error during auto-registration:', error);
      alert('Error during registration. Check console for details.');
    } finally {
      setAutoRegistering(null);
    }
  };

  return (
    <Card id="scheme-sahayak">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <ScrollText className="size-6 text-primary" />
          Yojana Mitra (Scheme Friend)
        </CardTitle>
        <CardDescription>
          Discover government schemes and benefits tailored for artisans with voice-guided enrollment assistance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {schemes.map((scheme, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="font-headline text-lg flex items-center justify-between">
                <span>{scheme.title}</span>
                {registeredSchemes.has(scheme.id) && (
                  <Badge variant="secondary" className="ml-2">
                    <CheckCircle className="size-3 mr-1" />
                    Registered
                  </Badge>
                )}
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm">{scheme.description}</p>
                <p className="text-sm"><strong className="font-semibold">Eligibility:</strong> {scheme.eligibility}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(scheme.link, '_blank')}
                  >
                    Learn More
                  </Button>
                  {!registeredSchemes.has(scheme.id) && (
                    <Button
                      size="sm"
                      onClick={() => window.open('/voice-enrollment', '_blank')}
                    >
                      <Phone className="size-3 mr-1" />
                      Voice Guide
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {registeredSchemes.size > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Registration Summary</h4>
            <p className="text-sm text-green-700">
              Successfully registered for {registeredSchemes.size} scheme(s).
              Status tracking and notifications are now active.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
