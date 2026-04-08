/**
 * Script to clear legacy FCM tokens from push_subscriptions table
 * 
 * Run with: npx tsx scripts/clear-legacy-fcm-tokens.ts
 */

import { db } from '../server/db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

type PushSubscription = typeof schema.pushSubscriptions.$inferSelect;

async function clearLegacyTokens() {
  console.log('🔍 Checking for legacy FCM tokens...');
  
  // Find all subscriptions
  const allSubscriptions = await db.select().from(schema.pushSubscriptions);
  console.log(`📊 Total subscriptions: ${allSubscriptions.length}`);
  
  // Identify legacy FCM tokens (contain APA91b pattern)
  const legacyTokens = allSubscriptions.filter((sub: PushSubscription) => 
    sub.endpoint.includes('APA91b') || 
    sub.endpoint.startsWith('test-token') ||
    sub.endpoint.includes('fcm')
  );
  
  console.log(`🔴 Legacy FCM tokens found: ${legacyTokens.length}`);
  
  // Identify valid OneSignal player IDs (UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validTokens = allSubscriptions.filter((sub: PushSubscription) => uuidRegex.test(sub.endpoint));
  console.log(`🟢 Valid OneSignal player IDs: ${validTokens.length}`);
  
  // Identify member subscriptions
  const memberSubscriptions = allSubscriptions.filter((sub: PushSubscription) => sub.memberId !== null);
  console.log(`👤 Member subscriptions: ${memberSubscriptions.length}`);
  
  if (legacyTokens.length > 0) {
    console.log('\n📋 Legacy tokens to deactivate:');
    legacyTokens.forEach((token: PushSubscription) => {
      console.log(`  - ${token.endpoint.substring(0, 30)}... (active: ${token.isActive})`);
    });
    
    // Deactivate legacy tokens
    for (const token of legacyTokens) {
      if (token.isActive) {
        await db.update(schema.pushSubscriptions)
          .set({ isActive: false })
          .where(eq(schema.pushSubscriptions.id, token.id));
        console.log(`  ✅ Deactivated: ${token.endpoint.substring(0, 30)}...`);
      }
    }
    
    console.log('\n✅ Legacy FCM tokens deactivated successfully!');
  } else {
    console.log('\n✅ No legacy FCM tokens found!');
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`  - Total subscriptions: ${allSubscriptions.length}`);
  console.log(`  - Legacy FCM tokens: ${legacyTokens.length}`);
  console.log(`  - Valid OneSignal player IDs: ${validTokens.length}`);
  console.log(`  - Member subscriptions: ${memberSubscriptions.length}`);
  
  process.exit(0);
}

clearLegacyTokens().catch(console.error);
