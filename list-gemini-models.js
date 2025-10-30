// List available Gemini models using REST API
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('No API key found!');
    return;
  }
  
  console.log('Listing available Gemini models...\n');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('Available models:\n');
      data.models.forEach(model => {
        console.log(`📦 ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
        console.log('');
      });
      
      console.log('\n✅ Models that support generateContent:');
      data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .forEach(m => console.log(`   - ${m.name.replace('models/', '')}`));
    } else {
      console.error('Error:', data);
    }
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();
