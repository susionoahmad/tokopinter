-- SKEMA DATABASE POS KASIR SAAS (POSTGRESQL)
-- Versi: 1.0
-- Deskripsi: Multi-tenant POS system with audit logs and relational transactions

-- 1. Tabel Tenants (Data Toko)
CREATE TABLE tenants (
    id VARCHAR(50) PRIMARY KEY, -- Contoh: TOKO-AIUQ0
    name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    admin_pin VARCHAR(10) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    categories JSONB DEFAULT '[]', -- Menyimpan array kategori dalam format JSON
    cashiers JSONB DEFAULT '[]',   -- Menyimpan array kasir (nama, pin, etc.)
    receipt_footer TEXT,
    receipt_logo TEXT,           -- Base64 atau URL
    printer_address VARCHAR(100),
    printer_auto_cut BOOLEAN DEFAULT FALSE,
    qris_merchant_name VARCHAR(255),
    qris_nmid VARCHAR(50),
    qris_custom_image TEXT,      -- Base64 atau URL
    subscription_status VARCHAR(20) DEFAULT 'trial', -- trial, active, expired
    subscription_package VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly, lifetime
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Products (Katalog Barang)
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    category VARCHAR(100),
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit VARCHAR(20) DEFAULT 'pcs',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Transactions (Header Penjualan)
CREATE TABLE transactions (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    total_cost DECIMAL(15, 2) NOT NULL,
    profit DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- Tunai, QRIS, Kartu
    amount_paid DECIMAL(15, 2) NOT NULL,
    change DECIMAL(15, 2) NOT NULL,
    cashier_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Transaction Items (Detail Barang terjual)
-- Inilah kelebihan SQL, kita bisa memisahkan item untuk laporan yang lebih detail
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) REFERENCES transactions(id) ON DELETE CASCADE,
    product_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    cost DECIMAL(15, 2) NOT NULL,
    quantity INTEGER NOT NULL
);

-- 5. Tabel Stock Logs (Audit Perubahan Stok)
CREATE TABLE stock_logs (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'in' (tambah) atau 'out' (jual/kurang)
    quantity INTEGER NOT NULL,
    reason TEXT,
    current_stock INTEGER NOT NULL,
    operator VARCHAR(100)
);

-- 6. Tabel Cashier Sessions (Shift Kasir)
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

-- 7. Tabel Kas Besar (Keuangan Owner)
CREATE TABLE kas_besar (
    tenant_id VARCHAR(50) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Kas Mutations (Catatan Aliran Kas)
CREATE TABLE kas_mutations (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'MASUK' | 'KELUAR'
    source VARCHAR(50) NOT NULL, -- 'PENJUALAN' | 'KAS_BESAR_TRANSFER' | 'MODAL_SESI' | 'PENARIKAN_SESI' | 'LAINNYA'
    amount DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    session_id VARCHAR(50),
    target VARCHAR(20) NOT NULL -- 'CASHIER' | 'KAS_BESAR'
);

-- 9. Tabel Login Logs (Audit Trail Keamanan)
CREATE TABLE login_logs (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL, -- 'SUCCESS' | 'FAILED' | 'RATE_LIMITED'
    reason TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing untuk mempercepat query multi-tenant
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_stock_logs_product ON stock_logs(product_id);
