import React, { useState } from 'react';
import { Tenant, SubscriptionPackage, SubscriptionRates } from '../types';
import { Store, Plus, LogIn, LogOut, ChevronRight, Shield, Sparkles, KeyRound, WifiOff, LayoutGrid, CheckCircle } from 'lucide-react';
import { generateId, formatRupiah } from '../utils';

interface TenantPortalProps {
  tenants: Tenant[];
  onSelectTenant: (tenantId: string, pin: string) => Promise<void>;
  onAddTenant: (name: string, adminPin: string, cashierName: string, cashierPin: string, subscriptionPackage: SubscriptionPackage) => void;
  currentUserEmail: string | null;
  onLoginViaGoogle: () => void;
  onGoToSuperadmin?: () => void;
  isOnline: boolean;
  packageRates: SubscriptionRates;
  isSuperadmin: boolean;
  onLogoutCloud?: () => void;
}

export default function TenantPortal({
  tenants,
  onSelectTenant,
  onAddTenant,
  currentUserEmail,
  onLoginViaGoogle,
  onGoToSuperadmin,
  isOnline,
  packageRates,
  isSuperadmin,
  onLogoutCloud
}: TenantPortalProps) {
  
  const [activeTab, setActiveTab] = useState<'owned' | 'create' | 'join'>('owned');
  const [storeName, setStoreName] = useState('');
  const [adminPin, setAdminPin] = useState('1234');
  const [cashierName, setCashierName] = useState('Kasir 1');
  const [cashierPin, setCashierPin] = useState('0000');
  const [subscriptionPackage, setSubscriptionPackage] = useState<SubscriptionPackage>('trial');
  
  // Join Tab fields
  const [joinStoreCode, setJoinStoreCode] = useState('');
  const [joinPin, setJoinPin] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Quick pin states
  const [selectedQuickStore, setSelectedQuickStore] = useState<Tenant | null>(null);
  const [quickPin, setQuickPin] = useState('');
  const [quickError, setQuickError] = useState('');

  // Auto detect user stores
  const myStores = tenants.filter(t => 
    currentUserEmail && t.ownerEmail.toLowerCase() === currentUserEmail.toLowerCase()
  );

  const handleQuickPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedQuickStore) return;

    onSelectTenant(selectedQuickStore.id, quickPin).then(() => {
      setSelectedQuickStore(null);
      setQuickPin('');
      setQuickError('');
    }).catch(err => {
      setQuickError(err.message || '📌 PIN yang Anda masukkan SALAH!');
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setErrorMsg('Nama toko tidak boleh kosong!');
      return;
    }
    if (adminPin.length < 4 || cashierPin.length < 4) {
      setErrorMsg('PIN minimal harus 4 digit!');
      return;
    }

    onAddTenant(storeName.trim(), adminPin, cashierName.trim(), cashierPin, subscriptionPackage);
    setStoreName('');
    setSubscriptionPackage('monthly');
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!joinStoreCode.trim() || !joinPin) {
      setErrorMsg('Kode Toko dan PIN wajib diisi!');
      return;
    }

    const tCode = joinStoreCode.trim().toUpperCase();
    const target = tenants.find(t => t.id.toUpperCase() === tCode);

    if (target) {
    onSelectTenant(tCode, joinPin).then(() => {
      setJoinStoreCode('');
      setJoinPin('');
    }).catch(err => {
      setErrorMsg(err.message || 'PIN atau Kode Toko salah!');
    });
    } else {
      setErrorMsg('Toko tidak ditemukan! Periksa kembali Kode Toko.');
    }
  };

  const isSuperadminUser = currentUserEmail === 'susiono.ahmad@gmail.com' || currentUserEmail === 'susiono.ahmad' || (currentUserEmail && currentUserEmail.includes('susiono.ahmad'));

  return (
    <div className="flex flex-col items-center justify-center p-6 h-full w-full bg-slate-900 text-slate-100 font-sans" id="tenant-gateway-portal">
      {/* Decors */}
      <div className="absolute top-24 left-1/4 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-24 right-1/4 w-44 h-44 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-[36px] overflow-hidden p-6 sm:p-7 shadow-2xl relative flex flex-col justify-between" id="portal-frame-box">
        
        {/* Portal Header */}
        <div className="text-center mb-5 relative z-10">
          <div className="w-12 h-12 bg-indigo-650 rounded-2xl mx-auto flex items-center justify-center text-white shadow shadow-indigo-255/10 mb-2 font-black leading-none text-xl">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">Pintu Gerbang Ritel SaaS</h2>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
            Kasir Pintar Multi-Tenant POS System
          </p>

          {/* Superadmin Notification alert banner */}
          {isSuperadminUser && onGoToSuperadmin && (
            <div className="mt-3 p-2 px-3.5 bg-indigo-950/80 border border-indigo-900/60 rounded-2xl flex items-center justify-between text-left text-xs animate-pulse">
              <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
                <Shield className="w-4 h-4 text-indigo-400" /> Deteksi: Superadmin SaaS
              </span>
              <button
                onClick={onGoToSuperadmin}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] px-3 py-1 rounded-xl transition-all uppercase tracking-wide cursor-pointer active:scale-95 shadow shadow-indigo-255/10"
              >
                Masuk SaaS Panel
              </button>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        {!isSuperadmin && (
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shrink-0 mb-4.5 gap-1.5" id="portal-tabs">
            <button
              onClick={() => { setActiveTab('owned'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-center rounded-xl text-[11px] font-black tracking-wide transition-all cursor-pointer select-none ${
                activeTab === 'owned'
                  ? 'bg-slate-805 text-white border border-slate-705 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toko Saya ({currentUserEmail ? myStores.length : 'Lokal'})
            </button>
            <button
              onClick={() => { setActiveTab('join'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-center rounded-xl text-[11px] font-black tracking-wide transition-all cursor-pointer select-none ${
                activeTab === 'join'
                  ? 'bg-slate-805 text-white border border-slate-705 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Masuk Kode & PIN
            </button>
            <button
              onClick={() => { setActiveTab('create'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-center rounded-xl text-[11px] font-black tracking-wide transition-all cursor-pointer select-none ${
                activeTab === 'create'
                  ? 'bg-slate-805 text-white border border-slate-705 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              + Toko Baru
            </button>
          </div>
        )}

        {/* Dynamic portal area */}
        <div className="flex-1 min-h-[180px] mb-4 overflow-y-auto" id="portal-body-pane">
          {errorMsg && (
            <div className="bg-rose-950/20 text-rose-400 p-2 px-3 rounded-2xl border border-rose-900/30 text-[11px] font-bold font-mono tracking-tight text-center mb-3">
              ⚠️ {errorMsg}
            </div>
          )}

          {activeTab === 'owned' && (
            <div className="space-y-2">
              {!currentUserEmail ? (
                // Local Mode Prompt
                <div className="p-4 bg-slate-900/60 rounded-2xl text-center border border-slate-815 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-810 mx-auto flex items-center justify-center text-slate-400">
                    <WifiOff className="w-5 h-5 text-indigo-400 animate-bounce" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Akses Lokal (Offline Sandbox)</h4>
                  <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto">
                    Anda sedang beroperasi dalam mode penyimpanan lokal. Data aman disimpan di browser tablet ini.
                  </p>
                  
                  {/* Join/Create action in local */}
                  <div className="flex gap-2 justify-center pt-1.5">
                    <button
                      onClick={onLoginViaGoogle}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white text-[10.5px] font-black rounded-xl transition-all shadow cursor-pointer active:scale-95"
                    >
                      Hubungkan Google Cloud Sync
                    </button>
                  </div>
                </div>
              ) : myStores.length === 0 ? (
                <div className="p-4 bg-slate-900/40 rounded-2xl text-center border border-slate-815 py-8">
                  <span className="text-2xl">🌱</span>
                  <h4 className="text-xs font-bold text-white mt-1.5">Belum Ada Toko Terdaftar</h4>
                  <p className="text-[10.5px] text-slate-400 mt-1 leading-normal max-w-xs mx-auto">
                    Akun cloud Anda belum mengklaim kepemilikan Toko ritel apa pun. Klik tab "+ Toko Baru" untuk mendirikannya.
                  </p>
                </div>
              ) : selectedQuickStore ? (
                // Secure PIN gate overlay for selecting a quick store
                <form onSubmit={handleQuickPinSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
                  <div className="text-center relative">
                    <span className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-900/40 mb-1.5 shadow-sm">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <h4 className="font-extrabold text-white text-xs tracking-wide leading-none">{selectedQuickStore.name}</h4>
                    <span className="text-[8.5px] font-mono text-indigo-400 font-bold tracking-wider mt-1 block">ID: {selectedQuickStore.id}</span>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">Keamanan Multi-Role aktif. Silakan masukkan PIN Toko Anda:</p>
                  </div>

                  {quickError && (
                    <div className="bg-rose-950/20 text-rose-400 p-2 rounded-xl border border-rose-900/30 text-[10px] font-bold text-center">
                      ⚠️ {quickError}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <input
                      type="password"
                      required
                      maxLength={6}
                      placeholder="• • • •"
                      value={quickPin}
                      onChange={(e) => {
                        setQuickError('');
                        setQuickPin(e.target.value.replace(/\D/g, ''));
                      }}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 text-center font-mono font-black text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505 text-indigo-305 tracking-widest placeholder-slate-700"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuickStore(null);
                        setQuickPin('');
                        setQuickError('');
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-[10px] font-black tracking-wider rounded-xl transition-all uppercase cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-505 text-white text-[10px] font-black tracking-wider rounded-xl transition-all uppercase shadow cursor-pointer active:scale-95"
                    >
                      Masuk Toko
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {myStores.map(t => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedQuickStore(t);
                        setQuickPin('');
                        setQuickError('');
                      }}
                      className="flex items-center justify-between p-3.5 bg-slate-900/50 hover:bg-slate-850/60 rounded-2xl border border-slate-850 hover:border-indigo-900/60 cursor-pointer transition-all gap-3 overflow-hidden group"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="font-extrabold text-white text-xs leading-none truncate group-hover:text-indigo-300 transition-colors">{t.name}</h4>
                        <div className="flex gap-1.5 items-center mt-1">
                          <span className="text-[9px] font-mono text-slate-500 font-bold block">KODE TOKO: {t.id}</span>
                          {t.subscriptionStatus === 'trial' && t.trialEndsAt && (
                            <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold uppercase leading-none border border-amber-500/30">
                              Trial
                            </span>
                          )}
                          {t.subscriptionStatus === 'active' && (
                            <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded font-bold uppercase leading-none border border-emerald-500/30">
                              Pro
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'join' && (
            <form onSubmit={handleJoin} className="space-y-3 p-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">KODE TOKO SAAS (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TOKO-ABC (Dapatkan dari Owner)"
                  value={joinStoreCode}
                  onChange={(e) => setJoinStoreCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-820 font-bold text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-550 text-indigo-305 tracking-wide placeholder-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1 relative">
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-indigo-405" /> MASUKKAN PIN KEAMANAN TOKO
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="PIN Owner / PIN Kasir"
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-820 text-center font-mono font-bold text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-550 text-indigo-305 tracking-widest placeholder-slate-650"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-black tracking-wide text-white transition-all shadow shadow-indigo-255/15 mt-3 cursor-pointer select-none active:scale-[0.98]"
              >
                Masuk ke Toko
              </button>
            </form>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-3.5 p-1">
              {!currentUserEmail && (
                <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/5 border border-amber-500/20 rounded-2xl p-3.5 flex flex-col gap-2.5 mb-2 text-left shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="text-amber-400 text-sm mt-0.5 animate-bounce">💡</span>
                    <div className="space-y-1">
                      <h5 className="text-[11px] font-black text-amber-300 uppercase tracking-widest leading-none flex items-center gap-1">
                        Saran: Hubungkan Google First
                      </h5>
                      <p className="text-[10px] text-slate-350 leading-relaxed">
                        Membuat toko saat terhubung Google memastikan Anda adalah <strong>Pemilik Resmi (Owner)</strong>. Toko akan otomatis tersimpan permanen di Cloud-SaaS, terproteksi dari reset cache browser, dan siap diakses dari perangkat lain!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onLoginViaGoogle}
                    className="w-full py-1.5 bg-amber-550 hover:bg-amber-500 text-slate-950 text-[10px] font-extrabold tracking-wider rounded-xl transition-all uppercase flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5 stroke-[2.5]" /> Hubungkan Akun Google Sekarang
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">NAMA TOKO / WARUNG BARU</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Warung Barokah Susi"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-820 font-semibold text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505 placeholder-slate-600 animate-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">PIN ADMINISTRATOR (OWNER)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="1234"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-820 text-center font-mono font-black text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505 text-indigo-305"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">NAMA KASIR PERTAMA</label>
                  <input
                    type="text"
                    required
                    placeholder="Kasir 1"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-820 text-center font-black text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">PIN SECURITY SHIFT (KASIR)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="0000"
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-820 text-center font-mono font-black text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505 text-indigo-303"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">📦 Pilih Tingkat Paket (Sesuai Kebutuhan Anda)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['trial', 'monthly', 'yearly', 'lifetime'] as SubscriptionPackage[]).map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setSubscriptionPackage(pkg)}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all relative overflow-hidden h-16 ${
                        subscriptionPackage === pkg
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      {subscriptionPackage === pkg && (
                        <div className="absolute top-0 right-0 p-0.5 bg-indigo-500 rounded-bl-md">
                          <CheckCircle className="w-2 h-2 text-white" />
                        </div>
                      )}
                      
                      <span className={`text-[8px] font-black uppercase tracking-wider mb-0.5 ${subscriptionPackage === pkg ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {pkg === 'trial' ? 'Demo' : pkg === 'monthly' ? 'Bulan' : pkg === 'yearly' ? 'Tahun' : 'Life'}
                      </span>
                      
                      <span className="text-[9px] font-black">{pkg === 'trial' ? 'FREE' : formatRupiah(packageRates[pkg])}</span>
                      
                      {pkg === 'trial' && (
                        <span className={`mt-0.5 text-[6px] font-bold px-1 py-0.2 rounded-full ${subscriptionPackage === pkg ? 'bg-white/20 text-white' : 'bg-indigo-900/40 text-indigo-400'}`}>
                          7 HARI
                        </span>
                      )}
                      {pkg === 'yearly' && (
                        <span className={`mt-0.5 text-[6px] font-bold px-1 py-0.2 rounded-full ${subscriptionPackage === pkg ? 'bg-white/20 text-white' : 'bg-amber-900/40 text-amber-500'}`}>
                          -15%
                        </span>
                      )}
                      {pkg === 'lifetime' && (
                        <span className={`mt-0.5 text-[6px] font-bold px-1 py-0.2 rounded-full ${subscriptionPackage === pkg ? 'bg-white/20 text-white' : 'bg-emerald-900/40 text-emerald-500'}`}>
                           PRO
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {subscriptionPackage !== 'trial' ? (
                  <p className="text-[9px] text-slate-500 italic mt-0.5">* Paket akan otomatis aktif setelah masa uji coba (Trial) 7 hari berakhir.</p>
                ) : (
                  <p className="text-[9px] text-indigo-400/80 font-bold italic mt-0.5">✨ Cobalah seluruh fitur secara gratis selama 7 hari tanpa komitmen.</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-black tracking-wide text-white transition-all shadow shadow-indigo-255/15 mt-2 cursor-pointer select-none active:scale-[0.98]"
              >
                BANGUN TOKO & GENERATE DATABASE
              </button>
            </form>
          )}
        </div>

        {/* Local Storage Sandbox fallback hint */}
        {!currentUserEmail && activeTab !== 'owned' && (
          <div className="text-[10px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 p-2 text-center rounded-2xl shrink-0 leading-normal mb-1 flex items-center justify-center gap-1.5">
            ✏️ Anda dalam mode lokal. Toko baru akan disimpan di browser ini.
          </div>
        )}

        {/* Footer info & Logout Cloud */}
        {currentUserEmail && (
          <div className="mt-4 pt-4 border-t border-slate-900/50 flex items-center justify-between gap-1.5 px-1 shrink-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none">Cloud Identity</span>
              <span className="text-[10px] text-indigo-300 font-bold leading-none truncate">{currentUserEmail}</span>
            </div>
            <button
               onClick={onLogoutCloud}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 hover:bg-rose-955/20 text-slate-400 hover:text-rose-400 text-[9px] font-black uppercase tracking-wider rounded-xl border border-slate-800 hover:border-rose-900/40 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
               <LogOut className="w-3 h-3" /> Logout Cloud
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
