import React, { useState, useMemo } from 'react';
import { Product, StockLog, Transaction, CostHistoryLog } from '../types';
import { formatRupiah, generateId } from '../utils';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Coins, 
  Package, 
  HelpCircle,
  TrendingUp,
  FolderMinus,
  CheckCircle,
  FileSpreadsheet,
  Brain,
  Sparkles,
  Lightbulb,
  Loader2,
  Workflow,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryTabProps {
  products: Product[];
  stockLogs: StockLog[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (productId: string, newStock: number, reason: 'PENAMBAHAN' | 'PENYESUAIAN' | 'RUSAK') => void;
  tenantCategories?: string[];
  transactions?: Transaction[];
  currentUserEmail?: string;
  activeRole?: string | null;
}

const EMOJI_OPTIONS = ['📦', '🍜', '🧃', '🌾', '🧴', '🍬', '🧼', '☕', '🍞', '🍎', '🥩', '🥚', '🍦', '🍫', '🍪', '🔋', '📔'];

export default function InventoryTab({ 
  products, 
  stockLogs,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  onAdjustStock,
  tenantCategories,
  transactions,
  currentUserEmail,
  activeRole
}: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [stockLogFilter, setStockLogFilter] = useState('Semua');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'daftar' | 'riwayat'>('daftar');

  // Quick Reorder states
  const [reorderingProduct, setReorderingProduct] = useState<Product | null>(null);
  const [reorderQty, setReorderQty] = useState<number>(10);
  const [reorderReason, setReorderReason] = useState<'PENAMBAHAN' | 'PENYESUAIAN'>('PENAMBAHAN');

  const openReorderDialog = (product: Product) => {
    // pre-fill suggested restock amount based on minStock value.
    // Recommended formula: (minStock * 3) - current stock, ensuring a logical minimum reorder amount
    const suggestedValue = Math.max(5, (product.minStock * 3) - product.stock);
    setReorderingProduct(product);
    setReorderQty(suggestedValue);
    setReorderReason('PENAMBAHAN');
  };

  const handleReorderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderingProduct) return;
    
    const qty = Number(reorderQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Jumlah reorder harus berupa angka positif!');
      return;
    }

    const nextStock = reorderingProduct.stock + qty;
    onAdjustStock(reorderingProduct.id, nextStock, reorderReason);
    setReorderingProduct(null);
  };

  // Custom manual adjustment fields
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const [manualAdjustValue, setManualAdjustValue] = useState<string>('');

  // AI stock velocity analyzer state
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<{
    calcData?: any[];
    aiAnalysis?: {
      insights: {
        productId: string;
        productName: string;
        velocityGrade: string;
        daysRemainingEst: number;
        optimalReorderQty: number;
        reason: string;
      }[];
      generalSummary: string;
    };
  } | null>(() => {
    try {
      const cached = localStorage.getItem('ai_velocity_analysis_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const handleRunVelocityAnalysis = async () => {
    setLoadingAi(true);
    setAiError(null);
    try {
      const response = await fetch('/api/gemini/velocity-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: products,
          transactions: transactions || []
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setAiData(result);
        localStorage.setItem('ai_velocity_analysis_cache', JSON.stringify(result));
        
        // Show warning if using fallback
        if (result.usingFallback) {
          setAiError(`⚠️ ${result.fallbackReason}`);
        }
      } else {
        throw new Error(result.error || 'Terjadi kesalahan analisis');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Gagal menjalankan analisis kecepatan stok AI. Periksa koneksi dan coba lagi.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formCost, setFormCost] = useState(0);
  const [formCostNote, setFormCostNote] = useState('');
  const [formStock, setFormStock] = useState(0);
  const [formMinStock, setFormMinStock] = useState(5);
  const [formBarcode, setFormBarcode] = useState('');
  const [formEmoji, setFormEmoji] = useState('📦');

  // Custom persistent cost fluctuation history
  const [viewingCostHistoryProduct, setViewingCostHistoryProduct] = useState<Product | null>(null);
  const [costHistoryLogs, setCostHistoryLogs] = useState<CostHistoryLog[]>(() => {
    try {
      const cached = localStorage.getItem('pos_cost_history_logs_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error(e);
    }
    
    // Seed high-fidelity mock data for instant professional appearance
    const seed: CostHistoryLog[] = [
      {
        id: 'cost-1',
        productId: 'prod-1', // Indomie
        oldCost: 2500,
        newCost: 2700,
        timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        userName: 'Ahmad (Owner)',
        note: 'Kenaikan bahan dasar gandum di tingkat distributor utama'
      },
      {
        id: 'cost-2',
        productId: 'prod-2', // Teh Botol
        oldCost: 2800,
        newCost: 2900,
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        userName: 'Susi (Kasir)',
        note: 'Biaya distribusi logistik agen grosir naik per karton'
      },
      {
        id: 'cost-3',
        productId: 'prod-3', // Beras
        oldCost: 65000,
        newCost: 67000,
        timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        userName: 'Ahmad (Owner)',
        note: 'Anomali cuaca ekstrim mengakibatkan gagal panen di pemasok Cianjur'
      },
      {
        id: 'cost-4',
        productId: 'prod-6', // Sabun Mandi Lifebuoy
        oldCost: 3500,
        newCost: 3200,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        userName: 'Susi (Kasir)',
        note: 'Diskon cuci gudang massal bundling target kuartal agen kosmetik'
      },
      {
        id: 'cost-5',
        productId: 'prod-1', // Indomie (historical entry)
        oldCost: 2400,
        newCost: 2500,
        timestamp: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
        userName: 'Ahmad (Owner)',
        note: 'Pabrik melakukan penyesuaian harga kemasan & saus bumbu baru'
      }
    ];
    
    localStorage.setItem('pos_cost_history_logs_cache', JSON.stringify(seed));
    return seed;
  });

  // Categories extraction
  const categories = useMemo(() => {
    const list = tenantCategories && tenantCategories.length > 0
      ? new Set(tenantCategories)
      : new Set([...['Makanan', 'Minuman', 'Sembako', 'Sabun & Mandi', 'Lainnya'], ...products.map(p => p.category)]);
    return ['Semua', ...Array.from(list)];
  }, [products, tenantCategories]);

  const uniqueCustomCategories = useMemo(() => {
    if (tenantCategories && tenantCategories.length > 0) {
      return tenantCategories;
    }
    const defaults = ['Makanan', 'Minuman', 'Sembako', 'Sabun & Mandi', 'Lainnya'];
    const prodCats = products.map(p => p.category);
    return Array.from(new Set([...defaults, ...prodCats]));
  }, [products, tenantCategories]);

  // Filtered lists
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(searchTerm));
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const filteredStockLogs = useMemo(() => {
    let logs = stockLogs.slice().reverse();
    if (stockLogFilter !== 'Semua') {
      logs = logs.filter(log => log.reason === stockLogFilter);
    }
    return logs;
  }, [stockLogs, stockLogFilter]);

  const logStats = useMemo(() => {
    let sales = 0;
    let additions = 0;
    let adjustments = 0;
    let ruined = 0;
    stockLogs.forEach(log => {
      if (log.reason === 'PENJUALAN') sales += Math.abs(log.change);
      else if (log.reason === 'PENAMBAHAN') additions += log.change;
      else if (log.reason === 'PENYESUAIAN') adjustments += log.change;
      else if (log.reason === 'RUSAK') ruined += Math.abs(log.change);
    });
    return { sales, additions, adjustments, ruined };
  }, [stockLogs]);

  // Warning metrics
  const lowStockCount = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock).length;
  }, [products]);

  const totalCatalogItems = products.length;

  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  }, [products]);

  const totalCapitalValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
  }, [products]);

  // Handle operations
  const openAddForm = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(uniqueCustomCategories[0] || 'Makanan');
    setFormPrice(0);
    setFormCost(0);
    setFormCostNote('');
    setFormStock(10);
    setFormMinStock(3);
    setFormBarcode(`899123${Math.floor(1000000 + Math.random() * 9000000)}`);
    setFormEmoji('📦');
    setIsAddingNew(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price);
    setFormCost(product.cost);
    setFormCostNote('');
    setFormStock(product.stock);
    setFormMinStock(product.minStock);
    setFormBarcode(product.barcode || '');
    setFormEmoji(product.imageUrl || '📦');
    setIsAddingNew(true);
  };

  const closeForm = () => {
    setIsAddingNew(false);
    setEditingProduct(null);
    setFormCostNote('');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCategory.trim()) {
      alert('Nama barang dan Kategori wajb diisi!');
      return;
    }

    if (formPrice < formCost) {
      if (!window.confirm('Peringatan: Harga jual lebih rendah dari modal (cost)! Apakah ingin tetap menyimpan?')) {
        return;
      }
    }

    if (editingProduct) {
      const isCostChanged = Number(formCost) !== editingProduct.cost;
      if (isCostChanged) {
        const newLogEntry: CostHistoryLog = {
          id: generateId('costlog'),
          productId: editingProduct.id,
          oldCost: editingProduct.cost,
          newCost: Number(formCost),
          timestamp: new Date().toISOString(),
          userName: currentUserEmail || (activeRole ? `${activeRole.toUpperCase()} (System)` : 'Kasir'),
          note: formCostNote.trim() || 'Perubahan manual dari edit detail barang'
        };
        const updatedLogs = [newLogEntry, ...costHistoryLogs];
        setCostHistoryLogs(updatedLogs);
        localStorage.setItem('pos_cost_history_logs_cache', JSON.stringify(updatedLogs));
      }

      // update
      onUpdateProduct({
        ...editingProduct,
        name: formName.trim(),
        category: formCategory.trim(),
        price: Number(formPrice),
        cost: Number(formCost),
        stock: Number(formStock),
        minStock: Number(formMinStock),
        barcode: formBarcode.trim(),
        imageUrl: formEmoji
      });
    } else {
      // create
      const newProdId = generateId('prod');
      const newProduct: Product = {
        id: newProdId,
        name: formName.trim(),
        category: formCategory.trim(),
        price: Number(formPrice),
        cost: Number(formCost),
        stock: Number(formStock),
        minStock: Number(formMinStock),
        barcode: formBarcode.trim(),
        imageUrl: formEmoji
      };

      const newLogEntry: CostHistoryLog = {
        id: generateId('costlog'),
        productId: newProdId,
        oldCost: 0,
        newCost: Number(formCost),
        timestamp: new Date().toISOString(),
        userName: currentUserEmail || (activeRole ? `${activeRole.toUpperCase()} (System)` : 'Kasir'),
        note: 'Pendaftaran barang baru dengan modal awal'
      };
      const updatedLogs = [newLogEntry, ...costHistoryLogs];
      setCostHistoryLogs(updatedLogs);
      localStorage.setItem('pos_cost_history_logs_cache', JSON.stringify(updatedLogs));

      onAddProduct(newProduct);
    }
    closeForm();
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${name}" dari katalog toko?`)) {
      onDeleteProduct(id);
    }
  };

  const adjustStockFast = (productId: string, currentStock: number, change: number) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    const nextStock = Math.max(0, currentStock + change);
    const reason = change > 0 ? 'PENAMBAHAN' : 'PENYESUAIAN';
    onAdjustStock(productId, nextStock, reason);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 overflow-y-auto text-slate-800" id="inventory-tab-interface">
      
      {/* Sub-Tabs Selector inside Inventory Tab */}
      <div className="flex border-b border-slate-200 mb-5 bg-white p-1 rounded-2xl shadow-sm gap-1 self-start select-none shrink-0 border border-slate-100">
        <button
          type="button"
          onClick={() => setActiveSubTab('daftar')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'daftar'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          Daftar Stok & Barang
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('riwayat')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer relative ${
            activeSubTab === 'riwayat'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Riwayat Mutasi Stok
          {stockLogs.length > 0 && (
            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
              activeSubTab === 'riwayat'
                ? 'bg-white/20 border-white/10 text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              {stockLogs.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'daftar' ? (
        <>
          {/* Upper Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Katalog Barang</span>
                <h4 className="text-2xl font-black text-slate-800">{totalCatalogItems} <span className="text-xs font-normal text-slate-500">Jenis</span></h4>
              </div>
              <div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
                <Package className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Peringatan Stok</span>
                  {lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                </div>
                <h4 className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {lowStockCount} <span className="text-xs font-normal text-slate-500">Kritis</span>
                </h4>
              </div>
              <div className={`p-3 rounded-2xl ${lowStockCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nilai Jual Inventaris</span>
                <h4 className="text-xl font-extrabold text-indigo-700">{formatRupiah(totalInventoryValue)}</h4>
              </div>
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Modal Terikat</span>
                <h4 className="text-xl font-extrabold text-blue-700">{formatRupiah(totalCapitalValue)}</h4>
              </div>
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-500">
                <Coins className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Interactive Low Stock & Approaching Limit Dashboard Alert */}
          {products.some(p => p.stock <= p.minStock + 2) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50/65 border border-amber-200/80 rounded-2xl p-4 mb-5 shadow-sm"
              id="low-stock-alert-container"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-2 border-b border-amber-200/50">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">⚠️ Peringatan Stok & Rekomendasi Restok Seketika</h4>
                    <p className="text-[11px] text-amber-700/90 font-medium">Beberapa produk berada di bawah atau sangat mendekati nilai limit minimum yang ideal.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
                  <span className="text-[9.5px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg border border-rose-200/50 font-black uppercase tracking-wider">
                    {products.filter(p => p.stock <= p.minStock).length} Kritis
                  </span>
                  <span className="text-[9.5px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200/50 font-black uppercase tracking-wider">
                    {products.filter(p => p.stock > p.minStock && p.stock <= p.minStock + 2).length} Mendekati Limit
                  </span>
                </div>
              </div>

              {/* Scrollable grid of warnings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {products
                  .filter(p => p.stock <= p.minStock + 2)
                  .slice(0, 12) // Show up to 12 warning items
                  .map(p => {
                    const isCritical = p.stock <= p.minStock;
                    const isOutOfStock = p.stock === 0;

                    return (
                      <div 
                        key={`alert-item-${p.id}`} 
                        className={`p-3 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:shadow-sm ${
                          isCritical 
                            ? 'bg-rose-50/50 border-rose-200/70 hover:border-rose-300' 
                            : 'bg-white border-slate-200/80 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-xl p-1 bg-white rounded-lg shadow-sm select-none border border-slate-100 leading-none">{p.imageUrl || '📦'}</span>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-800 truncate" title={p.name}>{p.name}</h5>
                            <span className="text-[9.5px] text-slate-400 font-mono block">Kategori: {p.category}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                isOutOfStock 
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200/50 animate-pulse' 
                                  : isCritical 
                                  ? 'bg-red-100 text-red-700 border border-red-200/50' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-200/50'
                              }`}>
                                Stok: {p.stock} pcs
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-medium font-mono">
                                (limit: {p.minStock})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive short-cuts directly inline */}
                        <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => adjustStockFast(p.id, p.stock, 5)}
                            className="flex-1 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] transition-all cursor-pointer text-center active:scale-95"
                            title="Tambah 5 unit ke stok barang ini"
                          >
                            +5 Stok
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustStockFast(p.id, p.stock, 20)}
                            className="flex-1 py-1 rounded-lg bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all cursor-pointer text-center active:scale-95"
                            title="Tambah 20 unit ke stok barang ini"
                          >
                            +20 Stok
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm(p.name);
                              const targetElement = document.getElementById('inventory-search');
                              if (targetElement) {
                                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className="py-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black transition-all cursor-pointer"
                            title="Tandai barang di tabel"
                          >
                            🔍
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* AI Stock Velocity & Smart Reorder Analyzer Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 mb-5 shadow-lg border border-indigo-500/20" id="ai-reorder-analyzer">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/40 pb-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-400/20 rounded-xl text-indigo-400">
                  <Brain className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans font-black text-xs uppercase tracking-wider text-indigo-300">Inteligensi Buatan Gemini</h3>
                    <span className="text-[9px] bg-indigo-600 border border-indigo-400/30 text-white font-mono font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider">AI Powered</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                    Asisten Analisis Perputaran & Batas Pemesanan Kembali (Reorder)
                  </h4>
                  <p className="text-[11px] text-indigo-200/70 font-medium">
                    Menganalisis pergerakan data dari riwayat transaksi 30 hari kasir untuk merekomendasikan jumlah stok optimum secara otomatis.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  disabled={loadingAi}
                  onClick={handleRunVelocityAnalysis}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-500/10 cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Mulai Analisis AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error state */}
            {aiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-xs font-semibold mb-3">
                ⚠️ {aiError}
              </div>
            )}

            {/* Default/Empty State */}
            {!aiData && !loadingAi && (
              <div className="py-8 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                <Workflow className="w-8 h-8 text-indigo-405 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-300 font-extrabold text-[12px]">Data transaksimu siap dianalisis!</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1 px-4 leading-medium">
                  Gemini akan menghitung rata-rata kecepatan penjualan per hari dan membantu mengklasifikasikan barang kritis yang wajib dibeli ulang dari supplier.
                </p>
              </div>
            )}

            {/* Loading state messages */}
            {loadingAi && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-slate-950/35 rounded-xl border border-indigo-900/30">
                <div className="relative">
                  <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin"></div>
                  <Brain className="w-5 h-5 text-indigo-400 absolute top-2.5 left-2.5 animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-black tracking-wide text-indigo-200 animate-pulse">Menghitung Kecepatan Penjualan 30 Hari...</p>
                  <p className="text-[10px] text-slate-450 font-mono">Model: Gemini 3.5-flash • Memformulasikan Pola Reorder Optimum</p>
                </div>
              </div>
            )}

            {/* Successful Analysis Results */}
            {aiData && !loadingAi && (
              <div className="space-y-4">
                {/* General Summary Alert */}
                {aiData.aiAnalysis?.generalSummary && (
                  <div className="bg-indigo-950/40 border border-indigo-400/20 p-3.5 rounded-xl flex gap-2.5 items-start">
                    <Lightbulb className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-indigo-300 font-mono font-bold uppercase tracking-wider">Kesimpulan Inteligensi Toko:</span>
                      <p className="text-xs font-semibold text-slate-200 leading-relaxed mt-0.5">
                        {aiData.aiAnalysis.generalSummary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Analysis Breakdown */}
                <div>
                  <h5 className="text-[11px] text-indigo-300 font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    📋 Rekomendasi Tiap Barang ({aiData.aiAnalysis?.insights?.length || 0} Terdeteksi)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {aiData.aiAnalysis?.insights?.map((insight) => {
                      const prod = products.find(p => p.id === insight.productId);
                      const currentStock = prod ? prod.stock : 0;
                      const emoji = prod?.imageUrl || '📦';
                      
                      // Custom velocity badge styles
                      let velocityStyles = "bg-slate-800 text-slate-300 border-slate-700";
                      if (insight.velocityGrade.includes("Tinggi")) {
                        velocityStyles = "bg-rose-500/10 text-rose-300 border-rose-500/30 font-black";
                      } else if (insight.velocityGrade.includes("Sedang")) {
                        velocityStyles = "bg-sky-500/10 text-sky-200 border-sky-500/30 font-bold";
                      } else if (insight.velocityGrade.includes("Rendah")) {
                        velocityStyles = "bg-amber-500/10 text-amber-200 border-amber-500/30 font-bold";
                      }

                      return (
                        <div 
                          key={`ai-insight-${insight.productId}`}
                          className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-200"
                        >
                          <div>
                            <div className="flex items-start gap-2.5">
                              <span className="text-xl p-1 bg-slate-950 rounded border border-slate-800 leading-none select-none shrink-0">{emoji}</span>
                              <div className="min-w-0 flex-1">
                                <h6 className="font-extrabold text-xs text-white truncate" title={insight.productName}>{insight.productName}</h6>
                                <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded mt-1 ${velocityStyles}`}>
                                  Speed: {insight.velocityGrade}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px] font-mono border-t border-b border-indigo-900/10 py-2 my-2 bg-slate-950/20 px-2 rounded-lg">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Stok Toko</span>
                                <span className="font-black text-white">{currentStock} pcs</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Estimasi Habis</span>
                                <span className="font-black text-amber-400">
                                  {insight.daysRemainingEst === -1 ? 'Tak Hingga' : `${insight.daysRemainingEst} Hari`}
                                </span>
                              </div>
                            </div>

                            <p className="text-[10.5px] text-slate-300 leading-relaxed font-medium mb-3">
                              {insight.reason}
                            </p>
                          </div>

                          {/* Quick interactive order button */}
                          {insight.optimalReorderQty > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                adjustStockFast(insight.productId, currentStock, insight.optimalReorderQty);
                              }}
                              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10.5px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Restok +{insight.optimalReorderQty} Unit Sesuai AI
                            </button>
                          ) : (
                            <div className="w-full py-1.5 px-3 bg-slate-800 text-slate-450 text-center font-bold text-[10px] rounded-lg select-none">
                              ✅ Stok Cukup Aman (Pesan: 0)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Stock Controls Header */}
          <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-sm mb-4 space-y-3">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-base">Manajemen Stok & Inventori Retail</h3>
              </div>
              <button
                type="button"
                onClick={openAddForm}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-100 self-start md:self-auto cursor-pointer"
                id="add-product-btn"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Tambah Produk Baru
              </button>
            </div>

            {/* Filters and Search inline */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input 
                  type="text" 
                  placeholder="Cari berdasarkan nama produk atau barcode..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs transition-colors"
                  id="inventory-search"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto py-0.5 scrollbar-none" id="categories-tabs-inventory">
                {categories.map(category => (
                  <button
                    key={`inventory-cat-${category}`}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === category 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                    id={`inventory-cat-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[300px]" id="inventory-table-card">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="bg-slate-100 p-4 rounded-full mb-3 text-slate-400">
                  <FolderMinus className="w-8 h-8" />
                </div>
                <h4 className="font-semibold text-slate-700 mb-1">Katalog Kosong</h4>
                <p className="text-xs text-slate-400 max-w-sm mb-3">Belum ada barang yang sesuai dengan pencarian Anda. Klik tombol Tambah Produk Baru untuk mengisinya.</p>
                {products.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      INITIAL_PRODUCTS.forEach(p => {
                        onAddProduct(p);
                      });
                    }}
                    className="mt-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    📥 Muat 8 Contoh Produk Demo
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse min-w-[700px]" id="inventory-table-list">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-250 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-3.5 px-4">Ikon</th>
                      <th className="py-3.5 px-4">Nama Produk / Barcode</th>
                      <th className="py-3.5 px-4">Kategori</th>
                      <th className="py-3.5 px-4 text-right">Modal awal (Cost)</th>
                      <th className="py-3.5 px-4 text-center">Riwayat Fluktuasi Modal</th>
                      <th className="py-3.5 px-4 text-right">Harga Jual</th>
                      <th className="py-3.5 px-4 text-center">Stok Fisik</th>
                      <th className="py-3.5 px-4 text-center">Aksi / Kontrol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {filteredProducts.map(product => {
                      const isLow = product.stock <= product.minStock;

                      return (
                        <tr 
                          key={product.id}
                          className={`hover:bg-slate-50/75 transition-colors ${isLow ? 'bg-amber-50/20' : ''}`}
                          id={`inventory-row-${product.id}`}
                        >
                          <td className="py-3 px-4 font-mono text-2xl text-center select-none">{product.imageUrl || '📦'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-805 text-sm">{product.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono tracking-tight mt-0.5" title="Barcode / Kode QR">
                                🏷️ {product.barcode || 'Belum diisi'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                              {product.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-500 whitespace-nowrap">
                            {formatRupiah(product.cost)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {(() => {
                              const productLogs = costHistoryLogs
                                .filter(log => log.productId === product.id)
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                              if (productLogs.length === 0) {
                                return (
                                  <span className="text-[10px] text-slate-400 font-medium italic select-none">
                                    Stabil / Tetap
                                  </span>
                                );
                              }

                              const latest = productLogs[0];
                              const percentDiff = latest.oldCost > 0
                                ? ((latest.newCost - latest.oldCost) / latest.oldCost) * 100
                                : 0;

                              const hasRealChange = latest.oldCost > 0 && latest.oldCost !== latest.newCost;

                              return (
                                <button
                                  type="button"
                                  onClick={() => setViewingCostHistoryProduct(product)}
                                  className="px-2 py-1 rounded-xl text-[11px] font-bold transition-all hover:bg-slate-100/80 cursor-pointer active:scale-95 inline-flex flex-col items-center gap-0.5 max-w-[150px] border border-transparent hover:border-slate-200"
                                  title="Klik untuk melihat riwayat fluktuasi harga beli lengkap"
                                  id={`btn-cost-history-${product.id}`}
                                >
                                  {hasRealChange ? (
                                    <>
                                      <div className="flex items-center gap-1 justify-center">
                                        {percentDiff > 0 ? (
                                          <span className="text-red-650 bg-red-50 border border-red-150 rounded-lg px-2 py-0.5 font-extrabold flex items-center gap-0.5 scale-90">
                                            ↗ +{percentDiff.toFixed(1)}%
                                          </span>
                                        ) : (
                                          <span className="text-emerald-650 bg-emerald-50 border border-emerald-150 rounded-lg px-2 py-0.5 font-extrabold flex items-center gap-0.5 scale-90">
                                            ↘ {percentDiff.toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap lowercase tracking-tight mt-0.5 block">
                                        dari {formatRupiah(latest.oldCost)}
                                      </span>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <span className="text-slate-500 font-extrabold bg-slate-50 border border-slate-150 rounded-lg px-2 py-0.5 scale-90">
                                        ℹ️ Terdaftar
                                      </span>
                                      <span className="text-[9px] text-slate-400 mt-0.5 block">Mulai: {formatRupiah(latest.newCost)}</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                            {formatRupiah(product.price)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <span className={`font-mono font-extrabold text-sm ${
                                  product.stock === 0 
                                    ? 'text-red-600' 
                                    : isLow 
                                    ? 'text-amber-500 font-bold' 
                                    : 'text-slate-800'
                                }`}>
                                  {product.stock}
                                </span>
                              </div>

                              {/* stock warnings */}
                              {isLow && (
                                <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded-md mt-0.5 border border-amber-100 flex items-center gap-0.5 whitespace-nowrap">
                                  ⚠️ Limit: {product.minStock}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              
                              {/* Easy + / - / manual adjustments right on table */}
                              {adjustingProductId === product.id ? (
                                <form 
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const val = parseInt(manualAdjustValue);
                                    if (!isNaN(val)) {
                                      adjustStockFast(product.id, product.stock, val);
                                    }
                                    setAdjustingProductId(null);
                                    setManualAdjustValue('');
                                  }}
                                  className="flex items-center border border-indigo-400 rounded-lg bg-white overflow-hidden shadow-sm scale-90"
                                >
                                  <input 
                                    type="number" 
                                    placeholder="Qty"
                                    value={manualAdjustValue}
                                    onChange={(e) => setManualAdjustValue(e.target.value)}
                                    className="w-14 px-1.5 py-1 text-center text-[11px] font-bold outline-none border-none bg-slate-50 text-slate-800"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    className="p-1 px-1.5 bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer text-[10px] font-bold"
                                    title="Simpan"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdjustingProductId(null);
                                      setManualAdjustValue('');
                                    }}
                                    className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer text-[10px] font-bold border-l border-slate-200"
                                    title="Batal"
                                  >
                                    ✕
                                  </button>
                                </form>
                              ) : (
                                <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm scale-90">
                                  <button
                                    type="button"
                                    onClick={() => adjustStockFast(product.id, product.stock, -1)}
                                    className="p-1 hover:bg-slate-100 text-slate-500 transition-colors"
                                    title="Kurangi stok 1"
                                  >
                                    <Plus className="w-3.5 h-3.5 rotate-45 text-rose-500" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => adjustStockFast(product.id, product.stock, 5)}
                                    className="p-1 border-l border-slate-150 hover:bg-emerald-50 text-emerald-600 font-bold text-[10px] px-1.5 px-2 py-1 transition-colors"
                                    title="Restok +5"
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdjustingProductId(product.id);
                                      setManualAdjustValue('');
                                    }}
                                    className="p-1 border-l border-slate-150 hover:bg-slate-50 text-indigo-600 font-extrabold text-[10px] px-2 py-1 transition-colors cursor-pointer"
                                    title="Input Manual"
                                  >
                                    Manual
                                  </button>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => openReorderDialog(product)}
                                className="bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition-all font-bold text-[10.5px] flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Quick Reorder / Restok Cepat dari Supplier"
                                id={`quick-reorder-${product.id}`}
                              >
                                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                                Reorder
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditForm(product)}
                                className="bg-sky-50 text-sky-600 p-1.5 rounded-lg hover:bg-sky-100 transition-colors"
                                title="Edit Detail"
                                id={`edit-item-${product.id}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteClick(product.id, product.name)}
                                className="bg-rose-50 text-rose-600 p-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                                title="Hapus"
                                id={`delete-item-${product.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Riwayat Mutasi View */}
          {/* Log Stats mini grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 shrink-0">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl">
                <Coins className="w-5 h-5 text-rose-500" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Penjualan</span>
                <h4 className="text-lg font-black text-rose-600">{logStats.sales} <span className="text-xs font-normal text-slate-500">item</span></h4>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                <Plus className="w-5 h-5 text-emerald-505" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Penambahan</span>
                <h4 className="text-lg font-black text-emerald-600">+{logStats.additions} <span className="text-xs font-normal text-slate-500">item</span></h4>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
                <RefreshCw className="w-5 h-5 text-indigo-550" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Penyesuaian</span>
                <h4 className="text-lg font-black text-indigo-605">{logStats.adjustments >= 0 ? '+' : ''}{logStats.adjustments} <span className="text-xs font-normal text-slate-500">item</span></h4>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Barang Rusak</span>
                <h4 className="text-lg font-black text-amber-600">-{logStats.ruined} <span className="text-xs font-normal text-slate-500">item</span></h4>
              </div>
            </div>
          </div>

          {/* Stock Logs Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0" id="stock-logs-table-card">
            <div className="p-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-slate-500" />
                <h3 className="font-extrabold text-slate-800 text-sm">Riwayat Masuk-Keluar Barang</h3>
              </div>
              <select 
                value={stockLogFilter}
                onChange={(e) => setStockLogFilter(e.target.value)}
                className="text-[10px] font-bold border border-slate-250 rounded-lg px-2.5 py-1.5 outline-none text-slate-650 bg-white shadow-sm cursor-pointer"
              >
                <option value="Semua">Semua Alasan</option>
                <option value="PENJUALAN">Penjualan</option>
                <option value="PENAMBAHAN">Penambahan</option>
                <option value="PENYESUAIAN">Penyesuaian</option>
                <option value="RUSAK">Rusak</option>
              </select>
            </div>
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150">
                    <tr>
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4">Barang</th>
                        <th className="py-3 px-4 text-center">Perubahan</th>
                        <th className="py-3 px-4">Alasan</th>
                        <th className="py-3 px-4">Oleh</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                    {filteredStockLogs.length > 0 ? filteredStockLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('id-ID', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{log.productName}</td>
                        <td className={`py-3 px-4 text-center font-black ${log.change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {log.change > 0 ? '+' : ''}{log.change}
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-605 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            log.reason === 'PENJUALAN' ? 'bg-rose-50 text-rose-600' :
                            log.reason === 'PENAMBAHAN' ? 'bg-emerald-50 text-emerald-600' :
                            log.reason === 'RUSAK' ? 'bg-amber-50 text-amber-600' :
                            'bg-indigo-50 text-indigo-600'
                          }`}>
                            {log.reason.toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate" title={log.userName}>{log.userName}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin-slow mb-2" />
                            <p className="font-semibold text-slate-500 text-xs">Belum ada riwayat mutasi stok</p>
                            <p className="text-[10px] text-slate-400 mt-1">Lakukan penjualan atau restok barang untuk merekam mutasi secara otomatis.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- ADD / EDIT PRODUCT SLIDEOVER FORM MODAL --- */}
      <AnimatePresence>
        {isAddingNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="form-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto"
              id="form-card-box"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-6 py-5 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {editingProduct ? 'Perbarui Atribut Barang' : 'Daftarkan Barang Baru'}
                  </h3>
                  <p className="text-xs text-indigo-100 mt-0.5">Catalog inventori POS Anda</p>
                </div>
                <div className="bg-white/10 p-1.5 rounded-xl font-mono text-xs font-bold text-indigo-200">
                  {editingProduct ? `EDIT [${editingProduct.id}]` : 'NEW PRODUCT'}
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                
                {/* Product Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Barang <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Susu Cair Ultra Milk 1L"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-800 text-sm font-semibold text-slate-705"
                    id="form-field-name"
                  />
                </div>

                {/* Grid Category, Barcode, Emoji */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Category */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                    <div className="flex gap-1.5">
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-840 text-xs font-semibold"
                        id="form-field-category-select"
                      >
                        {uniqueCustomCategories.map(cat => (
                          <option key={`opt-cat-${cat}`} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Barcode</label>
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      placeholder="899..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-840 text-xs font-mono font-bold"
                      id="form-field-barcode"
                    />
                  </div>

                  {/* Icon Emoji Selection */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pilih Icon/Emoji</label>
                    <div className="flex gap-1.5 items-center">
                      <span className="text-3xl bg-slate-100 p-1 px-2.5 rounded-xl select-none">{formEmoji}</span>
                      <select
                        value={formEmoji}
                        onChange={(e) => setFormEmoji(e.target.value)}
                        className="flex-1 px-2 py-2.5 rounded-xl border border-slate-200 outline-none text-xs font-semibold"
                        id="form-field-emoji"
                      >
                        {EMOJI_OPTIONS.map(em => (
                          <option key={`em-${em}`} value={em}>{em}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                {/* Grid Financials and Stock */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Cost price */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Modal (Cost)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs text-center">Rp</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formCost || ''}
                        onChange={(e) => setFormCost(Number(e.target.value))}
                        className="w-full pl-7 pr-2 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-830 text-xs font-bold"
                        id="form-field-cost"
                      />
                    </div>
                  </div>

                  {/* Selling price */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harga Jual</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs text-center">Rp</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formPrice || ''}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full pl-7 pr-2 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-550 text-xs font-bold text-indigo-600"
                        id="form-field-price"
                      />
                    </div>
                  </div>

                  {/* Current stock */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stok Awal</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-555 text-xs font-bold"
                      id="form-field-stock"
                    />
                  </div>

                  {/* Alert Threshold stock */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Limit Minim</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-555 text-xs font-bold text-amber-650"
                      id="form-field-min-stock"
                    />
                  </div>

                </div>

                {/* Conditional Cost Note on cost variation */}
                {editingProduct && Number(formCost) !== editingProduct.cost && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50/70 border border-amber-200/50 p-3 rounded-2xl space-y-1.5"
                  >
                    <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1 select-none">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      Catatan Alasan Perubahan Modal (Cost) <span className="text-[10px] text-amber-600 font-normal select-none">(Terdeteksi Fluktuasi)</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="Contoh: Kenaikan harga tepung terigu global, atau ganti distributor baru..."
                      value={formCostNote}
                      onChange={(e) => setFormCostNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-xs font-semibold text-slate-800 shadow-inner"
                      id="form-cost-note-input"
                    />
                  </motion.div>
                )}

                {/* Form Actions footer */}
                <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 py-3 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wide transition-colors shadow-md shadow-indigo-155 flex items-center justify-center gap-1 cursor-pointer"
                    id="form-submit-btn"
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                    SIMPAN PRODUK
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- QUICK REORDER MODAL DIALOG --- */}
      <AnimatePresence>
        {reorderingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="reorder-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden my-auto"
              id="reorder-card-box"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-6 py-5 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl text-white">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      Quick Reorder Restok
                    </h3>
                    <p className="text-xs text-emerald-100 mt-0.5">Pemesanan Ulang Cepat dari Supplier</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReorderingProduct(null)}
                  className="text-emerald-100 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleReorderSubmit} className="p-6 space-y-4">
                {/* Product Detail Banner */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-3">
                  <span className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-slate-150 leading-none select-none">
                    {reorderingProduct.imageUrl || '📦'}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{reorderingProduct.name}</h4>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      {reorderingProduct.category}
                    </span>
                  </div>
                </div>

                {/* Stock Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Stok Toko Saat Ini</span>
                    <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">{reorderingProduct.stock} unit</span>
                  </div>
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                    <span className="text-[10px] text-amber-600 font-bold block uppercase tracking-wider">Limit Minimum Stok</span>
                    <span className="text-base font-black text-amber-600 font-mono mt-0.5 block">{reorderingProduct.minStock} unit</span>
                  </div>
                </div>

                {/* AI & Business Recommended Box */}
                <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-black text-xs">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Rekomendasi Jumlah Reorder</span>
                  </div>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed mt-1 font-medium">
                    Berdasarkan formula kelipatan stok aman <code className="bg-indigo-100 px-1 py-0.2 rounded font-mono font-bold font-black text-[10px]">(Limit Minim × 3) - Stok</code>, kami merekomendasikan penambahan berskala:
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-100/60">
                    <span className="text-[10.5px] text-slate-500 font-bold">Rekomendasi Minimum:</span>
                    <button
                      type="button"
                      onClick={() => setReorderQty(Math.max(5, (reorderingProduct.minStock * 3) - reorderingProduct.stock))}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] px-3 py-1 rounded-lg transition-all cursor-pointer select-none"
                    >
                      +{Math.max(5, (reorderingProduct.minStock * 3) - reorderingProduct.stock)} Unit
                    </button>
                  </div>
                </div>

                {/* Quantity Input Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Masukkan Jumlah Pemesanan Kembali <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      value={reorderQty}
                      onChange={(e) => setReorderQty(Math.max(1, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-extrabold text-indigo-705 bg-indigo-50/20"
                      id="reorder-qty-input"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs text-center font-mono">Pcs</span>
                  </div>
                </div>

                {/* Quick adjustments shortcut inside modal */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Pencetan Cepat / Shortcuts</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 25, 50, 100].map(val => (
                      <button
                        key={`shortcut-reorder-${val}`}
                        type="button"
                        onClick={() => setReorderQty(val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none ${
                          reorderQty === val
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason of adjustment */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori Catatan Log</label>
                  <select
                    value={reorderReason}
                    onChange={(e) => setReorderReason(e.target.value as 'PENAMBAHAN' | 'PENYESUAIAN')}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PENAMBAHAN">PENAMBAHAN (Stok Masuk Baru)</option>
                    <option value="PENYESUAIAN">PENYESUAIAN (Koreksi Mutasi)</option>
                  </select>
                </div>

                {/* Modal Actions footer */}
                <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReorderingProduct(null)}
                    className="flex-1 py-3 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 transition-colors cursor-pointer"
                  >
                    Batalkan
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tracking-wide transition-colors shadow-md shadow-emerald-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    id="reorder-submit-btn"
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                    TAMBAH {reorderQty} STOK
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DETAIL RIWAYAT FLUKTUASI COST/MODAL DIALOG --- */}
      <AnimatePresence>
        {viewingCostHistoryProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="cost-history-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto"
              id="cost-history-card-box"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-5 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl text-white">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      Riwayat Fluktuasi Modal
                    </h3>
                    <p className="text-xs text-slate-200 mt-0.5">Analisis perubahan harga beli (cost)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingCostHistoryProduct(null)}
                  className="text-slate-200 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Product Info Banner */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-slate-150 leading-none select-none">
                      {viewingCostHistoryProduct.imageUrl || '📦'}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{viewingCostHistoryProduct.name}</h4>
                      <span className="text-[10px] bg-slate-250 text-slate-600 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        {viewingCostHistoryProduct.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Harga Modal Aktif</span>
                    <span className="text-base font-black text-slate-850 font-mono">{formatRupiah(viewingCostHistoryProduct.cost)}</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {(() => {
                    const logs = costHistoryLogs
                      .filter(log => log.productId === viewingCostHistoryProduct.id)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                    if (logs.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-400 space-y-1">
                          <Package className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                          <p className="text-xs font-bold">Harga Cost Stabil</p>
                          <p className="text-[10px]">Belum pernah ada perubahan harga modal sejak produk didaftarkan.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="relative border-l border-slate-200 pl-4 ml-3 space-y-5 py-2">
                        {logs.map((log, idx) => {
                          const percentDiff = log.oldCost > 0 
                            ? ((log.newCost - log.oldCost) / log.oldCost) * 100 
                            : 0;
                          const isIncrease = log.newCost > log.oldCost;

                          return (
                            <div key={log.id} className="relative">
                              {/* Dot node */}
                              <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 ${
                                idx === 0 
                                  ? 'bg-slate-800 border-white ring-2 ring-slate-200' 
                                  : 'bg-white border-slate-300'
                              }`} />

                              {/* Card detail */}
                              <div className="bg-slate-50/70 border border-slate-150 p-3 rounded-xl space-y-1.5">
                                {/* Time and User metadata */}
                                <div className="flex justify-between items-center text-[9.5px]">
                                  <span className="text-slate-400 font-bold block font-mono">
                                    {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                                    Oleh: {log.userName}
                                  </span>
                                </div>

                                {/* Fluctuations */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {log.oldCost === 0 ? (
                                      <span className="text-xs font-bold text-slate-700">
                                        Didaftarkan: {formatRupiah(log.newCost)}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold font-mono">
                                        <span className="text-slate-400 line-through font-normal">{formatRupiah(log.oldCost)}</span>
                                        <span className="text-slate-350 select-none">➔</span>
                                        <span className="text-slate-800">{formatRupiah(log.newCost)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {log.oldCost > 0 && (
                                    <span>
                                      {isIncrease ? (
                                        <span className="text-[10px] font-extrabold text-red-650 bg-red-50 border border-red-100 rounded-md px-1.5 py-0.5">
                                          ↗ +{percentDiff.toFixed(1)}% (Naik)
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-extrabold text-emerald-650 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">
                                          ↘ {percentDiff.toFixed(1)}% (Turun)
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>

                                {/* Comments */}
                                <p className="text-[10.5px] text-slate-650 italic leading-relaxed pt-1 border-t border-slate-200/55">
                                  💬 {log.note || 'Tidak ada catatan.'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-indigo-50/40 border border-indigo-100/50 p-3 rounded-xl flex items-start gap-2">
                  <div className="p-0.5 bg-indigo-100 rounded text-indigo-700 shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-indigo-900/80 leading-relaxed font-semibold">
                    Tip Bisnis: Pemantauan perubahan harga modal membantu Anda merumuskan kebijakan harga jual yang tepat agar margin kotor profitabilitas ritel tenant Anda tetap aman terlindungi dari fluktuasi inflasi distributor.
                  </p>
                </div>

                {/* Footer closed actions */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setViewingCostHistoryProduct(null)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-950 text-white rounded-xl text-xs font-black tracking-wide transition-colors shadow-md shadow-slate-150 cursor-pointer"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
