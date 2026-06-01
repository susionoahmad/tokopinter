import React, { useState, useEffect, useRef } from 'react';
import { Tenant, Cashier, SubscriptionPackage, SubscriptionRates } from '../types';
import { testPrinterConnection } from '../lib/print/bluetoothTransport';
import { formatRupiah } from '../utils';
import {
  Store,
  Key,
  ShieldAlert,
  Lock,
  LogOut,
  CheckCircle,
  RefreshCw,
  Plus,
  Trash2,
  Tag,
  Sparkles,
  LayoutGrid,
  Printer,
  Info,
  Star,
  MessageCircle
} from 'lucide-react';

const CATEGORY_TEMPLATES = {
  sembako: {
    name: 'Sembako & Toko Kelontong',
    icon: '🛒',
    items: ['Sembako', 'Minyak & Telur', 'Beras & Gandum', 'Bumbu Dapur', 'Sabun & Mandi', 'Rokok & Tembakau', 'Minuman Kemasan', 'Snack']
  },
  kuliner: {
    name: 'Café / F&B / Kuliner',
    icon: '☕',
    items: ['Makanan Utama', 'Minuman Dingin', 'Kopi & Teh', 'Cemilan / Snack', 'Dessert & Manis', 'Bahan Baku Masak']
  },
  fashion: {
    name: 'Butik & Fashion',
    icon: '👕',
    items: ['Atasan Pria/Wanita', 'Celana & Bawahan', 'Hijab & Kerudung', 'Aksesoris & Tas', 'Sepatu & Sandal', 'Jaket / Outerwear']
  },
  konter: {
    name: 'Konter HP & Pulsa',
    icon: '📱',
    items: ['Pulsa Elektrik', 'Paket Data', 'Aksesoris HP', 'Voucher Fisik', 'Jasa & Service', 'Kartu Perdana Baru']
  }
};

const DEFAULT_CATEGORIES = ['Makanan', 'Minuman', 'Sembako', 'Sabun & Mandi', 'Lainnya'];

interface TenantSettingsTabProps {
  tenant: Tenant;
  onUpdateTenant: (updated: Tenant) => void;
  onLockScreen: () => void;
  onLogoutTenant: () => void;
  onTakeOverCashierShift: () => void;
  currentUser?: any;
  packageRates: SubscriptionRates;
}

