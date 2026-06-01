
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkStockLogs() {
  try {
    const res = await pool.query('SELECT * FROM stock_logs ORDER BY timestamp DESC LIMIT 20');
    console.log('--- RECENT STOCK LOGS ---');
    console.log(JSON.stringify(res.rows, null, 2));
    
    const prodRes = await pool.query('SELECT id, name, stock FROM products LIMIT 10');
    console.log('\n--- PRODUCT EXAMPLES ---');
    console.log(JSON.stringify(prodRes.rows, null, 2));
    
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await pool.end();
  }
}

checkStockLogs();
