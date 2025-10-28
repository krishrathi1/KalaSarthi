/**
 * Profession Mapping Service for Intelligent Profession Matching
 * 
 * This service provides comprehensive profession-to-keyword mappings,
 * material and technique detection, and support for multi-profession queries.
 */

import { RequirementExtraction } from './GoogleGenerativeAIService';

export interface ProfessionMapping {
  professions: Array<{
    name: string;
    confidence: number;
    matchingFactors: string[];
  }>;
  fallbackProfessions: string[];
  reasoning: string;
}

export interface ProfessionCategory {
  name: string;
  keywords: string[];
  materials: string[];
  techniques: string[];
  products: string[];
  aliases: string[];
}

export interface MaterialTechniqueMapping {
  material: string;
  relatedProfessions: string[];
  commonTechniques: string[];
  confidence: number;
}

export class ProfessionMappingService {
  private static instance: ProfessionMappingService;
  private professionCategories: Map<string, ProfessionCategory>;
  private materialMappings: Map<string, MaterialTechniqueMapping>;
  private techniqueToProf: Map<string, string[]>;

  private constructor() {
    this.professionCategories = new Map();
    this.materialMappings = new Map();
    this.techniqueToProf = new Map();
    this.initializeMappings();
  }

  public static getInstance(): ProfessionMappingService {
    if (!ProfessionMappingService.instance) {
      ProfessionMappingService.instance = new ProfessionMappingService();
    }
    return ProfessionMappingService.instance;
  }

  private initializeMappings(): void {
    this.initializeProfessionCategories();
    this.initializeMaterialMappings();
    this.initializeTechniqueMappings();
  }

  private initializeProfessionCategories(): void {
    const categories: ProfessionCategory[] = [
      {
        name: 'pottery',
        keywords: ['pottery', 'ceramic', 'clay', 'earthenware', 'terracotta', 'porcelain', 'stoneware'],
        materials: ['clay', 'ceramic', 'terracotta', 'porcelain', 'earthenware', 'stoneware'],
        techniques: ['throwing', 'glazing', 'firing', 'molding', 'hand-building', 'wheel-throwing'],
        products: ['pots', 'vases', 'bowls', 'plates', 'cups', 'tiles', 'sculptures', 'planters'],
        aliases: ['ceramics', 'clay work', 'ceramic art']
      },
      {
        name: 'woodworking',
        keywords: ['wood', 'wooden', 'timber', 'lumber', 'carpentry', 'furniture', 'cabinet', 'doors', 'commercial'],
        materials: ['wood', 'timber', 'oak', 'pine', 'teak', 'mahogany', 'bamboo', 'plywood', 'hardwood', 'softwood'],
        techniques: ['carving', 'turning', 'joinery', 'sanding', 'polishing', 'inlay', 'marquetry', 'carpentry', 'custom woodwork', 'door making'],
        products: ['furniture', 'doors', 'windows', 'tables', 'chairs', 'cabinets', 'boxes', 'frames', 'wooden doors', 'commercial doors', 'hotel furniture'],
        aliases: ['carpentry', 'furniture making', 'wood craft', 'door making', 'custom carpentry', 'woodwork']
      },
      {
        name: 'jewelry',
        keywords: ['jewelry', 'jewellery', 'ornaments', 'accessories', 'precious', 'gems'],
        materials: ['gold', 'silver', 'platinum', 'copper', 'brass', 'diamonds', 'pearls', 'gemstones'],
        techniques: ['casting', 'soldering', 'oxidizing', 'engraving', 'stone-setting', 'filigree'],
        products: ['rings', 'necklaces', 'earrings', 'bracelets', 'pendants', 'brooches', 'chains'],
        aliases: ['jewelry making', 'goldsmithing', 'silversmithing']
      },
      {
        name: 'textiles',
        keywords: ['textile', 'fabric', 'cloth', 'weaving', 'spinning', 'yarn', 'thread'],
        materials: ['cotton', 'silk', 'wool', 'linen', 'jute', 'hemp', 'polyester', 'rayon'],
        techniques: ['weaving', 'spinning', 'dyeing', 'printing', 'knitting', 'crocheting'],
        products: ['sarees', 'fabrics', 'carpets', 'rugs', 'tapestries', 'clothing', 'blankets'],
        aliases: ['weaving', 'fabric making', 'textile art']
      },
      {
        name: 'leather work',
        keywords: ['leather', 'hide', 'skin', 'suede', 'tanning'],
        materials: ['leather', 'suede', 'hide', 'patent leather', 'nubuck'],
        techniques: ['tanning', 'tooling', 'stamping', 'stitching', 'embossing', 'dyeing'],
        products: ['bags', 'wallets', 'belts', 'shoes', 'jackets', 'purses', 'accessories'],
        aliases: ['leathercraft', 'leather crafting', 'hide work']
      },
      {
        name: 'metalwork',
        keywords: ['metal', 'iron', 'steel', 'brass', 'bronze', 'aluminum', 'forging'],
        materials: ['iron', 'steel', 'brass', 'bronze', 'aluminum', 'copper', 'tin'],
        techniques: ['forging', 'welding', 'casting', 'hammering', 'engraving', 'patina'],
        products: ['sculptures', 'gates', 'railings', 'utensils', 'decorative items', 'tools'],
        aliases: ['blacksmithing', 'metalcraft', 'ironwork']
      },
      {
        name: 'painting',
        keywords: ['painting', 'canvas', 'art', 'portrait', 'landscape', 'mural'],
        materials: ['canvas', 'paper', 'wood', 'acrylic', 'oil', 'watercolor', 'tempera'],
        techniques: ['brushwork', 'glazing', 'impasto', 'wash', 'dry brush', 'stippling'],
        products: ['paintings', 'portraits', 'murals', 'illustrations', 'artwork', 'canvases'],
        aliases: ['fine art', 'canvas art', 'artistic painting']
      },
      {
        name: 'embroidery',
        keywords: ['embroidery', 'stitching', 'needlework', 'thread work', 'decorative stitching'],
        materials: ['thread', 'yarn', 'silk thread', 'cotton thread', 'metallic thread', 'fabric'],
        techniques: ['hand stitching', 'machine embroidery', 'cross-stitch', 'chain stitch', 'satin stitch'],
        products: ['embroidered fabrics', 'decorative items', 'clothing', 'accessories', 'wall hangings'],
        aliases: ['needlework', 'thread work', 'decorative stitching']
      }
    ];

    categories.forEach(category => {
      this.professionCategories.set(category.name, category);
    });
  }

