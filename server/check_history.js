
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkStockHistory() {
  try {
    const tenantId = 'TOKO-L1GLT';
    const productId = 'prod-i1qw0fr'; // Es Teh
    
    console.log(`Checking history for Product: ${productId} on Tenant: ${tenantId}`);
    
    const prodRes = await pool.query('SELECT name, stock FROM products WHERE id = $1 AND tenant_id = $2', [productId, tenantId]);
    console.log('Current Database State:', prodRes.rows[0]);
    
    const logsRes = await pool.query('SELECT * FROM stock_logs WHERE product_id = $1 AND tenant_id = $2 ORDER BY timestamp ASC', [productId, tenantId]);
    console.log('\nStock Logs (Chronological):');
    
    let runningStock = 0;
    const history = logsRes.rows.map(log => {
      const change = log.type === 'in' ? parseInt(log.quantity) : -parseInt(log.quantity);
      runningStock += change;
      return {
        timestamp: log.timestamp,
        type: log.type,
        qty: log.quantity,
        change: change,
        calculatedStock: runningStock,
        logCurrentStock: log.current_stock,
        reason: log.reason
      };
    });
    
    console.log(JSON.stringify(history, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkStockHistory();
