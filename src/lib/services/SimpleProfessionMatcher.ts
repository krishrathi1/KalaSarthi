/**
 * Simple Profession Matcher - Direct keyword-based profession detection
 */

export interface SimpleProfessionMatch {
  profession: string;
  confidence: number;
  matchedKeywords: string[];
}

export class SimpleProfessionMatcher {
  private static instance: SimpleProfessionMatcher;
  
  private professionKeywords = {
    'woodworking': ['wood', 'wooden', 'door', 'doors', 'furniture', 'table', 'chair', 'cabinet', 'carpentry', 'carpenter', 'timber', 'teak', 'oak', 'woodwork'],
    'pottery': ['pottery', 'clay', 'ceramic', 'pot', 'pots', 'bowl', 'bowls', 'vase', 'plate', 'plates', 'terracotta'],
    'jewelry': ['jewelry', 'jewellery', 'gold', 'silver', 'ring', 'rings', 'necklace', 'earring', 'earrings', 'bracelet'],
    'textiles': ['textile', 'textiles', 'fabric', 'cloth', 'saree', 'sarees', 'weaving', 'silk', 'cotton', 'wool'],
    'metalwork': ['metal', 'iron', 'steel', 'brass', 'bronze', 'gate', 'gates', 'railing', 'sculpture'],
    'painting': ['painting', 'paint', 'canvas', 'art', 'portrait', 'mural', 'artwork']
  };

  public static getInstance(): SimpleProfessionMatcher {
    if (!SimpleProfessionMatcher.instance) {
      SimpleProfessionMatcher.instance = new SimpleProfessionMatcher();
    }
    return SimpleProfessionMatcher.instance;
  }

  public detectProfession(query: string): SimpleProfessionMatch {
    const queryLower = query.toLowerCase();
    const results: SimpleProfessionMatch[] = [];

    for (const [profession, keywords] of Object.entries(this.professionKeywords)) {
      const matchedKeywords = keywords.filter(keyword => queryLower.includes(keyword));
      
      if (matchedKeywords.length > 0) {
        const confidence = Math.min(1.0, matchedKeywords.length * 0.3); // Better confidence calculation
        results.push({
          profession,
          confidence,
          matchedKeywords
        });
      }
    }

    // Return the profession with highest confidence, or default to pottery
    if (results.length > 0) {
      results.sort((a, b) => b.confidence - a.confidence);
      return results[0];
    }

    return {
      profession: 'pottery',
      confidence: 0.1,
      matchedKeywords: []
    };
  }
}