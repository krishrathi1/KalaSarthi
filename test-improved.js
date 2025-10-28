// Test the improved system with 60 artisans
const fetch = require('node-fetch');

async function testImproved() {
  console.log('🔍 Testing improved system with 60 artisans...');
  
  const queries = [
    'wooden doors for my hotel',
    'pottery bowls for kitchen',
    'silver jewelry earrings',
    'handwoven silk sarees',
    'brass decorative items',
    'traditional paintings'
  ];

  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:9003/api/intelligent-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          method: 'intelligent',
          maxResults: 5
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Detected: ${data.data.queryAnalysis.detectedProfession}`);
        console.log(`📊 Found ${data.data.matches.length} artisans`);
        data.data.matches.forEach((match, i) => {
          console.log(`  ${i+1}. ${match.artisan.name} (${match.artisan.artisticProfession}) - Score: ${match.relevanceScore} - ${match.artisan.address?.city || 'Unknown'}`);
        });
      } else {
        console.log(`❌ Failed: ${data.error?.message}`);
      }
    } catch (error) {
      console.log(`💥 Error: ${error.message}`);
    }
  }
}

testImproved();