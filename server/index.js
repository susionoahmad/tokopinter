const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-pos-key';

// Basic environment validation for production
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.DATABASE_URL)) {
  console.error('FATAL ERROR: JWT_SECRET or DATABASE_URL is not defined in production.');
  process.exit(1);
}

// Middleware
app.use(cors({
  // Masukkan domain Vercel Anda di sini untuk keamanan ekstra
  origin: process.env.NODE_ENV === 'production'
    ? ['https://tokopinter.vercel.app', 'https://kalkulatorin.com'] // Ganti dengan domain Vercel asli Anda
    : true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(morgan('dev'));


// Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Sesuaikan jika menggunakan Cloud SQL SSL
    keepAlive: true
  } : false
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);

    // Ensure transactions table has session_id column to preserve cashier session history
    pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS session_id VARCHAR(50)', (alterErr) => {
      if (alterErr) console.error('Error adding session_id column:', alterErr);
      else console.log('Ensured transactions table has session_id column.');
    });

    // Ensure transactions table has tax column
    pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax NUMERIC(15,2) DEFAULT 0', (alterErr) => {
      if (alterErr) console.error('Error adding tax column:', alterErr);
      else console.log('Ensured transactions table has tax column.');
    });

    // Ensure login_logs table exists
    pool.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY, tenant_id VARCHAR(50), ip_address VARCHAR(45),
        user_agent TEXT, status VARCHAR(20), reason TEXT, attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
      if (err) console.error('Error creating login_logs table:', err);
    });
  }
});

// Middleware for Auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Akses ditolak, silakan login' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token kadaluwarsa atau tidak valid' });
    req.user = user;
    next();
  });
};

// Middleware untuk verifikasi role Superadmin
const verifySuperadmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    console.warn(`[AUTH] Access Denied (verifySuperadmin): User ${req.user.userName} (${req.user.role}) attempted to access superadmin route ${req.originalUrl}`);
    return res.status(403).json({ error: 'Akses ditolak: Menu ini hanya dapat diakses oleh Superadmin' });
  }

  next();
};

// Middleware untuk verifikasi role Owner dan isolasi Tenant
const verifyOwner = (req, res, next) => {
  const tenantId = req.params.tenantId;

  if (req.user.role !== 'owner') {
    console.warn(`[AUTH] Access Denied (verifyOwner): User ${req.user.userName} (${req.user.role}) attempted to access owner route ${req.originalUrl}`);
    return res.status(403).json({ error: 'Akses ditolak: Menu ini hanya dapat diakses oleh Owner' });
  }

  if (tenantId && req.user.tenantId !== tenantId) {
    console.warn(`[AUTH] Access Denied (verifyOwner): Tenant mismatch. User ${req.user.userName} (Tenant: ${req.user.tenantId}) tried to access Tenant: ${tenantId}`);
    return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin untuk ID Toko ini' });
  }

  next();
};

// Middleware untuk verifikasi akses Tenant (Bisa diakses Owner dan Kasir)
const verifyTenantAccess = (req, res, next) => {
  const tenantId = req.params.tenantId || req.body.tenantId;

  if (req.user.role !== 'owner' && req.user.role !== 'cashier') {
    console.warn(`[AUTH] Access Denied (verifyTenantAccess): User ${req.user.userName} (${req.user.role}) has invalid role for path ${req.originalUrl}`);
    return res.status(403).json({ error: 'Akses ditolak: Peran pengguna tidak valid' });
  }

  if (tenantId && req.user.tenantId !== tenantId) {
    console.warn(`[AUTH] Access Denied (verifyTenantAccess): Tenant mismatch. User ${req.user.userName} (Tenant: ${req.user.tenantId}) tried to access Tenant: ${tenantId}`);
    return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin untuk ID Toko ini' });
  }

  next();
};