  private initializeMaterialMappings(): void {
    const mappings: MaterialTechniqueMapping[] = [
      // Clay and ceramics
      { material: 'clay', relatedProfessions: ['pottery'], commonTechniques: ['throwing', 'glazing', 'firing'], confidence: 0.95 },
      { material: 'ceramic', relatedProfessions: ['pottery'], commonTechniques: ['glazing', 'firing'], confidence: 0.9 },
      { material: 'terracotta', relatedProfessions: ['pottery'], commonTechniques: ['molding', 'firing'], confidence: 0.85 },
      
      // Wood materials
      { material: 'wood', relatedProfessions: ['woodworking'], commonTechniques: ['carving', 'sanding', 'polishing', 'joinery'], confidence: 0.95 },
      { material: 'wooden', relatedProfessions: ['woodworking'], commonTechniques: ['carving', 'joinery', 'carpentry'], confidence: 0.9 },
      { material: 'timber', relatedProfessions: ['woodworking'], commonTechniques: ['cutting', 'joining', 'carpentry'], confidence: 0.85 },
      { material: 'oak', relatedProfessions: ['woodworking'], commonTechniques: ['carving', 'finishing'], confidence: 0.8 },
      { material: 'teak', relatedProfessions: ['woodworking'], commonTechniques: ['carving', 'polishing'], confidence: 0.8 },
      
      // Metals
      { material: 'silver', relatedProfessions: ['jewelry', 'metalwork'], commonTechniques: ['oxidizing', 'engraving', 'casting'], confidence: 0.9 },
      { material: 'gold', relatedProfessions: ['jewelry'], commonTechniques: ['casting', 'engraving'], confidence: 0.95 },
      { material: 'iron', relatedProfessions: ['metalwork'], commonTechniques: ['forging', 'welding'], confidence: 0.9 },
      { material: 'brass', relatedProfessions: ['metalwork', 'jewelry'], commonTechniques: ['casting', 'engraving'], confidence: 0.85 },
      
      // Textiles
      { material: 'silk', relatedProfessions: ['textiles'], commonTechniques: ['weaving', 'dyeing'], confidence: 0.9 },
      { material: 'cotton', relatedProfessions: ['textiles'], commonTechniques: ['weaving', 'spinning'], confidence: 0.85 },
      { material: 'wool', relatedProfessions: ['textiles'], commonTechniques: ['spinning', 'knitting'], confidence: 0.85 },
      
      // Leather
      { material: 'leather', relatedProfessions: ['leather work'], commonTechniques: ['tooling', 'stitching'], confidence: 0.95 },
      { material: 'suede', relatedProfessions: ['leather work'], commonTechniques: ['stitching', 'dyeing'], confidence: 0.85 },
      
      // Art materials
      { material: 'canvas', relatedProfessions: ['painting'], commonTechniques: ['brushwork', 'glazing'], confidence: 0.9 },
      { material: 'thread', relatedProfessions: ['embroidery', 'textiles'], commonTechniques: ['stitching', 'weaving'], confidence: 0.8 }
    ];

    mappings.forEach(mapping => {
      this.materialMappings.set(mapping.material.toLowerCase(), mapping);
    });
  }

