#!/usr/bin/env node

/**
 * AI Infrastructure Initialization Script
 * 
 * This script initializes the AI infrastructure for the Buyer Connect feature.
 * It sets up agents, workflows, and populates initial data.
 */

import { initializeAIInfrastructure, agentOrchestrator, workflowManager, vectorStore } from './core';
import { aiMonitoringService } from './core/monitoring';
import { initializeBuyerConnectAgents } from './agents';

// Sample agents for Buyer Connect
const buyerConnectAgents = [
  {
    id: 'requirement-analyzer',
    name: 'Requirement Analyzer',
    description: 'Analyzes buyer requirements and extracts key information',
    capabilities: ['requirement-analysis', 'nlp', 'intent-detection'],
    status: 'active' as const,
    priority: 9,
    lastActivity: new Date()
  },
  {
    id: 'confidence-scorer',
    name: 'Confidence Scorer',
    description: 'Generates confidence scores for artisan-buyer matches',
    capabilities: ['confidence-scoring', 'matching', 'reasoning'],
    status: 'active' as const,
    priority: 8,
    lastActivity: new Date()
  },
  {
    id: 'cultural-context',
    name: 'Cultural Context Agent',
    description: 'Provides cultural context and authenticity information',
    capabilities: ['cultural-analysis', 'authenticity', 'education'],
    status: 'active' as const,
    priority: 7,
    lastActivity: new Date()
  },
  {
    id: 'conversation-mediator',
    name: 'Conversation Mediator',
    description: 'Facilitates cross-language communication and cultural understanding',
    capabilities: ['translation', 'mediation', 'cultural-sensitivity'],
    status: 'active' as const,
    priority: 8,
    lastActivity: new Date()
  },
  {
    id: 'recommendation-engine',
    name: 'Recommendation Engine',
    description: 'Generates personalized recommendations and predictions',
    capabilities: ['recommendations', 'prediction', 'personalization'],
    status: 'active' as const,
    priority: 7,
    lastActivity: new Date()
  }
];

// Sample vector documents for initial population
const sampleVectorDocuments = [
  {
    id: 'craft-pottery',
    content: 'Traditional pottery making using clay, wheel throwing, glazing techniques, ceramic art, handmade vessels, decorative bowls, functional kitchenware',
    metadata: { category: 'pottery', region: 'india', skill_level: 'expert' },
    type: 'cultural' as const
  },
  {
    id: 'craft-textiles',
    content: 'Handwoven textiles, traditional weaving, silk sarees, cotton fabrics, natural dyes, block printing, embroidery, traditional patterns',
    metadata: { category: 'textiles', region: 'india', skill_level: 'expert' },
    type: 'cultural' as const
  },
  {
    id: 'craft-jewelry',
    content: 'Traditional jewelry making, silver work, gold crafting, gemstone setting, ethnic designs, cultural ornaments, handcrafted accessories',
    metadata: { category: 'jewelry', region: 'india', skill_level: 'expert' },
    type: 'cultural' as const
  },
  {
    id: 'craft-woodwork',
    content: 'Wood carving, furniture making, decorative sculptures, traditional woodworking techniques, handcrafted wooden items, artistic carvings',
    metadata: { category: 'woodwork', region: 'india', skill_level: 'expert' },
    type: 'cultural' as const
  }
];

async function initializeAI() {
  console.log('🚀 Starting AI Infrastructure Initialization...');
  
  try {
    // Initialize core AI infrastructure
    console.log('📦 Initializing core AI services...');
    await initializeAIInfrastructure();
    
    // Initialize Buyer Connect agents
    console.log('🤖 Initializing Buyer Connect AI agents...');
    await initializeBuyerConnectAgents();
    
    // Register additional sample agents
    console.log('🤖 Registering additional AI agents...');
    buyerConnectAgents.forEach(agent => {
      agentOrchestrator.registerAgent(agent);
    });
    
    // Populate vector store with sample data
    console.log('🔍 Populating vector store...');
    await vectorStore.addDocuments(sampleVectorDocuments);
    
    // Log initialization event
    aiMonitoringService.logEvent({
      type: 'agent_task',
      data: { operation: 'initialization', agents: buyerConnectAgents.length, documents: sampleVectorDocuments.length },
      success: true
    });
    
    console.log('✅ AI Infrastructure initialized successfully!');
    console.log(`   - ${buyerConnectAgents.length} agents registered`);
    console.log(`   - ${sampleVectorDocuments.length} vector documents added`);
    console.log('   - Monitoring system active');
    
    // Display health status
    const healthStatus = await import('./core').then(m => m.getAIHealthStatus());
    console.log('\n📊 Health Status:');
    console.log(`   - Active Agents: ${healthStatus.stats.activeAgents}`);
    console.log(`   - Vector Documents: ${healthStatus.stats.vectorDocuments}`);
    console.log(`   - Total Memories: ${healthStatus.stats.totalMemories}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize AI infrastructure:', error);
    
    // Log error event
    aiMonitoringService.logEvent({
      type: 'error',
      data: { operation: 'initialization', error: error instanceof Error ? error.message : 'Unknown error' },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    process.exit(1);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeAI().then(() => {
    console.log('\n🎉 Initialization complete! AI infrastructure is ready for Buyer Connect.');
    process.exit(0);
  }).catch(error => {
    console.error('Initialization failed:', error);
    process.exit(1);
  });
}

export { initializeAI };