export default function TenantSettingsTab({
  tenant,
  onUpdateTenant,
  onLockScreen,
  onLogoutTenant,
  onTakeOverCashierShift,
  currentUser,
  packageRates
}: TenantSettingsTabProps) {

  const [storeName, setStoreName] = useState(tenant.name);
  const [adminPin, setAdminPin] = useState(tenant.adminPin);
  const [address, setAddress] = useState(tenant.address || '');
  const [phone, setPhone] = useState(tenant.phone || '');
  const [receiptFooter, setReceiptFooter] = useState(
    tenant.receiptFooter || 'Terima kasih atas kunjungan Anda!\nBarang yang dibeli tidak dapat ditukar.'
  );
  const [receiptLogo, setReceiptLogo] = useState(tenant.receiptLogo || '');
  const [printerAddress, setPrinterAddress] = useState(tenant.printerAddress || '');
  const [printerAutoCut, setPrinterAutoCut] = useState(tenant.printerAutoCut ?? true);

  // Static QRIS state variables
  const [qrisMerchantName, setQrisMerchantName] = useState(tenant.qrisMerchantName || tenant.name);
  const [qrisNmid, setQrisNmid] = useState(tenant.qrisNmid || '');
  const [qrisCustomImage, setQrisCustomImage] = useState(tenant.qrisCustomImage || '');

  // Dynamic Tax settings
  const [taxEnabled, setTaxEnabled] = useState(tenant.taxEnabled ?? false);
  const [taxPercentage, setTaxPercentage] = useState(tenant.taxPercentage ?? 11);
  const [taxMethod, setTaxMethod] = useState<'include' | 'exclude'>(tenant.taxMethod || 'exclude');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage>(tenant.subscriptionPackage || 'monthly');
  const handleQrisImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Ukuran file gambar QRIS terlalu besar! Maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrisCustomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReceiptLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB max for logo
        setErrorMsg('Ukuran file logo terlalu besar! Maksimal 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestPrinterConnection = async () => {
    if (!printerAddress.trim()) {
      setErrorMsg('Harap isi Device Address printer terlebih dahulu!');
      return;
    }
    setIsTestingConnection(true);
    setErrorMsg('');

    try {
      await testPrinterConnection();
      alert(`Berhasil! Printer Bluetooth terhubung dan dapat menerima perintah.`);
    } catch (error: any) {
      console.error('Gagal uji koneksi printer:', error);
      alert(`Gagal uji koneksi printer: ${error?.message || 'Pastikan printer mendukung Web Bluetooth dan sudah menyala.'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Maintenance category state
  const [customCategories, setCustomCategories] = useState<string[]>(
    tenant.categories || DEFAULT_CATEGORIES
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCashierName, setNewCashierName] = useState('');
  const [newCashierPin, setNewCashierPin] = useState('');
  const [hasUnsavedCategoryChanges, setHasUnsavedCategoryChanges] = useState(false);
  const categoryAutosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    setStoreName(tenant.name);
    setAdminPin(tenant.adminPin);
    setAddress(tenant.address || '');
    setPhone(tenant.phone || '');
    setReceiptFooter(tenant.receiptFooter || 'Terima kasih atas kunjungan Anda!\nBarang yang dibeli tidak dapat ditukar.');
    setReceiptLogo(tenant.receiptLogo || '');
    setPrinterAddress(tenant.printerAddress || '');
    setPrinterAutoCut(tenant.printerAutoCut ?? true);
    setQrisMerchantName(tenant.qrisMerchantName || tenant.name);
    setQrisNmid(tenant.qrisNmid || '');
    setQrisCustomImage(tenant.qrisCustomImage || '');
    setTaxEnabled(tenant.taxEnabled ?? false);
    setTaxPercentage(tenant.taxPercentage ?? 11);
    setTaxMethod(tenant.taxMethod || 'exclude');
    setCustomCategories(tenant.categories && tenant.categories.length > 0 ? tenant.categories : DEFAULT_CATEGORIES);
    setSelectedPackage(tenant.subscriptionPackage || 'monthly');
    setNewCategoryName('');
    setHasUnsavedCategoryChanges(false);
    setSuccessMsg('');
    setErrorMsg('');
  }, [tenant]);

  useEffect(() => {
    if (!hasUnsavedCategoryChanges) {
      return;
    }

    if (categoryAutosaveTimer.current) {
      window.clearTimeout(categoryAutosaveTimer.current);
    }

    categoryAutosaveTimer.current = window.setTimeout(() => {
      if (!hasUnsavedCategoryChanges) return;
      onUpdateTenant({
        ...tenant,
        categories: customCategories
      });
      setHasUnsavedCategoryChanges(false);
      setSuccessMsg('Perubahan kategori berhasil disimpan otomatis.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 1500);

    return () => {
      if (categoryAutosaveTimer.current) {
        window.clearTimeout(categoryAutosaveTimer.current);
      }
    };
  }, [customCategories, hasUnsavedCategoryChanges, onUpdateTenant, tenant]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!storeName.trim()) {
      setErrorMsg('Nama Toko tidak boleh kosong!');
      return;
    }
    if (adminPin.length < 4) {
      setErrorMsg('PIN minimal harus 4 digit!');
      return;
    }
    if (customCategories.length === 0) {
      setErrorMsg('Kategori toko tidak boleh kosong! Daftarkan minimal satu kategori.');
      return;
    }

    // Validate Printer MAC Address format if provided
    const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
    if (printerAddress.trim() && !macRegex.test(printerAddress.trim())) {
      setErrorMsg('Format Device Address tidak valid! Gunakan format MAC Address (XX:XX:XX:XX:XX:XX).');
      return;
    }

    onUpdateTenant({
      ...tenant,
      name: storeName.trim(),
      adminPin: adminPin.trim(),
      categories: customCategories,
      address: address.trim(),
      phone: phone.trim(),
      receiptFooter: receiptFooter.trim(),
      receiptLogo: receiptLogo,
      printerAddress: printerAddress.trim(),
      printerAutoCut: printerAutoCut,
      qrisMerchantName: qrisMerchantName.trim(),
      qrisNmid: qrisNmid.trim(),
      qrisCustomImage: qrisCustomImage,
      taxEnabled: taxEnabled,
      taxPercentage: taxPercentage,
      taxMethod: taxMethod
    });

    setHasUnsavedCategoryChanges(false);
    setSuccessMsg('Kredensial keamanan, profil struk, printer Bluetooth, dan kategori ritel berhasil diperbarui!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const saveTenantSettings = () => {
    handleSave({ preventDefault: () => { } } as React.FormEvent);
  };

  const calculateSubscriptionEnd = (pkg: SubscriptionPackage) => {
    const now = new Date();
    if (pkg === 'monthly') {
      now.setMonth(now.getMonth() + 1);
      return now.toISOString();
    }
    if (pkg === 'yearly') {
      now.setFullYear(now.getFullYear() + 1);
      return now.toISOString();
    }
    return undefined;
  };

  const handleUpgradeSubscription = () => {
    const pkgName = selectedPackage === 'monthly' ? 'Bulanan' : selectedPackage === 'yearly' ? 'Tahunan' : 'Lifetime';
    const amount = formatRupiah(packageRates[selectedPackage]);
    const message = `Halo Admin Superadmin, saya ingin aktivasi paket *${pkgName}* (${amount}) untuk toko saya:\n\n*ID Toko:* ${tenant.id}\n*Nama Toko:* ${tenant.name}\n*Email Owner:* ${tenant.ownerEmail}\n\nMohon instruksi pembayarannya. Terima kasih.`;

    const encodedMessage = encodeURIComponent(message);
    const waNumber = import.meta.env.VITE_SUPERADMIN_WA || '6281358170243';
    const waUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
    setSuccessMsg(`Pilihan paket ${pkgName} telah dikonfirmasi. Anda dialihkan ke WhatsApp Admin untuk proses pembayaran & aktivasi.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const saveCategoryChanges = () => {
    if (!hasUnsavedCategoryChanges) return;
    onUpdateTenant({
      ...tenant,
      categories: customCategories
    });
    setHasUnsavedCategoryChanges(false);
    setSuccessMsg('Perubahan kategori berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) {
      setErrorMsg('Nama kategori tidak boleh kosong.');
      return;
    }

    if (customCategories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      setErrorMsg(`Kategori "${clean}" sudah terdaftar di toko ini!`);
      return;
    }

    setCustomCategories(prev => {
      setHasUnsavedCategoryChanges(true);
      return [...prev, clean];
    });
    setNewCategoryName('');
    setErrorMsg('');
    setSuccessMsg(`Kategori "${clean}" berhasil ditambahkan.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRemoveCategory = (nameToRemove: string) => {
    if (customCategories.length <= 1) {
      setErrorMsg('Setidaknya harus menyisakan 1 kategori aktif untuk toko Anda!');
      return;
    }
    setCustomCategories(prev => {
      setHasUnsavedCategoryChanges(true);
      return prev.filter(c => c !== nameToRemove);
    });
    setErrorMsg('');
    setSuccessMsg(`Kategori "${nameToRemove}" berhasil dihapus.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const loadTemplate = (key: keyof typeof CATEGORY_TEMPLATES) => {
    const template = CATEGORY_TEMPLATES[key];
    setCustomCategories(prev => {
      setHasUnsavedCategoryChanges(true);
      return [...template.items];
    });
    setErrorMsg('');
    setSuccessMsg(`Berhasil memuat template kategori: ${template.name}`);
    setTimeout(() => setSuccessMsg(''), 3050);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 overflow-y-auto text-slate-800 animate-fade-in" id="tenant-settings-tab">

      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm mb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-700 flex items-center justify-center">
            <Store className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 leading-tight">Manajemen & Maintenance Toko</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">Atur keamanan, credentials, dan kelompok kategori masing-masing toko secara mandiri</p>
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onLockScreen}
            className="w-full sm:w-auto justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            id="btn-lock-screen-action"
          >
            <Lock className="w-3.5 h-3.5" /> Kunci Layar (Lock)
          </button>

          <button
            onClick={onTakeOverCashierShift}
            className="w-full sm:w-auto justify-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            id="btn-shift-cashier"
            title="Lemparkan tablet ini dalam keadaan Terlock dengan membebaskan shift hanya dalam wewenang Kasir"
          >
            🔋 Serahkan Kasir Shift
          </button>

          <button
            onClick={onLogoutTenant}
            className="w-full sm:w-auto justify-center px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            id="btn-logout-tenant-portal"
          >
            <LogOut className="w-3.5 h-3.5" /> Ganti Toko
          </button>
        </div>
      </div>

      {/* Subscription Panel */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl flex items-center justify-center ${tenant.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Star className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 leading-tight">Status Paket Langganan</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">
              {tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt && `Masa Uji Coba Berakhir: ${new Date(tenant.trialEndsAt).toLocaleDateString('id-ID')} (Sisa ${Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} Hari)`}
              {tenant.subscriptionStatus === 'active' && (
                tenant.subscriptionPackage === 'lifetime'
                  ? 'Status: Pro Premium (Aktif Selamanya)'
                  : `Status: Pro Premium (Berakhir: ${tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toLocaleDateString('id-ID') : 'Tidak Terbatas'})`
              )}
              {tenant.subscriptionStatus === 'expired' && 'Status: Masalalu (Kadaluarsa - Segera Perpanjang)'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Paket saat ini: <strong className="text-slate-800 capitalize">{tenant.subscriptionPackage || 'monthly'}</strong>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Tarif Paket: <strong>{formatRupiah(packageRates[tenant.subscriptionPackage || 'monthly'])}</strong>
              {tenant.subscriptionStatus === 'trial' && tenant.subscriptionPackage && (
                <> • Setelah trial akan dikenakan {formatRupiah(packageRates[tenant.subscriptionPackage])} / {tenant.subscriptionPackage === 'monthly' ? 'bulan' : tenant.subscriptionPackage === 'yearly' ? 'tahun' : 'sekali bayar'}</>
              )}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">🏷️ Rencana Paket Pilihan</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['monthly', 'yearly', 'lifetime'] as SubscriptionPackage[]).map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setSelectedPackage(pkg)}
                  className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all relative overflow-hidden group ${selectedPackage === pkg
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30'
                    }`}
                >
                  {selectedPackage === pkg && (
                    <div className="absolute top-0 right-0 p-1.5 bg-indigo-500 rounded-bl-xl">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className={`text-[10px] font-black uppercase tracking-wider mb-1 ${selectedPackage === pkg ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {pkg === 'monthly' ? 'Bulanan' : pkg === 'yearly' ? 'Tahunan' : 'Lifetime'}
                  </span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-black">{formatRupiah(packageRates[pkg])}</span>
                  </div>

                  {pkg === 'yearly' && (
                    <div className={`mt-2 text-[8px] font-bold px-2 py-0.5 rounded-full ${selectedPackage === pkg ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                      HEMAT 15%
                    </div>
                  )}
                  {pkg === 'lifetime' && (
                    <div className={`mt-2 text-[8px] font-bold px-2 py-0.5 rounded-full ${selectedPackage === pkg ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                      SEKALI BAYAR
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleUpgradeSubscription}
            className="w-full justify-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-2 group"
          >
            <MessageCircle className="w-4 h-4 text-emerald-100 group-hover:translate-x-1 transition-transform" /> Konfirmasi & Bayar via WA
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-250 font-bold text-xs flex items-center gap-1.5 shadow-sm border-dashed mb-4">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-250 font-bold text-xs mb-4">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT COLUMN: SECURITY AND CREDENTIALS SETTINGS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-180 shadow-sm lg:col-span-6 space-y-5">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <span className="font-extrabold text-sm text-slate-800">Kredensial & Autentikasi Keamanan</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Store Code (Readonly) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">KODE TOKO SAAS (ID - Tidak bisa diubah)</label>
              <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 font-mono font-black text-xs text-slate-600 select-all cursor-pointer inline-block self-start">
                {tenant.id}
              </div>
              <p className="text-[9.5px]/relaxed text-slate-400 font-medium">
                Gunakan Kode Toko di atas dan PIN Kasir untuk masuk di tablet atau perangkat kasir tambahan.
              </p>
            </div>

            {/* Store Name */}
            <div className="flex flex-col gap-1 col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Toko Ritel <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="misal: Toko Roti Sejahtera"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-505 text-sm font-semibold text-slate-705"
                id="edit-store-name"
              />
            </div>

            {/* Grid for PINs */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 overflow-hidden">
                <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-500" /> PIN OWNER (ADMIN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN 4-6 digit"
                  className="w-full px-4 py-2.5 rounded-xl border border-amber-205 focus:border-amber-400 outline-none focus:ring-2 focus:ring-amber-500/20 font-mono font-black text-xs text-center text-amber-800"
                  id="edit-admin-pin"
                />
              </div>

              {/* Manajemen Kasir Section */}
              <div className="border border-sky-200 rounded-xl p-3 bg-sky-50/30">
                <label className="text-[10px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Key className="w-3.5 h-3.5 text-sky-500" /> Manajemen Kasir
                </label>

                <div className="space-y-2 mb-3">
                  {tenant.cashiers?.map((c) => (
                    <div key={c.uid} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-sky-100">
                      <span>{c.name} (PIN: {c.pin})</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => {
                          const newPin = prompt("Masukkan PIN baru untuk " + c.name, c.pin);
                          if (newPin && newPin.length >= 4) {
                            const newCashiers = (tenant.cashiers || []).map(csh => csh.uid === c.uid ? { ...csh, pin: newPin } : csh);
                            onUpdateTenant({ ...tenant, cashiers: newCashiers });
                          }
                        }} className="text-amber-500 font-bold">Reset PIN</button>
                        <button type="button" onClick={() => {
                          const newCashiers = (tenant.cashiers || []).filter(csh => csh.uid !== c.uid);
                          onUpdateTenant({ ...tenant, cashiers: newCashiers });
                        }} className="text-rose-500 font-bold">Hapus</button>
                      </div>
                    </div>
                  ))}
                  {(!tenant.cashiers || tenant.cashiers.length === 0) && (
                    <p className="text-[10px] text-sky-400 italic text-center py-1">Belum ada kasir terdaftar.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nama Kasir"
                    className="text-xs p-2 rounded border border-sky-200 w-full"
                    value={newCashierName}
                    onChange={(e) => setNewCashierName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="PIN (4 digit)"
                    maxLength={6}
                    className="text-xs p-2 rounded border border-sky-200 w-20 font-mono"
                    value={newCashierPin}
                    onChange={(e) => setNewCashierPin(e.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCashierName.trim()) {
                        setErrorMsg('Nama kasir tidak boleh kosong!');
                        return;
                      }
                      if (newCashierPin.length < 4) {
                        setErrorMsg('PIN kasir minimal 4 digit!');
                        return;
                      }
                      const isDuplicate = (tenant.cashiers || []).some(c => c.pin === newCashierPin);
                      if (isDuplicate) {
                        setErrorMsg('PIN sudah digunakan kasir lain. Gunakan PIN berbeda.');
                        return;
                      }
                      const newCashier: Cashier = {
                        uid: Date.now().toString(),
                        name: newCashierName.trim(),
                        pin: newCashierPin,
                        tenantId: tenant.id
                      };
                      onUpdateTenant({ ...tenant, cashiers: [...(tenant.cashiers || []), newCashier] });
                      setNewCashierName('');
                      setNewCashierPin('');
                      setErrorMsg('');
                      setSuccessMsg(`Kasir "${newCashier.name}" berhasil ditambahkan!`);
                      setTimeout(() => setSuccessMsg(''), 3000);
                    }}
                    className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded font-bold transition-colors cursor-pointer shrink-0"
                  >
                    + Tambah
                  </button>
                </div>
              </div>
            </div>

            {/* Profil Struk Dinamis */}
            <div className="pt-3.5 border-t border-slate-100 flex flex-col gap-3">
              <h4 className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                📝 Konfigurasi Cetak Struk Belanja
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Alamat */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Alamat Toko (Header Struk)</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Contoh: Jl. Diponegoro No. 123, Surabaya"
                    className="w-full px-3 py-2 rounded-xl border border-slate-205 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[11px] font-semibold text-slate-700 resize-none"
                    id="edit-store-address"
                  />
                </div>

                {/* Telepon */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Nomor Telepon Toko</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-205 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[11px] font-semibold text-slate-700"
                    id="edit-store-phone"
                  />
                  <span className="text-[8.5px] text-slate-400 font-semibold leading-normal mt-1 block">Muncul di baris cetakan detail info struk</span>
                </div>
              </div>

              {/* Catatan Kaki (Dynamic Footer) */}
              <div className="flex flex-col gap-1">
                <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Catatan Kaki Struk (Footer)</label>
                <textarea
                  rows={2}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Contoh: Terima kasih atas kunjungan Anda! • Barang yang sudah dibeli tidak dapat ditukarkan kembali."
                  className="w-full px-3 py-2 rounded-xl border border-slate-205 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[11px] font-semibold text-slate-700 resize-none"
                  id="edit-store-footer"
                />
                <span className="text-[8.5px] text-slate-400 font-semibold leading-relaxed">Dapat ditulis beberapa baris, dicetak di bagian paling bawah struk kertas kasir</span>
              </div>

              {/* Logo Struk Belanja */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mt-2">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                  {receiptLogo ? (
                    <img src={receiptLogo} alt="Logo Struk" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-[9px] text-slate-400 font-bold text-center leading-tight p-1 select-none">Belum Ada Logo</div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">Unggah Logo Toko untuk Struk</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptLogoChange}
                    className="text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10.5px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <span className="text-[8.5px] text-slate-400 leading-normal block">Pilih file gambar logo toko Anda yang akan dicetak di bagian atas struk. Disarankan berukuran lebar maksimal 384px dan berupa gambar hitam putih kembang/monochrome. Maks 1MB.</span>
                </div>
                {receiptLogo && (
                  <button
                    type="button"
                    onClick={() => setReceiptLogo('')}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-[9px] uppercase rounded-lg cursor-pointer transition-all shrink-0"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>

              {/* Konfigurasi Printer Bluetooth Kasir */}
              <div className="pt-3.5 border-t border-slate-105 flex flex-col gap-3" id="bluetooth-printer-section">
                <h4 className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5" id="bluetooth-printer-header">
                  <Printer className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Pengaturan Printer Bluetooth Kasir
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                  {/* Bluetooth Device Address */}
                  <div className="flex flex-col gap-1" id="field-printer-address">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">Device Address (MAC/ID Printer)</label>
                    <input
                      type="text"
                      value={printerAddress}
                      onChange={(e) => setPrinterAddress(e.target.value)}
                      placeholder="Contoh: 00:11:22:33:FF:EE atau Thermal-58"
                      className="w-full px-3 py-2 rounded-xl border border-slate-205 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[11px] font-semibold text-slate-700"
                      id="edit-printer-address"
                    />
                    <span className="text-[8.5px] text-slate-400 font-semibold leading-normal">MAC Address printer thermal bluetooth yang terhubung</span>
                  </div>

                  {/* Auto-cut paper toggle */}
                  <div className="flex flex-col gap-1.5" id="field-printer-autocut">
                    <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Potong Kertas Otomatis (Auto-Cut)</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none self-start" id="toggle-autocut-paper">
                      <input
                        type="checkbox"
                        checked={printerAutoCut}
                        onChange={(e) => setPrinterAutoCut(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2.5 text-xs font-bold text-slate-705">
                        {printerAutoCut ? '✅ Aktif (Cut Otomatis)' : '❌ Nonaktif (Sobek Manual)'}
                      </span>
                    </label>
                    <span className="text-[8.5px] text-slate-400 font-semibold leading-normal block flex items-center gap-1">
                      <Info className="w-3 h-3 text-indigo-400" />
                      Fitur ini hanya berfungsi jika printer thermal Anda mendukung hardware command ESC/POS (GS V 0).
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestPrinterConnection}
                  disabled={isTestingConnection}
                  className={`w-full sm:w-auto px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${isTestingConnection
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                >
                  {isTestingConnection ? 'Menghubungkan...' : 'Test Connection'}
                </button>
              </div>

              {/* Konfigurasi QRIS Statis */}
              <div className="pt-3.5 border-t border-slate-105 flex flex-col gap-3" id="qris-settings-section">
                <h4 className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5" id="qris-settings-header">
                  📱 Integrasi QRIS Pembayaran Statis
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">Nama Merchant QRIS (Pada Banner)</label>
                    <input
                      type="text"
                      value={qrisMerchantName}
                      onChange={(e) => setQrisMerchantName(e.target.value)}
                      placeholder="Contoh: TOKO BERKAH JAYA"
                      className="w-full px-3 py-2 rounded-xl border border-slate-205 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[11px] font-semibold text-slate-700"
                    />
                    <span className="text-[8.5px] text-slate-400 font-semibold leading-normal">Nama toko Anda yang akan muncul sewaktu di-scan pelanggan</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">NMID Merchant (Opsional)</label>
                    <input
                      type="text"
                      value={qrisNmid}
                      onChange={(e) => setQrisNmid(e.target.value)}
                      placeholder="Contoh: ID1020210344558"
                      className="w-full px-3 py-2 rounded-xl border border-slate-205 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[11px] font-semibold text-slate-700"
                    />
                    <span className="text-[8.5px] text-slate-400 font-semibold leading-normal">Nomor identitas unik merchant QRIS dari Penyelenggara Jasa</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                    {qrisCustomImage ? (
                      <img src={qrisCustomImage} alt="QRIS Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-[9px] text-slate-400 font-bold text-center leading-tight p-1 select-none">Belum Ada QR Gambar</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">Unggah Gambar QRIS Statis Ritel Anda</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrisImageChange}
                      className="text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10.5px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <span className="text-[8.5px] text-slate-400 leading-normal block">Pilih file gambar/screenshot barcode QRIS resmi dari bank atau e-wallet (GOPAY, OVO, ShopeePay, DANA, BCA, Mandiri, dll). Maksimal ukuran file 2MB.</span>
                  </div>
                  {qrisCustomImage && (
                    <button
                      type="button"
                      onClick={() => setQrisCustomImage('')}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-[9px] uppercase rounded-lg cursor-pointer transition-all shrink-0"
                    >
                      Hapus Gambar
                    </button>
                  )}
                </div>
              </div>

              {/* --- PENGATURAN PAJAK DINAMIS --- */}
              <div className="pt-3.5 border-t border-slate-100 flex flex-col gap-3" id="tax-settings-section">
                <h4 className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" /> Konfigurasi Pajak (PPN/Tax)
                </h4>

                <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-800">Aktifkan Pajak Otomatis</span>
                      <p className="text-[9px] text-slate-500 font-bold">Tambahkan biaya pajak pada setiap transaksi checkout</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {taxEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-fade-in">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Persentase Pajak (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={taxPercentage}
                            onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                            className="w-full pl-3 pr-8 py-2.5 rounded-2xl border border-slate-205 focus:ring-2 focus:ring-indigo-500/20 text-sm font-black text-slate-800 outline-none"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metode Perhitungan</label>
                        <div className="flex bg-white rounded-2xl border border-slate-200 p-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => setTaxMethod('exclude')}
                            className={`flex-1 py-2 text-[9.5px] font-black rounded-xl transition-all ${taxMethod === 'exclude' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
                              }`}
                          >
                            DILUAR HARGA
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaxMethod('include')}
                            className={`flex-1 py-2 text-[9.5px] font-black rounded-xl transition-all ${taxMethod === 'include' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
                              }`}
                          >
                            TERMASUK HARGA
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {taxEnabled && (
                    <div className="text-[9.5px] bg-white/80 p-3 rounded-2xl border border-indigo-100 flex gap-2.5 items-start text-indigo-700 leading-relaxed font-bold">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                      <div>
                        {taxMethod === 'exclude'
                          ? `Harga barang akan ditambahkan ${taxPercentage}% saat checkout (Pajak Pertambahan Nilai).`
                          : `Harga barang sudah termasuk pajak ${taxPercentage}% (Zakat/Pajak yang sudah dihitung di dalam harga).`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 italic">Tekan Simpan untuk menerapkan segala perubahan</p>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                id="save-tenant-settings"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Simpan Struktur Ritel
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: CATEGORY MAINTENANCE LIST & PRESETS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-180 shadow-sm lg:col-span-6 space-y-5">
          <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-emerald-600" />
              <span className="font-extrabold text-sm text-slate-800">Maintenance Kategori Toko</span>
            </div>
            <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
              {customCategories.length} Aktif
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
            Toko Makanan dan Kelontong Sembako tentu memiliki kategorisasi yang berbeda. Atur kustomisasi kategori barang Anda di sini agar tidak tercampur:
          </p>

          {/* Quick loading category preset templates */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
            <h5 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> INSTANT PRESET TEMPLATES
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(CATEGORY_TEMPLATES).map(([key, tpl]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => loadTemplate(key as keyof typeof CATEGORY_TEMPLATES)}
                  className="p-2 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 text-[10px] font-bold rounded-xl transition-all shadow-sm text-left flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="text-sm select-none shrink-0">{tpl.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 truncate leading-none mb-0.5">{tpl.name}</p>
                    <p className="text-[8px] text-slate-400 font-mono truncate">{tpl.items.join(', ')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Adding form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Tambahkan Kategori Baru..."
              value={newCategoryName}
              onChange={(e) => {
                setErrorMsg('');
                setNewCategoryName(e.target.value);
              }}
              className="flex-1 w-full px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-505 bg-slate-50 placeholder-slate-400"
              maxLength={20}
            />
            <button
              type="submit"
              className="shrink-0 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 px-3 sm:px-4 rounded-xl transition-all font-black text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 shrink-0" /> Pasang
            </button>
          </form>

          {/* Current Category lists */}
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {customCategories.map((cat, idx) => (
              <div
                key={`${cat}-${idx}`}
                className="flex items-center justify-between p-2 px-3.5 bg-slate-50/60 hover:bg-slate-100/60 rounded-xl border border-slate-200/50 hover:border-slate-350 transition-colors gap-2 group"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
                  <span className="text-xs font-bold text-slate-700">{cat}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Hapus kategori barang ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {hasUnsavedCategoryChanges && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-800">
              Perubahan kategori belum disimpan. Klik tombol bawah untuk menyimpan semua perubahan pengaturan toko.
            </div>
          )}

          <button
            type="button"
            onClick={saveCategoryChanges}
            disabled={!hasUnsavedCategoryChanges}
            className={`w-full py-3 mt-3 text-xs font-black uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${hasUnsavedCategoryChanges ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> {hasUnsavedCategoryChanges ? 'Simpan Perubahan Kategori' : 'Kategori Sudah Tersimpan'}
          </button>

        </div>
      </div>
    </div>
  );
}
