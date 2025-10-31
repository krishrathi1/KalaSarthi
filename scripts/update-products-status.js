/**
 * Script to add status: 'published' to all products in Firestore
 * 
 * Usage:
 * node scripts/update-products-status.js
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION_NAME = 'products';

async function updateProductsStatus() {
    console.log('🚀 Starting product status update...\n');

    try {
        // Get all products
        console.log('📥 Fetching all products from Firestore...');
        const productsRef = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(productsRef);

        if (snapshot.empty) {
            console.log('❌ No products found in the database.');
            return;
        }

        console.log(`✅ Found ${snapshot.size} products\n`);

        // Process products one by one
        let totalUpdated = 0;
        let alreadyHadStatus = 0;
        let errors = 0;

        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();

            // Check if status already exists and inventory is properly set
            const hasStatus = data.status === 'published';
            const hasInventory = data.inventory?.isAvailable === true;

            if (hasStatus && hasInventory) {
                alreadyHadStatus++;
                console.log(`⏭️  Skipping ${docSnapshot.id} - already properly configured`);
                continue;
            }

            // Update document with status and inventory fields
            try {
                const docRef = doc(db, COLLECTION_NAME, docSnapshot.id);
                const updateData = {
                    status: 'published',
                    updatedAt: new Date()
                };

                // Ensure inventory.isAvailable is set to true
                if (!hasInventory) {
                    updateData['inventory.isAvailable'] = true;
                    // If inventory doesn't exist at all, set a default quantity
                    if (!data.inventory) {
                        updateData['inventory.quantity'] = data.inventory?.quantity || 1;
                    }
                }

                await updateDoc(docRef, updateData);

                totalUpdated++;
                console.log(`✅ Updated ${docSnapshot.id} (${totalUpdated}/${snapshot.size - alreadyHadStatus})`);
            } catch (error) {
                console.error(`❌ Failed to update ${docSnapshot.id}:`, error.message);
                errors++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 UPDATE SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total products found:        ${snapshot.size}`);
        console.log(`Already had status:          ${alreadyHadStatus}`);
        console.log(`Successfully updated:        ${totalUpdated}`);
        console.log(`Errors:                      ${errors}`);
        console.log('='.repeat(50));

        if (errors === 0) {
            console.log('\n✅ All products updated successfully!');
        } else {
            console.log(`\n⚠️  Completed with ${errors} errors. Please check the logs above.`);
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Verify products after update
async function verifyUpdate() {
    console.log('\n🔍 Verifying updates...\n');

    try {
        const productsRef = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(productsRef);
        
        let fullyConfigured = 0;
        let missingStatus = 0;
        let missingInventory = 0;
        let missingBoth = 0;
        
        snapshot.docs.forEach(docSnapshot => {
            const data = docSnapshot.data();
            const hasStatus = data.status === 'published';
            const hasInventory = data.inventory?.isAvailable === true;
            
            if (hasStatus && hasInventory) {
                fullyConfigured++;
            } else if (!hasStatus && !hasInventory) {
                missingBoth++;
            } else if (!hasStatus) {
                missingStatus++;
            } else if (!hasInventory) {
                missingInventory++;
            }
        });
        
        console.log('📊 Verification Results:');
        console.log(`Total products:                        ${snapshot.size}`);
        console.log(`Fully configured (published + available): ${fullyConfigured}`);
        console.log(`Missing status only:                   ${missingStatus}`);
        console.log(`Missing inventory.isAvailable only:   ${missingInventory}`);
        console.log(`Missing both:                          ${missingBoth}`);

        if (fullyConfigured === snapshot.size) {
            console.log('\n✅ Verification passed! All products are properly configured.');
        } else {
            console.log('\n⚠️  Some products still need configuration.');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

// Main execution
async function main() {
    console.log('\n' + '='.repeat(50));
    console.log('🔧 FIRESTORE PRODUCT STATUS UPDATER');
    console.log('='.repeat(50) + '\n');

    console.log('⚠️  This will update ALL products in Firestore');
    console.log('⚠️  Adding status: "published" to products without status\n');

    // Update products
    await updateProductsStatus();

    // Verify
    await verifyUpdate();

    console.log('\n✅ Script completed!\n');
    process.exit(0);
}

// Run the script
main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
