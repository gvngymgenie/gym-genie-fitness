/**
 * Script to push database schema and create admin user for gym-genie-one
 * Run with: npx tsx script/setup-db-and-admin-client2.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '@shared/schema';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.client2' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  process.exit(1);
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function setup() {
  console.log('🔌 Connecting to database...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false
  });

  const db = drizzle(pool, { schema });

  try {
    console.log('✅ Connected! Pushing schema...');
    
    // Create all tables
    await db.execute(sql`CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    console.log('✅ Schema pushed successfully!');
    console.log('');

    // Check if admin exists
    const existing = await db.select().from(schema.users).where(eq(schema.users.username, 'admin')).limit(1);
    
    if (existing.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Username: ${existing[0].username}`);
      console.log(`   Email: ${existing[0].email}`);
    } else {
      // Create admin
      const adminId = crypto.randomUUID();
      const hashedPwd = hashPassword('admin123');
      
      await db.insert(schema.users).values({
        id: adminId,
        username: 'admin',
        password: hashedPwd,
        email: 'kousi@live.in',
        firstName: 'Admin',
        phone: '9962017899',
        role: 'admin',
        isActive: true
      });

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

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

setup();
