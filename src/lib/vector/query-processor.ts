/**
 * Query Processing and Expansion
 * Processes and enhances user queries for better semantic search
 */

export interface ProcessedQuery {
  originalQuery: string;
  cleanedQuery: string;
  expandedQuery: string;
  extractedConcepts: string[];
  queryType: 'product' | 'skill' | 'material' | 'style' | 'mixed';
  confidence: number;
  processingTime: number;
  metadata: {
    language: string;
    intentClarity: number;
    specificityScore: number;
    expandedTerms: string[];
  };
}

export interface QueryExpansionRule {
  trigger: string;
  expansions: string[];
  weight: number;
  category: string;
}

export interface ConceptMapping {
  concept: string;
  synonyms: string[];
  related: string[];
  category: string;
  weight: number;
}

export class QueryProcessor {
  private expansionRules: QueryExpansionRule[];
  private conceptMappings: Map<string, ConceptMapping>;
  private stopWords: Set<string>;
  private craftKeywords: Map<string, string[]>;
  
  constructor() {
    this.initializeExpansionRules();
    this.initializeConceptMappings();
    this.initializeStopWords();
    this.initializeCraftKeywords();
  }
  
  /**
   * Process and expand a user query
   */
  async processQuery(query: string): Promise<ProcessedQuery> {
    const startTime = Date.now();
    
    console.log(`🔍 Processing query: "${query}"`);
    
    try {
      // Step 1: Clean the query
      const cleanedQuery = this.cleanQuery(query);
      
      // Step 2: Extract concepts
      const extractedConcepts = this.extractConcepts(cleanedQuery);
      
      // Step 3: Determine query type
      const queryType = this.determineQueryType(cleanedQuery, extractedConcepts);
      
      // Step 4: Expand the query
      const expandedQuery = await this.expandQuery(cleanedQuery, extractedConcepts, queryType);
      
      // Step 5: Calculate confidence and metadata
      const confidence = this.calculateQueryConfidence(cleanedQuery, extractedConcepts, expandedQuery);
      const metadata = this.generateQueryMetadata(cleanedQuery, expandedQuery, extractedConcepts);
      
      const processedQuery: ProcessedQuery = {
        originalQuery: query,
        cleanedQuery,
        expandedQuery,
        extractedConcepts,
        queryType,
        confidence,
        processingTime: Date.now() - startTime,
        metadata
      };
      
      console.log(`✅ Processed query in ${processedQuery.processingTime}ms (confidence: ${(confidence * 100).toFixed(1)}%)`);
      console.log(`   Type: ${queryType}, Concepts: ${extractedConcepts.length}, Expanded terms: ${metadata.expandedTerms.length}`);
      
      return processedQuery;
      
    } catch (error) {
      console.error('❌ Failed to process query:', error);
      throw error;
    }
  }
  
  /**
   * Process multiple queries in batch
   */
  async processQueries(queries: string[]): Promise<ProcessedQuery[]> {
    console.log(`🔄 Processing ${queries.length} queries in batch`);
    
    const results = await Promise.all(
      queries.map(query => this.processQuery(query))
    );
    
    console.log(`✅ Processed ${results.length} queries successfully`);
    return results;
  }
  
