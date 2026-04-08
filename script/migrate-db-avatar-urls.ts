/**
 * Database Migration Script: Update member avatar URLs from local to Supabase
 * 
 * This script updates the 'avatar' field in the members table from local paths
 * (e.g., '/uploads/avatars/filename.jpg') to Supabase URLs.
 * 
 * Prerequisites:
 * 1. Run migrate-avatars-to-supabase.ts first to upload files
 * 2. Ensure Supabase environment variables are set
 * 
 * Usage: npx tsx script/migrate-db-avatar-urls.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import path from 'path';

// Load .env.local for database connection
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getMembersWithLocalAvatars() {
  const result = await pool.query(`
    SELECT id, first_name, last_name, avatar, avatar_static_url
    FROM members
    WHERE avatar IS NOT NULL
    AND avatar LIKE '/uploads/%'
    AND avatar NOT LIKE 'https://%'
  `);
  return result.rows;
}

async function updateMemberAvatar(memberId: string, newAvatarUrl: string) {
  await pool.query(`
    UPDATE members
    SET avatar = $1
    WHERE id = $2
  `, [newAvatarUrl, memberId]);
}

async function migrateDatabaseUrls() {
  console.log('\n🔍 Fetching members with local avatar paths...\n');
  
  const members = await getMembersWithLocalAvatars();
  
  if (members.length === 0) {
    console.log('✅ No members found with local avatar paths to migrate.');
    return;
  }
  
  console.log(`Found ${members.length} members to migrate\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const member of members) {
    const localPath = member.avatar;
    const filename = path.basename(localPath);
    
    try {
      // Get Supabase public URL for the file
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(`avatars/${filename}`);
      
      // Update the database
      await updateMemberAvatar(member.id, data.publicUrl);
      
      console.log(`✅ ${member.first_name} ${member.last_name}: ${localPath} -> ${data.publicUrl}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to migrate ${member.first_name} ${member.last_name}:`, error);
      failCount++;
    }
  }
  
  console.log(`\n📊 Database migration complete:`);
  console.log(`   ✅ Updated: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

async function main() {
  console.log('🚀 Starting database avatar URL migration...\n');
  
  try {
    await migrateDatabaseUrls();
    console.log('\n✨ Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
