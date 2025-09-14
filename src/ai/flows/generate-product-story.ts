export interface ProductStoryInput {
  product: {
    name: string;
    description: string;
    category: string;
    materials: string[];
    techniques: string[];
    origin: string;
    artisan: {
      name: string;
      location: string;
      experience: number;
      specialties: string[];
    };
    culturalSignificance?: string;
    price?: number;
    dimensions?: string;
    colors?: string[];
  };
  targetAudience?: 'general' | 'collectors' | 'tourists' | 'local_market';
  storyType?: 'heritage' | 'artisan' | 'technique' | 'cultural' | 'modern';
  language?: string;
  length?: 'short' | 'medium' | 'long';
}

export interface ProductStory {
  title: string;
  introduction: string;
  mainStory: string;
  culturalContext: string;
  artisanProfile: string;
  techniqueDescription: string;
  emotionalConnection: string;
  conclusion: string;
  tags: string[];
  metadata: {
    wordCount: number;
    readingTime: string;
    language: string;
    storyType: string;
    targetAudience: string;
  };
}

export interface ProductStoryResult {
  story: ProductStory;
  variations: {
    socialMedia: string;
    marketing: string;
    educational: string;
    emotional: string;
  };
  visualSuggestions: {
    images: string[];
    videos: string[];
    infographics: string[];
  };
  marketingCopy: {
    headline: string;
    subheadline: string;
    callToAction: string;
    keyFeatures: string[];
  };
  seoOptimization: {
    keywords: string[];
    metaDescription: string;
    titleTag: string;
  };
}

