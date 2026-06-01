import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, CartItem, Tenant, CashierSession, Transaction, KasBesar } from '../types';
import { formatRupiah, generateId } from '../utils';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { buildReceiptBytes, ReceiptThermalPayload } from '../lib/print/printEngine';
import { sendToPrinter } from '../lib/print/bluetoothTransport';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  CreditCard, 
  QrCode, 
  Coins, 
  Percent, 
  Receipt,
  ScanBarcode,
  Sparkles,
  AlertTriangle,
  Info,
  Printer,
  CheckCircle,
  Package,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CashierTabProps {
  products: Product[];
  onCompleteSale: (items: CartItem[], total: number, discount: number, tax: number, paymentMethod: 'Tunai' | 'QRIS' | 'Kartu', amountPaid: number, cashierName: string, discountPercent: number, taxPercent: number) => void;
  tenantCategories?: string[];
  tenant?: Tenant;
  onAddProduct?: (product: Product) => void;
  isLocked: boolean;
  activeSession: CashierSession | null;
  onOpenSession: (openingBalance: number, source: 'CASHIER' | 'KAS_BESAR') => void;
  onCloseSession: (closingBalance: number) => void;
  transactions: Transaction[];
  kasBesar?: KasBesar | null;
}

export default function CashierTab({ 
  products, 
  onCompleteSale, 
  tenantCategories,
  tenant,
  onAddProduct,
  isLocked,
  activeSession,
  onOpenSession,
  onCloseSession,
  transactions,
  kasBesar
}: CashierTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashierName, setCashierName] = useState(() => localStorage.getItem('pos_cashier_name') || '');
  // Session Modal — source is always KAS_BESAR
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCashFlow, setShowCashFlow] = useState(false);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const kasBesarBalance = kasBesar?.balance ?? 0;

  const dynamicBalance = useMemo(() => {
    if (!activeSession) return 0;
    const sessionTransactions = transactions.filter(t => t.sessionId === activeSession.id && t.paymentMethod === 'Tunai');
    const totalCashSales = sessionTransactions.reduce((sum, t) => sum + t.totalPrice, 0);
    return activeSession.openingBalance + totalCashSales;
  }, [activeSession, transactions]);

  useEffect(() => {
    if (!isLocked) {
      setCashierName(localStorage.getItem('pos_cashier_name') || '');
    }
  }, [isLocked]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState(false);

  // Discount & Tax sync with tenant settings
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isTaxEnabled, setIsTaxEnabled] = useState(tenant?.taxEnabled ?? false);
  
  useEffect(() => {
    if (tenant) {
      setIsTaxEnabled(tenant.taxEnabled ?? false);
    }
  }, [tenant?.taxEnabled]);
  const [mobileActiveView, setMobileActiveView] = useState<'products' | 'cart'>('products');

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Kartu'>('Tunai');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState(0);
  const [cashSelection, setCashSelection] = useState<number[]>([]);

  // Completed Receipt Modal State for automatic receipt popup
  const [completedReceipt, setCompletedReceipt] = useState<{
    items: CartItem[];
    total: number;
    discount: number;
    tax: number;
    paymentMethod: 'Tunai' | 'QRIS' | 'Kartu';
    amountPaid: number;
    change: number;
    receiptId: string;
    timestamp: string;
  } | null>(null);

  // Sound/Vibration emulation state
  const [isScannedBg, setIsScannedBg] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Track percentages for receipt display
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState(0);
  const [appliedTaxPercent, setAppliedTaxPercent] = useState(0);

  // Quick Add Product Modal Flow
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickName, setQuickName] = useState('');

  const handlePrintThermal = async () => {
    if (!completedReceipt) return;
    setIsPrinting(true);

    const payload: ReceiptThermalPayload = {
      storeName: tenant?.name || 'KASIR PORTABLE CLOUD',
      address: tenant?.address || '',
      phone: tenant?.phone || '',
      receiptId: completedReceipt.receiptId,
      timestamp: new Date(completedReceipt.timestamp).toLocaleString('id-ID'),
      paymentMethod: completedReceipt.paymentMethod,
      items: completedReceipt.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity
      })),
      subtotal: completedReceipt.total - completedReceipt.tax + completedReceipt.discount,
      discount: completedReceipt.discount,
      tax: completedReceipt.tax,
      total: completedReceipt.total,
      amountPaid: completedReceipt.amountPaid,
      change: completedReceipt.change,
      discountPercent: (completedReceipt as any).discountPercent || 0,
      taxPercent: (completedReceipt as any).taxPercent || 0,
      footerText: tenant?.receiptFooter || 'Terima kasih atas kunjungan Anda!\nBarang yang dibeli tidak dapat ditukar.',
      autoCut: tenant?.printerAutoCut !== false
    };

    try {
      const receiptBytes = buildReceiptBytes(payload);
      await sendToPrinter(receiptBytes);
      alert('Data struk berhasil dikirim ke printer Bluetooth. Pastikan printer telah dipilih dan terhubung.');
    } catch (error: any) {
      console.error('Gagal mencetak struk:', error);
      alert(`Gagal mencetak struk: ${error?.message || 'Kesalahan koneksi Bluetooth atau printer tidak kompatibel.'}`);
    } finally {
      setIsPrinting(false);
    }
  };
  const [quickCategory, setQuickCategory] = useState('Makanan');
  const [quickPrice, setQuickPrice] = useState<number>(0);
  const [quickCost, setQuickCost] = useState<number>(0);
  const [quickStock, setQuickStock] = useState<number>(10);
  const [quickBarcode, setQuickBarcode] = useState('');

  // Quick Custom Order Modal Flow
  const [showCustomOrder, setShowCustomOrder] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(0);

  // Hotkey / Quick Input ref for simulation
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // List of unique categories from currently loaded products
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

  useEffect(() => {
    if (uniqueCustomCategories.length > 0) {
      setQuickCategory(uniqueCustomCategories[0]);
    }
  }, [uniqueCustomCategories]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(searchTerm));
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Quick scan simulation
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = products.find(p => p.barcode === barcodeInput.trim());
    if (product) {
      if (product.stock <= 0) {
        setScanMessage(`❌ ${product.name} Habis!`);
        setBarcodeError(true);
      } else {
        addToCart(product);
        setScanMessage(`🎯 Berhasil Scan: ${product.name}`);
        setBarcodeError(false);
        setIsScannedBg(true);
        setTimeout(() => setIsScannedBg(false), 300);
      }
    } else {
      setScanMessage(`🔍 Barcode [${barcodeInput}] tidak terdaftar!`);
      setBarcodeError(true);
    }
    setBarcodeInput('');
    setTimeout(() => setScanMessage(null), 3000);
  };

  const addToCart = (product: Product) => {
    if (!activeSession) {
      alert('Sesi belum dibuka. Silakan buka sesi di tab Kasir terlebih dahulu.');
      return;
    }
    // Check stock limits in cart
    const existing = cart.find(item => item.product.id === product.id);
    const existingQty = existing ? existing.quantity : 0;
    
    if (existingQty >= product.stock) {
      alert(`Stok tidak mencukupi! Hanya tersisa ${product.stock} items.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    const cartItem = cart.find(item => item.product.id === productId);
    const targetProduct = products.find(p => p.id === productId) || cartItem?.product;
    if (!targetProduct) return;

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > targetProduct.stock) {
          alert(`Stok tidak mencukupi! Maksimum stok: ${targetProduct.stock}`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      alert('Sesi belum dibuka. Silakan buka sesi di tab Kasir terlebih dahulu.');
      return;
    }
    if (!quickName.trim()) {
      alert('Nama barang tidak boleh kosong!');
      return;
    }
    if (Number(quickPrice) <= 0) {
      alert('Harga jual harus lebih besar dari 0!');
      return;
    }

    const newProdId = generateId('prod');
    const newProduct: Product = {
      id: newProdId,
      name: quickName.trim(),
      category: quickCategory.trim(),
      price: Number(quickPrice),
      cost: Number(quickCost),
      stock: Number(quickStock),
      minStock: 2,
      barcode: quickBarcode.trim() || `899${Math.floor(100000000 + Math.random() * 900000000)}`,
      imageUrl: '📦'
    };

    if (onAddProduct) {
      onAddProduct(newProduct);
      // Tunggu perubahan state sebentar agar produk masuk ke daftar utama, lalu add ke cart
      setTimeout(() => {
        addToCart(newProduct);
      }, 100);
    } else {
      addToCart(newProduct);
    }

    // Reset input form
    setQuickName('');
    setQuickPrice(0);
    setQuickCost(0);
    setQuickStock(10);
    setQuickBarcode('');
    setShowQuickAddProduct(false);
  };

  const handleSaveCustomOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      alert('Sesi belum dibuka. Silakan buka sesi di tab Kasir terlebih dahulu.');
      return;
    }
    if (!customName.trim()) {
      alert('Nama pesanan kustom tidak boleh kosong!');
      return;
    }
    if (Number(customPrice) <= 0) {
      alert('Harga harus lebih besar dari 0!');
      return;
    }

    const customProd: Product = {
      id: generateId('customprod'),
      name: `(Kustom) ${customName.trim()}`,
      category: 'Kustom',
      price: Number(customPrice),
      cost: 0,
      stock: 999999,
      minStock: 0,
      barcode: '',
      imageUrl: '🛍️'
    };

    setCart([...cart, { product: customProd, quantity: 1 }]);

    // Reset input form
    setCustomName('');
    setCustomPrice(0);
    setShowCustomOrder(false);
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round(subtotal * (discountPercent / 100));
  }, [subtotal, discountPercent]);

  const taxAmount = useMemo(() => {
    if (!isTaxEnabled || !tenant) return 0;
    const rate = tenant.taxPercentage ?? 11;
    const base = subtotal - discountAmount;
    
    if (tenant.taxMethod === 'include') {
      // (Base * taxRate / (100 + taxRate))
      return Math.round(base - (base / (1 + rate / 100)));
    } else {
      // Exclude: (Base * taxRate / 100)
      return Math.round(base * (rate / 100));
    }
  }, [subtotal, discountAmount, isTaxEnabled, tenant]);

  const total = useMemo(() => {
    const base = subtotal - discountAmount;
    if (tenant?.taxMethod === 'include' && isTaxEnabled) {
      return base;
    }
    return base + taxAmount;
  }, [subtotal, discountAmount, taxAmount, tenant, isTaxEnabled]);

  // Adjust cash selection options based on current total
  useEffect(() => {
    if (total <= 0) {
      setCashSelection([]);
      return;
    }
    // Indonesian high denomination quick cash suggestions
    const bills = [5000, 10000, 20000, 50000, 100000];
    const suggestions = new Set<number>();
    
    // Add exact payment
    suggestions.add(total);
    
    // Next higher standard bills
    bills.forEach(bill => {
      if (bill > total) {
        suggestions.add(bill);
      }
      // multiples of bills that are larger than total
      const multiple = Math.ceil(total / bill) * bill;
      if (multiple > total && multiple <= total + 100000) {
        suggestions.add(multiple);
      }
    });

    setCashSelection(Array.from(suggestions).sort((a, b) => a - b).slice(0, 4));
    setAmountPaid(total);
  }, [total]);

  // Track change when amountPaid is edited
  useEffect(() => {
    setChangeAmount(Math.max(0, amountPaid - total));
  }, [amountPaid, total]);

  const initiateCheckout = () => {
    if (!activeSession) {
      alert('Sesi belum dibuka. Silakan buka sesi di tab Kasir terlebih dahulu.');
      return;
    }
    if (cart.length === 0) return;
    setPaymentMethod('Tunai');
    setAmountPaid(total);
    setShowCheckout(true);
  };

  const handleCheckoutSubmit = () => {
    if (paymentMethod === 'Tunai' && amountPaid < total) {
      alert('Uang yang dibayarkan kurang dari total belanjaan!');
      return;
    }

    // Complete transaction
    const finalAmountPaid = paymentMethod === 'Tunai' ? amountPaid : total;
    const finalTaxPercent = isTaxEnabled ? (tenant?.taxPercentage ?? 11) : 0;
    onCompleteSale(cart, total, discountAmount, taxAmount, paymentMethod, finalAmountPaid, cashierName, discountPercent, finalTaxPercent);
    
    // Capture receipt details for automatic display
    const calculatedChange = Math.max(0, finalAmountPaid - total);
    setCompletedReceipt({
      items: [...cart],
      total,
      discount: discountAmount,
      tax: taxAmount,
      paymentMethod,
      amountPaid: finalAmountPaid,
      change: calculatedChange,
      receiptId: `TRX-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      discountPercent: discountPercent,
      taxPercent: isTaxEnabled ? 11 : 0
    } as any);

    // Reset states
    clearCart();
    setDiscountPercent(0);
    setIsTaxEnabled(false);
    setShowCheckout(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden text-slate-800" id="cashier-interface">
      <style>{`
        #product-selection-pane::-webkit-scrollbar,
        #cart-items-container::-webkit-scrollbar,
        #categories-tabs::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        #product-selection-pane::-webkit-scrollbar-track,
        #cart-items-container::-webkit-scrollbar-track,
        #categories-tabs::-webkit-scrollbar-track {
          background: transparent;
        }
        #product-selection-pane::-webkit-scrollbar-thumb,
        #cart-items-container::-webkit-scrollbar-thumb,
        #categories-tabs::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 99px;
        }
        #product-selection-pane::-webkit-scrollbar-thumb:hover,
        #cart-items-container::-webkit-scrollbar-thumb:hover,
        #categories-tabs::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
      
      {/* Mobile view selector (Tabs) - only visible on small displays */}
      <div className="lg:hidden bg-indigo-500 p-2 flex gap-1.5 shrink-0 select-none shadow-inner" id="mobile-tab-switch">
        <button
          onClick={() => setMobileActiveView('products')}
          className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-250 flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileActiveView === 'products'
              ? 'bg-white text-indigo-700 shadow-md scale-[1.01]'
              : 'bg-indigo-700/60 text-indigo-100 hover:bg-indigo-600/60'
          }`}
          id="mobile-btn-products"
        >
          <span>📦</span> Daftar Barang
        </button>
        <button
          onClick={() => setMobileActiveView('cart')}
          className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-250 flex items-center justify-center gap-1.5 relative cursor-pointer ${
            mobileActiveView === 'cart'
              ? 'bg-white text-indigo-700 shadow-md scale-[1.01]'
              : 'bg-indigo-700/60 text-indigo-100 hover:bg-indigo-600/60'
          }`}
          id="mobile-btn-cart"
        >
          <span>🛒</span> Pesanan Kasir
          {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black leading-none px-1.5 py-1 rounded-full flex items-center justify-center shadow-sm animate-pulse">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* LEFT PORTION: Product Grid & Filters */}
      <div className={`flex-1 flex flex-col p-4 overflow-y-auto min-h-0 bg-slate-50 ${mobileActiveView === 'products' ? 'flex' : 'hidden lg:flex'}`} id="product-selection-pane">
         {/* Search Bar, Scanner Simulator and Category Selector Combined */}
        <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Cari barang atau scan barcode..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                id="product-search-input"
              />
            </div>

            {/* Simulated Barcode Hardware Scan Trigger */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-1.5 items-center">
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input 
                  ref={barcodeInputRef}
                  type="text" 
                  placeholder="Simulasi barcode scan..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className={`w-44 pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 transition-all ${
                    barcodeError 
                      ? 'border-red-300 bg-red-50 focus:ring-red-400' 
                      : 'border-slate-200 focus:ring-indigo-500'
                  }`}
                  id="barcode-simulation-input"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0 cursor-pointer"
                id="barcode-submit-btn"
              >
                Scan
              </button>
            </form>
          </div>

          <AnimatePresence>
            {scanMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2 ${
                  barcodeError ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${barcodeError ? 'bg-red-500' : 'bg-indigo-500'} animate-ping`}></div>
                {scanMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shortcut simulator buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium uppercase font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Simulasi Scan Cepat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {products.slice(0, 3).map(p => (
                <button
                  key={`shortcut-${p.id}`}
                  onClick={() => {
                    setBarcodeInput(p.barcode || '');
                    if (barcodeInputRef.current) barcodeInputRef.current.focus();
                  }}
                  type="button"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg px-2 py-1 text-[11px] font-medium font-mono transition-colors border border-slate-200/50"
                >
                  [{p.name.split(' ')[0]}]
                </button>
              ))}
            </div>
          </div>

          {/* Categorization tabs */}
          <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none" id="categories-tabs">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === category 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 border border-indigo-500/10'
                    : 'bg-white text-slate-650 border border-slate-200 hover:bg-slate-50'
                }`}
                id={`category-tab-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Quick Action Cashier Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-100 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowQuickAddProduct(true)}
              type="button"
              className="flex-1 py-3 px-3 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm border border-indigo-200/50"
              id="btn-quick-add-product"
              title="Tambah barang baru permanen ke dalam sistem"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>+ Tambah Barang Baru</span>
            </button>
            <button
              onClick={() => setShowCustomOrder(true)}
              type="button"
              className="flex-1 py-3 px-3 bg-amber-50 hover:bg-amber-100/70 text-amber-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm border border-amber-200/50"
              id="btn-quick-custom-order"
              title="Masukkan pesanan kustom non-terdaftar ke keranjang"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>+ Pesanan Kustom</span>
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className={`flex-1 min-h-0 transition-colors duration-300 rounded-xl p-1 ${isScannedBg ? 'bg-emerald-100' : ''}`}>
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center h-full">
              <div className="bg-slate-100 p-4 rounded-full mb-3 text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Barang tidak ditemukan</h3>
              <p className="text-slate-400 text-sm max-w-sm">Coba cari dengan kata kunci lain atau pilih kategori yang berbeda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5" id="product-grid-container">
              {filteredProducts.map(product => {
                const cartQty = cart.find(item => item.product.id === product.id)?.quantity || 0;
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock <= product.minStock;

                return (
                  <motion.div
                    key={product.id}
                    layoutId={`product-card-${product.id}`}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`relative p-3 rounded-2xl border bg-white flex flex-col justify-between transition-all cursor-pointer min-h-[140px] select-none group ${
                      isOutOfStock 
                        ? 'opacity-60 saturate-50 border-slate-200 cursor-not-allowed bg-slate-50' 
                        : cartQty > 0
                        ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                    id={`product-card-${product.id}`}
                  >
                    {/* Floating badge for Low stock or Cart count */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                      {cartQty > 0 && (
                        <div className="bg-indigo-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-scaleIn shadow-sm">
                          {cartQty}
                        </div>
                      )}
                      {isOutOfStock ? (
                        <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase">
                          Habis
                        </div>
                      ) : isLowStock ? (
                        <div className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> menipis
                        </div>
                      ) : null}
                    </div>

                    {/* Image Emoji and category */}
                    <div className="flex items-start gap-2.5 mb-2">
                      <span className="text-3xl bg-slate-100 w-12 h-12 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center select-none shadow-sm shrink-0">
                        {product.imageUrl || '📦'}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1 pr-1">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold truncate block">
                          {product.category}
                        </span>
                        <h4 className="font-semibold text-slate-800 text-sm leading-tight mt-0.5" title={product.name}>
                          {product.name}
                        </h4>
                      </div>
                    </div>

                    {/* Stock status and price */}
                    <div className="flex items-end justify-between mt-auto pt-2 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-medium">Stok: {product.stock}</span>
                        <span className="font-extrabold text-indigo-600 text-sm">
                          {formatRupiah(product.price)}
                        </span>
                      </div>
                      <div className="bg-slate-50 group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 p-1.5 rounded-xl transition-colors">
                        <Plus className="w-4 h-4 cursor-pointer" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PORTION: Cart Drawer / Panel */}
      <div className={`w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col flex-1 lg:flex-none lg:h-full min-h-0 relative shadow-lg ${mobileActiveView === 'cart' ? 'flex' : 'hidden lg:flex'}`} id="cart-drawer-pane">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-150 bg-slate-50 shrink-0 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-base">Pesanan Aktif ({cart.reduce((s,i) => s + i.quantity, 0)})</h3>
            </div>
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                title="Kosongkan Keranjang"
                id="clear-cart-btn"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-white px-2.5 py-1.5 rounded-md border border-slate-200 shadow-sm w-max">
            <span className="font-bold uppercase tracking-wider">Kasir:</span>
            <span className="font-medium text-slate-800">
              {cashierName || 'Kasir'}
            </span>
          </div>
          
          {/* Sesson Status */}
          <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs space-y-2">
             <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                     {activeSession ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sesi Aktif ({formatRupiah(dynamicBalance)})</span>
                    ) : (
                        <span className="flex items-center gap-1 text-slate-500"><div className="w-2 h-2 rounded-full bg-slate-400" /> Sesi Tutup</span>
                    )}
                </span>
                <div className="flex gap-1">
                  {activeSession && (
                    <button onClick={() => setShowCashFlow(true)} className="text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded">Laporan</button>
                  )}
                  {activeSession ? (
                      <button onClick={() => onCloseSession(0)} className="text-rose-600 font-bold hover:bg-rose-50 px-2 py-1 rounded">Tutup</button>
                  ) : (
                    <button onClick={() => setShowOpenSession(true)} className="text-emerald-700 font-bold hover:bg-emerald-50 px-2 py-1 rounded">Buka</button>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" id="cart-items-container">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <div className="opacity-30 mb-2">🛍️</div>
              <p className="text-sm">Keranjang kosong.</p>
              <p className="text-xs px-6 mt-1 text-slate-400">Pilih menu di sebelah kiri atau ketik barcode untuk memulai transaksi.</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map(item => (
                <motion.div
                  key={`cart-item-${item.product.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all gap-2"
                  id={`cart-item-row-${item.product.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-2xl min-w-8 text-center">{item.product.imageUrl || '📦'}</span>
                    <div className="min-w-0 pr-1">
                      <h5 className="font-medium text-slate-800 text-sm truncate leading-tight">{item.product.name}</h5>
                      <span className="text-xs font-semibold text-indigo-600">{formatRupiah(item.product.price)}</span>
                    </div>
                  </div>

                  {/* Quantity Actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        id={`cart-qty-minus-${item.product.id}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-slate-705 min-w-6 text-center select-none">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        id={`cart-qty-plus-${item.product.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Hapus"
                      id={`cart-delete-${item.product.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Cart Calculation & Pricing Box */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3.5 shrink-0" id="invoice-bill-box">
          
          {/* Quick Discounts & Taxes */}
          <div className="flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 flex-1">
              <Percent className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-slate-500 mr-1">Diskon:</span>
              <select 
                value={discountPercent} 
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer flex-1"
                id="discount-select"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="10">10%</option>
                <option value="15">15%</option>
                <option value="20">20%</option>
              </select>
            </div>

            <button 
              onClick={() => setIsTaxEnabled(!isTaxEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold flex-1 transition-all justify-center cursor-pointer ${
                isTaxEnabled 
                  ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              id="tax-toggle-btn"
            >
              <span>PPN (11%)</span>
              <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${isTaxEnabled ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                {isTaxEnabled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          </div>

          {/* Pricing Details */}
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-150">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-750">{formatRupiah(subtotal)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-xs text-rose-600 font-medium">
                <span>Diskon ({discountPercent}%)</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            {isTaxEnabled && (
              <div className="flex justify-between text-xs text-amber-700 font-medium">
                <span>PPN (11%)</span>
                <span>+{formatRupiah(taxAmount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 my-1 pt-1.5 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-800">Total Harga</span>
              <span className="text-lg font-black text-indigo-700" id="cart-total-price">
                {formatRupiah(total)}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={initiateCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
              cart.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 active:scale-[0.98]'
            }`}
            id="checkout-trigger-btn"
          >
            <Receipt className="w-4.5 h-4.5" />
            BAYAR SEKARANG
          </button>
        </div>
      </div>

      {/* --- PAYMENT MODAL WINDOW --- */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="checkout-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-800 my-auto"
              id="payment-modal-box"
            >
              {/* Payment Header */}
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg leading-tight">Proses Pembayaran</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">Sistem POS Android / Kasir Pintar</p>
                </div>
                <div className="bg-white/10 p-2 rounded-2xl text-indigo-100">
                  <Coins className="w-6 h-6" />
                </div>
              </div>

              {/* Total & Summary Block */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Harus Dibayar</span>
                <span className="text-3xl font-black text-slate-850 mt-1" id="checkout-total-billing">
                  {formatRupiah(total)}
                </span>
                <span className="text-xs text-indigo-700 font-mono mt-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 max-w-full truncate text-center">
                  📄 {cart.reduce((s,i)=>s+i.quantity, 0)} Items • Diskon {discountPercent}% {isTaxEnabled ? '+ PPN' : ''}
                </span>
              </div>

              {/* Payment Methods Selection Tabs */}
              <div className="px-6 py-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Tunai')}
                    className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                      paymentMethod === 'Tunai'
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                    id="pay-method-cash"
                  >
                    <Coins className="w-5 h-5 text-amber-500" />
                    Tunai
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('QRIS');
                      setAmountPaid(total);
                    }}
                    className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                      paymentMethod === 'QRIS'
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                    id="pay-method-qris"
                  >
                    <QrCode className="w-5 h-5 text-indigo-500" />
                    QRIS
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Kartu');
                      setAmountPaid(total);
                    }}
                    className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                      paymentMethod === 'Kartu'
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                    id="pay-method-card"
                  >
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    Kartu
                  </button>
                </div>
              </div>

              {/* Dynamic Content based on Payment Method */}
              <div className="px-6 pb-6 space-y-4">
                
                {paymentMethod === 'Tunai' ? (
                  <>
                    {/* Amount suggestion chip list */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Uang Pas / Nominal Cepat</span>
                      <div className="flex flex-wrap gap-1.5">
                        {cashSelection.map(num => (
                          <button
                            key={`cash-shortcut-${num}`}
                            type="button"
                            onClick={() => setAmountPaid(num)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              amountPaid === num 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {formatRupiah(num)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Numeric Cash Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Jumlah Uang Diterima (Rp)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">Rp</span>
                        <input
                          type="number"
                          value={amountPaid || ''}
                          onChange={(e) => setAmountPaid(Number(e.target.value))}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                          id="cash-received-value"
                        />
                      </div>
                    </div>

                    {/* Kembalian / Change calculation */}
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-indigo-500 tracking-wider uppercase">Kembalian</span>
                        <span className={`text-xl font-extrabold ${amountPaid >= total ? 'text-indigo-700' : 'text-slate-400'}`}>
                          {formatRupiah(changeAmount)}
                        </span>
                      </div>
                      <div className="text-indigo-500 font-bold text-xs">
                        {amountPaid >= total ? '👍 Uang Cukup' : '⚠️ Uang Kurang'}
                      </div>
                    </div>
                  </>
                 ) : paymentMethod === 'QRIS' ? (
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-205 flex flex-col items-center text-center justify-center">
                    {/* Simulated QRIS Code layout resembling national standard */}
                    <div className="w-[185px] bg-white border border-rose-500 rounded-2xl overflow-hidden shadow-md flex flex-col items-center pb-2.5">
                      {/* QRIS Header */}
                      <div className="w-full bg-rose-500 p-1.5 text-white flex flex-col items-center relative gap-0.5">
                        <div className="flex items-center gap-1 justify-center leading-none">
                          <span className="bg-amber-500 text-white font-extrabold text-[8px] px-1 py-0.5 rounded tracking-wide leading-none font-sans">QRIS</span>
                          <span className="text-[9px] font-black tracking-widest leading-none">NASIONAL</span>
                        </div>
                        <div className="text-[6.5px] font-extrabold text-rose-100 uppercase tracking-wider leading-none">Penyelenggara Jasa Pembayaran</div>
                        {/* Underline stripes decoration */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 flex">
                          <div className="flex-1 bg-teal-400"></div>
                          <div className="flex-1 bg-amber-400"></div>
                          <div className="flex-1 bg-blue-500"></div>
                          <div className="flex-1 bg-rose-600"></div>
                        </div>
                      </div>

                      {/* Merchant name and NMID */}
                      <div className="py-1.5 px-2 text-center w-full min-w-0">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase leading-snug tracking-wide truncate">
                          {tenant?.qrisMerchantName || tenant?.name || 'UMKM Mandiri'}
                        </h4>
                        {tenant?.qrisNmid && (
                          <p className="text-[7.5px] font-mono text-slate-400 mt-0.5 leading-none">NMID: {tenant.qrisNmid}</p>
                        )}
                      </div>

                      {/* Image scanner container */}
                      <div className="bg-white p-1.5 rounded-xl border border-slate-150 inline-block relative shadow-sm">
                        {tenant?.qrisCustomImage ? (
                          <img 
                            src={tenant.qrisCustomImage} 
                            alt="QRIS Statis" 
                            className="w-28 h-28 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="relative">
                            <QrCode className="w-28 h-28 text-slate-800" />
                            <div className="absolute inset-0 bg-transparent flex items-center justify-center">
                              {/* Tiny center logo dummy resembling GPN */}
                              <div className="bg-teal-500 text-white font-black text-[7px] p-1 font-mono rounded tracking-tight shadow-md animate-pulse">GPN</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer logos marker */}
                      <div className="text-[6px] font-extrabold text-slate-400 uppercase mt-1.5 select-none tracking-widest flex items-center gap-1.5 justify-center leading-none">
                        <span>● GPN</span>
                        <span>● LINKAJA</span>
                        <span>● QRIS</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 max-w-xs mt-2.5 leading-relaxed">
                      Mintalah pembeli men-scan barcode <strong className="text-rose-600 font-bold">QRIS Statis</strong> di atas sebesar <strong className="text-slate-800 font-black">{formatRupiah(total)}</strong> menggunakan e-wallet atau M-Banking andalannya.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-700">Simulasi Pembaca Kartu Debit/Kredit</h5>
                      <p className="text-[10px] text-slate-400 mt-1">Masukkan kartu ke mesin EDC nirkabel atau tap menggunakan NFC smartphone pembeli. Total {formatRupiah(total)} akan langsung didebit.</p>
                    </div>
                  </div>
                )}

                {/* Cancel or Finalize */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 py-3 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckoutSubmit}
                    disabled={paymentMethod === 'Tunai' && amountPaid < total}
                    className={`flex-1 py-3 rounded-xl text-xs font-black tracking-wide text-white transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'Tunai' && amountPaid < total
                        ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-155 active:scale-[0.98]'
                    }`}
                    id="finalize-payment-btn"
                  >
                    <Check className="w-4 h-4 text-white" />
                    KONFIRMASI LUNAS
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {completedReceipt && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none" id="instant-receipt-popup">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-indigo-950/50 rounded-3xl p-4 w-full max-w-sm shadow-2xl relative space-y-4 my-auto"
            >
              {/* Floating Reprint Action Button */}
              <button
                type="button"
                onClick={handlePrintThermal}
                disabled={isPrinting}
                className="absolute -top-3.5 -right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-3.5 py-1.5 rounded-full hover:from-amber-400 hover:to-amber-500 transition-all font-black text-[10px] tracking-wide shadow-lg shadow-amber-500/30 flex items-center gap-1.5 cursor-pointer active:scale-95 border-2 border-slate-900 z-10 hover:shadow-xl"
                title="Cetak Ulang Struk Cepat tanpa menu riwayat"
                id="btn-quick-reprint"
              >
                <Printer className="w-3.5 h-3.5 animate-pulse text-slate-950" />
                <span>Cetak Ulang</span>
              </button>

              {/* Happy Check Animation Title */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full mb-1">
                  <CheckCircle className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-sm font-black text-white tracking-wide uppercase">Pembayaran Sukses!</h3>
                <p className="text-[10px] text-slate-400">Transaksi dicatat & stok telah diperbarui otomatis</p>
                {completedReceipt.change > 0 && (
                  <div className="mt-1.5 py-1.5 px-3 bg-indigo-950/60 border border-indigo-900/30 rounded-xl inline-block">
                    <span className="text-[9px] text-indigo-400 uppercase tracking-wider font-extrabold block">Uang Kembalian:</span>
                    <span className="text-base font-black text-amber-400 font-mono tracking-tight">{formatRupiah(completedReceipt.change)}</span>
                  </div>
                )}
              </div>

              {/* Realistic Paper Thermal Receipt Print */}
              <div className="bg-white text-slate-800 p-4 rounded-2xl shadow-md border border-slate-100 flex flex-col font-sans relative">
                {/* Top teeth effect */}
                <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(45deg,#fff_25%,transparent_25%),linear-gradient(-45deg,#fff_25%,transparent_25%)] bg-[size:10px_10px] bg-repeat-x -translate-y-1 mt-0"></div>

                <div className="text-center space-y-1 mb-3">
                  {tenant?.receiptLogo ? (
                    <img 
                      src={tenant.receiptLogo} 
                      alt="Logo Toko" 
                      className="max-h-16 max-w-full mx-auto object-contain mb-1.5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Receipt className="w-6 h-6 text-indigo-600 mx-auto opacity-70" />
                  )}
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wide">
                    {tenant?.name || 'KASIR PORTABLE CLOUD'}
                  </h4>
                  <p className="text-[8.5px] text-slate-500 max-w-xs mx-auto leading-normal whitespace-pre-line font-medium">
                    {tenant?.address || 'Koneksi Cloud SaaS Berbasis Google Auth'}
                    {tenant?.phone && `\nTelp: ${tenant.phone}`}
                  </p>
                </div>

                {/* Info block lines */}
                <div className="border-t border-dashed border-slate-300 py-1.5 text-[9px] font-mono font-semibold text-slate-505 space-y-0.5">
                  <div className="flex justify-between">
                    <span>ID NOTA:</span>
                    <span className="text-slate-800">{completedReceipt.receiptId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KASIR:</span>
                    <span className="text-slate-800 uppercase">{cashierName || 'Kasir'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WAKTU:</span>
                    <span>{new Date(completedReceipt.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS:</span>
                    <span className="text-emerald-600 font-extrabold">LUNAS ({completedReceipt.paymentMethod})</span>
                  </div>
                </div>

                {/* Itemized Line rows */}
                <div className="border-t border-dashed border-slate-300 py-2 space-y-1 max-h-[140px] overflow-y-auto scrollbar-none">
                  {completedReceipt.items.map((item, idx) => (
                    <div key={`rec-item-${idx}`} className="text-[9.5px] leading-tight text-slate-705 flex flex-col">
                      <div className="flex justify-between font-bold">
                        <span>{item.product.name}</span>
                        <span>{formatRupiah(item.product.price * item.quantity)}</span>
                      </div>
                      <div className="text-[8.5px] text-slate-400 font-mono">
                        {item.quantity} x {formatRupiah(item.product.price)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cash summary calculations block */}
                <div className="border-t border-dashed border-slate-300 pt-2 pb-1.5 text-[9.5px] font-mono font-extrabold text-slate-750 space-y-1">
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>{formatRupiah(completedReceipt.total - completedReceipt.tax + completedReceipt.discount)}</span>
                  </div>
                  {completedReceipt.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>DISKON ({(completedReceipt as any).discountPercent || 0}%):</span>
                      <span>-{formatRupiah(completedReceipt.discount)}</span>
                    </div>
                  )}
                  {completedReceipt.tax > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>PAJAK ({(completedReceipt as any).taxPercent || 0}%{tenant?.taxMethod === 'include' ? ' IC' : ''}):</span>
                      <span>{tenant?.taxMethod === 'include' ? 'TERM' : formatRupiah(completedReceipt.tax)}</span>
                    </div>
                  )}
                  {tenant?.taxMethod === 'include' && completedReceipt.tax > 0 && (
                    <div className="px-1.5 py-0.5 bg-slate-50 rounded text-[7px] text-slate-400 italic">
                      * Harga sudah termasuk Pajak {formatRupiah(completedReceipt.tax)}
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-900 pt-1 border-t border-slate-100 font-black">
                    <span>TOTAL BELANJA:</span>
                    <span>{formatRupiah(completedReceipt.total)}</span>
                  </div>
                  <div className="flex justify-between pt-0.5 font-sans font-bold text-slate-500 text-[9px]">
                    <span>DIBAYAR ({completedReceipt.paymentMethod}):</span>
                    <span>{formatRupiah(completedReceipt.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-sans text-amber-600 font-black text-[9.5px]">
                    <span>KEMBALIAN:</span>
                    <span>{formatRupiah(completedReceipt.change)}</span>
                  </div>
                </div>

                {/* Feet teeth custom footer message */}
                <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[8.5px] text-slate-400 font-bold max-w-xs mx-auto whitespace-pre-line leading-relaxed">
                  {tenant?.receiptFooter || 'Terima kasih atas kunjungan Anda!\nBarang yang dibeli tidak dapat ditukar.'}
                </div>
              </div>

              {/* Instant Controls & Dismiss Print Button */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const message = `Halo Pelanggan, berikut struk belanja:${completedReceipt.items.map(i => `\n- ${i.product.name} x${i.quantity}`).join('')}\nTotal: ${formatRupiah(completedReceipt.total)}\nStatus: Lunas.\nKasir: ${cashierName || 'Kasir'}\nTerima kasih! -- ${tenant?.name || 'Toko Kami'}`;
                    navigator.clipboard.writeText(message);
                    alert('Teks Struk berhasil disalin ke clipboard untuk dishare ke WhatsApp!');
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-black rounded-xl transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  📥 Salin Teks Struk WhatsApp
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrintThermal}
                    disabled={isPrinting}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-black rounded-xl transition-all uppercase flex items-center justify-center gap-1.5 tracking-wide cursor-pointer active:scale-95 shadow shadow-indigo-900"
                  >
                    <Printer className="w-4 h-4 text-indigo-200" /> {isPrinting ? 'Mencetak...' : 'Cetak (Print)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompletedReceipt(null)}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10.5px] font-black rounded-xl transition-all uppercase flex items-center justify-center gap-1 tracking-wider cursor-pointer active:scale-95"
                  >
                    Transaksi Baru
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- QUICK ADD PRODUCT DIRECTLY FROM CASHIER --- */}
      <AnimatePresence>
        {showQuickAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto shadow-2xl" id="quick-add-product-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-800 my-auto"
              id="quick-add-product-box"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg leading-tight">Tambah Barang Baru Instan</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">Daftarkan produk permanen ke database</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddProduct(false)}
                  className="text-white bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-lg transition-colors cursor-pointer text-sm font-black"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveQuickProduct} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nama Barang</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi Susu Aren Gula Merah"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Kategori</label>
                    <select
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 text-sm cursor-pointer"
                    >
                      {uniqueCustomCategories.map(cat => (
                        <option key={`quick-cat-${cat}`} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Stok Awal</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={quickStock}
                      onChange={(e) => setQuickStock(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Harga Modal (Rp)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={quickCost || ''}
                      onChange={(e) => setQuickCost(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-850 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Harga Jual (Rp)</label>
                    <input
                      type="number"
                      required
                      placeholder="Kelipatan 500/1000..."
                      value={quickPrice || ''}
                      onChange={(e) => setQuickPrice(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-850 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <span>Barcode / Kode Unik</span>
                    <span className="text-[10px] text-slate-400 font-normal italic">(Kosongkan untuk otomatis)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 8991234567"
                    value={quickBarcode}
                    onChange={(e) => setQuickBarcode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800 text-sm"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAddProduct(false)}
                    className="flex-1 py-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white rounded-xl text-xs font-bold text-slate-650 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Daftar & Jual
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- QUICK CUSTOM ORDER DIRECTLY TO CART --- */}
      <AnimatePresence>
        {showCustomOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="custom-order-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden text-slate-800 my-auto"
              id="custom-order-box"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-slate-950 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base leading-tight text-slate-950">Buat Pesanan Kustom</h3>
                  <p className="text-[11px] text-slate-900 font-semibold mt-0.5">Jual barang sekali pakai tanpa masuk stok</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomOrder(false)}
                  className="text-slate-950 bg-slate-950/10 hover:bg-slate-950/20 px-2 py-1.5 rounded-lg transition-colors cursor-pointer text-sm font-black"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveCustomOrder} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nama Pesanan / Deskripsi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sewa Lapangan 1 Jam / Jasa Bungkus Kado"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Harga Layanan / Barang (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm font-mono">Rp</span>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={customPrice || ''}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 font-extrabold text-slate-850 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomOrder(false)}
                    className="flex-1 py-3 border border-slate-200 hover:border-slate-350 bg-white rounded-xl text-xs font-bold text-slate-650 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    + Masukkan Keranjang
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOpenSession && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="opensession-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <Play className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-lg text-slate-800">Buka Sesi Kasir</h3>
              </div>
              <p className="text-xs text-slate-400 mb-5">Modal awal akan diambil dari Kas Besar.</p>

              {/* Kas Besar Balance Info */}
              <div className={`rounded-2xl p-4 mb-5 flex items-center justify-between border-2 ${
                kasBesarBalance <= 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saldo Kas Besar Tersedia</p>
                  <p className={`text-xl font-black mt-0.5 ${
                    kasBesarBalance <= 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}>
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(kasBesarBalance)}
                  </p>
                </div>
                <span className="text-3xl">{kasBesarBalance <= 0 ? '⚠️' : '💰'}</span>
              </div>

              {kasBesarBalance <= 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 text-xs text-rose-700 font-semibold">
                  ❌ Kas Besar tidak mencukupi. Tambah saldo di menu <strong>Kas PRO</strong> terlebih dahulu (khusus Owner).
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Modal Awal Sesi (Rp)</label>
                  <input 
                      type="number" 
                      placeholder="Contoh: 50000" 
                      value={openingBalance || ''} 
                      onChange={(e) => setOpeningBalance(Number(e.target.value))}
                      className={`w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 ${
                        openingBalance > kasBesarBalance && kasBesarBalance > 0
                          ? 'border-rose-400 bg-rose-50 focus:ring-rose-400'
                          : 'focus:ring-emerald-500'
                      }`}
                  />
                  {openingBalance > kasBesarBalance && kasBesarBalance > 0 && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold">⚠️ Melebihi saldo Kas Besar yang tersedia!</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => { setShowOpenSession(false); setOpeningBalance(0); }}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >Batal</button>
                <button 
                  onClick={() => {
                    if (openingBalance <= 0) {
                      alert('Masukkan jumlah modal awal yang valid!');
                      return;
                    }
                    if (openingBalance > kasBesarBalance) {
                      alert(`Saldo Kas Besar tidak mencukupi!\nTersedia: Rp ${kasBesarBalance.toLocaleString('id-ID')}\nDiminta: Rp ${openingBalance.toLocaleString('id-ID')}`);
                      return;
                    }
                    onOpenSession(openingBalance, 'KAS_BESAR');
                    setShowOpenSession(false);
                    setOpeningBalance(0);
                  }} 
                  disabled={kasBesarBalance <= 0}
                  className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  🚀 Buka Sesi
                </button>
              </div>
            </motion.div>
         </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCashFlow && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="cashflow-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6"
            >
              <h3 className="font-bold text-lg mb-4">Laporan Arus Kas</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Awal:</span>
                  <span className="font-bold">{activeSession ? formatRupiah(activeSession.openingBalance) : 'Rp 0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pemasukan Tunai:</span>
                  <span className="font-bold text-emerald-600">+{formatRupiah(dynamicBalance - (activeSession?.openingBalance || 0))}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-bold">Total Saldo:</span>
                  <span className="font-black text-indigo-700">{formatRupiah(dynamicBalance)}</span>
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => setShowCashFlow(false)} className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">Tutup</button>
              </div>
            </motion.div>
         </div>
        )}
      </AnimatePresence>
    </div>
  );
}
