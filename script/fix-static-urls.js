import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres.oqadltfzjckgmjmjhsqk:WPIhQ2GuMJV4luaf@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify',
});

async function fixStaticUrls() {
  try {
    console.log('🔧 Healing broken avatar URLs in database...');
    
    // Reset all legacy internal-disk uploads to DiceBear fallbacks in production
    // Because Vercel deployments are immutable, old local uploads are gone.
    const membersHeal = await pool.query(`
      UPDATE members 
      SET avatar = 'https://api.dicebear.com/7.x/initials/svg?seed=' || "first_name",
          avatar_static_url = NULL
      WHERE (avatar LIKE 'uploads/avatars/%' OR avatar_static_url LIKE '%/uploads/avatars/%')
      AND (avatar_static_url NOT LIKE '%cloudinary.com%' OR avatar_static_url IS NULL)
    `);
    console.log(`✅ Healed ${membersHeal.rowCount} member records (Resetting local disk paths to fallbacks)`);

    // Ensure remaining Cloudinary URLs use HTTPS
    const membersCloudinary = await pool.query(`
      UPDATE members 
      SET avatar_static_url = REPLACE(avatar_static_url, 'http://res.cloudinary.com', 'https://res.cloudinary.com')
      WHERE avatar_static_url LIKE 'http://res.cloudinary.com%'
    `);
    console.log(`✅ Fixed ${membersCloudinary.rowCount} Cloudinary URLs to use HTTPS`);

    // Update staff table (if it exists)
    try {
      const staffHeal = await pool.query(`
        UPDATE staff 
        SET avatar = 'https://api.dicebear.com/7.x/initials/svg?seed=' || "first_name",
            avatar_static_url = NULL
        WHERE (avatar LIKE 'uploads/avatars/%' OR avatar_static_url LIKE '%/uploads/avatars/%')
        AND (avatar_static_url NOT LIKE '%cloudinary.com%' OR avatar_static_url IS NULL)
      `);
      console.log(`✅ Healed ${staffHeal.rowCount} staff records`);
    } catch (error) {
      if (error.code === '42P01') {
        console.log('ℹ️  Staff table does not exist, skipping staff records');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Static server URLs fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing static URLs:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
fixStaticUrls();