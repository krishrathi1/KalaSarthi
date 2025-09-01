export interface GenerateProductStoryInput {
  productName: string;
  description: string;
  tags: string[];
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  imageUrl?: string;
}

export interface GenerateProductStoryOutput {
  story: string;
  translatedStory: { [key: string]: string };
  tags: string[];
  culturalContext: string;
}

export async function generateProductStory(
  input: GenerateProductStoryInput
): Promise<GenerateProductStoryOutput> {
  // Mock implementation - replace with actual AI flow
  const story = `The ${input.productName} is a beautiful piece of craftsmanship that tells a story of tradition and innovation. ${input.description}`;

  return {
    story,
    translatedStory: {
      en: story,
      hi: `यह ${input.productName} एक सुंदर शिल्प कृति है जो परंपरा और नवाचार की कहानी बताती है। ${input.description}`,
    },
    tags: input.tags,
    culturalContext: "This product represents the rich cultural heritage of Indian artisans.",
  };
}