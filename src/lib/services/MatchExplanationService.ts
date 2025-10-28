/**
 * Match Explanation Service for Intelligent Profession Matching
 * 
 * This service generates clear, user-friendly explanations for why artisans
 * were matched to buyer queries, providing transparency and building trust.
 */

import { IUser } from '../models/User';
import { EnhancedQueryAnalysis, MatchExplanation } from './IntelligentProfessionMatcher';
import { DetailedScore } from './RelevanceScoringService';

export interface UserFriendlyExplanation {
  summary: string;
  keyStrengths: string[];
  matchHighlights: {
    profession: string | null;
    skills: string[];
    materials: string[];
    techniques: string[];
    experience: string | null;
    location: string | null;
    performance: string | null;
  };
  confidenceIndicator: {
    level: 'high' | 'medium' | 'low';
    percentage: number;
    description: string;
  };
  whyThisArtisan: string;
  potentialConcerns: string[];
  nextSteps: string[];
}

export interface ExplanationTemplate {
  profession: Record<string, string>;
  skills: Record<string, string>;
  materials: Record<string, string>;
  techniques: Record<string, string>;
  experience: Record<string, string>;
  performance: Record<string, string>;
}

export class MatchExplanationService {
  private static instance: MatchExplanationService;
  
  private explanationTemplates: ExplanationTemplate = {
    profession: {
      'pottery': 'specializes in creating beautiful ceramic and clay items',
      'woodworking': 'crafts high-quality wooden furniture and decorative pieces',
      'jewelry': 'creates exquisite jewelry and precious metal accessories',
      'textiles': 'weaves and creates beautiful fabric items and clothing',
      'leather work': 'crafts durable and stylish leather goods',
      'metalwork': 'forges and shapes metal into functional and decorative items',
      'painting': 'creates stunning artwork and decorative paintings',
      'embroidery': 'adds intricate decorative stitching and threadwork'
    },
    skills: {
      'carving': 'expert carving skills for detailed decorative work',
      'weaving': 'traditional weaving techniques for authentic textiles',
      'casting': 'precision casting for complex metal and jewelry pieces',
      'glazing': 'professional glazing for beautiful ceramic finishes',
      'oxidizing': 'specialized oxidizing techniques for unique metal effects',
      'engraving': 'detailed engraving work for personalized items',
      'stitching': 'precise stitching for durable and beautiful results'
    },
    materials: {
      'wood': 'extensive experience working with various wood types',
      'silver': 'specialized in silver crafting and finishing',
      'clay': 'expert in clay preparation and ceramic techniques',
      'silk': 'skilled in handling and working with premium silk',
      'leather': 'experienced in leather selection and treatment',
      'gold': 'certified in gold working and precious metal handling',
      'cotton': 'proficient in cotton textile production'
    },
    techniques: {
      'handwoven': 'traditional handweaving for authentic results',
      'hand-carved': 'intricate hand-carving for unique pieces',
      'forged': 'traditional forging methods for strength and beauty',
      'thrown': 'wheel-thrown pottery for perfect symmetry',
      'embossed': 'detailed embossing for raised decorative patterns',
      'inlaid': 'precision inlay work for complex designs'
    },
    experience: {
      'master': 'master-level craftsperson with decades of experience',
      'expert': 'highly experienced artisan with proven expertise',
      'intermediate': 'skilled craftsperson with solid experience',
      'beginner': 'emerging artisan with fresh perspective and dedication'
    },
    performance: {
      'excellent': 'consistently delivers exceptional results with high customer satisfaction',
      'good': 'reliable delivery with good customer feedback',
      'average': 'steady performance with satisfactory results'
    }
  };

  private constructor() {}

  public static getInstance(): MatchExplanationService {
    if (!MatchExplanationService.instance) {
      MatchExplanationService.instance = new MatchExplanationService();
    }
    return MatchExplanationService.instance;
  }

  /**
   * Generate comprehensive user-friendly explanation
   */
  public generateUserFriendlyExplanation(
    artisan: IUser,
    analysis: EnhancedQueryAnalysis,
    detailedScore: DetailedScore,
    matchExplanation: MatchExplanation
  ): UserFriendlyExplanation {
    const summary = this.generateSummary(artisan, analysis, detailedScore);
    const keyStrengths = this.identifyKeyStrengths(detailedScore, matchExplanation);
    const matchHighlights = this.generateMatchHighlights(artisan, analysis, detailedScore);
    const confidenceIndicator = this.generateConfidenceIndicator(detailedScore);
    const whyThisArtisan = this.generateWhyThisArtisan(artisan, analysis, detailedScore);
    const potentialConcerns = this.identifyPotentialConcerns(detailedScore, artisan);
    const nextSteps = this.generateNextSteps(artisan, analysis);

    return {
      summary,
      keyStrengths,
      matchHighlights,
      confidenceIndicator,
      whyThisArtisan,
      potentialConcerns,
      nextSteps
    };
  }

