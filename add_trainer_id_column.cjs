const { Pool } = require('pg');

async function addTrainerIdColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding trainer_id column to members table...');
    await pool.query('ALTER TABLE members ADD COLUMN trainer_id varchar REFERENCES users(id);');
    console.log('✅ Successfully added trainer_id column');
  } catch (error) {
    if (error.code === '42701') {
      console.log('ℹ️  Column trainer_id already exists');
    } else {
      console.error('❌ Error adding trainer_id column:', error.message);
    }
  } finally {
    await pool.end();
  }
}

addTrainerIdColumn();