// Helper function untuk mencatat log login ke database
const logLoginAttempt = async (req, tenantId, status, reason) => {
  try {
    await pool.query(
      `INSERT INTO login_logs (tenant_id, ip_address, user_agent, status, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId || 'UNKNOWN', req.ip, req.headers['user-agent'], status, reason]
    );
  } catch (err) {
    console.error('Gagal menyimpan login log:', err);
  }
};

// Rate Limiter khusus untuk Login (Pencegahan Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 percobaan per IP dalam jendela 15 menit
  message: { error: 'Terlalu banyak percobaan login dari perangkat ini. Silakan coba lagi setelah 15 menit.' },
  handler: (req, res, next, options) => {
    logLoginAttempt(req, req.body.tenantId, 'RATE_LIMITED', 'Terlalu banyak percobaan (Brute Force protection)');
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Basic Routes
app.get('/', (req, res) => {
  res.json({ message: 'POS Kasir SQL API is running', status: 'OK' });
});

// Helper to map DB tenant (snake_case) to Frontend Tenant (camelCase)
const mapTenantToFrontend = (t) => {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    ownerUid: t.owner_uid || 'sql_owner',
    ownerEmail: t.owner_email,
    adminPin: t.admin_pin,
    address: t.address || '',
    phone: t.phone || '',
    categories: typeof t.categories === 'string' ? JSON.parse(t.categories) : (t.categories || []),
    cashiers: typeof t.cashiers === 'string' ? JSON.parse(t.cashiers) : (t.cashiers || []),
    receiptFooter: t.receipt_footer || '',
    receiptLogo: t.receipt_logo || '',
    printerAddress: t.printer_address || '',
    printerAutoCut: t.printer_auto_cut || false,
    qrisMerchantName: t.qris_merchant_name || '',
    qrisNmid: t.qris_nmid || '',
    qrisCustomImage: t.qris_custom_image || '',
    subscriptionStatus: t.subscription_status || 'trial',
    subscriptionPackage: t.subscription_package || 'monthly',
    trialEndsAt: t.trial_ends_at,
    subscriptionEndsAt: t.subscription_ends_at,
    taxEnabled: t.tax_enabled || false,
    taxPercentage: parseFloat(t.tax_percentage || 0),
    taxMethod: t.tax_method || 'exclude',
    createdAt: t.created_at,
    updatedAt: t.updated_at
  };
};

const mapProductToFrontend = (p) => {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: parseFloat(p.price),
    cost: parseFloat(p.cost),
    stock: parseInt(p.stock),
    minStock: parseInt(p.min_stock),
    barcode: p.barcode,
    unit: p.unit,
    imageUrl: p.image_url
  };
};

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/superadmin-login', async (req, res) => {
  try {
    const { email } = req.body;
    const SUPERADMIN_EMAILS = ['susiono.ahmad@gmail.com'];
    if (!SUPERADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Akses ditolak: Email bukan Superadmin' });
    }
    const token = jwt.sign(
      { userName: 'Superadmin', role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, role: 'superadmin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { tenantId, pin } = req.body;

    // 1. Cek Toko
    const tenantResult = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenantResult.rows.length === 0) {
      await logLoginAttempt(req, tenantId, 'FAILED', 'ID Toko tidak ditemukan');
      return res.status(404).json({ error: 'ID Toko tidak ditemukan' });
    }

    const tenant = tenantResult.rows[0];
    let role = null;
    let userName = null;

    // 2. Cek apakah ini PIN Owner
    if (tenant.admin_pin === pin) {
      role = 'owner';
      userName = 'Owner ' + tenant.name;
    } else {
      // 3. Cek di daftar Kasir (Jika ada tabel/field kasir)
      const cashiers = typeof tenant.cashiers === 'string' ? JSON.parse(tenant.cashiers) : (tenant.cashiers || []);
      const foundCashier = cashiers.find(c => c.pin === pin);
      if (foundCashier) {
        role = 'cashier';
        userName = foundCashier.name;
      }
    }

    if (!role) {
      await logLoginAttempt(req, tenantId, 'FAILED', 'PIN Salah');
      return res.status(401).json({ error: 'PIN yang Anda masukkan salah' });
    }

    await logLoginAttempt(req, tenantId, 'SUCCESS', `Login sebagai ${role}`);

    // 4. Generate Token
    const token = jwt.sign(
      { tenantId: tenant.id, role, userName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role, tenant: mapTenantToFrontend(tenant), userName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUPERADMIN DASHBOARD ENDPOINTS ---
app.get('/api/admin/login-stats', authenticateToken, verifySuperadmin, async (req, res) => {
  try {
    // 1. Ringkasan kegagalan dalam 24 jam terakhir
    const total24h = await pool.query(`
      SELECT COUNT(*) FROM login_logs 
      WHERE status IN ('FAILED', 'RATE_LIMITED') 
      AND attempted_at > NOW() - INTERVAL '24 hours'
    `);

    // 2. Daftar kegagalan login terbaru
    const recent = await pool.query(`
      SELECT id, tenant_id, ip_address, status, reason, attempted_at 
      FROM login_logs 
      WHERE status IN ('FAILED', 'RATE_LIMITED')
      ORDER BY attempted_at DESC 
      LIMIT 50
    `);

    // 3. Tenant yang paling sering mengalami kegagalan (7 hari terakhir)
    const targets = await pool.query(`
      SELECT tenant_id, COUNT(*) as fail_count 
      FROM login_logs 
      WHERE status IN ('FAILED', 'RATE_LIMITED')
      AND attempted_at > NOW() - INTERVAL '7 days'
      GROUP BY tenant_id 
      ORDER BY fail_count DESC 
      LIMIT 10
    `);

    res.json({
      summary: {
        totalFailures24h: parseInt(total24h.rows[0].count)
      },
      recent: recent.rows,
      topTargets7d: targets.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TENANTS ENDPOINTS ---
app.get('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json(mapTenantToFrontend(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tenants', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tenants ORDER BY name ASC');
    const mapped = result.rows.map(t => mapTenantToFrontend(t));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants', async (req, res) => {
  try {
    const t = req.body;
    const id = t.id;
    const name = t.name;
    const owner_email = t.ownerEmail || t.owner_email || 'sql_owner@pos.com';
    const admin_pin = t.adminPin || t.admin_pin || '1234';
    const categories = JSON.stringify(t.categories || []);
    const cashiers = JSON.stringify(t.cashiers || []);

    const query = `
        INSERT INTO tenants (
          id, name, owner_email, admin_pin, categories, cashiers, 
          subscription_status, subscription_package, trial_ends_at, subscription_ends_at,
          tax_enabled, tax_percentage, tax_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          owner_email = EXCLUDED.owner_email,
          admin_pin = EXCLUDED.admin_pin,
          categories = EXCLUDED.categories,
          cashiers = EXCLUDED.cashiers,
          subscription_status = EXCLUDED.subscription_status,
          subscription_package = EXCLUDED.subscription_package,
          trial_ends_at = EXCLUDED.trial_ends_at,
          subscription_ends_at = EXCLUDED.subscription_ends_at,
          tax_enabled = EXCLUDED.tax_enabled,
          tax_percentage = EXCLUDED.tax_percentage,
          tax_method = EXCLUDED.tax_method,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
    const values = [
      id, name, owner_email, admin_pin, categories, cashiers,
      t.subscriptionStatus || 'trial',
      t.subscriptionPackage || 'monthly',
      t.trialEndsAt || null,
      t.subscriptionEndsAt || null,
      t.taxEnabled || false,
      t.taxPercentage || 0,
      t.taxMethod || 'exclude'
    ];
    const result = await pool.query(query, values);
    res.status(201).json(mapTenantToFrontend(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const t = req.body;
    const query = `
      UPDATE tenants SET
        name = $1,
        admin_pin = $2,
        address = $3,
        phone = $4,
        categories = $5,
        cashiers = $6,
        receipt_footer = $7,
        receipt_logo = $8,
        printer_address = $9,
        printer_auto_cut = $10,
        qris_merchant_name = $11,
        qris_nmid = $12,
        qris_custom_image = $13,
        subscription_status = $14,
        subscription_package = $15,
        trial_ends_at = $16,
        subscription_ends_at = $17,
        tax_enabled = $18,
        tax_percentage = $19,
        tax_method = $20,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *
    `;
    const values = [
      t.name, t.adminPin, t.address, t.phone,
      JSON.stringify(t.categories || []),
      JSON.stringify(t.cashiers || []),
      t.receiptFooter, t.receiptLogo,
      t.printerAddress, t.printerAutoCut,
      t.qrisMerchantName, t.qrisNmid, t.qrisCustomImage,
      t.subscriptionStatus || 'trial',
      t.subscriptionPackage || 'monthly',
      t.trialEndsAt || null,
      t.subscriptionEndsAt || null,
      t.taxEnabled || false,
      t.taxPercentage || 0,
      t.taxMethod || 'exclude',
      id
    ];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json(mapTenantToFrontend(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PRODUCTS ENDPOINTS ---
app.get('/api/products/:tenantId', authenticateToken, verifyTenantAccess, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
    res.json(result.rows.map(p => mapProductToFrontend(p)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:tenantId', authenticateToken, verifyOwner, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const p = req.body;
    const query = `
      INSERT INTO products (id, tenant_id, name, barcode, category, price, cost, stock, min_stock, unit, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        cost = EXCLUDED.cost,
        stock = EXCLUDED.stock,
        category = EXCLUDED.category,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [p.id, tenantId, p.name, p.barcode, p.category, p.price, p.cost, p.stock, p.minStock, p.unit, p.imageUrl];
    const result = await pool.query(query, values);
    res.status(201).json(mapProductToFrontend(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:tenantId/:id', authenticateToken, verifyOwner, async (req, res) => {
  try {
    const { tenantId, id } = req.params;
    const p = req.body;
    const query = `
        UPDATE products SET
            name = $1, barcode = $2, category = $3, price = $4, cost = $5, 
            stock = $6, min_stock = $7, unit = $8, image_url = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10 AND tenant_id = $11
        RETURNING *
      `;
    const values = [p.name, p.barcode, p.category, p.price, p.cost, p.stock, p.minStock, p.unit, p.imageUrl, id, tenantId];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(mapProductToFrontend(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:tenantId/:id', authenticateToken, verifyOwner, async (req, res) => {
  try {
    const { tenantId, id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- STOCK LOGS ---
app.post('/api/stock-logs/:tenantId', authenticateToken, verifyOwner, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const log = req.body;

    // Get current stock from DB first to ensure accuracy
    const prodRes = await pool.query('SELECT stock FROM products WHERE id = $1 AND tenant_id = $2', [log.productId, tenantId]);
    if (prodRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const latestStock = prodRes.rows[0].stock;

    const query = `
        INSERT INTO stock_logs (id, tenant_id, product_id, timestamp, type, quantity, reason, current_stock, operator)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
    // 'type' normally 'PENAMBAHAN' -> mapped to 'in' or 'out'
    const typeStr = (log.reason === 'PENJUALAN' || log.reason === 'RUSAK') ? 'out' : 'in';
    const values = [log.id, tenantId, log.productId, log.timestamp, typeStr, Math.abs(log.change), log.reason, latestStock, log.userName];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock-logs/:tenantId', authenticateToken, verifyOwner, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const query = `
      SELECT sl.*, p.name as product_name 
      FROM stock_logs sl
      LEFT JOIN products p ON sl.product_id = p.id
      WHERE sl.tenant_id = $1 
      ORDER BY sl.timestamp DESC
    `;
    const result = await pool.query(query, [tenantId]);
    const mapped = result.rows.map(log => ({
      id: log.id,
      productId: log.product_id,
      productName: log.product_name || 'Produk Terhapus',
      change: log.type === 'out' ? -parseInt(log.quantity) : parseInt(log.quantity),
      reason: log.reason,
      timestamp: log.timestamp,
      userName: log.operator
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRANSACTIONS ENDPOINTS (WITH ATOMIC STOCK UPDATE & COST SNAPSHOT) ---
app.post('/api/transactions/:tenantId', authenticateToken, verifyTenantAccess, async (req, res) => {
  const { tenantId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = req.body;

    // 1. Snapshot costs from current products for higher accuracy in P&L
    // Note: We ignore if the price/cost has changed since the frontend request
    // and rely on the frontend's provided cost if it matches the DB's current cost
    // for historical integrity. 

    // 1. Insert Transaction Header (including tax and percentages)
    const txQuery = `
      INSERT INTO transactions (id, tenant_id, timestamp, total_price, total_cost, profit, tax, tax_percent, discount_percent, payment_method, amount_paid, change, cashier_name, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;
    await client.query(txQuery, [
      tx.id, tenantId, tx.timestamp, tx.totalPrice, tx.totalCost,
      tx.profit, tx.tax || 0, tx.taxPercent || 0, tx.discountPercent || 0,
      tx.paymentMethod, tx.amountPaid, tx.change, tx.cashierName, tx.sessionId
    ]);

    // 2. Insert Items & Update Stock
    for (const item of tx.items) {
      // Fetch latest cost from DB to ensure snapshot is accurate if frontend is outdated
      const prodRes = await client.query('SELECT cost, stock FROM products WHERE id = $1 AND tenant_id = $2', [item.productId, tenantId]);
      const actualCost = prodRes.rows.length > 0 ? parseFloat(prodRes.rows[0].cost) : item.cost;
      const latestStockBefore = prodRes.rows.length > 0 ? prodRes.rows[0].stock : 0;

      const logId = `log-${tx.id}-${item.productId}`;
      const logExists = await client.query('SELECT id FROM stock_logs WHERE id = $1', [logId]);

      if (logExists.rows.length === 0) {
        await client.query(
          'INSERT INTO transaction_items (transaction_id, product_id, name, price, cost, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
          [tx.id, item.productId, item.name, item.price, actualCost, item.quantity]
        );

        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2 AND tenant_id = $3',
          [item.quantity, item.productId, tenantId]
        );

        const currentStock = latestStockBefore - item.quantity;

        await client.query(
          `INSERT INTO stock_logs (id, tenant_id, product_id, timestamp, type, quantity, reason, current_stock, operator)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [logId, tenantId, item.productId, tx.timestamp, 'out', item.quantity, 'PENJUALAN', currentStock, tx.cashierName]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Transaction successful', id: tx.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/transactions/:tenantId', authenticateToken, verifyOwner, async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Fetch all transactions for this tenant
    const txResult = await pool.query(
      'SELECT * FROM transactions WHERE tenant_id = $1 ORDER BY timestamp DESC',
      [tenantId]
    );

    if (txResult.rows.length === 0) {
      return res.json([]);
    }

    // Fetch all transaction items for these transactions
    const txIds = txResult.rows.map(r => r.id);
    const itemsResult = await pool.query(
      'SELECT * FROM transaction_items WHERE transaction_id = ANY($1)',
      [txIds]
    );

    // Group items by transaction_id
    const itemsMap = {};
    itemsResult.rows.forEach(item => {
      if (!itemsMap[item.transaction_id]) {
        itemsMap[item.transaction_id] = [];
      }
      itemsMap[item.transaction_id].push({
        productId: item.product_id,
        name: item.name,
        price: parseFloat(item.price),
        cost: parseFloat(item.cost),
        quantity: parseInt(item.quantity)
      });
    });

    // Map database rows (snake_case) to Frontend transaction format (camelCase)
    const mappedTransactions = txResult.rows.map(t => ({
      id: t.id,
      timestamp: t.timestamp,
      totalPrice: parseFloat(t.total_price),
      totalCost: parseFloat(t.total_cost),
      profit: parseFloat(t.profit),
      tax: parseFloat(t.tax || 0),
      taxPercent: parseFloat(t.tax_percent || 0),
      discountPercent: parseFloat(t.discount_percent || 0),
      paymentMethod: t.payment_method,
      amountPaid: parseFloat(t.amount_paid),
      change: parseFloat(t.change),
      cashierName: t.cashier_name,
      sessionId: t.session_id || undefined,
      items: itemsMap[t.id] || []
    }));

    res.json(mappedTransactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESET DATA ---
app.delete('/api/tenants/:tenantId/reset', authenticateToken, verifyOwner, async (req, res) => {
  try {
    const { tenantId } = req.params;
    await pool.query('DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE tenant_id = $1)', [tenantId]);
    await pool.query('DELETE FROM transactions WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM stock_logs WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM products WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM kas_mutations WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM cashier_sessions WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM kas_besar WHERE tenant_id = $1', [tenantId]);
    res.json({ message: 'Data tenant berhasil direset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CASHIER SESSIONS ENDPOINTS ---
app.get('/api/sessions/:tenantId/active', authenticateToken, verifyTenantAccess, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await pool.query(
      "SELECT * FROM cashier_sessions WHERE tenant_id = $1 AND status = 'OPEN' LIMIT 1",
      [tenantId]
    );
    if (result.rows.length === 0) return res.json(null);

    const s = result.rows[0];
    res.json({
      id: s.id,
      tenantId: s.tenant_id,
      cashierUid: s.cashier_uid,
      startTime: s.start_time,
      endTime: s.end_time,
      openingBalance: parseFloat(s.opening_balance),
      closingBalance: s.closing_balance ? parseFloat(s.closing_balance) : undefined,
      totalCashSales: parseFloat(s.total_cash_sales),
      totalQRIS: parseFloat(s.total_qris),
      totalCard: parseFloat(s.total_card),
      status: s.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/open', authenticateToken, verifyTenantAccess, async (req, res) => {
  try {
    const { id, tenantId, cashierUid, startTime, openingBalance } = req.body;
    const query = `
      INSERT INTO cashier_sessions (id, tenant_id, cashier_uid, start_time, opening_balance, status)
      VALUES ($1, $2, $3, $4, $5, 'OPEN')
      RETURNING *
    `;
    const result = await pool.query(query, [id, tenantId, cashierUid, startTime, openingBalance]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/close', async (req, res) => {
  try {
    const { sessionId, endTime, closingBalance, totalCashSales, totalQRIS, totalCard } = req.body;
    const query = `
      UPDATE cashier_sessions SET
        end_time = $1,
        closing_balance = $2,
        total_cash_sales = $3,
        total_qris = $4,
        total_card = $5,
        status = 'CLOSED'
      WHERE id = $6
      RETURNING *
    `;
    const result = await pool.query(query, [
      endTime, closingBalance, totalCashSales || 0, totalQRIS || 0, totalCard || 0, sessionId
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { date_from, date_to, cashier_uid } = req.query;

    let query = "SELECT * FROM cashier_sessions WHERE tenant_id = $1";
    const params = [tenantId];

    if (date_from) {
      params.push(date_from);
      query += ` AND start_time >= $${params.length}`;
    }
    if (date_to) {
      params.push(date_to + ' 23:59:59');
      query += ` AND start_time <= $${params.length}`;
    }
    if (cashier_uid) {
      params.push(cashier_uid);
      query += ` AND cashier_uid = $${params.length}`;
    }
    query += " ORDER BY start_time DESC";

    const sessionResult = await pool.query(query, params);

    // Resolve cashier names from tenant JSON
    const tenantResult = await pool.query('SELECT cashiers FROM tenants WHERE id = $1', [tenantId]);
    const cashiersJson = tenantResult.rows[0]?.cashiers;
    const cashiersList = typeof cashiersJson === 'string' ? JSON.parse(cashiersJson) : (cashiersJson || []);
    const cashierMap = {};
    cashiersList.forEach(c => { cashierMap[c.uid] = c.name; });

    const mapped = sessionResult.rows.map(s => ({
      id: s.id,
      tenantId: s.tenant_id,
      cashierUid: s.cashier_uid,
      cashierName: cashierMap[s.cashier_uid] || s.cashier_uid || 'Kasir',
      startTime: s.start_time,
      endTime: s.end_time,
      openingBalance: parseFloat(s.opening_balance),
      closingBalance: s.closing_balance ? parseFloat(s.closing_balance) : undefined,
      totalCashSales: s.total_cash_sales ? parseFloat(s.total_cash_sales) : 0,
      totalQRIS: s.total_qris ? parseFloat(s.total_qris) : 0,
      totalCard: s.total_card ? parseFloat(s.total_card) : 0,
      status: s.status
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- KAS BESAR ENDPOINTS ---
app.get('/api/kas-besar/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    let result = await pool.query('SELECT * FROM kas_besar WHERE tenant_id = $1', [tenantId]);
    if (result.rows.length === 0) {
      const insertRes = await pool.query(
        'INSERT INTO kas_besar (tenant_id, balance) VALUES ($1, 0) RETURNING *',
        [tenantId]
      );
      result = insertRes;
    }
    const row = result.rows[0];
    res.json({
      id: 'kas-besar-' + tenantId,
      tenantId: row.tenant_id,
      balance: parseFloat(row.balance)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kas-besar/:tenantId/sync', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { balance } = req.body;
    const result = await pool.query(
      `INSERT INTO kas_besar (tenant_id, balance)
       VALUES ($1, $2)
       ON CONFLICT (tenant_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [tenantId, balance]
    );
    const row = result.rows[0];
    res.json({
      id: 'kas-besar-' + tenantId,
      tenantId: row.tenant_id,
      balance: parseFloat(row.balance)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MUTATIONS ENDPOINTS ---
app.get('/api/mutations/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await pool.query(
      'SELECT * FROM kas_mutations WHERE tenant_id = $1 ORDER BY timestamp DESC',
      [tenantId]
    );
    const mapped = result.rows.map(m => ({
      id: m.id,
      tenantId: m.tenant_id,
      type: m.type,
      source: m.source,
      amount: parseFloat(m.amount),
      timestamp: m.timestamp,
      note: m.note,
      sessionId: m.session_id,
      target: m.target
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mutations/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const m = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO kas_mutations (id, tenant_id, type, source, amount, timestamp, note, session_id, target)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await client.query(query, [
      m.id, tenantId, m.type, m.source, m.amount, m.timestamp, m.note, m.sessionId || null, m.target
    ]);

    if (m.target === 'KAS_BESAR' && m.source !== 'SALDO_AWAL') {
      const delta = m.type === 'MASUK' ? m.amount : -m.amount;
      await client.query(
        `INSERT INTO kas_besar (tenant_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (tenant_id) DO UPDATE SET balance = kas_besar.balance + $3, updated_at = CURRENT_TIMESTAMP`,
        [tenantId, delta > 0 ? delta : 0, delta]
      );
    }

    await client.query('COMMIT');

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      source: row.source,
      amount: parseFloat(row.amount),
      timestamp: row.timestamp,
      note: row.note,
      sessionId: row.session_id,
      target: row.target
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add a 404 handler (must be after all other routes)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// Generic error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan server internal.' });
});


// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
