import React, { useState, useEffect } from 'react';
import { Tenant, SubscriptionPackage, SubscriptionRates } from '../types';
import { Shield, Users, Store, Coins, Sparkles, BookOpen, Key, Trash2, ArrowRightLeft, Database } from 'lucide-react';
import { formatRupiah } from '../utils';

interface SaaSAdminPanelProps {
  tenants: Tenant[];
  currentUserEmail: string | null;
  onEnterTenant: (tenantId: string, pin: string) => Promise<void>;
  onAddTenant: (name: string, adminPin: string, cashierName: string, cashierPin: string, subscriptionPackage: SubscriptionPackage) => void;
  onUpdateTenant: (updatedTenant: Tenant) => void;
  onDeleteTenant: (tenantId: string) => void;
  packageRates: SubscriptionRates;
  onUpdatePackageRates: (rates: SubscriptionRates) => void;
}

export default function SaaSAdminPanel({ 
  tenants, 
  currentUserEmail, 
  onEnterTenant, 
  onAddTenant, 
  onUpdateTenant,
  onDeleteTenant,
  packageRates,
  onUpdatePackageRates
}: SaaSAdminPanelProps) {
  
  const [newStoreName, setNewStoreName] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('1234');
  const [newCashierName, setNewCashierName] = useState('Kasir 1');
  const [newCashierPin, setNewCashierPin] = useState('0000');
  const [newSubscriptionPackage, setNewSubscriptionPackage] = useState<SubscriptionPackage>('monthly');
  const [packageConfig, setPackageConfig] = useState<SubscriptionRates>(packageRates);
  const [errorText, setErrorText] = useState('');

  const handleCreateTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      setErrorText('Nama toko wajib diisi!');
      return;
    }
    if (newAdminPin.length < 4 || newCashierPin.length < 4) {
      setErrorText('PIN wajib minimal 4 digit!');
      return;
    }

    onAddTenant(newStoreName.trim(), newAdminPin, newCashierName.trim(), newCashierPin, newSubscriptionPackage);
    setNewStoreName('');
    setNewSubscriptionPackage('monthly');
    setErrorText('');
    alert('Toko baru berhasil ditambahkan ke jaringan SaaS!');
  };

  useEffect(() => {
    setPackageConfig(packageRates);
  }, [packageRates]);

  const handleSavePackageRates = () => {
    onUpdatePackageRates(packageConfig);
    alert('Tarif paket berhasil disimpan. Tenant sekarang menampilkan tarif terbaru.');
  };

  const handleChangeTenantPackage = (tenant: Tenant, value: SubscriptionPackage) => {
    const updatedTenant = {
      ...tenant,
      subscriptionPackage: value,
      subscriptionStatus: tenant.subscriptionStatus || 'active'
    };
    onUpdateTenant(updatedTenant);
  };

  const handleChangeTenantStatus = (tenant: Tenant, value: 'trial' | 'active' | 'expired') => {
    const updatedTenant = {
      ...tenant,
      subscriptionStatus: value
    };
    onUpdateTenant(updatedTenant);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-5 overflow-y-auto" id="saas-superadmin-panel">
      {/* SaaS Admin Header */}
      <div className="flex items-center gap-3 mb-6 bg-slate-900 border border-slate-800 p-4.5 rounded-3xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="bg-indigo-950 border border-indigo-800 p-3 rounded-2xl text-indigo-400 font-bold flex items-center justify-center shadow-lg">
          <Shield className="w-7 h-7" />
        </div>
        <div>
          <span className="text-[9px] bg-indigo-950 text-indigo-300 px-3 py-0.5 rounded-full border border-indigo-900 font-black tracking-widest uppercase">
            SUPERADMIN SAAS DASHBOARD
          </span>
          <h2 className="text-xl font-black mt-1 text-white">SaaS Kasir Pintar Console</h2>
          <p className="text-[11px] text-slate-400 mt-0.5 font-bold">
            Selamat datang, <strong className="text-indigo-300 font-bold">{currentUserEmail}</strong>. Selamat mengontrol seluruh tenant ritel.
          </p>
        </div>
      </div>

      {/* Grid of Global SaaS Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-810 p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Toko (Tenant)</span>
            <h4 className="text-2xl font-black text-slate-100">{tenants.length} <span className="text-xs font-normal text-slate-500">Unit</span></h4>
          </div>
          <div className="bg-indigo-955/30 p-3 rounded-2xl text-indigo-400 border border-indigo-900/40">
            <Store className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-810 p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Metrik SaaS Status</span>
            <h4 className="text-2xl font-black text-emerald-400">AKTIF <span className="text-xs font-normal text-slate-400">100%</span></h4>
          </div>
          <div className="bg-emerald-955/20 p-3 rounded-2xl text-emerald-400 border border-emerald-900/30">
            <Database className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-810 p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lisensi SaaS Owner</span>
            <h4 className="text-sm font-extrabold text-[#10B981] mt-1.5 bg-[#10B981]/10 px-3 py-1 rounded-full border border-[#10B981]/20 inline-block">
              Superadmin Premium
            </h4>
          </div>
          <div className="bg-teal-950/20 p-3 rounded-2xl text-teal-400 border border-teal-900/30">
            <Coins className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Create Store Block */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl lg:col-span-4 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            <h3 className="font-extrabold text-sm text-white">Tambahkan Toko Baru</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Daftarkan tenant secara manual di database awan. Kelebihan ini khusus diberikan untuk Superadmin pemilik platform SaaS.
          </p>

          <form onSubmit={handleCreateTenantSubmit} className="space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nama Toko Ritel</label>
              <input
                type="text"
                placeholder="misal: Toko Berkah Ahmad"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-semibold text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-550"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Owner PIN (Admin)</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="1234"
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center font-mono font-bold text-xs text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-550"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cashier PIN</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="0000"
                  value={newCashierPin}
                  onChange={(e) => setNewCashierPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center font-mono font-bold text-xs text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-550"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paket Awal</label>
              <select
                value={newSubscriptionPackage}
                onChange={(e) => setNewSubscriptionPackage(e.target.value as SubscriptionPackage)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-550"
              >
                <option value="trial">Trial (Uji Coba)</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
                <option value="lifetime">Seumur Hidup</option>
              </select>
            </div>

            {errorText && (
              <p className="text-[11px] text-rose-455 font-bold font-mono">⚠️ {errorText}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-black tracking-wide text-white transition-all shadow-md mt-2 cursor-pointer"
            >
              Simpan & Launch Tenant
            </button>
          </form>
        </div>

        {/* Package Rate Management */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl lg:col-span-4 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-emerald-400" />
            <h3 className="font-extrabold text-sm text-white">Pengaturan Tarif Paket</h3>
          </div>
          <p className="text-[11px] text-slate-400">Atur tarif langganan yang akan tampil di tiap tenant. Paket ini akan menjadi referensi harga untuk upgrade dan informasi paket.</p>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Tarif Trial (Default Rp 0)
              <input
                type="number"
                min={0}
                value={packageConfig.trial}
                onChange={(e) => setPackageConfig(prev => ({ ...prev, trial: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-450"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Tarif Bulanan
              <input
                type="number"
                min={0}
                value={packageConfig.monthly}
                onChange={(e) => setPackageConfig(prev => ({ ...prev, monthly: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-450"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Tarif Tahunan
              <input
                type="number"
                min={0}
                value={packageConfig.yearly}
                onChange={(e) => setPackageConfig(prev => ({ ...prev, yearly: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-450"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Tarif Lifetime
              <input
                type="number"
                min={0}
                value={packageConfig.lifetime}
                onChange={(e) => setPackageConfig(prev => ({ ...prev, lifetime: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-450"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePackageRates}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase rounded-2xl transition-all shadow-sm"
            >
              Simpan Tarif Paket
            </button>
            <div className="text-[11px] text-slate-400 leading-tight">
              Referensi: Trial ({formatRupiah(packageRates.trial)}) • Bulanan ({formatRupiah(packageRates.monthly)}) • Tahunan ({formatRupiah(packageRates.yearly)}) • Lifetime ({formatRupiah(packageRates.lifetime)})
            </div>
          </div>
        </div>

        {/* Managed Tenants List */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl lg:col-span-12 shadow-xl flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-810">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <Users className="w-5 h-5 text-indigo-400 animate-pulse" /> Daftar Jaringan Toko Aktif ({tenants.length})
            </h3>
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">SINKRONISASI REAL-TIME</span>
          </div>

          <div className="space-y-3.5 overflow-y-auto max-h-[420px]" id="tenant-list">
            {tenants.length === 0 ? (
              <div className="text-center py-12 text-slate-550 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-xs">Belum ada tenant yang terdaftar.</p>
                <p className="text-[10px] text-slate-600 mt-1">Daftarkan Toko baru anda lewat form di atas untuk memulai database.</p>
              </div>
            ) : (
              tenants.map(t => (
                <div 
                  key={t.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/55 rounded-2xl border border-slate-810 hover:border-slate-755 transition-all gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-100">{t.name}</span>
                      <span className="text-[9px] bg-indigo-950 text-indigo-300 font-bold px-2 py-0.5 rounded-md border border-indigo-900/60 font-mono">
                        ID: {t.id}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border font-mono ${
                        (t.subscriptionStatus || 'trial') === 'active' 
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-900/60'
                          : (t.subscriptionStatus || 'trial') === 'trial'
                            ? 'bg-amber-950 text-amber-300 border-amber-900/60'
                            : 'bg-rose-950 text-rose-300 border-rose-900/60'
                      }`}>
                        STATUS: {(t.subscriptionStatus || 'trial').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium space-x-1 flex items-center mt-1">
                      <span>Owner: <strong className="text-slate-350">{t.ownerEmail}</strong></span>
                      <span>•</span>
                      <span>Dibuat: {new Date(t.createdAt).toLocaleDateString('id-ID')}</span>
                      <span>•</span>
                      <span>Trial Berakhir: <strong className="text-amber-400">{t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('id-ID') : '-'}</strong></span>
                    </div>
                  {/* Display PINS so superadmin can assist forgot PIN users */}
                    <div className="flex flex-col gap-2 mt-2 font-mono text-[10px] font-bold text-slate-450 border-t border-slate-900/50 pt-1.5">
                      <span className="flex items-center gap-1 text-slate-400"><Key className="w-3 h-3 text-amber-500" /> Admin PIN: <strong className="text-amber-400">{t.adminPin}</strong></span>
                      {t.cashiers?.map(c => <span key={c.uid} className="flex items-center gap-1 text-slate-400"><Key className="w-3 h-3 text-sky-400" /> {c.name} PIN: <strong className="text-sky-400">{c.pin}</strong></span>)}
                      <span className="flex items-center gap-1 text-slate-400">Paket: <strong className="text-indigo-300 capitalize">{t.subscriptionPackage || 'monthly'}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-500 font-bold uppercase ml-1">Jenis Paket</label>
                        <select
                          value={t.subscriptionPackage || 'monthly'}
                          onChange={(e) => handleChangeTenantPackage(t, e.target.value as SubscriptionPackage)}
                          className="w-full px-3.5 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-550"
                          title="Ubah jenis paket tenant"
                        >
                          <option value="trial">Trial</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                          <option value="lifetime">Lifetime</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-500 font-bold uppercase ml-1">Status Langganan</label>
                        <select
                          value={t.subscriptionStatus || 'trial'}
                          onChange={(e) => handleChangeTenantStatus(t, e.target.value as any)}
                          className="w-full px-3.5 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-550"
                          title="Ubah status aktivasi tenant"
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">Tarif referensi: {formatRupiah(packageRates[t.subscriptionPackage || 'monthly'])}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onEnterTenant(t.id, t.adminPin)}
                        className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow shadow-indigo-255/10"
                        title="Operasikan Ritel as Owner"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Admin
                      </button>
                      <button
                        onClick={() => onEnterTenant(t.id, t.cashiers[0]?.pin || '')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-[10px] rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-slate-705"
                        title="Operasikan Ritel as Cashier"
                      >
                        Kasir
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`HAPUS TOKO "${t.name}"?\nSegenap produk, stok, dan laporan dalam toko ini akan langsung disirnakan permanen dari cloud SaaS!`)) {
                          onDeleteTenant(t.id);
                        }
                      }}
                      className="p-2 bg-rose-950/30 hover:bg-rose-950 text-rose-400 border border-rose-900/30 rounded-xl transition-colors cursor-pointer"
                      title="Hapus Toko"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