  private initializeTechniqueMappings(): void {
    const techniques = [
      // Pottery techniques
      { technique: 'throwing', professions: ['pottery'] },
      { technique: 'glazing', professions: ['pottery'] },
      { technique: 'firing', professions: ['pottery'] },
      { technique: 'wheel-throwing', professions: ['pottery'] },
      
      // Woodworking techniques
      { technique: 'carving', professions: ['woodworking'] },
      { technique: 'turning', professions: ['woodworking'] },
      { technique: 'joinery', professions: ['woodworking'] },
      { technique: 'sanding', professions: ['woodworking'] },
      { technique: 'polishing', professions: ['woodworking', 'metalwork'] },
      { technique: 'carpentry', professions: ['woodworking'] },
      { technique: 'custom woodwork', professions: ['woodworking'] },
      { technique: 'door making', professions: ['woodworking'] },
      { technique: 'finishing', professions: ['woodworking'] },
      { technique: 'cutting', professions: ['woodworking'] },
      { technique: 'joining', professions: ['woodworking'] },
      
      // Jewelry techniques
      { technique: 'oxidizing', professions: ['jewelry'] },
      { technique: 'casting', professions: ['jewelry', 'metalwork'] },
      { technique: 'soldering', professions: ['jewelry', 'metalwork'] },
      { technique: 'engraving', professions: ['jewelry', 'metalwork'] },
      { technique: 'stone-setting', professions: ['jewelry'] },
      
      // Textile techniques
      { technique: 'weaving', professions: ['textiles'] },
      { technique: 'spinning', professions: ['textiles'] },
      { technique: 'dyeing', professions: ['textiles', 'leather work'] },
      { technique: 'knitting', professions: ['textiles'] },
      { technique: 'handwoven', professions: ['textiles'] },
      
      // Metalwork techniques
      { technique: 'forging', professions: ['metalwork'] },
      { technique: 'welding', professions: ['metalwork'] },
      { technique: 'hammering', professions: ['metalwork'] },
      
      // Leather techniques
      { technique: 'tooling', professions: ['leather work'] },
      { technique: 'stamping', professions: ['leather work'] },
      { technique: 'stitching', professions: ['leather work', 'embroidery'] },
      
      // Painting techniques
      { technique: 'brushwork', professions: ['painting'] },
      { technique: 'impasto', professions: ['painting'] },
      
      // Embroidery techniques
      { technique: 'embroidery', professions: ['embroidery'] },
      { technique: 'needlework', professions: ['embroidery'] },
      { technique: 'cross-stitch', professions: ['embroidery'] }
    ];

    techniques.forEach(({ technique, professions }) => {
      this.techniqueToProf.set(technique.toLowerCase(), professions);
    });
  }

