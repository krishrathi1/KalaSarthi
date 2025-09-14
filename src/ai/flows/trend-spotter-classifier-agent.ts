import { ArtisanProfile, Product } from './trend-spotter-profile-agent';

export interface ProductClassifierInput {
  profession: string;
  professionDetails: {
    skills: string[];
    materials: string[];
    experience: string;
    location: string;
  };
  existingProducts: Product[];
}

export interface SearchQuery {
  query: string;
  rationale: string;
  category: string;
  priority: number;
}

export interface MarketInsight {
  targetPlatforms: string[];
  trendingCategories: string[];
  seasonalTrends: string[];
  competitiveLandscape: {
    highCompetition: string[];
    lowCompetition: string[];
    emergingCategories: string[];
  };
  pricingInsights: {
    priceRanges: {
      budget: number[];
      midRange: number[];
      premium: number[];
    };
    optimalPricing: {
      min: number;
      max: number;
      recommended: number;
    };
  };
}

export interface ProductClassification {
  primaryCategory: string;
  subCategories: string[];
  skillRequirements: string[];
  materialNeeds: string[];
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
  marketDemand: 'high' | 'medium' | 'low';
  competitionLevel: 'high' | 'medium' | 'low';
  profitPotential: 'high' | 'medium' | 'low';
}

export interface ClassifierAgentResult {
  searchQueries: SearchQuery[];
  marketInsights: MarketInsight;
  productClassifications: ProductClassification[];
  skillGapAnalysis: {
    currentSkills: string[];
    requiredSkills: string[];
    skillGaps: string[];
    learningRecommendations: string[];
  };
  materialAnalysis: {
    currentMaterials: string[];
    recommendedMaterials: string[];
    supplierSuggestions: string[];
    costOptimization: string[];
  };
  strategicRecommendations: {
    immediateActions: string[];
    shortTermGoals: string[];
    longTermVision: string[];
  };
}