  /**
   * Generate a concise summary of why this artisan is a good match
   */
  private generateSummary(
    artisan: IUser,
    analysis: EnhancedQueryAnalysis,
    detailedScore: DetailedScore
  ): string {
    const profession = artisan.artisticProfession?.toLowerCase() || 'artisan';
    const professionDesc = this.explanationTemplates.profession[profession] || `works in ${profession}`;
    
    const scorePercentage = Math.round(detailedScore.normalizedScore * 100);
    const confidenceLevel = detailedScore.confidenceLevel;
    
    let summary = `${artisan.name} is a ${confidenceLevel} confidence match (${scorePercentage}%) who ${professionDesc}.`;
    
    // Add top matching factor
    const topFactor = this.getTopMatchingFactor(detailedScore.breakdown);
    if (topFactor) {
      summary += ` ${topFactor}`;
    }

    return summary;
  }

  /**
   * Identify the key strengths that make this artisan suitable
   */
  private identifyKeyStrengths(
    detailedScore: DetailedScore,
    matchExplanation: MatchExplanation
  ): string[] {
    const strengths: string[] = [];
    const breakdown = detailedScore.breakdown;

    // Add strengths based on high scores
    if (breakdown.professionScore > 0.7) {
      strengths.push('Perfect profession alignment for your needs');
    }

    if (breakdown.skillScore > 0.6) {
      strengths.push('Strong skill set matching your requirements');
    }

    if (breakdown.materialScore > 0.6) {
      strengths.push('Expert knowledge of required materials');
    }

    if (breakdown.techniqueScore > 0.6) {
      strengths.push('Specialized in the techniques you need');
    }

    if (breakdown.experienceScore > 0.7) {
      strengths.push('High level of experience and expertise');
    }

    if (breakdown.performanceScore > 0.7) {
      strengths.push('Excellent track record and customer satisfaction');
    }

    if (breakdown.locationScore > 0.8) {
      strengths.push('Conveniently located for your project');
    }

    // Add specific matched elements
    if (matchExplanation.matchedSkills.length > 0) {
      strengths.push(`Skilled in: ${matchExplanation.matchedSkills.slice(0, 3).join(', ')}`);
    }

    if (matchExplanation.matchedMaterials.length > 0) {
      strengths.push(`Works with: ${matchExplanation.matchedMaterials.slice(0, 3).join(', ')}`);
    }

    return strengths.slice(0, 5); // Limit to top 5 strengths
  }

  /**
   * Generate detailed match highlights for each category
   */
  private generateMatchHighlights(
    artisan: IUser,
    analysis: EnhancedQueryAnalysis,
    detailedScore: DetailedScore
  ): UserFriendlyExplanation['matchHighlights'] {
    const breakdown = detailedScore.breakdown;
    
    return {
      profession: breakdown.professionScore > 0.3 ? 
        this.formatProfessionHighlight(artisan.artisticProfession) : null,
      
      skills: this.formatSkillsHighlight(artisan, analysis, breakdown.skillScore),
      
      materials: this.formatMaterialsHighlight(artisan, analysis, breakdown.materialScore),
      
      techniques: this.formatTechniquesHighlight(artisan, analysis, breakdown.techniqueScore),
      
      experience: breakdown.experienceScore > 0.3 ? 
        this.formatExperienceHighlight(artisan) : null,
      
      location: breakdown.locationScore > 0.3 ? 
        this.formatLocationHighlight(artisan) : null,
      
      performance: breakdown.performanceScore > 0.3 ? 
        this.formatPerformanceHighlight(artisan) : null
    };
  }

  /**
   * Generate confidence indicator with explanation
   */
  private generateConfidenceIndicator(detailedScore: DetailedScore): UserFriendlyExplanation['confidenceIndicator'] {
    const percentage = Math.round(detailedScore.normalizedScore * 100);
    const level = detailedScore.confidenceLevel;
    
    let description = '';
    switch (level) {
      case 'high':
        description = 'This artisan is an excellent match for your requirements with strong alignment across multiple factors.';
        break;
      case 'medium':
        description = 'This artisan is a good match with solid alignment in key areas relevant to your needs.';
        break;
      case 'low':
        description = 'This artisan may be suitable but has limited alignment with your specific requirements.';
        break;
    }

    return { level, percentage, description };
  }

