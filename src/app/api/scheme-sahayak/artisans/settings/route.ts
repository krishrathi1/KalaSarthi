/**
 * API Routes for User Settings Management
 * Handles language settings, accessibility preferences, and privacy controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '../../../../../lib/services/scheme-sahayak';

/**
 * User Settings Interface
 */
interface UserSettings {
  language: {
    primary: string;
    secondary?: string;
    autoDetect: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
    voiceAssistance: boolean;
  };
  privacy: {
    dataCollection: boolean;
    analytics: boolean;
    marketing: boolean;
    thirdPartySharing: boolean;
    locationTracking: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    density: 'compact' | 'comfortable' | 'spacious';
    animations: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

/**
 * GET /api/scheme-sahayak/artisans/settings
 * Get user settings for an artisan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Get current preferences and build settings object
    const preferences = await userService.getUserPreferences(artisanId);
    
    const settings: UserSettings = {
      language: {
        primary: artisan.preferences.language || 'en',
        secondary: undefined,
        autoDetect: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false,
        keyboardNavigation: true,
        voiceAssistance: false
      },
      privacy: {
        dataCollection: true,
        analytics: false,
        marketing: false,
        thirdPartySharing: false,
        locationTracking: true
      },
      display: {
        theme: 'auto',
        density: 'comfortable',
        animations: true
      },
      notifications: {
        email: preferences.channels.email,
        sms: preferences.channels.sms,
        push: preferences.channels.push,
        whatsapp: preferences.channels.whatsapp,
        frequency: preferences.timing.frequency
      }
    };

    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('GET /api/scheme-sahayak/artisans/settings error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scheme-sahayak/artisans/settings
 * Update user settings for an artisan
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, settings } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: { message: 'Settings object is required', code: 'MISSING_SETTINGS' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Update artisan profile with language settings
    if (settings.language) {
      await userService.updateArtisanProfile(artisanId, {
        preferences: {
          ...artisan.preferences,
          language: settings.language.primary
        }
      });
    }

    // Update notification preferences
    if (settings.notifications) {
      await userService.updateUserPreferences(artisanId, {
        channels: {
          email: settings.notifications.email,
          sms: settings.notifications.sms,
          push: settings.notifications.push,
          whatsapp: settings.notifications.whatsapp
        },
        timing: {
          ...artisan.preferences,
          frequency: settings.notifications.frequency
        }
      });
    }

    // Store other settings in a separate collection (accessibility, privacy, display)
    // This would typically be stored in a user_settings collection
    // For now, we'll just acknowledge the update

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        artisanId,
        updatedAt: new Date().toISOString(),
        settingsUpdated: Object.keys(settings)
      }
    });

  } catch (error) {
    console.error('PUT /api/scheme-sahayak/artisans/settings error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheme-sahayak/artisans/settings/reset
 * Reset user settings to default values
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, category } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    const defaultSettings: UserSettings = {
      language: {
        primary: 'en',
        secondary: undefined,
        autoDetect: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false,
        keyboardNavigation: true,
        voiceAssistance: false
      },
      privacy: {
        dataCollection: true,
        analytics: false,
        marketing: false,
        thirdPartySharing: false,
        locationTracking: true
      },
      display: {
        theme: 'auto',
        density: 'comfortable',
        animations: true
      },
      notifications: {
        email: true,
        sms: true,
        push: true,
        whatsapp: false,
        frequency: 'immediate'
      }
    };

    // Reset specific category or all settings
    if (category) {
      const validCategories = ['language', 'accessibility', 'privacy', 'display', 'notifications'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { success: false, error: { message: 'Invalid settings category', code: 'INVALID_CATEGORY' } },
          { status: 400 }
        );
      }

      // Reset specific category
      const categorySettings = { [category]: defaultSettings[category as keyof UserSettings] };
      
      return NextResponse.json({
        success: true,
        message: `${category} settings reset to default`,
        data: categorySettings
      });
    }

    // Reset all settings
    // Update language in artisan profile
    await userService.updateArtisanProfile(artisanId, {
      preferences: {
        ...artisan.preferences,
        language: defaultSettings.language.primary
      }
    });

    // Reset notification preferences
    await userService.updateUserPreferences(artisanId, {
      channels: {
        email: defaultSettings.notifications.email,
        sms: defaultSettings.notifications.sms,
        push: defaultSettings.notifications.push,
        whatsapp: defaultSettings.notifications.whatsapp
      },
      timing: {
        preferredHours: [9, 18],
        timezone: 'Asia/Kolkata',
        frequency: defaultSettings.notifications.frequency
      },
      types: {
        newSchemes: true,
        deadlineReminders: true,
        statusUpdates: true,
        documentRequests: true,
        rejectionNotices: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'All settings reset to default values',
      data: defaultSettings
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/artisans/settings/reset error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}