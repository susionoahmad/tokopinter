
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position;
    `);
    console.log('--- TENANTS TABLE SCHEMA ---');
    console.log(JSON.stringify(res.rows, null, 2));
    
    const resItem = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transaction_items' 
      ORDER BY ordinal_position;
    `);
    console.log('\n--- TRANSACTION_ITEMS TABLE SCHEMA ---');
    console.log(JSON.stringify(resItem.rows, null, 2));
    
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
