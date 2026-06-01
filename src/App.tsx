import React, { useState, useEffect } from 'react';
import { Product, CartItem, Transaction, ActiveTab, Tenant, SubscriptionPackage, SubscriptionRates, StockLog, CashierSession, KasBesar, Mutation } from './types';
import { INITIAL_PRODUCTS } from './data/mockProducts';
import { generateId, formatRupiah } from './utils';

const safeSetStorage = (key: string, value: any, limit: number = 0) => {
  try {
    if (Array.isArray(value) && limit > 0) {
      localStorage.setItem(key, JSON.stringify(value.slice(-limit)));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('Gagal menyimpan data ke local storage (' + key + '), masalah memori/kuota penuh.', error);
  }
};

import CashierTab from './components/CashierTab';
import InventoryTab from './components/InventoryTab';
import ReportsTab from './components/ReportsTab';
import KasProTab from './components/KasProTab';
import TenantPortal from './components/TenantPortal';
import LoginAuditDashboard from './components/LoginAuditDashboard';
import LockScreen from './components/LockScreen';
import TenantSettingsTab from './components/TenantSettingsTab';
import SaaSAdminPanel from './components/SaaSAdminPanel';
import { auth, loginWithGoogle, logoutUser } from './lib/firebase';
import { apiService } from './lib/api';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  Smartphone,
  Wifi,
  Battery,
  Database,
  Compass,
  BookOpen,
  FolderLock,
  LogOut,
  RefreshCw,
  Sparkles,
  Calculator,
  Box,
  BarChart3,
  Award,
  CircleHelp,
  Check,
  Play,
  Heart,
  ChevronRight,
  X,
  ChevronLeft,
  Lock,
  Store,
  ShieldAlert,
  Settings,
  PiggyBank
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Central Superadmin Configuration
const SUPERADMIN_EMAILS = ['susiono.ahmad@gmail.com'];

// Generates some initial transactions to populate reports
const getInitialTransactions = (): Transaction[] => {
  const now = new Date();

  // 3 mock sales today
  const tx1Time = new Date();
  tx1Time.setHours(now.getHours() - 4);
  const tx2Time = new Date();
  tx2Time.setHours(now.getHours() - 2);
  const tx3Time = new Date();
  tx3Time.setHours(now.getHours() - 1);

  const todayTxs: Transaction[] = [
    {
      id: 'tx-1001',
      timestamp: tx1Time.toISOString(),
      items: [
        { productId: 'prod-1', name: 'Indomie Goreng Spesial', price: 3500, cost: 2700, quantity: 4 },
        { productId: 'prod-2', name: 'Teh Botol Sosro Kotak 250ml', price: 4000, cost: 2900, quantity: 2 }
      ],
      totalPrice: (3500 * 4) + (4000 * 2), // 22.000
      totalCost: (2700 * 4) + (2900 * 2), // 16.600
      profit: 22000 - 16600, // 5.400
      tax: 2200,
      paymentMethod: 'Tunai',
      amountPaid: 30000,
      change: 8000
    },
    {
      id: 'tx-1002',
      timestamp: tx2Time.toISOString(),
      items: [
        { productId: 'prod-3', name: 'Beras Pandan Wangi 5kg', price: 78000, cost: 67000, quantity: 1 },
        { productId: 'prod-5', name: 'Gula Pasir Gulaku 1kg', price: 16500, cost: 14200, quantity: 2 }
      ],
      totalPrice: 111000,
      totalCost: 95400,
      profit: 111000 - 95400, // 15.600
      tax: 0,
      paymentMethod: 'QRIS',
      amountPaid: 111000,
      change: 0
    },
    {
      id: 'tx-1003',
      timestamp: tx3Time.toISOString(),
      items: [
        { productId: 'prod-4', name: 'Minyak Goreng Bimoli 1L', price: 18500, cost: 15800, quantity: 2 },
        { productId: 'prod-7', name: 'Kopi Kapal Api Mix 1 Renceng', price: 15000, cost: 12500, quantity: 1 }
      ],
      totalPrice: 52000,
      totalCost: 44100,
      profit: 52000 - 44100, // 7.900
      tax: 5200,
      paymentMethod: 'Kartu',
      amountPaid: 52000,
      change: 0
    }
  ];

  // Let's seed 6 prior days with nice mock transaction entries
  const historyTxs: Transaction[] = [];
  const baseSeedSalesByDay = [
    // Day -6
    [
      { productId: 'prod-3', name: 'Beras Pandan Wangi 5kg', price: 78000, cost: 67000, quantity: 2 },
      { productId: 'prod-1', name: 'Indomie Goreng Spesial', price: 3500, cost: 2700, quantity: 10 }
    ],
    // Day -5
    [
      { productId: 'prod-4', name: 'Minyak Goreng Bimoli 1L', price: 18500, cost: 15800, quantity: 5 },
      { productId: 'prod-2', name: 'Teh Botol Sosro Kotak 250ml', price: 4000, cost: 2900, quantity: 12 }
    ],
    // Day -4
    [
      { productId: 'prod-5', name: 'Gula Pasir Gulaku 1kg', price: 16500, cost: 14200, quantity: 8 },
      { productId: 'prod-8', name: 'Sabun Mandi Lifebuoy Red 85g', price: 4500, cost: 3600, quantity: 15 }
    ],
    // Day -3
    [
      { productId: 'prod-3', name: 'Beras Pandan Wangi 5kg', price: 78000, cost: 67000, quantity: 3 },
      { productId: 'prod-6', name: 'Roti Tawar Sari Roti', price: 15000, cost: 12800, quantity: 6 }
    ],
    // Day -2
    [
      { productId: 'prod-1', name: 'Indomie Goreng Spesial', price: 3500, cost: 2700, quantity: 20 },
      { productId: 'prod-7', name: 'Kopi Kapal Api Mix 1 Renceng', price: 15000, cost: 12500, quantity: 5 }
    ],
    // Day -1
    [
      { productId: 'prod-3', name: 'Beras Pandan Wangi 5kg', price: 78000, cost: 67000, quantity: 2 },
      { productId: 'prod-4', name: 'Minyak Goreng Bimoli 1L', price: 18500, cost: 15800, quantity: 6 },
      { productId: 'prod-5', name: 'Gula Pasir Gulaku 1kg', price: 16500, cost: 14200, quantity: 4 }
    ]
  ];

  for (let i = 6; i >= 1; i--) {
    const prevDate = new Date();
    prevDate.setDate(now.getDate() - i);
    prevDate.setHours(9 + (i % 3) * 3); // realistic hour distribution

    const items = baseSeedSalesByDay[6 - i] || [];
    let totalPrice = 0;
    let totalCost = 0;
    items.forEach(it => {
      totalPrice += it.price * it.quantity;
      totalCost += it.cost * it.quantity;
    });

    const tax = i % 2 === 0 ? Math.round(totalPrice * 0.08) : 0;
    historyTxs.push({
      id: `tx-history-${1000 - i}`,
      timestamp: prevDate.toISOString(),
      items,
      totalPrice,
      totalCost,
      profit: totalPrice - totalCost,
      tax,
      paymentMethod: i % 2 === 0 ? 'Tunai' : 'QRIS',
      amountPaid: totalPrice,
      change: 0
    });
  }

  return [...historyTxs, ...todayTxs];
};

export default function App() {
  // State Initialization
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [androidTime, setAndroidTime] = useState('');
  const [androidDate, setAndroidDate] = useState('');

  // Firebase Auth State & Online Connection status
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sqlSyncStatus, setSqlSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Multi-tenant SaaS States
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [kasBesar, setKasBesar] = useState<KasBesar | null>(null);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [activeRole, setActiveRole] = useState<'superadmin' | 'owner' | 'cashier' | null>(null);
  const [activeCashierSession, setActiveCashierSession] = useState<CashierSession | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [packageRates, setPackageRates] = useState<SubscriptionRates>({ trial: 0, monthly: 99000, yearly: 990000, lifetime: 2499000 });

  // Tutor System (Feynman's IT Class) State
  const [showTutor, setShowTutor] = useState(false);
  const [tutorStep, setTutorStep] = useState(1);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null); // null = not done, 1 = correct, 0 = wrong
  const [couponCode, setCouponCode] = useState<string | null>(null);

  // Monitor network online/offline transitions in real-time
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Firebase authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      // Auto-exchange status for backend JWT if superadmin whitelist matches
      if (user && SUPERADMIN_EMAILS.includes(user.email || '')) {
        try {
          await apiService.superadminLogin(user.email!);
        } catch (e) {
          console.error("Backend superadmin token exchange failed:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sinkronisasi Role Superadmin berdasarkan Google Auth (Firebase)
  // Digunakan untuk membedakan hak akses global SaaS vs hak akses per-toko (PostgreSQL)
  useEffect(() => {
    if (authLoading) return;

    const isSuperadmin = currentUser && SUPERADMIN_EMAILS.includes(currentUser.email || '');

    // Jika tidak sedang di dalam toko, tentukan role berdasarkan Google Auth
    if (!activeTenant) {
      if (isSuperadmin) {
        if (activeRole !== 'superadmin') {
          setActiveRole('superadmin');
          localStorage.setItem('pos_active_role', 'superadmin');
        }
      } else if (activeRole === 'superadmin') {
        setActiveRole(null);
        localStorage.removeItem('pos_active_role');
      }
    }
  }, [currentUser, activeTenant, authLoading, activeRole]);

  // Authenticated state is managed via onAuthStateChanged.
  // Data persistence is handled directly by PostgreSQL API and local storage.

  // Fetch tenants from PostgreSQL database
  const fetchTenants = async () => {
    try {
      console.log("Fetching tenants from PostgreSQL database...");
      const list = await apiService.getTenants();

      // Inject demo tenant if not present in list
      const demoExists = list.some((t: Tenant) => t.id === 'TOKO-DEMO');
      const finalList = demoExists ? list : [
        {
          id: 'TOKO-DEMO',
          name: 'Warung Kasir Pintar (Demo Lokal)',
          ownerUid: 'offline_author',
          ownerEmail: 'offline_owner@pos.com',
          adminPin: '1234',
          cashiers: [{ uid: 'demo-cashier', name: 'Kasir Demo', pin: '0000', tenantId: 'TOKO-DEMO' }],
          createdAt: new Date().toISOString(),
          subscriptionStatus: 'trial',
          categories: ['Makanan', 'Minuman', 'Sembako', 'Sabun & Mandi', 'Lainnya']
        },
        ...list
      ];

      setTenants(finalList);
      localStorage.setItem('saas_cached_tenants', JSON.stringify(finalList));

      // Re-sync active tenant if matches one in list
      const savedTenantId = localStorage.getItem('pos_active_tenant_id');
      if (savedTenantId) {
        const fresh = finalList.find(t => t.id === savedTenantId);
        if (fresh && JSON.stringify(fresh) !== JSON.stringify(activeTenant)) {
          setActiveTenant(fresh);
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil tenant dari SQL, fallback ke cache:", err);
      const localTenantsRaw = localStorage.getItem('saas_cached_tenants');
      if (localTenantsRaw) {
        setTenants(JSON.parse(localTenantsRaw));
      } else {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);
        const defaultLocalTenant: Tenant = {
          id: 'TOKO-DEMO',
          name: 'Warung Kasir Pintar (Demo Lokal)',
          ownerUid: 'offline_author',
          ownerEmail: 'offline_owner@pos.com',
          adminPin: '1234',
          cashiers: [{ uid: 'demo-cashier', name: 'Kasir Demo', pin: '0000', tenantId: 'TOKO-DEMO' }],
          createdAt: new Date().toISOString(),
          subscriptionStatus: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
          categories: ['Makanan', 'Minuman', 'Sembako', 'Sabun & Mandi', 'Lainnya']
        };
        const initList = [defaultLocalTenant];
        setTenants(initList);
        localStorage.setItem('saas_cached_tenants', JSON.stringify(initList));
      }
    }
  };

  // Fetch tenants on mount or when auth state changes
  useEffect(() => {
    if (authLoading) return;
    fetchTenants().finally(() => {
      // Jika tidak ada sesi yang perlu di-restore, kita selesaikan initializing di sini
      if (!localStorage.getItem('pos_token')) {
        setIsInitializing(false);
      }
    });
  }, [currentUser, authLoading]);

  // Auto-login effect for existing sessions & Initializing Guard
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem('pos_token');
      const savedTenantId = localStorage.getItem('pos_active_tenant_id');
      const savedRole = localStorage.getItem('pos_active_role');
      const savedLockedState = localStorage.getItem('pos_is_locked') === 'true';

      if (savedToken && savedTenantId) {
        try {
          // Validasi sesi ke PostgreSQL API
          const tenant = await apiService.getTenant(savedTenantId);
          setActiveTenant(tenant);
          setActiveRole(savedRole as any);
          setIsLocked(savedLockedState);
        } catch (err) {
          console.warn('Sesi kadaluwarsa atau server tidak terjangkau.');
          apiService.logout();
          setActiveTenant(null);
          setActiveRole(null);
        }
      }
      setIsInitializing(false);
    };

    if (!authLoading) {
      checkSession();
    }
  }, [authLoading]);


// Removed Firestore background auto-sync hook as we move to SQL only.
// Data is synced immediately to SQL in handlers.
// Offline data persists in localStorage until next manual sync or auto-retry.

// Sync products/transactions under the selected tenant
useEffect(() => {
  if (authLoading) return;

  // Immediately clear list states when changing tenant or loaded state to avoid transient states
  setProducts([]);
  setTransactions([]);
  setStockLogs([]);

  if (!activeTenant) {
    return;
  }

  // Only query PostgreSQL API if authenticated, token is verified, online, and target is NOT the local-only DEMO tenant
  if (activeTenant && activeTenant.id !== 'TOKO-DEMO') {
    const fetchProducts = async () => {
      try {
        const cloudProds = await apiService.getProducts(activeTenant.id);
        setProducts(cloudProds);
        safeSetStorage(`pos_products_${activeTenant.id}`, cloudProds, 2000);
      } catch (err) {
        console.warn(`Gagal mengambil produk dari SQL untuk ${activeTenant.id}, fallback ke cache.`);
        const savedProducts = localStorage.getItem(`pos_products_${activeTenant.id}`);
        if (savedProducts) setProducts(JSON.parse(savedProducts));
      }
    };
    fetchProducts();

    // Fetch Kas Besar from SQL
    const fetchKasBesar = async () => {
      try {
        const kbData = await apiService.getKasBesar(activeTenant.id);

        // Auto migration: if SQL balance is 0 but local cache balance > 0, sync it to PostgreSQL
        const savedKasBesar = localStorage.getItem(`pos_kas_besar_${activeTenant.id}`);
        if (savedKasBesar) {
          const localKB = JSON.parse(savedKasBesar);
          if (localKB && localKB.balance > 0 && kbData.balance === 0) {
            console.log(`[Migration] Syncing local Kas Besar balance (${localKB.balance}) to SQL...`);
            const syncedKB = await apiService.syncKasBesar(activeTenant.id, localKB.balance);
            setKasBesar(syncedKB);
            safeSetStorage(`pos_kas_besar_${activeTenant.id}`, syncedKB);
            return;
          }
        }

        setKasBesar(kbData);
        safeSetStorage(`pos_kas_besar_${activeTenant.id}`, kbData);
      } catch (err) {
        console.warn('Gagal mengambil Kas Besar dari SQL, fallback ke cache:', err);
        const savedKasBesar = localStorage.getItem(`pos_kas_besar_${activeTenant.id}`);
        if (savedKasBesar) setKasBesar(JSON.parse(savedKasBesar));
      }
    };
    fetchKasBesar();

    // Fetch Mutations from SQL
    const fetchMutations = async () => {
      try {
        const kbData = await apiService.getKasBesar(activeTenant.id);
        const mutList = await apiService.getMutations(activeTenant.id);

        let finalMuts = mutList;
        // Auto migration: if SQL mutations are empty but local cache mutations exist, sync them to PostgreSQL
        const savedMutations = localStorage.getItem(`pos_mutations_${activeTenant.id}`);
        if (savedMutations) {
          const localMuts: Mutation[] = JSON.parse(savedMutations);
          if (localMuts && localMuts.length > 0 && mutList.length === 0) {
            console.log(`[Migration] Syncing ${localMuts.length} local mutations to SQL...`);
            for (const m of localMuts) {
              try {
                await apiService.createMutation(activeTenant.id, m);
              } catch (e) {
                console.error("Gagal sync mutasi migrasi ke SQL:", e);
              }
            }
            // Fetch fresh updated list from PostgreSQL after migration
            finalMuts = await apiService.getMutations(activeTenant.id);
          }
        }

        // Reconciliation: check for starting capital discrepancy
        const totalKBMasuk = finalMuts.filter(m => m.target === 'KAS_BESAR' && m.type === 'MASUK').reduce((sum, m) => sum + m.amount, 0);
        const totalKBKeluar = finalMuts.filter(m => m.target === 'KAS_BESAR' && m.type === 'KELUAR').reduce((sum, m) => sum + m.amount, 0);
        const netKBMutations = totalKBMasuk - totalKBKeluar;

        const discrepancy = kbData.balance - netKBMutations;
        if (discrepancy > 10) { // Discrepancy of more than Rp 10
          console.log(`[Reconciliation] Detected Kas Besar discrepancy of ${discrepancy}. Syncing starting balance mutation...`);
          const initialMut: Mutation = {
            id: 'mut-initial-' + activeTenant.id,
            tenantId: activeTenant.id,
            type: 'MASUK',
            source: 'SALDO_AWAL', // Skip balance update on SQL server
            amount: discrepancy,
            timestamp: activeTenant.createdAt || new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // set it 24h earlier
            note: 'Saldo Awal Kas Besar',
            target: 'KAS_BESAR'
          };

          try {
            await apiService.createMutation(activeTenant.id, initialMut);
            finalMuts = await apiService.getMutations(activeTenant.id);
          } catch (err) {
            console.error("Gagal membuat mutasi saldo awal di SQL:", err);
          }
        }

        setMutations(finalMuts);
        safeSetStorage(`pos_mutations_${activeTenant.id}`, finalMuts);
      } catch (err) {
        console.warn('Gagal mengambil Mutasi dari SQL, fallback ke cache:', err);
        const savedMutations = localStorage.getItem(`pos_mutations_${activeTenant.id}`);
        if (savedMutations) setMutations(JSON.parse(savedMutations));
      }
    };
    fetchMutations();

    // Fetch Active Cashier Session from SQL
    const fetchActiveSession = async () => {
      try {
        const activeSess = await apiService.getActiveSession(activeTenant.id);
        setActiveCashierSession(activeSess);
      } catch (err) {
        console.warn('Gagal mengambil Sesi Aktif dari SQL:', err);
      }
    };
    fetchActiveSession();

    // Fetch Transactions from SQL
    const fetchTransactions = async () => {
      try {
        const cloudTxs = await apiService.getTransactions(activeTenant.id);
        cloudTxs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setTransactions(cloudTxs);
        safeSetStorage(`pos_transactions_${activeTenant.id}`, cloudTxs, 800);
      } catch (err) {
        console.warn(`Gagal mengambil transaksi dari SQL untuk ${activeTenant.id}, fallback ke cache.`);
        const savedTransactions = localStorage.getItem(`pos_transactions_${activeTenant.id}`);
        if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      }
    };
    fetchTransactions();

    // Fetch Stock Logs from SQL
    loadStockLogs();

    return () => { };
  } else if (activeTenant) {
    // Local Mode matching activeTenant
    const savedProducts = localStorage.getItem(`pos_products_${activeTenant.id}`);
    const savedTransactions = localStorage.getItem(`pos_transactions_${activeTenant.id}`);
    const savedStockLogs = localStorage.getItem(`pos_stocklogs_${activeTenant.id}`);

    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      const initialProds = activeTenant.id === 'TOKO-DEMO' ? INITIAL_PRODUCTS : [];
      setProducts(initialProds);
      safeSetStorage(`pos_products_${activeTenant.id}`, initialProds, 2000);
    }

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      const initialTxs = activeTenant.id === 'TOKO-DEMO' ? getInitialTransactions() : [];
      setTransactions(initialTxs);
      safeSetStorage(`pos_transactions_${activeTenant.id}`, initialTxs, 800);
    }

    if (savedStockLogs) {
      setStockLogs(JSON.parse(savedStockLogs));
    } else {
      setStockLogs([]);
      safeSetStorage(`pos_stocklogs_${activeTenant.id}`, [], 500);
    }

    const savedKasBesar = localStorage.getItem(`pos_kas_besar_${activeTenant.id}`);
    if (savedKasBesar) {
      setKasBesar(JSON.parse(savedKasBesar));
    } else {
      setKasBesar(null);
    }

    const savedMutations = localStorage.getItem(`pos_mutations_${activeTenant.id}`);
    if (savedMutations) {
      setMutations(JSON.parse(savedMutations));
    } else {
      setMutations([]);
    }
  }
}, [activeTenant, currentUser, authLoading, isOnline]);

