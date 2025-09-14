"use server";

import {
  interactWithArtisanDigitalTwin as interactWithArtisanDigitalTwinFlow,
  type DigitalTwinChatInput,
} from "@/ai/flows/ai-digital-twin-chatbot";
import {
  getCulturalTrendSuggestions as getCulturalTrendSuggestionsFlow,
  type CulturalTrendInput,
} from "@/ai/flows/cultural-trend-suggestions";
import {
  matchBuyersWithArtisans as matchBuyersWithArtisansFlow,
  type MatchmakingInput,
} from "@/ai/flows/buyer-artisan-matchmaking";
import {
  generateProductStory as generateProductStoryFlow,
  type ProductStoryInput,
} from "@/ai/flows/generate-product-story";


export async function analyzeTrends(artisanProfession: string, limit: number = 20, userProfile?: any, selectedCategories?: string[]) {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9002';
    const response = await fetch(`${baseUrl}/api/trend-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artisanProfession,
        limit,
        userProfile,
        selectedCategories,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in analyzeTrends:", error);
    return { success: false, error: "Failed to analyze trends." };
  }
}

export async function interactWithArtisanDigitalTwin(
  input: DigitalTwinChatInput
) {
  try {
    const result = await interactWithArtisanDigitalTwinFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in interactWithArtisanDigitalTwin:", error);
    return { success: false, error: "Failed to get response from Digital Twin." };
  }
}

export async function getCulturalTrendSuggestions(
  input: CulturalTrendInput
) {
  try {
    const result = await getCulturalTrendSuggestionsFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in getCulturalTrendSuggestions:", error);
    return { success: false, error: "Failed to get trend suggestions." };
  }
}

export async function matchBuyersWithArtisans(
  input: MatchmakingInput
) {
  try {
    const result = await matchBuyersWithArtisansFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in matchBuyersWithArtisans:", error);
    return { success: false, error: "Failed to find matches." };
  }
}

export async function generateProductStory(
  input: ProductStoryInput
) {
  try {
    const result = await generateProductStoryFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in generateProductStory:", error);
    return { success: false, error: "Failed to generate product story." };
  }
}
