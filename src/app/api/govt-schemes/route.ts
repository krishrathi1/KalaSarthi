import { NextRequest, NextResponse } from 'next/server';
import { monitorGovtAPIs } from '@/ai/flows/govt-api-monitoring';
import { processSchemes } from '@/ai/flows/scheme-agent';
import { matchSchemesToProfile } from '@/ai/flows/profile-matching-agent';
import { translateSchemes } from '@/ai/flows/translation-agent';
import { sendNotifications } from '@/ai/flows/notification-agent';
import { autoRegisterForSchemes } from '@/ai/flows/auto-registration-agent';
import { extractRequirementsFromDocument } from '@/ai/flows/ocr-agent';
import { prepareDocuments } from '@/ai/flows/document-prep-agent';
import { trackApplicationStatus } from '@/ai/flows/status-tracking-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanProfile, targetLanguage = 'hi', notificationMethods = ['push'], lastChecked } = body;

    console.log('=== Government Schemes API Called ===');
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Step 1: Monitor government APIs for new schemes
    console.log('Step 1: Monitoring government APIs...');
    const { newSchemes } = await monitorGovtAPIs({ lastChecked });
    console.log('New schemes found:', newSchemes.length);

    if (newSchemes.length === 0) {
      return NextResponse.json({
        message: 'No new schemes found',
        schemes: [],
      });
    }

    // Step 2: Process and enrich schemes
    console.log('Step 2: Processing schemes...');
    const { processedSchemes } = await processSchemes({ newSchemes });
    console.log('Processed schemes:', processedSchemes.length);

    // Step 3: Match schemes to artisan profile
    console.log('Step 3: Matching schemes to profile...');
    const { matchedSchemes } = await matchSchemesToProfile({
      artisanProfile,
      processedSchemes,
    });
    console.log('Matched schemes:', matchedSchemes.length);

    if (matchedSchemes.length === 0) {
      console.log('No matching schemes found for profile');
      return NextResponse.json({
        message: 'No matching schemes found for this profile',
        schemes: [],
      });
    }

    // Step 4: Translate schemes to user's language
    console.log('Step 4: Translating schemes...');
    const { translatedSchemes } = await translateSchemes({
      matchedSchemes,
      targetLanguage,
    });
    console.log('Translated schemes:', translatedSchemes.length);

    // Step 5: Send notifications
    console.log('Step 5: Sending notifications...');
    const { notifications } = await sendNotifications({
      translatedSchemes,
      artisanId: artisanProfile.id,
      notificationMethods,
      contactInfo: artisanProfile.contactInfo,
    });
    console.log('Notifications sent:', notifications.length);

    // Step 6: Auto-register for selected schemes (if requested)
    let registrations = null;
    if (body.autoRegister && body.selectedSchemes) {
      console.log('Step 6: Auto-registering for schemes...');
      console.log('Selected schemes for registration:', body.selectedSchemes);
      const { registrations: regResults } = await autoRegisterForSchemes({
        artisanProfile,
        selectedSchemes: translatedSchemes.filter(scheme =>
          body.selectedSchemes.includes(scheme.id)
        ),
      });
      registrations = regResults;
      console.log('Registration results:', registrations);
    }

    return NextResponse.json({
      message: 'Government scheme workflow completed successfully',
      schemes: translatedSchemes,
      notifications,
      registrations,
      totalSchemes: translatedSchemes.length,
    });

  } catch (error) {
    console.error('Error in govt-schemes workflow:', error);
    return NextResponse.json(
      { error: 'Failed to process government schemes workflow' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Get available schemes without full workflow
  const schemes = [
    {
      id: "mudra",
      title: "Pradhan Mantri MUDRA Yojana (PMMY)",
      description: "Provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises.",
      eligibility: "Any Indian Citizen with a business plan for non-farm sector.",
      link: "https://www.mudra.org.in/",
      category: "mudra"
    },
    {
      id: "sfurti",
      title: "Scheme of Fund for Regeneration of Traditional Industries (SFURTI)",
      description: "Organizes traditional industries and artisans into clusters.",
      eligibility: "Artisans, NGOs, and government institutions.",
      link: "https://sfurti.msme.gov.in/",
      category: "cluster"
    },
    {
      id: "ahvy",
      title: "Ambedkar Hastshilp Vikas Yojana (AHVY)",
      description: "Promotes Indian handicrafts by developing artisan clusters.",
      eligibility: "Handicraft artisans in self-help groups or cooperatives.",
      link: "https://handicrafts.nic.in/",
      category: "handicraft"
    }
  ];

  return NextResponse.json({ schemes });
}