  /**
   * Generate personalized explanation of why this specific artisan
   */
  private generateWhyThisArtisan(
    artisan: IUser,
    analysis: EnhancedQueryAnalysis,
    detailedScore: DetailedScore
  ): string {
    const breakdown = detailedScore.breakdown;
    const reasons: string[] = [];

    // Find the strongest matching factors
    const sortedFactors = Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    sortedFactors.forEach(([factor, score]) => {
      if (score > 0.5) {
        switch (factor) {
          case 'professionScore':
            reasons.push(`their specialization in ${artisan.artisticProfession} directly matches what you're looking for`);
            break;
          case 'skillScore':
            reasons.push('they have the specific skills needed for your project');
            break;
          case 'materialScore':
            reasons.push('they are experienced with the materials you want to use');
            break;
          case 'techniqueScore':
            reasons.push('they master the techniques required for your vision');
            break;
          case 'experienceScore':
            reasons.push('their experience level is well-suited for your project complexity');
            break;
          case 'performanceScore':
            reasons.push('they have a proven track record of delivering quality work');
            break;
        }
      }
    });

    if (reasons.length === 0) {
      return `${artisan.name} could be a good fit for your project based on their general expertise in ${artisan.artisticProfession}.`;
    }

    const baseText = `${artisan.name} stands out because `;
    if (reasons.length === 1) {
      return baseText + reasons[0] + '.';
    } else if (reasons.length === 2) {
      return baseText + reasons.join(' and ') + '.';
    } else {
      return baseText + reasons.slice(0, -1).join(', ') + ', and ' + reasons[reasons.length - 1] + '.';
    }
  }

  /**
   * Identify potential concerns or limitations
   */
  private identifyPotentialConcerns(detailedScore: DetailedScore, artisan: IUser): string[] {
    const concerns: string[] = [];
    const breakdown = detailedScore.breakdown;

    if (breakdown.professionScore < 0.3) {
      concerns.push('Profession alignment could be stronger for your specific needs');
    }

    if (breakdown.experienceScore < 0.4) {
      concerns.push('May have limited experience with complex projects');
    }

    if (breakdown.locationScore < 0.3) {
      concerns.push('Location may require additional coordination for delivery/installation');
    }

    if (breakdown.performanceScore < 0.4) {
      concerns.push('Limited performance history available for evaluation');
    }

    const responseTime = artisan.artisanConnectProfile?.performanceMetrics?.responseTime;
    if (responseTime && responseTime > 24) {
      concerns.push('May take longer to respond to initial inquiries');
    }

    const availability = artisan.artisanConnectProfile?.availabilityStatus;
    if (availability === 'busy') {
      concerns.push('Currently busy and may have limited immediate availability');
    } else if (availability === 'unavailable') {
      concerns.push('Currently unavailable for new projects');
    }

    return concerns.slice(0, 3); // Limit to top 3 concerns
  }

  /**
   * Generate suggested next steps for the buyer
   */
  private generateNextSteps(artisan: IUser, analysis: EnhancedQueryAnalysis): string[] {
    const steps: string[] = [];
    
    steps.push(`View ${artisan.name}'s full profile and portfolio`);
    steps.push('Send a message describing your project in detail');
    
    if (analysis.detectedIntent.action === 'commission') {
      steps.push('Discuss custom design options and timeline');
      steps.push('Request a detailed quote for your custom project');
    } else {
      steps.push('Ask about available products and pricing');
      steps.push('Inquire about delivery options and timeline');
    }

    const availability = artisan.artisanConnectProfile?.availabilityStatus;
    if (availability === 'busy') {
      steps.push('Ask about their current availability and project queue');
    }

    steps.push('Check references or reviews from previous customers');

    return steps;
  }

  // Helper methods for formatting highlights

  private formatProfessionHighlight(profession?: string): string {
    if (!profession) return 'General artisan services';
    
    const professionLower = profession.toLowerCase();
    const template = this.explanationTemplates.profession[professionLower];
    
    return template || `Specializes in ${profession}`;
  }

  private formatSkillsHighlight(
    artisan: IUser, 
    analysis: EnhancedQueryAnalysis, 
    score: number
  ): string[] {
    if (score < 0.3) return [];
    
    const skills = artisan.artisanConnectProfile?.matchingData?.skills || [];
    const relevantSkills = skills.filter(skill => 
      this.isSkillRelevantToQuery(skill, analysis)
    ).slice(0, 3);

    return relevantSkills.map(skill => {
      const template = this.explanationTemplates.skills[skill.toLowerCase()];
      return template || `Skilled in ${skill}`;
    });
  }

