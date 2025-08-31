// This file contains no code and is not used.
"use server";

import {
  interactWithArtisanDigitalTwin as interactWithArtisanDigitalTwinFlow,
  type InteractWithArtisanDigitalTwinInput,
} from "@/ai/flows/ai-digital-twin-chatbot";
import {
  getCulturalTrendSuggestions as getCulturalTrendSuggestionsFlow,
  type CulturalTrendSuggestionsInput,
} from "@/ai/flows/cultural-trend-suggestions";
import {
  matchBuyersWithArtisans as matchBuyersWithArtisansFlow,
  type MatchBuyersWithArtisansInput,
} from "@/ai/flows/buyer-artisan-matchmaking";


export async function interactWithArtisanDigitalTwin(
  input: InteractWithArtisanDigitalTwinInput
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
  input: CulturalTrendSuggestionsInput
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
  input: MatchBuyersWithArtisansInput
) {
  try {
    const result = await matchBuyersWithArtisansFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in matchBuyersWithArtisans:", error);
    return { success: false, error: "Failed to find matches." };
  }
}