  /**
   * Map extracted requirements to appropriate artisan professions
   */
  public mapRequirementsToProfessions(requirements: RequirementExtraction): ProfessionMapping {
    const professionScores = new Map<string, number>();
    const matchingFactors = new Map<string, string[]>();
    
    // Initialize all professions with base score
    Array.from(this.professionCategories.keys()).forEach(profession => {
      professionScores.set(profession, 0);
      matchingFactors.set(profession, []);
    });

    // Score based on materials
    requirements.materials.forEach(material => {
      const materialLower = material.toLowerCase();
      const mapping = this.materialMappings.get(materialLower);
      
      if (mapping) {
        mapping.relatedProfessions.forEach(profession => {
          const currentScore = professionScores.get(profession) || 0;
          professionScores.set(profession, currentScore + (mapping.confidence * 0.4));
          matchingFactors.get(profession)?.push(`Material: ${material}`);
        });
      }
    });

    // Score based on techniques
    requirements.techniques.forEach(technique => {
      const techniqueLower = technique.toLowerCase();
      const professions = this.techniqueToProf.get(techniqueLower);
      
      if (professions) {
        professions.forEach(profession => {
          const currentScore = professionScores.get(profession) || 0;
          professionScores.set(profession, currentScore + 0.35);
          matchingFactors.get(profession)?.push(`Technique: ${technique}`);
        });
      }
    });

    // Score based on products
    requirements.products.forEach(product => {
      this.professionCategories.forEach((category, profession) => {
        const productLower = product.toLowerCase();
        const matchesProduct = category.products.some(p => 
          productLower.includes(p.toLowerCase()) || p.toLowerCase().includes(productLower)
        );
        
        if (matchesProduct) {
          const currentScore = professionScores.get(profession) || 0;
          professionScores.set(profession, currentScore + 0.3);
          matchingFactors.get(profession)?.push(`Product: ${product}`);
        }
      });
    });

    // Bonus scoring for material-product combinations
    requirements.products.forEach(product => {
      requirements.materials.forEach(material => {
        const productLower = product.toLowerCase();
        const materialLower = material.toLowerCase();
        
        // Wooden doors combination
        if ((productLower.includes('door') && (materialLower.includes('wood') || materialLower.includes('wooden'))) ||
            (productLower.includes('furniture') && materialLower.includes('wood'))) {
          const currentScore = professionScores.get('woodworking') || 0;
          professionScores.set('woodworking', currentScore + 0.2);
          matchingFactors.get('woodworking')?.push(`Perfect match: ${material} ${product}`);
        }
        
        // Silver jewelry combination
        if (productLower.includes('jewelry') || productLower.includes('earring') || 
            productLower.includes('necklace') || productLower.includes('ring')) {
          if (materialLower.includes('silver') || materialLower.includes('gold')) {
            const currentScore = professionScores.get('jewelry') || 0;
            professionScores.set('jewelry', currentScore + 0.2);
            matchingFactors.get('jewelry')?.push(`Perfect match: ${material} ${product}`);
          }
        }
      });
    });

    // Score based on keywords in end use and specifications
    if (requirements.endUse) {
      const endUseLower = requirements.endUse.toLowerCase();
      this.professionCategories.forEach((category, profession) => {
        const matchesKeyword = category.keywords.some(keyword => 
          endUseLower.includes(keyword.toLowerCase())
        );
        
        if (matchesKeyword) {
          const currentScore = professionScores.get(profession) || 0;
          professionScores.set(profession, currentScore + 0.2);
          matchingFactors.get(profession)?.push(`Context: ${requirements.endUse}`);
        }
      });

      // Boost scores for commercial contexts
      if (endUseLower.includes('hotel') || endUseLower.includes('commercial') || 
          endUseLower.includes('business') || endUseLower.includes('restaurant')) {
        const woodworkingScore = professionScores.get('woodworking') || 0;
        if (woodworkingScore > 0) {
          professionScores.set('woodworking', woodworkingScore + 0.15);
          matchingFactors.get('woodworking')?.push(`Commercial context: ${requirements.endUse}`);
        }
      }
    }

    // Score based on specifications
    if (requirements.specifications) {
      const specs = Object.entries(requirements.specifications);
      specs.forEach(([key, value]) => {
        const specText = `${key} ${value}`.toLowerCase();
        
        // Commercial/professional context boost
        if (specText.includes('commercial') || specText.includes('professional') || 
            specText.includes('business') || specText.includes('hotel')) {
          const woodworkingScore = professionScores.get('woodworking') || 0;
          if (woodworkingScore > 0) {
            professionScores.set('woodworking', woodworkingScore + 0.1);
            matchingFactors.get('woodworking')?.push(`Professional context: ${key}`);
          }
        }
      });
    }

    // Convert to sorted array
    const sortedProfessions = Array.from(professionScores.entries())
      .map(([name, confidence]) => ({
        name,
        confidence: Math.min(1, confidence), // Cap at 1.0
        matchingFactors: matchingFactors.get(name) || []
      }))
      .filter(p => p.confidence > 0.1) // Only include professions with meaningful scores
      .sort((a, b) => b.confidence - a.confidence);

    // Determine primary and fallback professions
    const primaryProfession = sortedProfessions[0];
    const fallbackProfessions = this.getFallbackProfessions(requirements);
    
    // Generate reasoning
    const reasoning = this.generateMappingReasoning(sortedProfessions, requirements);

    return {
      professions: sortedProfessions,
      fallbackProfessions,
      reasoning
    };
  }

