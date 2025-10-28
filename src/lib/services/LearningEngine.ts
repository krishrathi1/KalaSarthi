/**
 * Learning Engine
 * Learns from user interactions to improve matching accuracy over time
 */

export interface InteractionEvent {
  buyerId: string;
  artisanId: string;
  searchQuery: string;
  relevanceScore: number;
  action: 'viewed' | 'contacted' | 'hired' | 'skipped';
  timestamp: Date;
  sessionId: string;
}

export interface LearningWeights {
  skillMatchWeight: number;
  portfolioMatchWeight: number;
  locationWeight: number;
  ratingWeight: number;
  lastUpdated: Date;
}

export interface UserLearningProfile {
  buyerId: string;
  weights: LearningWeights;
  interactionHistory: InteractionEvent[];
  preferences: {
    preferredCategories: string[];
    averagePriceRange: { min: number; max: number };
    preferredDistance: number;
    qualityPreference: 'budget' | 'standard' | 'premium';
  };
  successMetrics: {
    totalSearches: number;
    contactRate: number;
    hireRate: number;
    satisfactionScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class LearningEngine {
  private static instance: LearningEngine;
  private userProfiles: Map<string, UserLearningProfile>;
  private defaultWeights: LearningWeights;
  
  constructor() {
    this.userProfiles = new Map();
    this.defaultWeights = {
      skillMatchWeight: 0.4,
      portfolioMatchWeight: 0.3,
      locationWeight: 0.2,
      ratingWeight: 0.1,
      lastUpdated: new Date()
    };
  }
  
  static getInstance(): LearningEngine {
    if (!LearningEngine.instance) {
      LearningEngine.instance = new LearningEngine();
    }
    return LearningEngine.instance;
  }
  
  /**
   * Record user interaction for learning
   */
  async recordInteraction(event: InteractionEvent): Promise<void> {
    try {
      console.log(`📝 Recording interaction: ${event.action} for artisan ${event.artisanId}`);
      
      let userProfile = this.userProfiles.get(event.buyerId);
      
      if (!userProfile) {
        userProfile = this.createNewUserProfile(event.buyerId);
      }
      
      // Add interaction to history
      userProfile.interactionHistory.push(event);
      
      // Keep only last 100 interactions per user
      if (userProfile.interactionHistory.length > 100) {
        userProfile.interactionHistory.shift();
      }
      
      // Update success metrics
      this.updateSuccessMetrics(userProfile, event);
      
      // Update preferences based on interaction
      this.updateUserPreferences(userProfile, event);
      
      // Adjust weights if this was a successful interaction
      if (event.action === 'hired' || event.action === 'contacted') {
        this.adjustWeights(userProfile, event);
      }
      
      userProfile.updatedAt = new Date();
      this.userProfiles.set(event.buyerId, userProfile);
      
    } catch (error) {
      console.error('❌ Failed to record interaction:', error);
    }
  }
  
  /**
   * Get learning weights for a user
   */
  async getLearningWeights(buyerId: string): Promise<LearningWeights> {
    const userProfile = this.userProfiles.get(buyerId);
    
    if (!userProfile) {
      return { ...this.defaultWeights };
    }
    
    return { ...userProfile.weights };
  }
  
  /**
   * Update user preferences based on successful interactions
   */
  updateUserPreferences(userProfile: UserLearningProfile, event: InteractionEvent): void {
    // This would analyze the artisan that was interacted with
    // and update user preferences accordingly
    
    // For now, implement basic preference tracking
    if (event.action === 'hired' || event.action === 'contacted') {
      // Update success metrics
      userProfile.successMetrics.totalSearches++;
      
      if (event.action === 'contacted') {
        userProfile.successMetrics.contactRate = 
          (userProfile.successMetrics.contactRate * 0.9) + (1 * 0.1);
      }
      
      if (event.action === 'hired') {
        userProfile.successMetrics.hireRate = 
          (userProfile.successMetrics.hireRate * 0.9) + (1 * 0.1);
      }
    }
  }
  
  /**
   * Adjust weights based on successful interactions
   */
  private adjustWeights(userProfile: UserLearningProfile, event: InteractionEvent): void {
    const weights = userProfile.weights;
    const adjustmentFactor = 0.05; // Small adjustment per interaction
    
    if (event.action === 'hired') {
      // Successful hire - boost the factors that led to this match
      if (event.relevanceScore > 0.7) {
        weights.skillMatchWeight = Math.min(0.6, weights.skillMatchWeight + adjustmentFactor);
      }
      
      // Boost rating weight for successful hires
      weights.ratingWeight = Math.min(0.3, weights.ratingWeight + adjustmentFactor * 0.5);
    }
    
    // Normalize weights to sum to 1
    const totalWeight = weights.skillMatchWeight + weights.portfolioMatchWeight + 
                       weights.locationWeight + weights.ratingWeight;
    
    if (totalWeight > 0) {
      weights.skillMatchWeight /= totalWeight;
      weights.portfolioMatchWeight /= totalWeight;
      weights.locationWeight /= totalWeight;
      weights.ratingWeight /= totalWeight;
    }
    
    weights.lastUpdated = new Date();
  }
  
  /**
   * Create new user profile
   */
  private createNewUserProfile(buyerId: string): UserLearningProfile {
    return {
      buyerId,
      weights: { ...this.defaultWeights },
      interactionHistory: [],
      preferences: {
        preferredCategories: [],
        averagePriceRange: { min: 0, max: 50000 },
        preferredDistance: 100,
        qualityPreference: 'standard'
      },
      successMetrics: {
        totalSearches: 0,
        contactRate: 0,
        hireRate: 0,
        satisfactionScore: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Update success metrics
   */
  private updateSuccessMetrics(userProfile: UserLearningProfile, event: InteractionEvent): void {
    const metrics = userProfile.successMetrics;
    
    // Update total searches
    if (event.action === 'viewed') {
      metrics.totalSearches++;
    }
    
    // Update contact rate (exponential moving average)
    if (event.action === 'contacted') {
      metrics.contactRate = (metrics.contactRate * 0.9) + (1 * 0.1);
    }
    
    // Update hire rate
    if (event.action === 'hired') {
      metrics.hireRate = (metrics.hireRate * 0.9) + (1 * 0.1);
      
      // Boost satisfaction score for successful hires
      metrics.satisfactionScore = Math.min(1, (metrics.satisfactionScore * 0.9) + (0.8 * 0.1));
    }
    
    // Decrease satisfaction for skipped results
    if (event.action === 'skipped') {
      metrics.satisfactionScore = Math.max(0, (metrics.satisfactionScore * 0.95) + (0.2 * 0.05));
    }
  }
  
  /**
   * Get user learning statistics
   */
  getUserStats(buyerId: string): {
    totalInteractions: number;
    successRate: number;
    preferredCategories: string[];
    learningProgress: number;
  } {
    const userProfile = this.userProfiles.get(buyerId);
    
    if (!userProfile) {
      return {
        totalInteractions: 0,
        successRate: 0,
        preferredCategories: [],
        learningProgress: 0
      };
    }
    
    const successfulInteractions = userProfile.interactionHistory.filter(
      event => event.action === 'hired' || event.action === 'contacted'
    ).length;
    
    return {
      totalInteractions: userProfile.interactionHistory.length,
      successRate: userProfile.interactionHistory.length > 0 
        ? successfulInteractions / userProfile.interactionHistory.length 
        : 0,
      preferredCategories: userProfile.preferences.preferredCategories,
      learningProgress: Math.min(1, userProfile.interactionHistory.length / 20) // Progress based on interaction count
    };
  }
  
  /**
   * Get overall learning engine statistics
   */
  getOverallStats(): {
    totalUsers: number;
    totalInteractions: number;
    averageSuccessRate: number;
    mostActiveUsers: number;
  } {
    const profiles = Array.from(this.userProfiles.values());
    
    const totalInteractions = profiles.reduce(
      (sum, profile) => sum + profile.interactionHistory.length, 0
    );
    
    const averageSuccessRate = profiles.length > 0
      ? profiles.reduce((sum, profile) => sum + profile.successMetrics.hireRate, 0) / profiles.length
      : 0;
    
    const activeUsers = profiles.filter(profile => 
      profile.interactionHistory.length > 5 &&
      (Date.now() - profile.updatedAt.getTime()) < (7 * 24 * 60 * 60 * 1000) // Active in last 7 days
    ).length;
    
    return {
      totalUsers: profiles.length,
      totalInteractions,
      averageSuccessRate,
      mostActiveUsers: activeUsers
    };
  }
  
  /**
   * Get learning insights for a specific user
   */
  async getLearningInsights(buyerId: string): Promise<{
    userProfile: UserLearningProfile | null;
    recommendations: string[];
    learningProgress: number;
    nextSteps: string[];
  }> {
    const userProfile = this.userProfiles.get(buyerId);
    
    if (!userProfile) {
      return {
        userProfile: null,
        recommendations: [
          'Start interacting with artisans to build your profile',
          'Try searching for different types of crafts',
          'Contact artisans that match your needs'
        ],
        learningProgress: 0,
        nextSteps: [
          'Perform your first search',
          'View artisan profiles',
          'Contact an artisan'
        ]
      };
    }
    
    const stats = this.getUserStats(buyerId);
    const recommendations: string[] = [];
    const nextSteps: string[] = [];
    
    // Generate recommendations based on user behavior
    if (stats.successRate < 0.2) {
      recommendations.push('Try refining your search terms for better matches');
      recommendations.push('Consider expanding your location radius');
      nextSteps.push('Use more specific keywords in searches');
    }
    
    if (userProfile.successMetrics.contactRate < 0.1) {
      recommendations.push('Consider contacting artisans with high relevance scores');
      nextSteps.push('Review artisan portfolios before contacting');
    }
    
    if (userProfile.preferences.preferredCategories.length === 0) {
      recommendations.push('Explore different craft categories to find your preferences');
      nextSteps.push('Browse various artisan categories');
    }
    
    // Default recommendations if user is doing well
    if (recommendations.length === 0) {
      recommendations.push('Your matching preferences are well-tuned');
      recommendations.push('Continue exploring new artisans');
      nextSteps.push('Try searching for seasonal or trending crafts');
    }
    
    return {
      userProfile,
      recommendations,
      learningProgress: stats.learningProgress,
      nextSteps
    };
  }
  
  /**
   * Get overall learning system statistics
   */
  async getLearningStats(): Promise<{
    totalUsers: number;
    totalInteractions: number;
    averageSuccessRate: number;
    activeUsers: number;
    learningEffectiveness: number;
    topPerformingWeights: LearningWeights;
    recentTrends: {
      newUsersThisWeek: number;
      interactionsThisWeek: number;
      averageSessionLength: number;
    };
  }> {
    const profiles = Array.from(this.userProfiles.values());
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Calculate basic stats
    const totalInteractions = profiles.reduce(
      (sum, profile) => sum + profile.interactionHistory.length, 0
    );
    
    const averageSuccessRate = profiles.length > 0
      ? profiles.reduce((sum, profile) => sum + profile.successMetrics.hireRate, 0) / profiles.length
      : 0;
    
    const activeUsers = profiles.filter(profile => 
      profile.interactionHistory.length > 0 &&
      (now - profile.updatedAt.getTime()) < oneWeekAgo
    ).length;
    
    // Calculate learning effectiveness (improvement over time)
    let learningEffectiveness = 0;
    if (profiles.length > 0) {
      const profilesWithHistory = profiles.filter(p => p.interactionHistory.length >= 10);
      if (profilesWithHistory.length > 0) {
        learningEffectiveness = profilesWithHistory.reduce((sum, profile) => {
          const recentInteractions = profile.interactionHistory.slice(-5);
          const earlyInteractions = profile.interactionHistory.slice(0, 5);
          
          const recentSuccessRate = recentInteractions.filter(
            i => i.action === 'hired' || i.action === 'contacted'
          ).length / recentInteractions.length;
          
          const earlySuccessRate = earlyInteractions.filter(
            i => i.action === 'hired' || i.action === 'contacted'
          ).length / earlyInteractions.length;
          
          return sum + (recentSuccessRate - earlySuccessRate);
        }, 0) / profilesWithHistory.length;
      }
    }
    
    // Find top performing weights (from users with high success rates)
    const topPerformers = profiles
      .filter(p => p.successMetrics.hireRate > 0.3)
      .sort((a, b) => b.successMetrics.hireRate - a.successMetrics.hireRate)
      .slice(0, 10);
    
    const topPerformingWeights = topPerformers.length > 0
      ? topPerformers.reduce((avg, profile) => ({
          skillMatchWeight: avg.skillMatchWeight + profile.weights.skillMatchWeight / topPerformers.length,
          portfolioMatchWeight: avg.portfolioMatchWeight + profile.weights.portfolioMatchWeight / topPerformers.length,
          locationWeight: avg.locationWeight + profile.weights.locationWeight / topPerformers.length,
          ratingWeight: avg.ratingWeight + profile.weights.ratingWeight / topPerformers.length,
          lastUpdated: new Date()
        }), {
          skillMatchWeight: 0,
          portfolioMatchWeight: 0,
          locationWeight: 0,
          ratingWeight: 0,
          lastUpdated: new Date()
        })
      : { ...this.defaultWeights };
    
    // Calculate recent trends
    const newUsersThisWeek = profiles.filter(
      profile => (now - profile.createdAt.getTime()) < oneWeekAgo
    ).length;
    
    const recentInteractions = profiles.flatMap(profile =>
      profile.interactionHistory.filter(
        interaction => (now - interaction.timestamp.getTime()) < oneWeekAgo
      )
    );
    
    const interactionsThisWeek = recentInteractions.length;
    
    // Calculate average session length (time between first and last interaction in a session)
    const averageSessionLength = recentInteractions.length > 0
      ? recentInteractions.reduce((sum, interaction, index, arr) => {
          const sessionInteractions = arr.filter(i => i.sessionId === interaction.sessionId);
          if (sessionInteractions.length > 1) {
            const sessionStart = Math.min(...sessionInteractions.map(i => i.timestamp.getTime()));
            const sessionEnd = Math.max(...sessionInteractions.map(i => i.timestamp.getTime()));
            return sum + (sessionEnd - sessionStart);
          }
          return sum;
        }, 0) / recentInteractions.length
      : 0;
    
    return {
      totalUsers: profiles.length,
      totalInteractions,
      averageSuccessRate,
      activeUsers,
      learningEffectiveness: Math.max(0, Math.min(1, learningEffectiveness)),
      topPerformingWeights,
      recentTrends: {
        newUsersThisWeek,
        interactionsThisWeek,
        averageSessionLength: Math.round(averageSessionLength / (1000 * 60)) // Convert to minutes
      }
    };
  }
  
  /**
   * Clear learning data (for testing or privacy)
   */
  clearLearningData(buyerId?: string): void {
    if (buyerId) {
      this.userProfiles.delete(buyerId);
      console.log(`🗑️ Cleared learning data for user: ${buyerId}`);
    } else {
      this.userProfiles.clear();
      console.log('🗑️ Cleared all learning data');
    }
  }
}

export default LearningEngine;