const loadStockLogs = async () => {
  if (!activeTenant || activeTenant.id === 'TOKO-DEMO') return;
  try {
    const logsList = await apiService.getStockLogs(activeTenant.id);
    setStockLogs(logsList);
    safeSetStorage(`pos_stocklogs_${activeTenant.id}`, logsList, 500);
  } catch (err) {
    console.warn(`Gagal mengambil log stok dari SQL untuk ${activeTenant.id}, fallback ke cache.`);
    const savedLogs = localStorage.getItem(`pos_stocklogs_${activeTenant.id}`);
    if (savedLogs) setStockLogs(JSON.parse(savedLogs));
  }
};

// Load and tick clock inside status bar
useEffect(() => {
  const updateTime = () => {
    const d = new Date();
    setAndroidTime(d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    setAndroidDate(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }));
  };
  updateTime();
  const interval = setInterval(updateTime, 30000);
  return () => clearInterval(interval);
}, []);

// Sync to local storage
const saveProductsToStorage = (updatedList: Product[]) => {
  if (!activeTenant) return;
  setProducts(updatedList);
  safeSetStorage(`pos_products_${activeTenant.id}`, updatedList, 2000);
};

const saveTransactionsToStorage = (updatedList: Transaction[]) => {
  if (!activeTenant) return;
  setTransactions(updatedList);
  safeSetStorage(`pos_transactions_${activeTenant.id}`, updatedList, 800);
};