  /**
   * Clean and normalize the query
   */
  private cleanQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, ' ') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  /**
   * Extract meaningful concepts from the query
   */
  private extractConcepts(query: string): string[] {
    const words = query.split(/\s+/);
    const concepts: string[] = [];
    
    // Extract individual words (excluding stop words)
    words.forEach(word => {
      if (word.length > 2 && !this.stopWords.has(word)) {
        concepts.push(word);
      }
    });
    
    // Extract multi-word concepts
    const multiWordConcepts = this.extractMultiWordConcepts(query);
    concepts.push(...multiWordConcepts);
    
    // Remove duplicates and return
    return [...new Set(concepts)];
  }
  
  /**
   * Extract multi-word concepts and phrases
   */
  private extractMultiWordConcepts(query: string): string[] {
    const concepts: string[] = [];
    
    // Common craft-related phrases
    const phrases = [
      'hand made', 'handmade', 'hand crafted', 'handcrafted',
      'custom made', 'bespoke', 'one of a kind', 'unique piece',
      'traditional craft', 'heritage craft', 'folk art',
      'home decor', 'wall art', 'table decoration',
      'wedding gift', 'birthday gift', 'anniversary gift',
      'natural materials', 'eco friendly', 'sustainable',
      'vintage style', 'modern design', 'contemporary art'
    ];
    
    phrases.forEach(phrase => {
      if (query.includes(phrase)) {
        concepts.push(phrase.replace(/\s+/g, '_'));
      }
    });
    
    return concepts;
  }
  
  /**
   * Determine the type of query based on content
   */
  private determineQueryType(
    query: string,
    concepts: string[]
  ): 'product' | 'skill' | 'material' | 'style' | 'mixed' {
    const productKeywords = ['bowl', 'vase', 'jewelry', 'necklace', 'bracelet', 'table', 'chair', 'lamp', 'bag', 'scarf'];
    const skillKeywords = ['pottery', 'woodworking', 'weaving', 'carving', 'painting', 'sculpting', 'embroidery'];
    const materialKeywords = ['wood', 'clay', 'metal', 'fabric', 'leather', 'glass', 'stone', 'ceramic'];
    const styleKeywords = ['traditional', 'modern', 'vintage', 'rustic', 'elegant', 'minimalist', 'ornate'];
    
    let productScore = 0;
    let skillScore = 0;
    let materialScore = 0;
    let styleScore = 0;
    
    concepts.forEach(concept => {
      if (productKeywords.some(keyword => concept.includes(keyword))) productScore++;
      if (skillKeywords.some(keyword => concept.includes(keyword))) skillScore++;
      if (materialKeywords.some(keyword => concept.includes(keyword))) materialScore++;
      if (styleKeywords.some(keyword => concept.includes(keyword))) styleScore++;
    });
    
    const scores = { product: productScore, skill: skillScore, material: materialScore, style: styleScore };
    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore === 0) return 'mixed';
    
    const topTypes = Object.entries(scores).filter(([_, score]) => score === maxScore);
    
    if (topTypes.length > 1) return 'mixed';
    
    return topTypes[0][0] as 'product' | 'skill' | 'material' | 'style';
  }
  
  /**
   * Expand query with related terms and synonyms
   */
  private async expandQuery(
    query: string,
    concepts: string[],
    queryType: string
  ): Promise<string> {
    const expansions: string[] = [];
    
    // Add original query
    expansions.push(query);
    
    // Expand based on query type
    switch (queryType) {
      case 'product':
        expansions.push(...this.expandProductQuery(concepts));
        break;
      case 'skill':
        expansions.push(...this.expandSkillQuery(concepts));
        break;
      case 'material':
        expansions.push(...this.expandMaterialQuery(concepts));
        break;
      case 'style':
        expansions.push(...this.expandStyleQuery(concepts));
        break;
      default:
        expansions.push(...this.expandMixedQuery(concepts));
    }
    
    // Apply expansion rules
    concepts.forEach(concept => {
      const rules = this.expansionRules.filter(rule => 
        concept.includes(rule.trigger) || rule.trigger.includes(concept)
      );
      
      rules.forEach(rule => {
        expansions.push(...rule.expansions);
      });
    });
    
    // Add concept mappings
    concepts.forEach(concept => {
      const mapping = this.conceptMappings.get(concept);
      if (mapping) {
        expansions.push(...mapping.synonyms);
        expansions.push(...mapping.related);
      }
    });
    
    // Remove duplicates and join
    const uniqueExpansions = [...new Set(expansions)];
    return uniqueExpansions.join(' ');
  }
  
  /**
   * Expand product-focused queries
   */
  private expandProductQuery(concepts: string[]): string[] {
    const expansions: string[] = [];
    
    concepts.forEach(concept => {
      const productExpansions = this.craftKeywords.get('products') || [];
      productExpansions.forEach(expansion => {
        if (concept.includes(expansion) || expansion.includes(concept)) {
          expansions.push(expansion);
        }
      });
    });
    
    return expansions;
  }
  
  /**
   * Expand skill-focused queries
   */
  private expandSkillQuery(concepts: string[]): string[] {
    const expansions: string[] = [];
    
    concepts.forEach(concept => {
      const skillExpansions = this.craftKeywords.get('skills') || [];
      skillExpansions.forEach(expansion => {
        if (concept.includes(expansion) || expansion.includes(concept)) {
          expansions.push(expansion);
        }
      });
    });
    
    return expansions;
  }
  
  /**
   * Expand material-focused queries
   */
  private expandMaterialQuery(concepts: string[]): string[] {
    const expansions: string[] = [];
    
    concepts.forEach(concept => {
      const materialExpansions = this.craftKeywords.get('materials') || [];
      materialExpansions.forEach(expansion => {
        if (concept.includes(expansion) || expansion.includes(concept)) {
          expansions.push(expansion);
        }
      });
    });
    
    return expansions;
  }
  
  /**
   * Expand style-focused queries
   */
  private expandStyleQuery(concepts: string[]): string[] {
    const expansions: string[] = [];
    
    concepts.forEach(concept => {
      const styleExpansions = this.craftKeywords.get('styles') || [];
      styleExpansions.forEach(expansion => {
        if (concept.includes(expansion) || expansion.includes(concept)) {
          expansions.push(expansion);
        }
      });
    });
    
    return expansions;
  }
  
  /**
   * Expand mixed queries
   */
  private expandMixedQuery(concepts: string[]): string[] {
    const expansions: string[] = [];
    
    // Add general craft-related terms
    expansions.push('handmade', 'artisan', 'craft', 'handcrafted', 'traditional', 'custom');
    
    return expansions;
  }
  
  /**
   * Calculate confidence score for the query
   */
  private calculateQueryConfidence(
    query: string,
    concepts: string[],
    expandedQuery: string
  ): number {
    let confidence = 0;
    
    // Base confidence from query length
    if (query.length > 5) confidence += 0.2;
    if (query.length > 15) confidence += 0.2;
    if (query.length > 30) confidence += 0.1;
    
    // Confidence from number of concepts
    if (concepts.length > 1) confidence += 0.2;
    if (concepts.length > 3) confidence += 0.2;
    
    // Confidence from expansion quality
    const expansionRatio = expandedQuery.length / query.length;
    if (expansionRatio > 1.5) confidence += 0.1;
    if (expansionRatio > 2.0) confidence += 0.1;
    
    return Math.min(1, confidence);
  }
  
  /**
   * Generate metadata for the processed query
   */
  private generateQueryMetadata(
    query: string,
    expandedQuery: string,
    concepts: string[]
  ): ProcessedQuery['metadata'] {
    const originalWords = query.split(/\s+/).length;
    const expandedWords = expandedQuery.split(/\s+/).length;
    const expandedTerms = expandedQuery.split(/\s+/).filter(word => !query.includes(word));
    
    return {
      language: 'en', // Could be detected in the future
      intentClarity: this.calculateIntentClarity(query, concepts),
      specificityScore: this.calculateSpecificityScore(query, concepts),
      expandedTerms
    };
  }
  
  /**
   * Calculate how clear the user's intent is
   */
  private calculateIntentClarity(query: string, concepts: string[]): number {
    let clarity = 0;
    
    // Clear intent indicators
    const intentWords = ['need', 'want', 'looking for', 'buy', 'purchase', 'find', 'get'];
    if (intentWords.some(word => query.includes(word))) {
      clarity += 0.3;
    }
    
    // Specific product mentions
    const productWords = ['bowl', 'vase', 'table', 'chair', 'jewelry', 'necklace'];
    if (productWords.some(word => query.includes(word))) {
      clarity += 0.4;
    }
    
    // Descriptive adjectives
    const descriptiveWords = ['beautiful', 'unique', 'custom', 'handmade', 'traditional'];
    if (descriptiveWords.some(word => query.includes(word))) {
      clarity += 0.3;
    }
    
    return Math.min(1, clarity);
  }
  
  /**
   * Calculate how specific the query is
   */
  private calculateSpecificityScore(query: string, concepts: string[]): number {
    let specificity = 0;
    
    // Length-based specificity
    if (query.length > 20) specificity += 0.3;
    if (query.length > 50) specificity += 0.2;
    
    // Concept-based specificity
    if (concepts.length > 2) specificity += 0.3;
    if (concepts.length > 4) specificity += 0.2;
    
    return Math.min(1, specificity);
  }
  
  /**
   * Initialize expansion rules
   */
  private initializeExpansionRules(): void {
    this.expansionRules = [
      {
        trigger: 'pottery',
        expansions: ['ceramics', 'clay work', 'earthenware', 'stoneware', 'porcelain', 'glazed', 'kiln fired'],
        weight: 1.0,
        category: 'craft'
      },
      {
        trigger: 'woodworking',
        expansions: ['carpentry', 'furniture', 'wood craft', 'timber work', 'joinery', 'carving'],
        weight: 1.0,
        category: 'craft'
      },
      {
        trigger: 'jewelry',
        expansions: ['accessories', 'ornaments', 'precious metals', 'gems', 'handcrafted jewelry'],
        weight: 1.0,
        category: 'craft'
      },
      {
        trigger: 'textiles',
        expansions: ['fabric work', 'weaving', 'embroidery', 'cloth', 'fiber art', 'handloom'],
        weight: 1.0,
        category: 'craft'
      },
      {
        trigger: 'leather',
        expansions: ['hide work', 'leather craft', 'tanning', 'leather goods', 'accessories'],
        weight: 1.0,
        category: 'craft'
      },
      {
        trigger: 'handmade',
        expansions: ['artisan', 'handcrafted', 'hand made', 'crafted', 'artisanal', 'traditional'],
        weight: 0.8,
        category: 'quality'
      },
      {
        trigger: 'custom',
        expansions: ['bespoke', 'personalized', 'made to order', 'tailored', 'unique'],
        weight: 0.8,
        category: 'service'
      },
      {
        trigger: 'traditional',
        expansions: ['heritage', 'cultural', 'authentic', 'classic', 'time honored'],
        weight: 0.7,
        category: 'style'
      }
    ];
  }
  
  /**
   * Initialize concept mappings
   */
  private initializeConceptMappings(): void {
    this.conceptMappings = new Map([
      ['pottery', {
        concept: 'pottery',
        synonyms: ['ceramics', 'clay work', 'earthenware'],
        related: ['glazing', 'kiln firing', 'wheel throwing', 'hand building'],
        category: 'craft',
        weight: 1.0
      }],
      ['woodworking', {
        concept: 'woodworking',
        synonyms: ['carpentry', 'wood craft', 'timber work'],
        related: ['furniture making', 'carving', 'joinery', 'finishing'],
        category: 'craft',
        weight: 1.0
      }],
      ['jewelry', {
        concept: 'jewelry',
        synonyms: ['jewellery', 'accessories', 'ornaments'],
        related: ['metalworking', 'gem setting', 'wire work', 'beading'],
        category: 'craft',
        weight: 1.0
      }],
      ['handmade', {
        concept: 'handmade',
        synonyms: ['handcrafted', 'hand made', 'artisanal'],
        related: ['traditional', 'authentic', 'crafted', 'artisan made'],
        category: 'quality',
        weight: 0.9
      }],
      ['custom', {
        concept: 'custom',
        synonyms: ['bespoke', 'personalized', 'made to order'],
        related: ['unique', 'tailored', 'individual', 'special'],
        category: 'service',
        weight: 0.8
      }]
    ]);
  }
  
  /**
   * Initialize stop words
   */
  private initializeStopWords(): void {
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'my', 'your',
      'his', 'her', 'its', 'our', 'their', 'me', 'him', 'her', 'us', 'them', 'myself', 'yourself',
      'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves'
    ]);
  }
  
  /**
   * Initialize craft-specific keywords
   */
  private initializeCraftKeywords(): void {
    this.craftKeywords = new Map([
      ['products', [
        'bowl', 'vase', 'pot', 'plate', 'cup', 'mug', 'jar', 'sculpture',
        'table', 'chair', 'cabinet', 'shelf', 'box', 'frame',
        'necklace', 'bracelet', 'ring', 'earrings', 'pendant', 'brooch',
        'bag', 'purse', 'wallet', 'belt', 'shoes', 'sandals',
        'scarf', 'shawl', 'blanket', 'cushion', 'tapestry', 'rug'
      ]],
      ['skills', [
        'pottery', 'ceramics', 'woodworking', 'carpentry', 'carving', 'turning',
        'jewelry making', 'metalworking', 'silversmithing', 'goldsmithing',
        'weaving', 'embroidery', 'knitting', 'crocheting', 'quilting',
        'leather working', 'tanning', 'tooling', 'stitching',
        'painting', 'drawing', 'sculpting', 'modeling'
      ]],
      ['materials', [
        'clay', 'ceramic', 'porcelain', 'stoneware', 'earthenware',
        'wood', 'oak', 'pine', 'teak', 'mahogany', 'bamboo',
        'metal', 'silver', 'gold', 'copper', 'brass', 'bronze', 'iron',
        'fabric', 'cotton', 'silk', 'wool', 'linen', 'hemp',
        'leather', 'hide', 'suede', 'canvas',
        'glass', 'crystal', 'stone', 'marble', 'granite'
      ]],
      ['styles', [
        'traditional', 'modern', 'contemporary', 'vintage', 'antique',
        'rustic', 'country', 'farmhouse', 'industrial', 'minimalist',
        'ornate', 'decorative', 'elegant', 'simple', 'complex',
        'colorful', 'monochrome', 'natural', 'artistic', 'functional'
      ]]
    ]);
  }
  
  /**
   * Get expansion suggestions for a query
   */
  getExpansionSuggestions(query: string): string[] {
    const concepts = this.extractConcepts(this.cleanQuery(query));
    const suggestions: string[] = [];
    
    concepts.forEach(concept => {
      const mapping = this.conceptMappings.get(concept);
      if (mapping) {
        suggestions.push(...mapping.synonyms);
        suggestions.push(...mapping.related);
      }
    });
    
    return [...new Set(suggestions)].slice(0, 10);
  }
  
  /**
   * Validate processed query
   */
  validateProcessedQuery(processedQuery: ProcessedQuery): boolean {
    return (
      processedQuery.originalQuery.length > 0 &&
      processedQuery.cleanedQuery.length > 0 &&
      processedQuery.expandedQuery.length > 0 &&
      processedQuery.confidence >= 0 &&
      processedQuery.confidence <= 1 &&
      processedQuery.extractedConcepts.length > 0
    );
  }
}

export default QueryProcessor;