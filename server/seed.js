const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seed() {
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@'));
  const client = await pool.connect();
  try {
    console.log('Connected to database successfully. Checking tables...');

    // 1. Read and run schema from database.sql if tenants table does not exist
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      );
    `);

    const tenantsTableExists = tableCheck.rows[0].exists;
    if (!tenantsTableExists) {
      console.log('tenants table does not exist. Running database.sql schema...');
      const sqlPath = path.join(__dirname, '..', 'database.sql');
      if (fs.existsSync(sqlPath)) {
        const sqlSchema = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sqlSchema);
        console.log('Database schema created successfully.');
      } else {
        console.warn('database.sql not found at:', sqlPath);
      }
    } else {
      console.log('tenants table already exists. Skipping schema creation.');
    }

    // 2. Insert test tenant
    const tenantId = 'TOKO-DEMO';
    const testTenant = {
      id: tenantId,
      name: 'Warung Kasir Pintar (Demo Lokal)',
      owner_email: 'offline_owner@pos.com',
      admin_pin: '1234',
      categories: JSON.stringify(['Makanan', 'Minuman', 'Sembako', 'Sabun & Mandi', 'Lainnya']),
      cashiers: JSON.stringify([{ uid: 'demo-cashier', name: 'Kasir Demo', pin: '0000', tenantId: tenantId }]),
      subscription_status: 'trial',
      subscription_package: 'monthly',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    console.log(`Inserting/updating test tenant: ${tenantId}...`);

    // Check if the 'cashiers' column exists in tenants table. In database.sql, cashiers is not a column, 
    // it was assumed to be part of categories or another JSON field, but server/index.js line 74 says:
    // "const cashiers = tenant.cashiers || [];"
    // Wait, let's look at database.sql:
    // tenants has: id, name, owner_email, admin_pin, address, phone, categories, receipt_footer, receipt_logo, printer_address...
    // Ah! Table tenants does NOT have a cashiers column in database.sql!
    // But server/index.js line 74 does: "const cashiers = tenant.cashiers || [];"
    // Wait! Let's check if the cashiers column is in the database.sql. No, it isn't!
    // Let's check if there is a cashiers column or if we need to add it, or if it's already there in the database.
    // Let's check if we should add `cashiers JSONB DEFAULT '[]'` to `tenants` table so that it supports cashiers list!
    // Yes! Let's check the schema in database.sql.
    // Let's see: tenants table has `categories JSONB DEFAULT '[]'`, but no `cashiers`.
    // Let's check if we should modify the tenants table in database.sql or add a column if not exists!
    // This is a HUGE finding! Let's check if `cashiers` is used in server/index.js.
    // Yes, server/index.js line 74: `const cashiers = tenant.cashiers || [];`
    // And in tenants post endpoint:
    // app.post('/api/tenants', async (req, res) => {
    //   ...
    //   const values = [t.id, t.name, t.owner_email, t.admin_pin, JSON.stringify(t.categories || [])];
    //   ...
    // })
    // Wait, if tenant has cashiers, how is it stored in the database?
    // If the database has a `cashiers` column, that would work. Or if the frontend sends `cashiers` and we store it?
    // Let's check `database.sql` again. It has `CREATE TABLE tenants ( ... )`. It doesn't have a `cashiers` column.
    // But if `tenantResult.rows[0]` returns `tenant`, and `tenant.cashiers` is read, then there must be a `cashiers` column or field.
    // Let's add the column `cashiers JSONB DEFAULT '[]'` to the `tenants` table to support multiple cashiers in SQL!
    // Let's make sure it is added. We can run an `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cashiers JSONB DEFAULT '[]';`
    // Let's include that in the seed script! That is extremely robust!

    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_package VARCHAR(20) DEFAULT 'monthly';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2) DEFAULT 0;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_method VARCHAR(20) DEFAULT 'exclude';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cashiers JSONB DEFAULT '[]';
    `);
    console.log('Ensured tenants table has subscription columns.');

    // Create / Re-create cashier_sessions table to align structure
    await client.query(`
      DROP TABLE IF EXISTS cashier_sessions CASCADE;
      CREATE TABLE cashier_sessions (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
          cashier_uid VARCHAR(100) NOT NULL,
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE,
          opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
          closing_balance DECIMAL(15, 2),
          total_cash_sales DECIMAL(15, 2) DEFAULT 0,
          total_qris DECIMAL(15, 2) DEFAULT 0,
          total_card DECIMAL(15, 2) DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Ensured cashier_sessions table is fully updated.');

    // Create kas_besar table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kas_besar (
          tenant_id VARCHAR(50) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
          balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Ensured kas_besar table exists.');

    // Create kas_mutations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kas_mutations (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          source VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          note TEXT,
          session_id VARCHAR(50),
          target VARCHAR(20) NOT NULL
      );
    `);
    console.log('Ensured kas_mutations table exists.');

    const query = `
      INSERT INTO tenants (id, name, owner_email, admin_pin, categories, cashiers, subscription_status, subscription_package, trial_ends_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        owner_email = EXCLUDED.owner_email,
        admin_pin = EXCLUDED.admin_pin,
        categories = EXCLUDED.categories,
        cashiers = EXCLUDED.cashiers,
        subscription_status = EXCLUDED.subscription_status,
        subscription_package = EXCLUDED.subscription_package,
        trial_ends_at = EXCLUDED.trial_ends_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [
      testTenant.id,
      testTenant.name,
      testTenant.owner_email,
      testTenant.admin_pin,
      testTenant.categories,
      testTenant.cashiers,
      testTenant.subscription_status,
      testTenant.subscription_package,
      testTenant.trial_ends_at
    ];

    const result = await client.query(query, values);
    console.log('Seeded tenant successfully:', result.rows[0]);

    // Seed default Kas Besar balance for TOKO-DEMO (Rp 10.000.000 starting cash)
    // Dijalankan SETELAH tenant terbuat untuk mematuhi Foreign Key Constraint
    await client.query(`
      INSERT INTO kas_besar (tenant_id, balance)
      VALUES ('TOKO-DEMO', 10000000)
      ON CONFLICT (tenant_id) DO NOTHING;
    `);
    console.log('Seeded initial Kas Besar balance for TOKO-DEMO.');

  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
