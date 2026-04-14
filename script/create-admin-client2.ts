/**
 * Script to create admin user for gym-genie-one via Supabase REST API
 * Run with: npx tsx script/create-admin-client2.ts
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.client2' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createAdmin() {
  console.log('🔍 Checking database schema...');

  // First, check if users table exists
  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    }
  });

  if (!checkResponse.ok) {
    const error = await checkResponse.json();
    console.error('❌ Failed to access users table:', error);
    console.log('');
    console.log('⚠️  The users table does not exist yet.');
    console.log('   You need to push the schema first using:');
    console.log('   ');
    console.log('   npm run db:push');
    console.log('   ');
    console.log('   Make sure DATABASE_URL is set in .env.production.client2');
    process.exit(1);
  }

  console.log('✅ Users table exists. Checking for admin user...');

  // Check if admin exists
  const checkAdminResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/users?select=id,username,email&username=eq.admin`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  const existingUsers = await checkAdminResponse.json();

  if (existingUsers && existingUsers.length > 0) {
    console.log('⚠️  Admin user already exists!');
    console.log(`   ID: ${existingUsers[0].id}`);
    console.log(`   Username: ${existingUsers[0].username}`);
    console.log(`   Email: ${existingUsers[0].email}`);
    process.exit(0);
  }

  console.log('✅ No admin user found. Creating...');

  // Create admin user
  const adminData = {
    username: 'admin',
    password: hashPassword('admin123'),
    email: 'kousi@live.in',
    first_name: 'Admin',
    phone: '9962017899',
    role: 'admin',
    is_active: true
  };

  const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(adminData)
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }

  const created = await createResponse.json();

  console.log('✅ Admin user created successfully!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   Email: kousi@live.in');
  console.log('   Phone: 9962017899');
  console.log('');
  console.log('🔗 App URL: https://gym-genie-one.vercel.app');
  console.log('');
  console.log('⚠️  IMPORTANT: Change the password after first login!');
}

createAdmin();
