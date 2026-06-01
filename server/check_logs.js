
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkStockHistorySimplified() {
  try {
    const tenantId = 'TOKO-L1GLT';
    const productId = 'prod-i1qw0fr'; 
    
    const logsRes = await pool.query('SELECT timestamp, current_stock, type, quantity, reason FROM stock_logs WHERE product_id = $1 AND tenant_id = $2 ORDER BY timestamp ASC', [productId, tenantId]);
    
    logsRes.rows.forEach(row => {
      console.log(`${row.timestamp} | ${row.type} | ${row.quantity} | stock: ${row.current_stock} | ${row.reason}`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkStockHistorySimplified();