export async function classifyProductsForProfession(input: ProductClassifierInput): Promise<ClassifierAgentResult> {
  try {
    console.log(`🏷️ Classifying products for profession: ${input.profession}`);

    // Step 1: Generate optimized search queries
    const searchQueries = generateSearchQueries(input);
    console.log(`🔍 Generated ${searchQueries.length} search queries`);

    // Step 2: Analyze market insights
    const marketInsights = analyzeMarketInsights(input);
    console.log(`📊 Market insights analyzed`);

    // Step 3: Classify products
    const productClassifications = classifyProducts(input);
    console.log(`📦 Classified ${productClassifications.length} product categories`);

    // Step 4: Analyze skill gaps
    const skillGapAnalysis = analyzeSkillGaps(input);
    console.log(`🎯 Skill gap analysis completed`);

    // Step 5: Analyze materials
    const materialAnalysis = analyzeMaterials(input);
    console.log(`🧱 Material analysis completed`);

    // Step 6: Generate strategic recommendations
    const strategicRecommendations = generateStrategicRecommendations(input, productClassifications);
    console.log(`🎯 Strategic recommendations generated`);

    const result: ClassifierAgentResult = {
      searchQueries,
      marketInsights,
      productClassifications,
      skillGapAnalysis,
      materialAnalysis,
      strategicRecommendations
    };

    console.log(`✅ Product classification completed`);
    return result;

  } catch (error) {
    console.error('Error classifying products for profession:', error);
    throw new Error(`Product classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateSearchQueries(input: ProductClassifierInput): SearchQuery[] {
  const queries: SearchQuery[] = [];
  const profession = input.profession.toLowerCase();

  // Primary profession queries
  queries.push({
    query: `${input.profession} trending products`,
    rationale: 'General trend analysis for the artisan\'s profession',
    category: 'General',
    priority: 1
  });

  // Skill-based queries
  for (const skill of input.professionDetails.skills) {
    queries.push({
      query: `${skill} popular designs`,
      rationale: `Focus on primary skill: ${skill}`,
      category: 'Skills',
      priority: 1
    });
  }

  // Location-based queries
  queries.push({
    query: `${input.professionDetails.location} handmade crafts`,
    rationale: 'Local market analysis and regional preferences',
    category: 'Location',
    priority: 2
  });

  // Material-based queries
  for (const material of input.professionDetails.materials) {
    queries.push({
      query: `${material} ${input.profession} products`,
      rationale: `Products using ${material} material`,
      category: 'Materials',
      priority: 2
    });
  }

  // Experience-based queries
  const experienceLevel = determineExperienceLevel(input.professionDetails.experience);
  queries.push({
    query: `${experienceLevel} ${input.profession} projects`,
    rationale: `Appropriate complexity level for ${experienceLevel} artisans`,
    category: 'Experience',
    priority: 2
  });

  // Seasonal queries
  queries.push({
    query: `${input.profession} seasonal products`,
    rationale: 'Seasonal market opportunities',
    category: 'Seasonal',
    priority: 3
  });

  // Gift market queries
  queries.push({
    query: `${input.profession} gift ideas`,
    rationale: 'Gift market opportunities',
    category: 'Gifts',
    priority: 3
  });

  return queries;
}

function determineExperienceLevel(experience: string): string {
  const years = parseInt(experience.match(/\d+/)?.[0] || '0');
  if (years < 2) return 'beginner';
  if (years < 5) return 'intermediate';
  return 'advanced';
}

function analyzeMarketInsights(input: ProductClassifierInput): MarketInsight {
  const profession = input.profession.toLowerCase();
  
  // Determine target platforms based on profession
  const targetPlatforms = getTargetPlatforms(profession);
  
  // Identify trending categories
  const trendingCategories = getTrendingCategories(profession);
  
  // Seasonal trends
  const seasonalTrends = getSeasonalTrends(profession);
  
  // Competitive landscape
  const competitiveLandscape = analyzeCompetitiveLandscape(profession);
  
  // Pricing insights
  const pricingInsights = analyzePricingInsights(profession, input.existingProducts);

  return {
    targetPlatforms,
    trendingCategories,
    seasonalTrends,
    competitiveLandscape,
    pricingInsights
  };
}

function getTargetPlatforms(profession: string): string[] {
  const platforms = ['Amazon', 'Flipkart', 'Meesho'];
  
  // Add profession-specific platforms
  if (profession.includes('pottery') || profession.includes('ceramic')) {
    platforms.push('Etsy', 'Handmade India');
  }
  
  if (profession.includes('textile') || profession.includes('fabric')) {
    platforms.push('Myntra', 'Ajio');
  }
  
  return platforms;
}

function getTrendingCategories(profession: string): string[] {
  const baseCategories = ['Home Decor', 'Kitchen', 'Garden'];
  
  if (profession.includes('pottery')) {
    return [...baseCategories, 'Ceramic Art', 'Tableware'];
  }
  
  if (profession.includes('textile')) {
    return ['Fashion', 'Home Textiles', 'Accessories'];
  }
  
  if (profession.includes('wood')) {
    return [...baseCategories, 'Furniture', 'Crafts'];
  }
  
  return baseCategories;
}

function getSeasonalTrends(profession: string): string[] {
  return [
    'Holiday season boost (Nov-Dec)',
    'Wedding season (Oct-Mar)',
    'Festival season (Sep-Nov)',
    'Summer outdoor products (Apr-Jun)'
  ];
}

function analyzeCompetitiveLandscape(profession: string): {
  highCompetition: string[];
  lowCompetition: string[];
  emergingCategories: string[];
} {
  return {
    highCompetition: ['Basic pottery', 'Simple textiles', 'Standard woodwork'],
    lowCompetition: ['Custom designs', 'Eco-friendly products', 'Artistic pieces'],
    emergingCategories: ['Sustainable crafts', 'Digital art integration', 'Smart home decor']
  };
}

function analyzePricingInsights(profession: string, existingProducts: Product[]): {
  priceRanges: {
    budget: number[];
    midRange: number[];
    premium: number[];
  };
  optimalPricing: {
    min: number;
    max: number;
    recommended: number;
  };
} {
  const avgPrice = existingProducts.length > 0 
    ? existingProducts.reduce((sum, p) => sum + p.price, 0) / existingProducts.length 
    : 1000;

  return {
    priceRanges: {
      budget: [500, 1500],
      midRange: [1500, 3000],
      premium: [3000, 8000]
    },
    optimalPricing: {
      min: Math.round(avgPrice * 0.8),
      max: Math.round(avgPrice * 1.5),
      recommended: Math.round(avgPrice * 1.1)
    }
  };
}

function classifyProducts(input: ProductClassifierInput): ProductClassification[] {
  const classifications: ProductClassification[] = [];
  const profession = input.profession.toLowerCase();

  // Create classifications based on profession
  if (profession.includes('pottery')) {
    classifications.push({
      primaryCategory: 'Ceramics',
      subCategories: ['Tableware', 'Decorative', 'Garden', 'Art'],
      skillRequirements: ['Throwing', 'Glazing', 'Firing', 'Design'],
      materialNeeds: ['Clay', 'Glazes', 'Kiln', 'Tools'],
      complexityLevel: 'intermediate',
      marketDemand: 'high',
      competitionLevel: 'medium',
      profitPotential: 'high'
    });
  }

  if (profession.includes('textile')) {
    classifications.push({
      primaryCategory: 'Textiles',
      subCategories: ['Clothing', 'Home Textiles', 'Accessories', 'Art'],
      skillRequirements: ['Weaving', 'Dyeing', 'Sewing', 'Design'],
      materialNeeds: ['Fabric', 'Threads', 'Dyes', 'Tools'],
      complexityLevel: 'intermediate',
      marketDemand: 'high',
      competitionLevel: 'high',
      profitPotential: 'medium'
    });
  }

  // Add general classification if none specific
  if (classifications.length === 0) {
    classifications.push({
      primaryCategory: 'Handmade Crafts',
      subCategories: ['Home Decor', 'Kitchen', 'Garden', 'Art'],
      skillRequirements: input.professionDetails.skills,
      materialNeeds: input.professionDetails.materials,
      complexityLevel: 'intermediate',
      marketDemand: 'medium',
      competitionLevel: 'medium',
      profitPotential: 'medium'
    });
  }

  return classifications;
}

function analyzeSkillGaps(input: ProductClassifierInput): {
  currentSkills: string[];
  requiredSkills: string[];
  skillGaps: string[];
  learningRecommendations: string[];
} {
  const currentSkills = input.professionDetails.skills;
  const requiredSkills = [
    'Digital Marketing',
    'E-commerce',
    'Photography',
    'Customer Service',
    'Business Management',
    'Quality Control'
  ];

  const skillGaps = requiredSkills.filter(skill => 
    !currentSkills.some(current => 
      current.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(current.toLowerCase())
    )
  );

  const learningRecommendations = skillGaps.map(skill => {
    switch (skill) {
      case 'Digital Marketing':
        return 'Take online courses on social media marketing and SEO';
      case 'E-commerce':
        return 'Learn about online marketplace optimization and listing strategies';
      case 'Photography':
        return 'Improve product photography skills for better online presence';
      case 'Customer Service':
        return 'Develop communication skills for customer interactions';
      case 'Business Management':
        return 'Learn basic business operations and financial management';
      case 'Quality Control':
        return 'Implement quality assurance processes';
      default:
        return `Research and learn about ${skill}`;
    }
  });

  return {
    currentSkills,
    requiredSkills,
    skillGaps,
    learningRecommendations
  };
}

function analyzeMaterials(input: ProductClassifierInput): {
  currentMaterials: string[];
  recommendedMaterials: string[];
  supplierSuggestions: string[];
  costOptimization: string[];
} {
  const currentMaterials = input.professionDetails.materials;
  const profession = input.profession.toLowerCase();

  let recommendedMaterials: string[] = [];
  let supplierSuggestions: string[] = [];
  let costOptimization: string[] = [];

  if (profession.includes('pottery')) {
    recommendedMaterials = ['Premium clay', 'High-quality glazes', 'Kiln accessories'];
    supplierSuggestions = ['Local clay suppliers', 'Online glaze stores', 'Equipment rental'];
    costOptimization = ['Buy materials in bulk', 'Share kiln costs', 'Reuse materials'];
  } else if (profession.includes('textile')) {
    recommendedMaterials = ['Organic fabrics', 'Natural dyes', 'Quality threads'];
    supplierSuggestions = ['Fabric wholesalers', 'Dye suppliers', 'Local markets'];
    costOptimization = ['Buy seasonal fabrics', 'Group purchases', 'Direct supplier relationships'];
  } else {
    recommendedMaterials = ['High-quality base materials', 'Professional tools', 'Finishing supplies'];
    supplierSuggestions = ['Local suppliers', 'Online marketplaces', 'Trade shows'];
    costOptimization = ['Bulk purchasing', 'Supplier negotiations', 'Material efficiency'];
  }

  return {
    currentMaterials,
    recommendedMaterials,
    supplierSuggestions,
    costOptimization
  };
}

function generateStrategicRecommendations(
  input: ProductClassifierInput,
  classifications: ProductClassification[]
): {
  immediateActions: string[];
  shortTermGoals: string[];
  longTermVision: string[];
} {
  const immediateActions = [
    'Focus on 2-3 high-demand product categories',
    'Set up basic online presence',
    'Research local suppliers and materials',
    'Create product prototypes'
  ];

  const shortTermGoals = [
    'Launch first product line within 3 months',
    'Establish online sales channels',
    'Build customer base and reviews',
    'Develop signature product designs'
  ];

  const longTermVision = [
    'Become recognized brand in your craft category',
    'Scale production to meet demand',
    'Expand to multiple marketplaces',
    'Mentor other artisans and build community'
  ];

  return {
    immediateActions,
    shortTermGoals,
    longTermVision
  };
}
