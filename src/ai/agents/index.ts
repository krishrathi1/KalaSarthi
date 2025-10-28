// Export all AI agents for Buyer Connect
export { requirementAnalyzerAgent, type RequirementAnalysisInput, type RequirementAnalysisOutput } from './requirement-analyzer';
export { confidenceScorerAgent, type ConfidenceScoringInput, type ConfidenceScoringOutput } from './confidence-scorer';
export { matchingOrchestratorAgent, type MatchingRequestInput, type ArtisanMatchResult, type MatchingResultOutput } from './matching-orchestrator';

// Initialize all agents
export async function initializeBuyerConnectAgents(): Promise<void> {
  console.log('🤖 Initializing Buyer Connect AI agents...');
  
  try {
    // Agents are automatically registered when imported
    // This function can be used for any additional setup
    
    console.log('✅ Requirement Analyzer Agent initialized');
    console.log('✅ Confidence Scorer Agent initialized');
    console.log('✅ Matching Orchestrator Agent initialized');
    
    console.log('🎉 All Buyer Connect AI agents initialized successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize Buyer Connect agents:', error);
    throw error;
  }
}