  private formatMaterialsHighlight(
    artisan: IUser, 
    analysis: EnhancedQueryAnalysis, 
    score: number
  ): string[] {
    if (score < 0.3) return [];
    
    const materials = artisan.artisanConnectProfile?.matchingData?.materials || [];
    const queryMaterials = analysis.extractedRequirements.materials;
    
    const matchedMaterials = materials.filter(material => 
      queryMaterials.some(qm => 
        material.toLowerCase().includes(qm.toLowerCase()) ||
        qm.toLowerCase().includes(material.toLowerCase())
      )
    ).slice(0, 3);

    return matchedMaterials.map(material => {
      const template = this.explanationTemplates.materials[material.toLowerCase()];
      return template || `Works with ${material}`;
    });
  }

  private formatTechniquesHighlight(
    artisan: IUser, 
    analysis: EnhancedQueryAnalysis, 
    score: number
  ): string[] {
    if (score < 0.3) return [];
    
    const techniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
    const queryTechniques = analysis.extractedRequirements.techniques;
    
    const matchedTechniques = techniques.filter(technique => 
      queryTechniques.some(qt => 
        technique.toLowerCase().includes(qt.toLowerCase()) ||
        qt.toLowerCase().includes(technique.toLowerCase())
      )
    ).slice(0, 3);

    return matchedTechniques.map(technique => {
      const template = this.explanationTemplates.techniques[technique.toLowerCase()];
      return template || `Skilled in ${technique}`;
    });
  }

  private formatExperienceHighlight(artisan: IUser): string {
    const level = artisan.artisanConnectProfile?.matchingData?.experienceLevel;
    const totalOrders = artisan.artisanConnectProfile?.performanceMetrics?.totalOrders || 0;
    
    let highlight = this.explanationTemplates.experience[level || 'intermediate'];
    
    if (totalOrders > 100) {
      highlight += ` with over ${totalOrders} completed projects`;
    } else if (totalOrders > 10) {
      highlight += ` with ${totalOrders} completed projects`;
    }

    return highlight;
  }

  private formatLocationHighlight(artisan: IUser): string {
    const location = artisan.artisanConnectProfile?.locationData?.address;
    if (!location) return 'Location information available';
    
    const city = location.city;
    const state = location.state;
    
    let highlight = `Based in ${city}`;
    if (state && state !== city) {
      highlight += `, ${state}`;
    }
    
    const deliveryOptions = artisan.artisanConnectProfile?.locationData?.deliveryOptions || [];
    if (deliveryOptions.length > 0) {
      highlight += ` with ${deliveryOptions.join(', ')} options`;
    }

    return highlight;
  }

  private formatPerformanceHighlight(artisan: IUser): string {
    const metrics = artisan.artisanConnectProfile?.performanceMetrics;
    if (!metrics) return 'Performance information available';
    
    const satisfaction = metrics.customerSatisfaction;
    const completionRate = metrics.completionRate;
    
    let highlight = '';
    
    if (satisfaction && satisfaction > 4.5) {
      highlight = 'Exceptional customer satisfaction (4.5+ stars)';
    } else if (satisfaction && satisfaction > 4) {
      highlight = 'High customer satisfaction (4+ stars)';
    } else if (completionRate && completionRate > 0.95) {
      highlight = 'Excellent project completion rate (95%+)';
    } else {
      highlight = 'Reliable performance history';
    }

    if (metrics.responseTime && metrics.responseTime < 6) {
      highlight += ' with quick response times';
    }

    return highlight;
  }

  private getTopMatchingFactor(breakdown: DetailedScore['breakdown']): string | null {
    const sortedFactors = Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a);
    
    const topFactor = sortedFactors[0];
    if (topFactor[1] < 0.5) return null;
    
    switch (topFactor[0]) {
      case 'professionScore':
        return 'They specialize exactly in what you need.';
      case 'skillScore':
        return 'Their skills are perfectly aligned with your requirements.';
      case 'materialScore':
        return 'They have extensive experience with your preferred materials.';
      case 'techniqueScore':
        return 'They master the specific techniques your project requires.';
      case 'performanceScore':
        return 'They have an outstanding track record of successful projects.';
      default:
        return null;
    }
  }

  private isSkillRelevantToQuery(skill: string, analysis: EnhancedQueryAnalysis): boolean {
    const skillLower = skill.toLowerCase();
    const requirements = analysis.extractedRequirements;
    
    return requirements.products.some(product => 
      skillLower.includes(product.toLowerCase()) ||
      product.toLowerCase().includes(skillLower)
    ) ||
    requirements.materials.some(material => 
      skillLower.includes(material.toLowerCase()) ||
      material.toLowerCase().includes(skillLower)
    ) ||
    requirements.techniques.some(technique => 
      skillLower.includes(technique.toLowerCase()) ||
      technique.toLowerCase().includes(skillLower)
    );
  }
}