const saveStockLogsToStorage = (updatedList: StockLog[]) => {
  if (!activeTenant) return;
  setStockLogs(updatedList);
  safeSetStorage(`pos_stocklogs_${activeTenant.id}`, updatedList, 500);
};

const saveKasBesarToStorage = async (updated: KasBesar | null) => {
  if (!activeTenant) return;
  setKasBesar(updated);
  safeSetStorage(`pos_kas_besar_${activeTenant.id}`, updated);

  if (activeTenant.id !== 'TOKO-DEMO' && updated) {
    try {
      setSqlSyncStatus('syncing');
      await apiService.syncKasBesar(activeTenant.id, updated.balance);
      setSqlSyncStatus('idle');
    } catch (err) {
      setSqlSyncStatus('error');
      console.error("Gagal sync Kas Besar ke SQL", err);
    }
  }
};

const saveMutationsToStorage = async (updatedOrUpdater: Mutation[] | ((prev: Mutation[]) => Mutation[])) => {
  if (!activeTenant) return;

  let finalMutations: Mutation[] = [];

  setMutations(prev => {
    const updated = typeof updatedOrUpdater === 'function' ? (updatedOrUpdater as (prev: Mutation[]) => Mutation[])(prev) : updatedOrUpdater;
    finalMutations = updated;
    safeSetStorage(`pos_mutations_${activeTenant.id}`, updated, 1000);
    return updated;
  });

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      setSqlSyncStatus('syncing');
      const currentIds = new Set(mutations.map(m => m.id));
      const newMuts = finalMutations.filter(m => !currentIds.has(m.id));
      for (const m of newMuts) {
        await apiService.createMutation(activeTenant.id, m);
      }
      setSqlSyncStatus('idle');
    } catch (err) {
      setSqlSyncStatus('error');
      console.error("Gagal sync Mutasi ke SQL", err);
    }
  }
};

const handleAddStockLog = async (log: StockLog) => {
  if (!activeTenant) return;

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      await apiService.createStockLog(activeTenant.id, log);
      loadStockLogs();
    } catch (err: any) {
      console.error('Gagal simpan log stok ke SQL:', err);
    }
  } else {
    const updated = [...stockLogs, log];
    saveStockLogsToStorage(updated);
  }
};

// Product actions handlers
const handleAddProduct = async (newProduct: Product) => {
  if (!activeTenant) return;

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      await apiService.createProduct(activeTenant.id, newProduct);
      // We add locally to UI immediately for speed
      setProducts(prev => [newProduct, ...prev]);
    } catch (err: any) {
      alert('Gagal menambah produk ke SQL: ' + err.message);
    }
  } else {
    setProducts(prev => [newProduct, ...prev]);
  }

  // Log the initial stock of the added product as PENAMBAHAN
  if (newProduct.stock > 0) {
    await handleAddStockLog({
      id: generateId('log'),
      productId: newProduct.id,
      productName: newProduct.name,
      change: newProduct.stock,
      reason: 'PENAMBAHAN',
      timestamp: new Date().toISOString(),
      userName: currentUser?.email || activeRole || 'Kasir'
    });
  }
};

