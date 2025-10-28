/**
 * Test script to verify sidebar routes are correctly configured
 */

const { menuItems } = require('../src/lib/i18n.ts');

function testSidebarRoutes() {
  console.log('🧪 Testing sidebar route configuration...');
  
  // Find the Buyer Connect menu item
  const buyerConnectItem = menuItems.find(item => 
    item.label.en === 'Buyer Connect'
  );
  
  if (!buyerConnectItem) {
    console.error('❌ Buyer Connect menu item not found!');
    return;
  }
  
  console.log('\n📋 Buyer Connect Menu Item:');
  console.log('================');
  console.log(`Label (EN): ${buyerConnectItem.label.en}`);
  console.log(`Label (HI): ${buyerConnectItem.label.hi}`);
  console.log(`Path: ${buyerConnectItem.path}`);
  console.log(`Icon: ${buyerConnectItem.icon.name}`);
  
  // Check if path is correct
  if (buyerConnectItem.path === '/buyer-connect') {
    console.log('✅ Path correctly set to /buyer-connect');
  } else {
    console.error(`❌ Path is incorrect: ${buyerConnectItem.path}`);
  }
  
  // Check for any remaining matchmaking references
  const matchmakingItems = menuItems.filter(item => 
    item.path === '/matchmaking'
  );
  
  if (matchmakingItems.length === 0) {
    console.log('✅ No matchmaking routes found in menu items');
  } else {
    console.log(`⚠️ Found ${matchmakingItems.length} matchmaking routes still in menu:`);
    matchmakingItems.forEach(item => {
      console.log(`   - ${item.label.en}: ${item.path}`);
    });
  }
  
  console.log('\n✅ Sidebar route test completed!');
}

// Run the test
testSidebarRoutes();