  /**
   * Get profession keywords for a specific profession
   */
  public getProfessionKeywords(profession: string): string[] {
    const category = this.professionCategories.get(profession.toLowerCase());
    if (!category) {
      return [];
    }
    
    return [
      ...category.keywords,
      ...category.materials,
      ...category.techniques,
      ...category.products,
      ...category.aliases
    ];
  }

  /**
   * Validate if a profession matches the given requirements
   */
  public validateProfessionMatch(profession: string, requirements: RequirementExtraction): boolean {
    const category = this.professionCategories.get(profession.toLowerCase());
    if (!category) {
      return false;
    }

    // Check if any materials match
    const materialMatch = requirements.materials.some(material =>
      category.materials.some(catMaterial => 
        material.toLowerCase().includes(catMaterial.toLowerCase()) ||
        catMaterial.toLowerCase().includes(material.toLowerCase())
      )
    );

    // Check if any techniques match
    const techniqueMatch = requirements.techniques.some(technique =>
      category.techniques.some(catTechnique => 
        technique.toLowerCase().includes(catTechnique.toLowerCase()) ||
        catTechnique.toLowerCase().includes(technique.toLowerCase())
      )
    );

    // Check if any products match
    const productMatch = requirements.products.some(product =>
      category.products.some(catProduct => 
        product.toLowerCase().includes(catProduct.toLowerCase()) ||
        catProduct.toLowerCase().includes(product.toLowerCase())
      )
    );

    return materialMatch || techniqueMatch || productMatch;
  }

  /**
   * Get fallback professions when primary matching fails
   */
  private getFallbackProfessions(requirements: RequirementExtraction): string[] {
    const fallbacks: string[] = [];
    
    // If no specific materials/techniques, suggest popular professions
    if (requirements.materials.length === 0 && requirements.techniques.length === 0) {
      fallbacks.push('pottery', 'woodworking', 'textiles');
    }
    
    // Context-based fallbacks
    const endUse = requirements.endUse.toLowerCase();
    if (endUse.includes('home') || endUse.includes('house') || endUse.includes('kitchen')) {
      fallbacks.push('pottery', 'woodworking');
    }
    
    if (endUse.includes('wedding') || endUse.includes('ceremony')) {
      fallbacks.push('jewelry', 'textiles', 'embroidery');
    }
    
    if (endUse.includes('hotel') || endUse.includes('commercial') || endUse.includes('business') || endUse.includes('restaurant')) {
      fallbacks.push('woodworking', 'metalwork');
      
      // More specific commercial fallbacks based on products
      if (requirements.products.some(p => p.toLowerCase().includes('door') || p.toLowerCase().includes('furniture'))) {
        fallbacks.unshift('woodworking'); // Prioritize woodworking for doors/furniture
      }
    }
    
    if (endUse.includes('office') || endUse.includes('corporate')) {
      fallbacks.push('woodworking', 'metalwork', 'leather work');
    }
    
    return [...new Set(fallbacks)]; // Remove duplicates
  }

  /**
   * Generate human-readable reasoning for profession mapping
   */
  private generateMappingReasoning(
    professions: Array<{ name: string; confidence: number; matchingFactors: string[] }>,
    requirements: RequirementExtraction
  ): string {
    if (professions.length === 0) {
      return 'No clear profession match found based on the provided requirements.';
    }

    const primary = professions[0];
    let reasoning = `Primary profession "${primary.name}" selected with ${(primary.confidence * 100).toFixed(0)}% confidence`;
    
    if (primary.matchingFactors.length > 0) {
      reasoning += ` based on: ${primary.matchingFactors.slice(0, 3).join(', ')}`;
    }
    
    if (professions.length > 1) {
      const secondary = professions.slice(1, 3).map(p => p.name);
      reasoning += `. Secondary options: ${secondary.join(', ')}`;
    }
    
    return reasoning;
  }

  /**
   * Get all available profession categories
   */
  public getAllProfessions(): string[] {
    return Array.from(this.professionCategories.keys());
  }

  /**
   * Get detailed information about a profession
   */
  public getProfessionDetails(profession: string): ProfessionCategory | null {
    return this.professionCategories.get(profession.toLowerCase()) || null;
  }
}