const handleUpdateProduct = async (updatedProduct: Product) => {
  if (!activeTenant) return;
  const originalProduct = products.find(p => p.id === updatedProduct.id);
  const originalStock = originalProduct ? originalProduct.stock : 0;
  const stockChange = updatedProduct.stock - originalStock;

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      await apiService.updateProduct(activeTenant.id, updatedProduct.id, updatedProduct);
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch (err: any) {
      alert('Gagal update produk di SQL: ' + err.message);
    }
  } else {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  }

  // Log the stock change as PENAMBAHAN or PENYESUAIAN if it was corrected/edited
  if (stockChange !== 0 && originalProduct) {
    await handleAddStockLog({
      id: generateId('log'),
      productId: updatedProduct.id,
      productName: updatedProduct.name,
      change: stockChange,
      reason: stockChange > 0 ? 'PENAMBAHAN' : 'PENYESUAIAN',
      timestamp: new Date().toISOString(),
      userName: currentUser?.email || activeRole || 'Kasir'
    });
  }
};

const handleDeleteProduct = async (productId: string) => {
  if (!activeTenant) return;

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      await apiService.deleteProduct(activeTenant.id, productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      alert('Gagal menghapus produk di SQL: ' + err.message);
    }
  } else {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }
};

const handleUpdateProductStock = async (productId: string, quantitySold: number) => {
  if (!activeTenant) return;

  // Find before update
  const productBefore = products.find(p => p.id === productId);
  if (!productBefore) return;

  const updated = products.map(p => {
    if (p.id === productId) {
      return {
        ...p,
        stock: Math.max(0, p.stock - quantitySold)
      };
    }
    return p;
  });

  const updatedProduct = updated.find(p => p.id === productId);

  if (activeTenant.id !== 'TOKO-DEMO' && updatedProduct) {
    try {
      setSqlSyncStatus('syncing');
      await apiService.updateProduct(activeTenant.id, productId, updatedProduct);
      setSqlSyncStatus('idle');
    } catch (err) {
      setSqlSyncStatus('error');
      console.error('Gagal update stok di SQL:', err);
    }
  }

  if (!currentUser) {
    saveProductsToStorage(updated);
  }
  setProducts(updated);

  // Log the sale
  await handleAddStockLog({
    id: generateId('log'),
    productId,
    productName: productBefore.name,
    change: -quantitySold,
    reason: 'PENJUALAN',
    timestamp: new Date().toISOString(),
    userName: currentUser?.email || activeRole || 'Kasir'
  });
};

const handleAdjustStock = async (productId: string, newStock: number, reason: 'PENAMBAHAN' | 'PENYESUAIAN' | 'RUSAK', userName: string) => {
  if (!activeTenant) return;
  const productBefore = products.find(p => p.id === productId);
  if (!productBefore) return;

  const updatedProduct = { ...productBefore, stock: newStock };
  const change = newStock - productBefore.stock;

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      setSqlSyncStatus('syncing');
      await apiService.updateProduct(activeTenant.id, productId, updatedProduct);
      setSqlSyncStatus('idle');
    } catch (err) {
      setSqlSyncStatus('error');
      console.error('Gagal update stok di SQL:', err);
    }
  }

  if (!currentUser) {
    saveProductsToStorage(products.map(p => p.id === productId ? updatedProduct : p));
  }

  setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));

  // Log the adjustment
  await handleAddStockLog({
    id: generateId('log'),
    productId,
    productName: productBefore.name,
    change,
    reason,
    timestamp: new Date().toISOString(),
    userName
  });
};

// Checkout handle sale callback
const handleCompleteSale = async (
  items: CartItem[],
  total: number,
  discount: number,
  tax: number,
  paymentMethod: 'Tunai' | 'QRIS' | 'Kartu',
  amountPaid: number,
  cashierName: string,
  discountPercent: number,
  taxPercent: number
) => {
  if (!activeTenant) return;

  // Calculatings cost of sold items to record profit margins
  let calculatedCost = 0;
  const saleItems = items.map(item => {
    calculatedCost += (item.product.cost * item.quantity);
    return {
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      cost: item.product.cost,
      quantity: item.quantity
    };
  });

  const newTx: Transaction = {
    id: generateId('nota'),
    timestamp: new Date().toISOString(),
    items: saleItems,
    totalPrice: total,
    totalCost: calculatedCost,
    profit: total - calculatedCost,
    tax,
    taxPercent,
    discountPercent,
    paymentMethod,
    amountPaid,
    change: Math.max(0, amountPaid - total),
    cashierName,
    sessionId: activeCashierSession?.id
  };

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      setSqlSyncStatus('syncing');
      await apiService.saveTransaction(activeTenant.id, newTx);
      setTransactions(prev => [newTx, ...prev]);

      // Update local products state immediately for UI responsiveness
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          const soldItem = items.find(it => it.product.id === p.id);
          if (soldItem) {
            return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
          }
          return p;
        });
      });

      setSqlSyncStatus('idle');

      // Refresh stock logs to show the new transaction log
      loadStockLogs();
    } catch (err: any) {
      setSqlSyncStatus('error');
      alert('Gagal simpan transaksi ke SQL: ' + err.message);
    }
  } else {
    for (const item of items) {
      handleUpdateProductStock(item.product.id, item.quantity);
    }
    setTransactions(prev => [newTx, ...prev]);
    saveTransactionsToStorage([newTx, ...transactions]);
  }
};

const handleResetApp = async () => {
  if (!activeTenant) return;
  if (window.confirm('Apakah Anda ingin mereset seluruh data kasir kembali ke kondisi awal?')) {
    if (activeTenant.id !== 'TOKO-DEMO') {
      try {
        await apiService.resetTenantData(activeTenant.id);
        setProducts(INITIAL_PRODUCTS);
        setTransactions([]);
      } catch (err: any) {
        alert('Gagal reset data di SQL: ' + err.message);
      }
    } else {
      localStorage.removeItem(`pos_products_${activeTenant.id}`);
      localStorage.removeItem(`pos_transactions_${activeTenant.id}`);
      setProducts(INITIAL_PRODUCTS);
      setTransactions(getInitialTransactions());
    }
  }
};

