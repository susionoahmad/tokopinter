export interface KasBesar {
  id: string;
  tenantId: string;
  balance: number;
}

export interface Mutation {
  id: string;
  tenantId: string;
  type: 'MASUK' | 'KELUAR';
  source: 'PENJUALAN' | 'KAS_BESAR_TRANSFER' | 'MODAL_SESI' | 'PENARIKAN_SESI' | 'SALDO_AWAL' | 'LAINNYA';
  amount: number;
  timestamp: string;
  note?: string;
  sessionId?: string; // Links to session if relevant
  target: 'CASHIER' | 'KAS_BESAR';
}

export interface Cashier {
  uid: string;
  name: string;
  pin: string;
  tenantId: string;
}

export interface CashierSession {
  id: string;
  tenantId: string;
  cashierUid: string;
  cashierName?: string;
  startTime: string; // ISO
  endTime?: string;  // ISO
  openingBalance: number;
  closingBalance?: number;
  totalCashSales?: number;
  totalQRIS?: number;
  totalCard?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface CashierFinancialRecord {
  id: string;
  tenantId: string;
  cashierUid: string;
  sessionId: string;
  type: 'OPENING' | 'SALES' | 'HANDOVER' | 'CLOSING';
  amount: number;
  timestamp: string;
  note?: string;
  target: 'CASHIER' | 'KAS_BESAR';
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  change: number; // positive for addition, negative for reduction
  reason: 'PENJUALAN' | 'PENAMBAHAN' | 'PENYESUAIAN' | 'RUSAK' | string; // making it flexible
  timestamp: string;
  userName: string;
}

export interface CostHistoryLog {
  id: string;
  productId: string;
  oldCost: number;
  newCost: number;
  timestamp: string; // ISO string
  userName: string;
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // Jual
  cost: number;  // Modal/Beli (for profit calculation)
  stock: number;
  minStock: number; // Alerts if stock <= minStock
  barcode?: string;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO string
  items: {
    productId: string;
    name: string;
    price: number;
    cost: number;
    quantity: number;
  }[];
  totalPrice: number;
  totalCost: number;
  profit: number;
  tax: number;
  taxPercent?: number;
  discountPercent?: number;
  paymentMethod: 'Tunai' | 'QRIS' | 'Kartu';
  amountPaid: number;
  change: number;
  cashierName?: string;
  cashierUid?: string;
  sessionId?: string;
}

export type SubscriptionPackage = 'trial' | 'monthly' | 'yearly' | 'lifetime';

export interface SubscriptionRates {
  trial: number;
  monthly: number;
  yearly: number;
  lifetime: number;
}

export interface Tenant {
  id: string;        // e.g., 'TOKO-XYZ'
  name: string;
  ownerUid: string;
  ownerEmail: string;
  adminPin: string;   // e.g., '1234'
  cashiers: Cashier[];
  createdAt: string;
  categories?: string[]; // Custom defined categories for this specific store
  address?: string;     // Store Alamat
  phone?: string;       // Store Telepon
  receiptFooter?: string; // Store receipt dynamic footer
  receiptLogo?: string; // Base64 logo for the receipt
  printerAddress?: string; // MAC / Device Address of Bluetooth Printer
  printerAutoCut?: boolean; // Auto-cut paper toggle
  qrisMerchantName?: string;
  qrisNmid?: string;
  qrisCustomImage?: string; // base64 string or URL of static QRIS barcode/image
  subscriptionStatus?: 'trial' | 'active' | 'expired';
  subscriptionPackage?: SubscriptionPackage;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  taxEnabled?: boolean;
  taxPercentage?: number;
  taxMethod?: 'include' | 'exclude'; 
}

export type ActiveTab = 'pos' | 'inventory' | 'reports' | 'kas_pro' | 'superadmin' | 'tenant-settings';
