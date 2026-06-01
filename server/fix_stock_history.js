
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixStockHistory() {
  const client = await pool.connect();
  try {
    console.log('--- RECONCILING STOCK LOGS ---');
    
    // 1. Get all tenants and their products
    const productsRes = await client.query('SELECT tenant_id, id, name, stock FROM products');
    const products = productsRes.rows;
    
    for (const prod of products) {
      console.log(`Processing ${prod.name} (${prod.id}) for tenant ${prod.tenant_id}...`);
      
      // 2. Fetch all logs for this product sorted by time
      const logsRes = await client.query(
        'SELECT * FROM stock_logs WHERE product_id = $1 AND tenant_id = $2 ORDER BY timestamp ASC',
        [prod.id, prod.tenant_id]
      );
      
      let logs = logsRes.rows;
      if (logs.length === 0) continue;
      
      // 3. Backward reconciliation: 
      // Starting from final stock, we go backwards to reconstruct the history correctly
      let runningStock = prod.stock;
      
      // We process logs from newest to oldest
      for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        
        // Before the update, the stock was this current_stock value
        // Update the log's current_stock field
        await client.query(
          'UPDATE stock_logs SET current_stock = $1 WHERE id = $2',
          [runningStock, log.id]
        );
        
        // Reverse the change to get the stock BEFORE this log event
        const change = log.type === 'in' ? parseInt(log.quantity) : -parseInt(log.quantity);
        runningStock -= change;
      }
      
      console.log(`Done. Fixed ${logs.length} entries for ${prod.name}.`);
    }
    
    console.log('\n--- SYSTEM REPAIR COMPLETE ---');
  } catch (err) {
    console.error('Error during repair:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixStockHistory();
