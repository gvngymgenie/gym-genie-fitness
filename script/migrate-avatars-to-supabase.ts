/**
 * Migration Script: Upload local avatars to Supabase Storage
 * Run this script to migrate existing local avatars to Supabase.
 * 
 * Usage: npx tsx script/migrate-avatars-to-supabase.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const AVATARS_BUCKET = 'avatars';

async function ensureBucketExists() {
  console.log('🔍 Checking if avatars bucket exists...');
  
  const { data, error } = await supabase.storage.getBucket(AVATARS_BUCKET);
  
  if (error || !data) {
    console.log('📦 Creating avatars bucket...');
    const { error: createError } = await supabase.storage.createBucket(AVATARS_BUCKET, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 1024 * 1024 * 5 // 5MB
    });
    
    if (createError) {
      console.error('❌ Failed to create bucket:', createError);
      return false;
    }
    console.log('✅ Created avatars bucket');
  } else {
    console.log('✅ Avatars bucket already exists');
  }
  return true;
}

async function uploadAvatar(filePath: string): Promise<string | null> {
  const filename = path.basename(filePath);
  
  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    const contentType = getContentType(filename);
    
    console.log(`📤 Uploading ${filename}...`);
    
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(`avatars/${filename}`, fileBuffer, {
        cacheControl: '31536000',
        upsert: true,
        contentType
      });
    
    if (error) {
      console.error(`❌ Failed to upload ${filename}:`, error.message);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(data.path);
    
    console.log(`✅ Uploaded ${filename}: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading ${filename}:`, error);
    return null;
  }
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return types[ext] || 'application/octet-stream';
}

async function migrateLocalAvatars() {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
  
  console.log(`\n📂 Looking for avatars in: ${uploadsDir}`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('⚠️  Uploads directory does not exist. Nothing to migrate.');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files to process\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    
    // Skip directories
    if (fs.statSync(filePath).isDirectory()) continue;
    
    // Skip non-image files
    if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) continue;
    
    const result = await uploadAvatar(filePath);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

async function main() {
  console.log('🚀 Starting avatar migration to Supabase...\n');
  
  const bucketOk = await ensureBucketExists();
  if (!bucketOk) {
    process.exit(1);
  }
  
  await migrateLocalAvatars();
  
  console.log('\n✨ Migration complete!');
}

main().catch(console.error);