// Tenants CRUD operations
const handleAddTenant = async (name: string, adminPin: string, defaultCashierName: string, defaultCashierPin: string, subscriptionPackage: SubscriptionPackage = 'monthly') => {
  const newId = `TOKO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const newTenant: Tenant = {
    id: newId,
    name,
    ownerUid: currentUser?.uid || 'sql_owner',
    ownerEmail: currentUser?.email || 'sql_owner@pos.com',
    adminPin,
    cashiers: [{ uid: Date.now().toString(), name: defaultCashierName, pin: defaultCashierPin, tenantId: newId }],
    createdAt: new Date().toISOString(),
    categories: ['Makanan', 'Minuman', 'Sembako', 'Sabun & Mandi', 'Lainnya'],
    subscriptionStatus: 'trial',
    subscriptionPackage,
    trialEndsAt: trialEndsAt.toISOString()
  };

  try {
    await apiService.createTenant(newTenant);
    await fetchTenants();
    handleSelectTenant(newTenant.id, newTenant.adminPin);
  } catch (err: any) {
    alert('Gagal membuat toko di SQL: ' + err.message);
  }
};

const handleUpdateTenant = async (updatedTenant: Tenant) => {
  try {
    await apiService.updateTenant(updatedTenant.id, updatedTenant);
    setActiveTenant(updatedTenant);
    await fetchTenants();
  } catch (err: any) {
    alert('Gagal update toko di SQL: ' + err.message);
  }
};

const handleDeleteTenant = async (tenantId: string) => {
  if (tenantId !== 'TOKO-DEMO') {
    try {
      await apiService.deleteTenant(tenantId);
      const updated = tenants.filter(t => t.id !== tenantId);
      setTenants(updated);
      localStorage.setItem('saas_cached_tenants', JSON.stringify(updated));
    } catch (err: any) {
      alert('Gagal menghapus toko di SQL: ' + err.message);
    }
  } else {
    const updated = tenants.filter(t => t.id !== tenantId);
    setTenants(updated);
    localStorage.setItem('saas_cached_tenants', JSON.stringify(updated));
  }

  if (activeTenant?.id === tenantId) {
    handleExitTenant();
  }
};

const handleSelectTenant = async (tenantId: string, pin: string) => {
  try {
    const result = await apiService.login(tenantId, pin);
    setActiveTenant(result.tenant);
    setActiveRole(result.role);
    setIsLocked(false);

    localStorage.setItem('pos_active_tenant_id', result.tenant.id);
    localStorage.setItem('pos_active_role', result.role);
    localStorage.setItem('pos_is_locked', 'false');

    setActiveTab('pos');
  } catch (err: any) {
    throw new Error(err.message || 'Login gagal. Periksa PIN atau Kode Toko.');
  }
};

// Auto-login effect for existing sessions
useEffect(() => {
  const checkSession = async () => {
    const savedToken = localStorage.getItem('pos_token');
    const savedTenantId = localStorage.getItem('pos_active_tenant_id');
    const savedRole = localStorage.getItem('pos_active_role');

    if (savedToken && savedTenantId) {
      try {
        // If we have a token, we should fetch the tenant from SQL
        const tenant = await apiService.getTenant(savedTenantId);
        setActiveTenant(tenant);
        setActiveRole(savedRole as any);
      } catch (err) {
        console.warn('Sesi kadaluwarsa, silakan login kembali.');
        apiService.logout();
      }
    }
  };
  checkSession();
}, []);

const handleExitTenant = () => {
  setActiveTenant(null);
  setActiveRole(null);
  setIsLocked(false);
  localStorage.removeItem('pos_active_tenant_id');
  localStorage.removeItem('pos_active_role');
  localStorage.removeItem('pos_is_locked');
};

const handleUnlock = (role: 'owner' | 'cashier', cashierName?: string, cashierUid?: string) => {
  setActiveRole(role);
  setIsLocked(false);
  localStorage.setItem('pos_active_role', role);
  localStorage.setItem('pos_is_locked', 'false');
  if (cashierName) {
    localStorage.setItem('pos_cashier_name', cashierName);
  }
  if (cashierUid) {
    localStorage.setItem('pos_cashier_uid', cashierUid);
  }
};

const handleOpenSession = async (openingBalance: number, source: 'CASHIER' | 'KAS_BESAR') => {
  if (!activeTenant) return;
  const cashierUid = localStorage.getItem('pos_cashier_uid') || '';

  // Mutation record if coming from KAS_BESAR
  if (source === 'KAS_BESAR') {
    const newMutation: Mutation = {
      id: generateId('mut'),
      tenantId: activeTenant.id,
      type: 'KELUAR',
      source: 'MODAL_SESI',
      amount: openingBalance,
      timestamp: new Date().toISOString(),
      note: 'Transfer modal ke Kasir',
      target: 'KAS_BESAR'
    };
    await saveMutationsToStorage([...mutations, newMutation]);
    if (kasBesar) {
      await saveKasBesarToStorage({ ...kasBesar, balance: kasBesar.balance - openingBalance });
    }
  }

  const newSession: CashierSession = {
    id: generateId('session'),
    tenantId: activeTenant.id,
    cashierUid,
    startTime: new Date().toISOString(),
    openingBalance,
    status: 'OPEN'
  };
  setActiveCashierSession(newSession);

  if (activeTenant.id !== 'TOKO-DEMO') {
    try {
      await apiService.openSession(newSession);
    } catch (err) {
      console.error('Gagal menyimpan sesi baru ke SQL:', err);
    }
  }
};

const handleCloseSession = async (closingBalance: number) => {
  if (!activeCashierSession) return;

  // Calculate total sales metrics for the session
  const sessionTransactions = transactions.filter(t => t.sessionId === activeCashierSession.id);

  const cashTransactions = sessionTransactions.filter(t => t.paymentMethod === 'Tunai');
  const totalCashSales = cashTransactions.reduce((sum, t) => sum + t.totalPrice, 0);

  const qrisTransactions = sessionTransactions.filter(t => t.paymentMethod === 'QRIS');
  const totalQRISSales = qrisTransactions.reduce((sum, t) => sum + t.totalPrice, 0);

  const cardTransactions = sessionTransactions.filter(t => t.paymentMethod === 'Kartu');
  const totalCardSales = cardTransactions.reduce((sum, t) => sum + t.totalPrice, 0);

  const calculatedClosingBalance = activeCashierSession.openingBalance + totalCashSales;

  // Add Mutation to KasBesar
  if (activeTenant) {
    const newMutation: Mutation = {
      id: generateId('mut'),
      tenantId: activeTenant.id,
      type: 'MASUK',
      source: 'PENARIKAN_SESI',
      amount: calculatedClosingBalance,
      timestamp: new Date().toISOString(),
      note: `Penarikan dari Kasir ke Kas Besar (Sesi: ${activeCashierSession.id})`,
      target: 'KAS_BESAR'
    };
    await saveMutationsToStorage([...mutations, newMutation]);
  }

  const updatedSession: CashierSession = {
    ...activeCashierSession,
    endTime: new Date().toISOString(),
    closingBalance: calculatedClosingBalance,
    totalCashSales: totalCashSales,
    totalQRIS: totalQRISSales,
    totalCard: totalCardSales,
    status: 'CLOSED' as const
  };

  if (activeTenant && activeTenant.id !== 'TOKO-DEMO') {
    try {
      await apiService.closeSession({
        sessionId: updatedSession.id,
        endTime: updatedSession.endTime,
        closingBalance: updatedSession.closingBalance,
        totalCashSales: updatedSession.totalCashSales,
        totalQRIS: updatedSession.totalQRIS,
        totalCard: updatedSession.totalCard
      });
    } catch (err) {
      console.error('Gagal menutup sesi di SQL:', err);
    }
  }

  setActiveCashierSession(null);
};

const handleLockScreen = () => {
  setIsLocked(true);
  localStorage.setItem('pos_is_locked', 'true');
};

const handleTakeOverCashierShift = () => {
  setActiveRole('cashier');
  setIsLocked(true);
  localStorage.setItem('pos_active_role', 'cashier');
  localStorage.setItem('pos_is_locked', 'true');
  setActiveTab('pos');
};

// Quiz evaluation
const handleQuizSubmit = (selectedOption: string) => {
  setQuizAnswer(selectedOption);
  if (selectedOption === 'item-a') {
    // Correct!
    setQuizScore(1);
    setCouponCode('KASIRPINTAR_UMKM');
  } else {
    setQuizScore(0);
  }
};

// Reset quiz state to try again
const handleResetQuiz = () => {
  setQuizAnswer(null);
  setQuizScore(null);
  setCouponCode(null);
};

// Guard untuk mencegah layar blank saat inisialisasi
if (authLoading || isInitializing) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-indigo-200 font-black text-xs uppercase tracking-widest animate-pulse">
        Menyiapkan Sesi Kasir...
      </p>
    </div>
  );
}

return (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 font-sans relative overflow-hidden" id="main-frame-wrapper">

    {/* Decorative background visual elements */}
    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#10B981]/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

    {/* RUGGED TABLET POS Android Device Mock Shell Frame */}
    <div className="w-full max-w-6xl md:aspect-[16/10] h-[96vh] md:h-[92vh] bg-slate-950 rounded-2xl md:rounded-[36px] p-1.5 md:p-2.5 border-2 md:border-4 border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative" id="android-device-tablet">

      {/* Device Front Camera Notch and Bezel detail */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-16 h-1 bg-slate-800 rounded-full z-20"></div>

      {/* Dynamic Android OS Header status bar */}
      <div className="h-7 w-full bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 text-[11px] font-bold text-slate-400 select-none shrink-0" id="android-status-bar">
        <div className="flex items-center gap-2">
          <span className="text-[#10B981] font-mono">● LTE</span>
          <span className="text-slate-500">|</span>
          {isOnline ? (
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 text-[9px] uppercase tracking-wider">🟢 SQL Online</span>
          ) : (
            <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 text-[9px] uppercase tracking-wider animate-pulse">🔴 Mode Offline</span>
          )}
          <span className="text-slate-500">|</span>
          <span className="font-mono text-slate-350">{androidDate}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* SQL Sync Status */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/50 border border-slate-700/50">
            <Database className={`w-3 h-3 ${sqlSyncStatus === 'syncing' ? 'text-amber-400 animate-spin' : sqlSyncStatus === 'error' ? 'text-rose-500' : 'text-emerald-400'}`} />
            <span className={`text-[8px] uppercase tracking-widest font-black ${sqlSyncStatus === 'syncing' ? 'text-amber-200' : sqlSyncStatus === 'error' ? 'text-rose-300' : 'text-emerald-300 opacity-80'}`}>
              SQL {sqlSyncStatus === 'syncing' ? '...' : sqlSyncStatus === 'error' ? 'FAIL' : 'OK'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeTenant ? (
            <span className="bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-550/20 text-[10px] font-mono font-bold">
              🏪 TOKO: {activeTenant.name} | Role: {activeRole?.toUpperCase()}
            </span>
          ) : (
            currentUser ? (
              <span className="bg-emerald-500/10 text-emerald-350 px-1.5 py-0.2 rounded-md border border-emerald-500/20 text-[10px] font-mono font-bold">
                🔐 Login: {currentUser.email}
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-500/20 text-[10px] font-mono font-black animate-pulse">
                ⚠️ Silakan Login Google
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-500' : 'text-slate-600'}`} />
          <span className="font-semibold">{androidTime}</span>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="font-mono font-medium text-[10px]">98%</span>
            <Battery className="w-4 h-3 text-slate-300" />
          </div>
        </div>
      </div>

      {/* PIN Authentication App-Lock screen overlay */}
      {activeTenant && isLocked && (
        <LockScreen
          tenant={activeTenant}
          onUnlock={handleUnlock}
          onExitTenant={handleExitTenant}
        />
      )}

      {/* MAIN POS SOFTWARE PANELS INTEGRATE */}
      <div className="flex-1 bg-white flex flex-col md:flex-row overflow-hidden relative" id="pos-application-host">
        {activeTenant && activeRole === 'owner' && currentUser && SUPERADMIN_EMAILS.includes(currentUser.email!) && (
          <div className="absolute top-0 left-0 right-0 z-[60] bg-rose-600 text-white text-[10px] font-black py-1 px-3 flex items-center justify-center gap-2 shadow-lg animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" /> ⚠️ ANDA SEDANG MENGAKSES TOKO INI SEBAGAI SUPERADMIN (MODE DUKUNGAN)
          </div>
        )}

        {!activeTenant && activeTab !== 'superadmin' && activeTab !== 'security-audit' ? (
          <TenantPortal
            tenants={tenants}
            onSelectTenant={handleSelectTenant}
            onAddTenant={handleAddTenant}
            currentUserEmail={currentUser?.email || null}
            onLoginViaGoogle={loginWithGoogle}
            onGoToSuperadmin={() => {
              setActiveTab('superadmin');
            }}
            isOnline={isOnline}
            packageRates={packageRates}
            isSuperadmin={currentUser ? SUPERADMIN_EMAILS.includes(currentUser.email!) : false}
            onLogoutCloud={logoutUser}
          />
        ) : (
          <>
            {/* Main App Left Navigation Sidebar */}
            <div className="w-full md:w-56 bg-indigo-900 border-b md:border-b-0 md:border-r border-indigo-950 flex flex-col md:flex-col justify-between shrink-0 p-3 md:p-4 select-none" id="sidebar-navigation">

              <div className="flex flex-col md:flex-col gap-2.5 md:gap-6">

                {/* POS Brand Logo */}
                <div className="flex items-center justify-between md:justify-start gap-2.5 px-1 pb-1 md:pb-2 md:border-b border-indigo-850/60">
                  <div className="flex items-center gap-2">
                    <div className="bg-white p-1.5 md:p-2 rounded-xl text-indigo-700 shadow-sm leading-none flex items-center justify-center">
                      <Calculator className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      {activeTenant ? (
                        <>
                          <h1 className="font-black font-display tracking-tight text-white leading-tight text-xs md:text-sm truncate max-w-[120px]">{activeTenant.name}</h1>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[9px] text-indigo-300 uppercase font-mono font-bold leading-none">Role: {activeRole}</p>
                            {activeTenant.subscriptionStatus === 'trial' && activeTenant.trialEndsAt && (
                              <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold uppercase leading-none border border-amber-500/30">
                                Trial {Math.max(0, Math.ceil((new Date(activeTenant.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} Hari
                              </span>
                            )}
                            {activeTenant.subscriptionStatus === 'active' && (
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded font-bold uppercase leading-none border border-emerald-500/30" title={activeTenant.subscriptionPackage === 'lifetime' ? 'Aktif Selamanya' : `Hingga ${activeTenant.subscriptionEndsAt ? new Date(activeTenant.subscriptionEndsAt).toLocaleDateString('id-ID') : '-'}`}>
                                Pro {activeTenant.subscriptionPackage === 'lifetime' ? '∞' : activeTenant.subscriptionEndsAt ? new Date(activeTenant.subscriptionEndsAt).toLocaleDateString('id-ID') : ''}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <h1 className="font-black font-display tracking-tight text-white leading-tight text-xs md:text-sm">POS Kasir Pintar</h1>
                          <p className="text-[9px] md:text-[10px] text-indigo-300 uppercase font-mono font-bold">Superadmin Console</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile Reset & Info quick helper */}
                  <div className="flex xl:hidden gap-1.5 items-center">
                    <button
                      onClick={handleLockScreen}
                      className="p-1 px-2.5 bg-indigo-950 text-indigo-200 rounded-lg text-[10px] font-bold border border-indigo-800 transition-all cursor-pointer"
                      title="Kunci Aplikasi"
                    >
                      🔒 Lock
                    </button>
                    <button
                      onClick={handleExitTenant}
                      className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[10px] font-bold border border-rose-500/20 transition-all cursor-pointer"
                      title="Tutup Toko"
                    >
                      🚪 Keluar
                    </button>
                    {currentUser ? (
                      <button
                        onClick={() => logoutUser()}
                        className="p-1 px-2.5 bg-rose-900/40 text-rose-300 rounded-lg text-[10px] font-bold border border-rose-500/30 transition-all cursor-pointer"
                        title="Keluar Cloud"
                      >
                        Keluar Cloud
                      </button>
                    ) : (
                      <button
                        onClick={() => loginWithGoogle()}
                        className="p-1 px-2.5 bg-[#10B981]/20 text-[#10B981] rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
                        title="Hubungkan Cloud"
                      >
                        Login Cloud
                      </button>
                    )}
                  </div>
                </div>

                {/* Navigation Menu Selection Links */}
                <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0" id="sidebar-nav-links">

                  {/* A. Standard Tabs (For selected tenant) */}
                  {activeTenant && (
                    <>
                      {/* 1. Cashier POS Link - Accessible by ALL */}
                      <button
                        onClick={() => setActiveTab('pos')}
                        className={`shrink-0 md:w-full flex items-center justify-center md:justify-between p-2 md:p-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === 'pos'
                          ? 'bg-indigo-600 text-white shadow-md border border-indigo-500/20'
                          : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
                          }`}
                        id="tab-link-pos"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2.5">
                          <Calculator className="w-4 h-4 md:w-4.5 md:h-4.5" />
                          <span>Register Kasir</span>
                        </div>
                        <ChevronRight className="hidden md:block w-3.5 h-3.5 opacity-60" />
                      </button>

                      {/* 2. Stock Catalog Link - Only Owner & Superadmin can enter */}
                      <button
                        onClick={() => {
                          if (activeRole === 'cashier') {
                            alert('AKSES DIBATASI!\nKelola Stok hanya dapat diakses oleh Owner/Superadmin. Masukkan PIN Owner terlebih dahulu.');
                            handleLockScreen();
                          } else {
                            setActiveTab('inventory');
                          }
                        }}
                        className={`shrink-0 md:w-full flex items-center justify-center md:justify-between p-2 md:p-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === 'inventory'
                          ? 'bg-indigo-600 text-white shadow-md border border-indigo-500/20'
                          : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
                          } ${activeRole === 'cashier' ? 'opacity-[0.65]' : ''}`}
                        id="tab-link-inventory"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2.5">
                          <Box className="w-4 h-4 md:w-4.5 md:h-4.5" />
                          <span>Kelola Stok {activeRole === 'cashier' && '🔒'}</span>
                        </div>
                        <ChevronRight className="hidden md:block w-3.5 h-3.5 opacity-60" />
                      </button>

                      {/* 3. Real-time Reports Link - Only Owner & Superadmin can enter */}
                      <button
                        onClick={() => {
                          if (activeRole === 'cashier') {
                            alert('AKSES DIBATASI!\nLaporan Finansial dan Omset Toko dilindungi. Khusus Owner/Superadmin.');
                            handleLockScreen();
                          } else {
                            setActiveTab('reports');
                          }
                        }}
                        className={`shrink-0 md:w-full flex items-center justify-center md:justify-between p-2 md:p-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === 'reports'
                          ? 'bg-indigo-600 text-white shadow-md border border-indigo-500/20'
                          : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
                          } ${activeRole === 'cashier' ? 'opacity-[0.65]' : ''}`}
                        id="tab-link-reports"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2.5">
                          <BarChart3 className="w-4 h-4 md:w-4.5 md:h-4.5" />
                          <span>Laporan Omset {activeRole === 'cashier' && '🔒'}</span>
                        </div>
                        <ChevronRight className="hidden md:block w-3.5 h-3.5 opacity-60" />
                      </button>

                      {/* 3.1 Kas PRO - Laporan & Mutasi */}
                      <button
                        onClick={() => {
                          if (activeRole === 'cashier') {
                            alert('AKSES DIBATASI!\nKas Besar hanya dapat diakses oleh Owner.');
                            handleLockScreen();
                          } else {
                            setActiveTab('kas_pro');
                          }
                        }}
                        className={`shrink-0 md:w-full flex items-center justify-center md:justify-between p-2 md:p-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === 'kas_pro'
                          ? 'bg-indigo-600 text-white shadow-md border border-indigo-500/20'
                          : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
                          } ${activeRole === 'cashier' ? 'opacity-[0.65]' : ''}`}
                        id="tab-link-kaspro"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2.5">
                          <PiggyBank className="w-4 h-4 md:w-4.5 md:h-4.5" />
                          <span>Kas PRO {activeRole === 'cashier' && '🔒'}</span>
                        </div>
                        <ChevronRight className="hidden md:block w-3.5 h-3.5 opacity-60" />
                      </button>

                      {/* 4. Store Security Credentials - Only Owner & Superadmin can enter */}
                      <button
                        onClick={() => {
                          if (activeRole === 'cashier') {
                            alert('AKSES DIBATASI!\nUbah PIN dan parameters Toko dilindungi.');
                            handleLockScreen();
                          } else {
                            setActiveTab('tenant-settings');
                          }
                        }}
                        className={`shrink-0 md:w-full flex items-center justify-center md:justify-between p-2 md:p-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === 'tenant-settings'
                          ? 'bg-indigo-600 text-white shadow-md border border-indigo-500/20'
                          : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
                          } ${activeRole === 'cashier' ? 'opacity-[0.65]' : ''}`}
                        id="tab-link-tenant-settings"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2.5">
                          <Settings className="w-4 h-4 md:w-4.5 md:h-4.5" />
                          <span>Pengaturan & Kategori {activeRole === 'cashier' && '🔒'}</span>
                        </div>
                        <ChevronRight className="hidden md:block w-3.5 h-3.5 opacity-60" />
                      </button>
                    </>
                  )}

                  {/* B. Superadmin Dashboard View Toggles (Berdasarkan Google Auth Whitelist) */}
                  {currentUser && SUPERADMIN_EMAILS.includes(currentUser.email!) && !activeTenant && (
                    <>
                      <button
                        onClick={() => setActiveTab('superadmin')}
                        className={`shrink-0 md:w-full flex items-center justify-center md:justify-between p-2 md:p-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === 'superadmin'
                          ? 'bg-indigo-600 text-white shadow-md border border-indigo-500/20'
                          : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4.5 h-4.5" />
                          <span>Console SaaS</span>
                        </div>
                        <ChevronRight className="hidden md:block w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        onClick={() => setActiveTab('security-audit')}
                        className={`shrink-0 md:w-full flex items-center justify-center md:justify-between p-2 md:p-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === 'security-audit'
                          ? 'bg-rose-600 text-white shadow-md border border-rose-500/20'
                          : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="w-4.5 h-4.5" />
                          <span>Security Audit</span>
                        </div>
                        <ChevronRight className="hidden md:block w-3.5 h-3.5 opacity-60" />
                      </button>
                    </>
                  )}

                </div>
              </div>

              {/* Bottom Panel Section in Sidebar */}
              <div className="hidden md:block space-y-2 mt-auto pt-4 border-t border-indigo-850/60">

                {/* Exit Store context button */}
                {activeTenant && (
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={handleLockScreen}
                      className="w-full py-1.5 bg-indigo-950/60 hover:bg-slate-800 text-indigo-250 font-bold text-[10.5px] rounded-xl border border-indigo-800/35 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      🔒 Kunci Kasir
                    </button>
                    <button
                      onClick={handleExitTenant}
                      className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-955 hover:text-rose-100 text-rose-300 font-extrabold text-[10.5px] rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      🚪 Ganti / Keluar Toko
                    </button>
                  </div>
                )}

                {/* Google Auth Card */}
                <div className="bg-indigo-955/45 border border-indigo-805/30 p-2.5 rounded-2xl text-[10.5px] space-y-2" id="auth-status-card">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-250 font-extrabold uppercase tracking-widest text-[8px] font-mono opacity-80">AUTHENTICATION</span>
                    {currentUser ? (
                      <span className="text-[7.5px] text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.2 rounded uppercase">LOGIN</span>
                    ) : (
                      <span className="text-[7.5px] text-amber-500 font-extrabold bg-amber-500/10 px-1 py-0.2 rounded uppercase">GUEST</span>
                    )}
                  </div>

                  {currentUser ? (
                    <div className="space-y-1.5">
                      <div className="min-w-0">
                        <p className="font-bold text-white text-[10.5px] truncate">{currentUser.displayName || 'Authorized User'}</p>
                        <p className="text-[9px] text-indigo-300 truncate">{currentUser.email}</p>
                      </div>
                      <div className="w-full py-1 bg-indigo-900/60 hover:bg-rose-950/40 text-indigo-200 hover:text-rose-250 rounded-xl text-[9px] font-black tracking-wide border border-indigo-800/35 hover:border-rose-900/30 transition-all flex items-center justify-center gap-1 cursor-pointer" onClick={() => logoutUser()}>
                        Keluar Akun
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => loginWithGoogle()}
                        className="w-full py-1 bg-[#10B981] hover:bg-emerald-500 text-white rounded-xl text-[9.5px] font-black tracking-wide transition-all shadow flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Login Google (Auth)
                      </button>
                    </div>
                  )}
                </div>

                {/* Tutor Hub Card */}
                <button
                  onClick={() => {
                    setTutorStep(1);
                    setShowTutor(true);
                  }}
                  className="w-full bg-indigo-950/50 border border-indigo-800/60 hover:bg-indigo-800 text-indigo-100 p-2.5 rounded-2xl text-xs flex items-center gap-2 text-left font-bold transition-all cursor-pointer relative overflow-hidden group"
                  id="view-tutor-btn"
                >
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-white text-[10.5px] leading-tight">Belajar Feynman</h5>
                    <p className="text-[8.5px] text-indigo-350 mt-0.5 leading-none">Materi Finansial Usaha</p>
                  </div>
                </button>

              </div>

            </div>

            {/* Core dynamic body panel rendering active component tab */}
            <div className="flex-1 min-h-0 overflow-hidden" id="active-tab-container">
              {activeTab === 'pos' && (
                <CashierTab
                  products={products}
                  onCompleteSale={handleCompleteSale}
                  tenantCategories={activeTenant?.categories}
                  tenant={activeTenant || undefined}
                  onAddProduct={handleAddProduct}
                  isLocked={isLocked}
                  activeSession={activeCashierSession}
                  onOpenSession={(bal, src) => handleOpenSession(bal, src)}
                  onCloseSession={handleCloseSession}
                  transactions={transactions}
                  kasBesar={kasBesar}
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryTab
                  products={products}
                  stockLogs={stockLogs}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onAdjustStock={(pid, nstk, res) => handleAdjustStock(pid, nstk, res, currentUser?.email || activeRole || 'Kasir')}
                  tenantCategories={activeTenant?.categories}
                  transactions={transactions}
                  currentUserEmail={currentUser?.email || undefined}
                  activeRole={activeRole}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsTab
                  transactions={transactions}
                  onResetData={handleResetApp}
                  products={products}
                  tenant={activeTenant || undefined}
                />
              )}
              {activeTab === 'kas_pro' && activeTenant && activeRole !== 'cashier' && (
                <KasProTab
                  tenant={activeTenant}
                  kasBesar={kasBesar}
                  setKasBesar={saveKasBesarToStorage}
                  mutations={mutations}
                  setMutations={saveMutationsToStorage}
                  transactions={transactions}
                />
              )}
              {activeTab === 'tenant-settings' && activeTenant && (
                <TenantSettingsTab
                  tenant={activeTenant}
                  onUpdateTenant={handleUpdateTenant}
                  onLockScreen={handleLockScreen}
                  onLogoutTenant={handleExitTenant}
                  onTakeOverCashierShift={handleTakeOverCashierShift}
                  currentUser={currentUser}
                  packageRates={packageRates}
                />
              )}
              {activeTab === 'superadmin' && currentUser && SUPERADMIN_EMAILS.includes(currentUser.email!) && (
                <SaaSAdminPanel
                  tenants={tenants}
                  currentUserEmail={currentUser?.email || null}
                  onEnterTenant={(tenantId, pin) => handleSelectTenant(tenantId, pin)}
                  onAddTenant={handleAddTenant}
                  onUpdateTenant={handleUpdateTenant}
                  onDeleteTenant={handleDeleteTenant}
                  packageRates={packageRates}
                  onUpdatePackageRates={setPackageRates}
                />
              )}
              {activeTab === 'security-audit' && currentUser && SUPERADMIN_EMAILS.includes(currentUser.email!) && (
                <div className="h-full overflow-y-auto bg-slate-50 p-6">
                  <LoginAuditDashboard />
                </div>
              )}
            </div>
          </>
        )}

      </div>

    </div>

    {/* --- KAK AHMAD'S INTERACTIVE IT TUTOR SIDEBAR POPUP (FEYNMAN METHOD) --- */}
    <AnimatePresence>
      {showTutor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 overflow-y-auto" id="tutor-modal-overlay">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden font-sans text-slate-800 my-auto border border-slate-100 flex flex-col"
            id="tutor-content-box"
          >
            {/* Tutor Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-2xl text-white">
                  <BookOpen className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-wide leading-none">Kelas IT Kak Ahmad</h3>
                  <p className="text-[10px] text-indigo-100 mt-1 font-bold">Teknik Feynman: Belajar Jauh Lebih Mudah!</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTutor(false);
                }}
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tutor Body Content containing Feynman modules */}
            <div className="p-6 overflow-y-auto max-h-[62vh] space-y-4" id="tutor-body-scroll">
              {tutorStep === 1 ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800">
                    <span className="text-3xl select-none">👋</span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Selamat Datang di Kasir Pintar Kak Ahmad!</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Kenalan yuk, nama saya Kak Ahmad. Hari ini kita pelajari alur utama & fungsi aplikasi ini untuk Toko Anda.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <h5 className="font-extrabold text-indigo-700 text-xs flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-indigo-600" /> 1. MENU TRANSAKSI (CASHIER TAB)
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Di sinilah kasir Anda bekerja mencari nama produk, memasukkan diskon, atau menyalakan PPN (Pajak). Selain klik manual, kasir juga bisa melakukan <strong className="text-slate-800">Simulasi Scan Barcode cepat</strong> di kolom pencarian.
                    </p>
                    {/* Analogy */}
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                      ⭐ <strong className="text-indigo-950">Fungsi Utama:</strong> Mempercepat antrean pembeli! Cukup klik, masukkan pembayaran, dan struk virtual langsung terbentuk. Stok barang di gudang pun langsung berkurang secara otomatis demi mencegah kecurangan data.
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <h5 className="font-extrabold text-slate-750 text-xs flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-slate-700" /> 2. MANAJEMEN STOK (INVENTORY TAB)
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Merupakan kendali mutlak milik <strong className="text-slate-800">Owner (Pemilik Toko)</strong>. Di menu ini Anda mendaftarkan nama produk baru, memperbarui sisa stok fisik, atau menentukan batas minimum stok aman.
                    </p>
                    <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-900 leading-relaxed">
                      📦 <strong className="text-amber-950">Alarm Pengingat:</strong> Jika stok suatu barang sudah di bawah batas aman, kartu barang di kasir otomatis berwarna oranye/kuning. Fitur ini membantu Owner mengetahui kapan harus berbelanja/kulakan barang lagi sebelum rak benar-benar kosong!
                    </div>
                  </div>
                </div>
              ) : tutorStep === 2 ? (
                <div className="space-y-3.5">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <BarChart3 className="w-5 h-5 text-indigo-600" /> 3. MENU LAPORAN & TRANSAKSI (REPORTS TAB)
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Laporan ini sangat penting bagi Owner untuk memantau performa toko secara real-time. Anda bisa melihat grafik tren jam ramai pengunjung, ringkasan omset harian, laba bersih, serta riwayat struk pembayaran yang pernah terbit.
                  </p>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h5 className="font-extrabold text-slate-800 text-xs tracking-wide">
                      💡 Konsep Keuntungan Toko (Laba Bersih vs Omset)
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sistem kasir cerdas ini mengelompokkan uang masuk ke dalam dua komponen utama agar keuangan bisnis Anda sehat dan terarah:
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-150 text-center">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block pb-0.5">Biaya Modal (Cost)</span>
                        <p className="text-sm font-black text-slate-700">Rp 2.000</p>
                        <span className="text-[9px] text-slate-450 leading-normal block mt-1">Uang yang Anda belanjakan untuk kulakan awal barang</span>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-center">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-600 block pb-0.5">Harga Jual (Price)</span>
                        <p className="text-sm font-black text-indigo-700">Rp 3.500</p>
                        <span className="text-[9px] text-indigo-600/80 leading-normal block mt-1">Uang yang dibayarkan oleh pembeli di meja kasir</span>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                      🎯 <strong className="text-indigo-950">Rumus Laba Bersih:</strong> <code className="bg-white px-1.5 py-0.5 rounded font-bold font-mono text-[10px] border border-indigo-150">Harga Jual - Biaya Modal</code>. Keuntungan bersih sebesar <strong className="text-indigo-900">Rp 1.500</strong> dari transaksi di atas adalah laba murni Anda yang aman digunakan untuk pengembangan usaha atau tabungan peribadi!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 text-amber-500 rounded-xl">
                      <Award className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Uji Kemampuanmu: Tantangan Kuis Kasir Kak Ahmad!</h4>
                      <p className="text-[10px] text-slate-400">Ayo jawab kuis di bawah ini untuk menguji pemahaman manajemen toko Anda.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase font-mono tracking-wider">Materi Evaluasi:</span>
                    <h5 className="font-extrabold text-slate-800 text-xs leading-relaxed">
                      Dek Susi mendirikan warung jus buah jeruk. Modal membelian buah jeruk dan gula per gelas adalah Rp 5.000. Susi menjual jus jeruknya kepada pembeli dengan tarif Rp 8.000. Berapa keuntungan bersih per gelas jus yang diraup Susi?
                    </h5>

                    <div className="space-y-2 mt-3" id="quiz-options-list">

                      <button
                        type="button"
                        onClick={() => handleQuizSubmit('item-a')}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold flex justify-between items-center transition-all ${quizAnswer === 'item-a'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-bold'
                          : 'border-slate-200 hover:border-slate-350 bg-white'
                          }`}
                      >
                        <span>💡 A. Rp 3.000 (Selisih dari Rp 8.000 - Rp 5.000)</span>
                        {quizAnswer === 'item-a' && <Check className="w-4.5 h-4.5 text-indigo-600 stroke-[3]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuizSubmit('item-b')}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold flex justify-between items-center transition-all ${quizAnswer === 'item-b'
                          ? 'border-rose-450 bg-rose-50 text-rose-800'
                          : 'border-slate-200 hover:border-slate-350 bg-white'
                          }`}
                      >
                        <span>❌ B. Rp 5.000 (Sebab itu modal awal belanja)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuizSubmit('item-c')}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold flex justify-between items-center transition-all ${quizAnswer === 'item-c'
                          ? 'border-rose-450 bg-rose-50 text-rose-800'
                          : 'border-slate-200 hover:border-slate-350 bg-white'
                          }`}
                      >
                        <span>❌ C. Rp 13.000 (Total penjumlahan Rp 5.000 + Rp 8.000)</span>
                      </button>

                    </div>

                    {/* Score announcement widget */}
                    <AnimatePresence>
                      {quizScore !== null && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className={`p-4 rounded-xl border mt-3 text-xs leading-relaxed ${quizScore === 1
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                            }`}
                        >
                          {quizScore === 1 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>🎖️ Luar Biasa! Jawaban Anda 100% Benar!</span>
                              </div>
                              <p className="text-[11px] text-indigo-700 leading-normal">
                                Anda pintar sekali menganalogikan matematika profit/laba usaha! Kak Ahmad sangat bangga. Silakan gunakan kupon hadiah khusus kasir ini di laci kasir impian Anda:
                              </p>
                              <div className="bg-white/80 border border-indigo-200 p-2 text-center rounded-xl font-mono font-black text-sm tracking-widest text-[#4F46E5] mt-2 select-all shadow-sm">
                                {couponCode}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>⚠️ Ayo Coba Lagi, Anda Pasti Bisa!</span>
                              </div>
                              <p className="text-[11px] text-rose-700 leading-normal">
                                Ingat rumusnya ya: <strong className="underline">Keuntungan Bersih = Harga Jual - Modal</strong>. Susi menjual jus jeruk seharga Rp 8.000, padahal untuk membelinya Susi butuh keluar modal jeruk Rp 5.000. Ayo kita re-hitung perlahan!
                              </p>
                              <button
                                type="button"
                                onClick={handleResetQuiz}
                                className="mt-2 text-rose-800 font-bold underline cursor-pointer hover:text-rose-950 block text-[10px]"
                              >
                                Coba Jawab Ulang
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </div>
              )}

            </div>

            {/* Tutor Slide actions navigation footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-400">Materi {tutorStep} dari 3</span>
              <div className="flex gap-2">
                {tutorStep > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTutorStep(tutorStep - 1);
                      setQuizAnswer(null);
                      setQuizScore(null);
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-650 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Kembali
                  </button>
                )}
                {tutorStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setTutorStep(tutorStep + 1)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    Selanjutnya <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTutor(false)}
                    className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer"
                  >
                    Selesai Belajar
                  </button>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>

  </div>
);
}
