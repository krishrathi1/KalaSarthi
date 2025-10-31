/**
 * Script to remove duplicate products from Firestore
 * Keeps the oldest product and removes newer duplicates
 * 
 * Usage:
 * npx tsx scripts/remove-duplicate-products.ts
 */

import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

// Load environment variables
dotenv.config();

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

interface Product {
    id: string;
    productId: string;
    name: string;
    artisanId: string;
    price: number;
    category: string;
    createdAt: any;
}

async function removeDuplicateProducts() {
    console.log('🚀 Starting duplicate product removal...\n');

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

        // Group products by name + artisanId
        const productGroups = new Map<string, Product[]>();

        snapshot.docs.forEach(docSnapshot => {
            const data = docSnapshot.data();
            const product: Product = {
                id: docSnapshot.id,
                productId: data.productId,
                name: data.name,
                artisanId: data.artisanId,
                price: data.price,
                category: data.category,
                createdAt: data.createdAt?.toDate() || new Date()
            };

            const key = `${product.artisanId}:${product.name}:${product.category}`;
            
            if (!productGroups.has(key)) {
                productGroups.set(key, []);
            }
            productGroups.get(key)!.push(product);
        });

        // Find and remove duplicates
        let totalDuplicates = 0;
        let totalDeleted = 0;
        let errors = 0;

        console.log('🔍 Analyzing for duplicates...\n');

        for (const [key, products] of productGroups.entries()) {
            if (products.length > 1) {
                // Sort by createdAt (oldest first)
                products.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

                const [original, ...duplicates] = products;
                totalDuplicates += duplicates.length;

                console.log(`\n📦 Found ${duplicates.length} duplicate(s) for: ${original.name}`);
                console.log(`   Keeping: ${original.id} (created: ${original.createdAt.toISOString()})`);

                // Delete duplicates
                for (const duplicate of duplicates) {
                    try {
                        const docRef = doc(db, COLLECTION_NAME, duplicate.id);
                        await deleteDoc(docRef);
                        totalDeleted++;
                        console.log(`   ❌ Deleted: ${duplicate.id} (created: ${duplicate.createdAt.toISOString()})`);
                    } catch (error: any) {
                        console.error(`   ⚠️  Failed to delete ${duplicate.id}:`, error.message);
                        errors++;
                    }
                }
            }
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 CLEANUP SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total products found:        ${snapshot.size}`);
        console.log(`Unique products:             ${productGroups.size}`);
        console.log(`Duplicates found:            ${totalDuplicates}`);
        console.log(`Successfully deleted:        ${totalDeleted}`);
        console.log(`Errors:                      ${errors}`);
        console.log(`Remaining products:          ${snapshot.size - totalDeleted}`);
        console.log('='.repeat(50));

        if (totalDuplicates === 0) {
            console.log('\n✅ No duplicates found! Database is clean.');
        } else if (errors === 0) {
            console.log('\n✅ All duplicates removed successfully!');
        } else {
            console.log(`\n⚠️  Completed with ${errors} errors. Please check the logs above.`);
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Verify cleanup
async function verifyCleanup() {
    console.log('\n🔍 Verifying cleanup...\n');

    try {
        const productsRef = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(productsRef);

        const productGroups = new Map<string, number>();

        snapshot.docs.forEach(docSnapshot => {
            const data = docSnapshot.data();
            const key = `${data.artisanId}:${data.name}:${data.category}`;
            productGroups.set(key, (productGroups.get(key) || 0) + 1);
        });

        const duplicatesRemaining = Array.from(productGroups.values()).filter(count => count > 1).length;

        console.log('📊 Verification Results:');
        console.log(`Total products:              ${snapshot.size}`);
        console.log(`Unique products:             ${productGroups.size}`);
        console.log(`Duplicates remaining:        ${duplicatesRemaining}`);

        if (duplicatesRemaining === 0) {
            console.log('\n✅ Verification passed! No duplicates remaining.');
        } else {
            console.log('\n⚠️  Some duplicates still exist. You may need to run the script again.');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

// Main execution
async function main() {
    console.log('\n' + '='.repeat(50));
    console.log('🧹 FIRESTORE DUPLICATE PRODUCT REMOVER');
    console.log('='.repeat(50) + '\n');

    console.log('⚠️  This will DELETE duplicate products from Firestore');
    console.log('⚠️  Keeping the oldest version of each product\n');

    // Remove duplicates
    await removeDuplicateProducts();

    // Verify
    await verifyCleanup();

    console.log('\n✅ Script completed!\n');
    process.exit(0);
}

// Run the script
main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