export async function generateProductStory(input: ProductStoryInput): Promise<ProductStoryResult> {
  try {
    console.log('📖 Generating product story for:', input.product.name);

    const story = createMainStory(input);
    const variations = createStoryVariations(input, story);
    const visualSuggestions = generateVisualSuggestions(input);
    const marketingCopy = createMarketingCopy(input, story);
    const seoOptimization = generateSEOOptimization(input, story);

    return {
      story,
      variations,
      visualSuggestions,
      marketingCopy,
      seoOptimization
    };

  } catch (error) {
    console.error('Product story generation error:', error);
    throw new Error(`Failed to generate product story: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createMainStory(input: ProductStoryInput): ProductStory {
  const { product, storyType = 'heritage', length = 'medium' } = input;
  
  // Generate story based on type
  let storyContent: ProductStory;
  
  switch (storyType) {
    case 'heritage':
      storyContent = generateHeritageStory(input);
      break;
    case 'artisan':
      storyContent = generateArtisanStory(input);
      break;
    case 'technique':
      storyContent = generateTechniqueStory(input);
      break;
    case 'cultural':
      storyContent = generateCulturalStory(input);
      break;
    case 'modern':
      storyContent = generateModernStory(input);
      break;
    default:
      storyContent = generateHeritageStory(input);
  }

  // Adjust length
  if (length === 'short') {
    storyContent = shortenStory(storyContent);
  } else if (length === 'long') {
    storyContent = expandStory(storyContent);
  }

  return storyContent;
}

function generateHeritageStory(input: ProductStoryInput): ProductStory {
  const { product } = input;
  
  const title = `The Timeless Legacy of ${product.name}`;
  
  const introduction = `In the heart of ${product.artisan.location}, where tradition meets artistry, ${product.artisan.name} creates ${product.name} - a masterpiece that carries the soul of generations. This ${product.category.toLowerCase()} is not just a product; it's a living testament to the rich cultural heritage that has been passed down through centuries.`;

  const mainStory = `Each ${product.name} begins its journey in the skilled hands of ${product.artisan.name}, a master artisan with ${product.artisan.experience} years of experience. Using traditional techniques passed down through generations, ${product.artisan.name} carefully selects the finest ${product.materials.join(' and ')} to create something truly extraordinary.

The process is a labor of love, involving ${product.techniques.join(', ')} - techniques that have remained unchanged for centuries. Every stroke, every detail, every finishing touch is applied with the wisdom of tradition and the passion of a true craftsman.

This particular piece represents more than just artistic skill; it embodies the cultural identity of ${product.artisan.location}, carrying forward the legacy of countless artisans who came before.`;

  const culturalContext = `${product.name} holds deep cultural significance in ${product.artisan.location}. ${product.culturalSignificance || `These ${product.category.toLowerCase()}s have been an integral part of local traditions, used in ceremonies, celebrations, and daily life. The techniques used to create them are considered sacred knowledge, passed down from master to apprentice in an unbroken chain of learning.`}`;

  const artisanProfile = `${product.artisan.name} is a renowned artisan from ${product.artisan.location}, specializing in ${product.artisan.specialties.join(', ')}. With ${product.artisan.experience} years of experience, ${product.artisan.name} has dedicated their life to preserving and perfecting these traditional techniques. Their work is recognized not just locally, but has gained appreciation from art lovers across the country.`;

  const techniqueDescription = `The creation of ${product.name} involves a meticulous process that begins with the careful selection of materials. ${product.artisan.name} uses traditional methods of ${product.techniques.join(' and ')}, ensuring that each piece maintains the authentic character that has made these ${product.category.toLowerCase()}s beloved for generations. The process requires patience, skill, and an intimate understanding of the materials and their properties.`;

  const emotionalConnection = `Owning a ${product.name} is like holding a piece of history in your hands. It connects you to the rich cultural tapestry of ${product.artisan.location} and the countless artisans who have dedicated their lives to perfecting this craft. Every time you look at it, you're reminded of the human stories, the cultural traditions, and the timeless beauty that transcends generations.`;

  const conclusion = `This ${product.name} is more than just a beautiful object - it's a bridge between the past and present, a celebration of human creativity and cultural heritage. By choosing this piece, you're not just acquiring a product; you're becoming part of a story that continues to unfold with each new generation of artisans and art lovers.`;

  return {
    title,
    introduction,
    mainStory,
    culturalContext,
    artisanProfile,
    techniqueDescription,
    emotionalConnection,
    conclusion,
    tags: [product.category, product.artisan.location, 'handmade', 'traditional', 'heritage'],
    metadata: {
      wordCount: countWords(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      readingTime: calculateReadingTime(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      language: input.language || 'en',
      storyType: 'heritage',
      targetAudience: input.targetAudience || 'general'
    }
  };
}

function generateArtisanStory(input: ProductStoryInput): ProductStory {
  const { product } = input;
  
  const title = `Meet ${product.artisan.name}: The Artisan Behind ${product.name}`;
  
  const introduction = `Behind every beautiful ${product.name} is the story of ${product.artisan.name}, a master artisan whose hands have shaped countless pieces of art over ${product.artisan.experience} years. This is not just the story of a product, but the story of a person whose life is dedicated to preserving and perfecting traditional craftsmanship.`;

  const mainStory = `${product.artisan.name}'s journey as an artisan began in the vibrant streets of ${product.artisan.location}, where the air is filled with the sounds of traditional crafts being practiced. From a young age, ${product.artisan.name} was drawn to the art of ${product.category.toLowerCase()}, spending hours watching and learning from master craftsmen.

Today, ${product.artisan.name} is recognized as one of the finest artisans in ${product.artisan.location}, specializing in ${product.artisan.specialties.join(', ')}. Each piece created is a reflection of their deep understanding of traditional techniques and their personal artistic vision.

The ${product.name} you see here is a perfect example of ${product.artisan.name}'s mastery. Created using ${product.materials.join(' and ')}, it showcases the intricate techniques of ${product.techniques.join(' and ')} that have been refined over decades of practice.`;

  const culturalContext = `In ${product.artisan.location}, artisans like ${product.artisan.name} are not just craftspeople - they are cultural ambassadors, keeping alive traditions that define the region's identity. Their work is celebrated in festivals, displayed in museums, and cherished by families who pass these pieces down through generations.`;

  const artisanProfile = `${product.artisan.name} represents the best of traditional craftsmanship in ${product.artisan.location}. With ${product.artisan.experience} years of experience, they have not only mastered the traditional techniques but have also contributed to their evolution, ensuring that these arts remain relevant and vibrant in the modern world.`;

  const techniqueDescription = `The techniques used by ${product.artisan.name} are a blend of traditional knowledge and personal innovation. Each ${product.name} is created through a process that respects the old ways while embracing the possibilities of the present. The result is a piece that honors tradition while speaking to contemporary sensibilities.`;

  const emotionalConnection = `When you purchase a ${product.name} from ${product.artisan.name}, you're not just buying a product - you're supporting a living tradition. You're helping to ensure that the skills and knowledge that created this piece will continue to be passed down to future generations.`;

  const conclusion = `This ${product.name} is a testament to ${product.artisan.name}'s dedication, skill, and love for their craft. It's a piece that carries the soul of its creator and the spirit of the tradition it represents.`;

  return {
    title,
    introduction,
    mainStory,
    culturalContext,
    artisanProfile,
    techniqueDescription,
    emotionalConnection,
    conclusion,
    tags: [product.artisan.name, product.category, product.artisan.location, 'artisan', 'handmade'],
    metadata: {
      wordCount: countWords(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      readingTime: calculateReadingTime(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      language: input.language || 'en',
      storyType: 'artisan',
      targetAudience: input.targetAudience || 'general'
    }
  };
}

function generateTechniqueStory(input: ProductStoryInput): ProductStory {
  const { product } = input;
  
  const title = `The Art and Science of Creating ${product.name}`;
  
  const introduction = `Creating a ${product.name} is a journey that combines ancient wisdom with meticulous craftsmanship. Every step in the process, from material selection to final finishing, is guided by techniques that have been perfected over centuries.`;

  const mainStory = `The creation of ${product.name} begins with the careful selection of ${product.materials.join(' and ')}, chosen for their quality and compatibility with traditional techniques. ${product.artisan.name} uses methods of ${product.techniques.join(' and ')} that have been passed down through generations of master craftsmen.

Each technique has its own rhythm and requirements. The process is not rushed - it follows the natural properties of the materials and the wisdom of traditional practices. This respect for the craft and the materials is what gives each ${product.name} its unique character and lasting beauty.

The techniques used are not just mechanical processes; they are expressions of cultural knowledge and artistic sensibility. Every movement, every decision, every adjustment is informed by years of experience and deep understanding of the craft.`;

  const culturalContext = `These techniques are more than just methods of production - they are cultural treasures that connect us to our heritage. In ${product.artisan.location}, these skills are considered sacred knowledge, preserved and passed down with great care and respect.`;

  const artisanProfile = `${product.artisan.name} has spent ${product.artisan.experience} years mastering these techniques, not just learning the mechanics but understanding the philosophy behind each method. This deep knowledge is what allows them to create pieces that are both technically excellent and artistically inspiring.`;

  const techniqueDescription = `The specific techniques used in creating this ${product.name} include ${product.techniques.join(', ')}. Each technique has been carefully chosen and executed to bring out the best qualities of the materials and to create a piece that will stand the test of time.`;

  const emotionalConnection = `Understanding the techniques behind ${product.name} deepens your appreciation for the piece. Every detail you see is the result of deliberate choices and skilled execution, making the piece not just beautiful but meaningful.`;

  const conclusion = `This ${product.name} represents the perfect marriage of traditional techniques and contemporary artistry. It's a piece that honors the past while embracing the present, created with methods that have stood the test of time.`;

  return {
    title,
    introduction,
    mainStory,
    culturalContext,
    artisanProfile,
    techniqueDescription,
    emotionalConnection,
    conclusion,
    tags: [product.category, 'techniques', 'traditional', 'craftsmanship', product.artisan.location],
    metadata: {
      wordCount: countWords(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      readingTime: calculateReadingTime(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      language: input.language || 'en',
      storyType: 'technique',
      targetAudience: input.targetAudience || 'general'
    }
  };
}

function generateCulturalStory(input: ProductStoryInput): ProductStory {
  const { product } = input;
  
  const title = `${product.name}: A Cultural Journey Through Time`;
  
  const introduction = `${product.name} is more than just a beautiful object - it's a window into the rich cultural heritage of ${product.artisan.location}. This piece carries within it the stories, traditions, and values of a people who have perfected the art of ${product.category.toLowerCase()} over generations.`;

  const mainStory = `In the cultural landscape of ${product.artisan.location}, ${product.name} holds a special place. ${product.culturalSignificance || `These ${product.category.toLowerCase()}s have been an integral part of local life, used in ceremonies, celebrations, and daily rituals. They represent not just artistic achievement but cultural identity and community values.`}

The creation of each piece follows cultural protocols and traditional practices that have been established over centuries. ${product.artisan.name} works not just as an individual artist but as a custodian of cultural knowledge, ensuring that each ${product.name} carries forward the authentic spirit of the tradition.

This particular piece embodies the cultural values of ${product.artisan.location} - respect for tradition, attention to detail, and the belief that beauty and functionality should go hand in hand.`;

  const culturalContext = `The cultural significance of ${product.name} extends beyond its physical form. It represents the continuity of tradition, the preservation of knowledge, and the celebration of cultural identity. In a world that's rapidly changing, pieces like this serve as anchors to our cultural roots.`;

  const artisanProfile = `${product.artisan.name} is not just an artisan but a cultural ambassador, working to preserve and promote the traditional arts of ${product.artisan.location}. Their work ensures that these cultural treasures continue to be created and appreciated.`;

  const techniqueDescription = `The techniques used in creating ${product.name} are deeply rooted in cultural practices. Each method has cultural significance and is performed with respect for the traditions that gave birth to them.`;

  const emotionalConnection = `Owning a ${product.name} connects you to a rich cultural heritage. It's a way of participating in the preservation of traditional arts and supporting the communities that keep these traditions alive.`;

  const conclusion = `This ${product.name} is a celebration of cultural heritage, a testament to the enduring power of tradition, and a beautiful addition to any collection. It represents the best of what human creativity and cultural wisdom can achieve when they work together.`;

  return {
    title,
    introduction,
    mainStory,
    culturalContext,
    artisanProfile,
    techniqueDescription,
    emotionalConnection,
    conclusion,
    tags: [product.category, 'culture', 'heritage', 'tradition', product.artisan.location],
    metadata: {
      wordCount: countWords(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      readingTime: calculateReadingTime(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      language: input.language || 'en',
      storyType: 'cultural',
      targetAudience: input.targetAudience || 'general'
    }
  };
}

function generateModernStory(input: ProductStoryInput): ProductStory {
  const { product } = input;
  
  const title = `${product.name}: Where Tradition Meets Contemporary Design`;
  
  const introduction = `In a world of mass production and fleeting trends, ${product.name} stands as a testament to the enduring value of traditional craftsmanship in contemporary life. This piece beautifully bridges the gap between heritage and modernity, offering timeless beauty that fits seamlessly into today's lifestyle.`;

  const mainStory = `${product.artisan.name} has reimagined traditional ${product.category.toLowerCase()} for the modern world, creating pieces that honor the past while embracing the present. Using time-tested techniques of ${product.techniques.join(' and ')}, they craft ${product.name} that speaks to contemporary sensibilities while maintaining the soul of traditional craftsmanship.

The design philosophy behind ${product.name} is simple yet profound: take the best of traditional techniques and materials, and present them in ways that resonate with modern life. The result is a piece that feels both familiar and fresh, both timeless and timely.

This approach has made ${product.artisan.name}'s work popular not just among traditional art lovers but also among those who appreciate quality craftsmanship and authentic design in their contemporary spaces.`;

  const culturalContext = `While ${product.name} embraces modern aesthetics, it remains deeply rooted in the cultural traditions of ${product.artisan.location}. The techniques, materials, and values that inform its creation are the same ones that have guided artisans for generations.`;

  const artisanProfile = `${product.artisan.name} represents a new generation of artisans who are finding innovative ways to keep traditional crafts relevant in the modern world. With ${product.artisan.experience} years of experience, they have mastered the traditional techniques while developing a contemporary vision.`;

  const techniqueDescription = `The creation of ${product.name} uses traditional techniques of ${product.techniques.join(' and ')}, but with a contemporary approach to design and finishing. The result is a piece that feels both authentic and modern.`;

  const emotionalConnection = `${product.name} offers the perfect blend of tradition and modernity. It's a piece that connects you to cultural heritage while fitting beautifully into contemporary life.`;

  const conclusion = `This ${product.name} proves that traditional crafts can thrive in the modern world when they're approached with respect for the past and vision for the future. It's a piece that will remain relevant and beautiful for years to come.`;

  return {
    title,
    introduction,
    mainStory,
    culturalContext,
    artisanProfile,
    techniqueDescription,
    emotionalConnection,
    conclusion,
    tags: [product.category, 'modern', 'contemporary', 'traditional', 'design'],
    metadata: {
      wordCount: countWords(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      readingTime: calculateReadingTime(introduction + mainStory + culturalContext + artisanProfile + techniqueDescription + emotionalConnection + conclusion),
      language: input.language || 'en',
      storyType: 'modern',
      targetAudience: input.targetAudience || 'general'
    }
  };
}

function shortenStory(story: ProductStory): ProductStory {
  // Simple shortening by taking first sentences of each section
  return {
    ...story,
    introduction: story.introduction.split('.')[0] + '.',
    mainStory: story.mainStory.split('.')[0] + '.',
    culturalContext: story.culturalContext.split('.')[0] + '.',
    artisanProfile: story.artisanProfile.split('.')[0] + '.',
    techniqueDescription: story.techniqueDescription.split('.')[0] + '.',
    emotionalConnection: story.emotionalConnection.split('.')[0] + '.',
    conclusion: story.conclusion.split('.')[0] + '.',
    metadata: {
      ...story.metadata,
      wordCount: countWords(story.introduction.split('.')[0] + story.mainStory.split('.')[0] + story.culturalContext.split('.')[0] + story.artisanProfile.split('.')[0] + story.techniqueDescription.split('.')[0] + story.emotionalConnection.split('.')[0] + story.conclusion.split('.')[0])
    }
  };
}

function expandStory(story: ProductStory): ProductStory {
  // Add more detail to each section
  return {
    ...story,
    introduction: story.introduction + ' This piece represents the culmination of years of dedication, skill, and cultural knowledge.',
    mainStory: story.mainStory + ' The process is both an art and a science, requiring not just technical skill but also artistic vision and cultural understanding.',
    culturalContext: story.culturalContext + ' These traditions continue to evolve while maintaining their essential character and cultural significance.',
    artisanProfile: story.artisanProfile + ' Their work is a bridge between the past and present, ensuring that traditional arts remain vibrant and relevant.',
    techniqueDescription: story.techniqueDescription + ' Each step is performed with care and precision, resulting in a piece that is both beautiful and durable.',
    emotionalConnection: story.emotionalConnection + ' It\'s a connection to something larger than ourselves - to the community of artisans, the cultural traditions, and the timeless values they represent.',
    conclusion: story.conclusion + ' It\'s a piece that will be treasured for generations, carrying forward the stories and traditions that make it special.',
    metadata: {
      ...story.metadata,
      wordCount: countWords(story.introduction + story.mainStory + story.culturalContext + story.artisanProfile + story.techniqueDescription + story.emotionalConnection + story.conclusion)
    }
  };
}

function createStoryVariations(input: ProductStoryInput, story: ProductStory): {
  socialMedia: string;
  marketing: string;
  educational: string;
  emotional: string;
} {
  return {
    socialMedia: `✨ Meet ${input.product.artisan.name} from ${input.product.artisan.location}! This beautiful ${input.product.name} was handcrafted using traditional techniques passed down through generations. Each piece tells a story of heritage, skill, and cultural pride. #Handmade #TraditionalCrafts #${input.product.category}`,
    
    marketing: `Discover the artistry of ${input.product.artisan.name} with this exquisite ${input.product.name}. Created using traditional techniques and premium materials, this piece brings authentic craftsmanship to your space. Limited availability - order now to own a piece of cultural heritage.`,
    
    educational: `Learn about the traditional art of ${input.product.category.toLowerCase()} with this ${input.product.name} by ${input.product.artisan.name}. This piece demonstrates centuries-old techniques including ${input.product.techniques.join(', ')}. Perfect for collectors and those interested in cultural heritage.`,
    
    emotional: `Every ${input.product.name} carries the soul of its creator, ${input.product.artisan.name}. This isn't just a product - it's a connection to ${input.product.artisan.location}'s rich cultural heritage, a testament to human creativity, and a piece that will be treasured for generations.`
  };
}

function generateVisualSuggestions(input: ProductStoryInput): {
  images: string[];
  videos: string[];
  infographics: string[];
} {
  return {
    images: [
      `${input.product.artisan.name} working on ${input.product.name}`,
      `Close-up of ${input.product.techniques[0]} technique`,
      `${input.product.name} in traditional setting`,
      `Materials used: ${input.product.materials.join(', ')}`,
      `Finished ${input.product.name} from different angles`
    ],
    videos: [
      `Time-lapse of ${input.product.name} creation process`,
      `Interview with ${input.product.artisan.name} about their craft`,
      `Traditional techniques demonstration`,
      `Cultural significance of ${input.product.category} in ${input.product.artisan.location}`
    ],
    infographics: [
      `Timeline of ${input.product.category} tradition`,
      `Step-by-step creation process`,
      `Cultural significance and uses`,
      `Materials and techniques used`
    ]
  };
}

function createMarketingCopy(input: ProductStoryInput, story: ProductStory): {
  headline: string;
  subheadline: string;
  callToAction: string;
  keyFeatures: string[];
} {
  return {
    headline: `Authentic ${input.product.name} by Master Artisan ${input.product.artisan.name}`,
    subheadline: `Handcrafted in ${input.product.artisan.location} using traditional techniques passed down through generations`,
    callToAction: `Own a piece of cultural heritage - Order your ${input.product.name} today`,
    keyFeatures: [
      `Handcrafted by ${input.product.artisan.name} with ${input.product.artisan.experience} years of experience`,
      `Made using traditional techniques: ${input.product.techniques.join(', ')}`,
      `Premium materials: ${input.product.materials.join(', ')}`,
      `Authentic ${input.product.artisan.location} craftsmanship`,
      `Cultural significance and heritage value`
    ]
  };
}

function generateSEOOptimization(input: ProductStoryInput, story: ProductStory): {
  keywords: string[];
  metaDescription: string;
  titleTag: string;
} {
  const keywords = [
    input.product.name,
    input.product.category,
    input.product.artisan.name,
    input.product.artisan.location,
    'handmade',
    'traditional crafts',
    'artisan',
    ...input.product.techniques,
    ...input.product.materials
  ];

  return {
    keywords,
    metaDescription: `Discover ${input.product.name} by ${input.product.artisan.name} from ${input.product.artisan.location}. Handcrafted using traditional techniques with ${input.product.materials.join(' and ')}. Authentic cultural heritage piece.`,
    titleTag: `${input.product.name} - Handcrafted by ${input.product.artisan.name} | Traditional ${input.product.category}`
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function calculateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const wordCount = countWords(text);
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}
