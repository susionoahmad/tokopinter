import React, { useState, useEffect, useMemo } from 'react';
import { KasBesar, Mutation, Tenant, Transaction, CashierSession } from '../types';
import { formatRupiah, generateId } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PiggyBank, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  History, 
  Calendar, 
  User, 
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { apiService } from '../lib/api';

interface KasProTabProps {
  tenant: Tenant;
  kasBesar: KasBesar | null;
  setKasBesar: React.Dispatch<React.SetStateAction<KasBesar | null>>;
  mutations: Mutation[];
  setMutations: React.Dispatch<React.SetStateAction<Mutation[]>>;
  transactions: Transaction[];
}

export default function KasProTab({ 
  tenant, 
  kasBesar, 
  setKasBesar, 
  mutations, 
  setMutations,
  transactions 
}: KasProTabProps) {
  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = (date: Date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString();

  // Tab State
  const [activeHistoryTab, setActiveHistoryTab] = useState<'KAS_BESAR' | 'CASHIER'>('KAS_BESAR');

  // Deposit State
  const [depositAmount, setDepositAmount] = useState<number>(0);

  // Cashier History Filters State
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [selectedCashierUid, setSelectedCashierUid] = useState<string>('ALL');

  // Cashier Sessions Dynamic State
  const [sessions, setSessions] = useState<CashierSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Cashier list
  const cashiersList = tenant.cashiers || [];

  // Fetch sessions on filter change
  useEffect(() => {
    const fetchSessions = async () => {
      if (tenant.id === 'TOKO-DEMO') {
        // Fallback mock data for TOKO-DEMO local playground
        const mockSessionsList: CashierSession[] = [
          {
            id: 'demo-sess-1',
            tenantId: 'TOKO-DEMO',
            cashierUid: 'demo-cashier',
            cashierName: 'Kasir Demo',
            startTime: `${todayStr}T08:00:00.000Z`,
            endTime: `${todayStr}T17:00:00.000Z`,
            openingBalance: 150000,
            closingBalance: 485000,
            totalCashSales: 335000,
            totalQRIS: 120000,
            totalCard: 50000,
            status: 'CLOSED'
          },
          {
            id: 'demo-sess-2',
            tenantId: 'TOKO-DEMO',
            cashierUid: 'demo-cashier',
            cashierName: 'Kasir Demo',
            startTime: `${todayStr}T18:00:00.000Z`,
            openingBalance: 200000,
            totalCashSales: 45000,
            status: 'OPEN'
          }
        ];

        // Filter locally
        const filtered = mockSessionsList.filter(s => {
          const sDate = s.startTime.split('T')[0];
          const matchCashier = selectedCashierUid === 'ALL' || s.cashierUid === selectedCashierUid;
          const matchDate = sDate >= dateFrom && sDate <= dateTo;
          return matchCashier && matchDate;
        });

        setSessions(filtered);
        return;
      }

      setIsLoadingSessions(true);
      try {
        const data = await apiService.getSessions(tenant.id, {
          date_from: dateFrom,
          date_to: dateTo,
          cashier_uid: selectedCashierUid !== 'ALL' ? selectedCashierUid : undefined
        });
        setSessions(data);
      } catch (err) {
        console.error("Gagal mengambil sesi kasir:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [tenant.id, dateFrom, dateTo, selectedCashierUid, todayStr]);

  // Build cashier drawer mutation timeline
  const cashierMutations = useMemo(() => {
    const rows: any[] = [];
    for (const session of sessions) {
      // 1. Opening Session
      rows.push({
        id: `open-${session.id}`,
        type: 'MASUK',
        label: `Buka Sesi (Modal Awal)`,
        sub: `Kasir: ${session.cashierName}`,
        amount: session.openingBalance,
        time: session.startTime,
        sessionId: session.id,
        cashierName: session.cashierName
      });

      // 2. Tunai/Cash sales transactions in this session
      const sessionTxs = transactions.filter(t => t.sessionId === session.id && t.paymentMethod === 'Tunai');
      for (const tx of sessionTxs) {
        // Summarize items for cleaner display
        const itemsStr = tx.items.length > 2 
          ? `${tx.items.slice(0, 2).map(i => i.name).join(', ')}...` 
          : tx.items.map(i => i.name).join(', ');

        rows.push({
          id: `tx-${tx.id}`,
          type: 'MASUK',
          label: `Penjualan Tunai`,
          sub: `${tx.id.substring(3) || tx.id} • ${itemsStr}`,
          amount: tx.totalPrice,
          time: tx.timestamp,
          sessionId: session.id,
          cashierName: session.cashierName
        });
      }

      // 3. Closing Session (Outflow of drawer cash)
      if (session.status === 'CLOSED') {
        const closeAmt = session.closingBalance !== undefined 
          ? session.closingBalance 
          : (session.openingBalance + (session.totalCashSales || 0));
        
        rows.push({
          id: `close-${session.id}`,
          type: 'KELUAR',
          label: `Tutup Sesi (Setor Akhir)`,
          sub: `Kasir: ${session.cashierName} • Disetor ke Brankas`,
          amount: closeAmt,
          time: session.endTime || session.startTime,
          sessionId: session.id,
          cashierName: session.cashierName
        });
      }
    }

    // Sort globally by time DESC (newest at top)
    return rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [sessions, transactions]);

  // Handle Deposit to Kas Besar
  const handleDeposit = () => {
    if (depositAmount <= 0) return;
    
    const newKasBesar = kasBesar 
      ? { ...kasBesar, balance: kasBesar.balance + depositAmount } 
      : { id: generateId('kb'), tenantId: tenant.id, balance: depositAmount };
    
    setKasBesar(newKasBesar);
    
    const newMutation: Mutation = {
      id: generateId('mut'),
      tenantId: tenant.id,
      type: 'MASUK',
      source: 'LAINNYA',
      amount: depositAmount,
      timestamp: new Date().toISOString(),
      note: 'Setor Kas Besar',
      target: 'KAS_BESAR'
    };
    
    setMutations(prev => [...prev, newMutation]);
    setDepositAmount(0);
  };

  const currentBalance = kasBesar?.balance || 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto scrollbar-thin text-slate-800">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
        <PiggyBank className="w-6 h-6 text-indigo-600 animate-pulse" />
        Laporan Kas PRO
      </h2>

      {/* Vault Info & Setor Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kas Besar Balance */}
        <div className="bg-gradient-to-br from-indigo-700 to-indigo-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <p className="text-indigo-200 text-[10px] md:text-xs font-bold uppercase tracking-wider">Saldo Kas Besar (Brankas)</p>
            <p className="text-2xl md:text-3xl font-black mt-1 md:mt-2 tracking-tight">{formatRupiah(currentBalance)}</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-150">
            <Info className="w-3.5 h-3.5" />
            <span>Kumpulan modal & sisa setor kasir.</span>
          </div>
        </div>

        {/* Deposit Section */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-700">Setor Kas Besar Manual</h3>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Modal awal brankas / setoran manual.</p>
          </div>
          <div className="flex gap-2 mt-3 md:mt-4">
            <input 
              type="number"
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              placeholder="Jumlah (Rp)"
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium w-full"
            />
            <button 
              onClick={handleDeposit} 
              className="px-4 md:px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white text-xs md:text-sm rounded-xl font-bold whitespace-nowrap"
            >
              Setor
            </button>
          </div>
        </div>
      </div>

      {/* Main Premium Segmented Tab Selector for History */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-4 border-b border-slate-100 gap-4 bg-slate-50/50">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setActiveHistoryTab('KAS_BESAR')}
              className={`text-xs px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeHistoryTab === 'KAS_BESAR' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5" />
              Brankas Kas Besar
            </button>
            <button
              onClick={() => setActiveHistoryTab('CASHIER')}
              className={`text-xs px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeHistoryTab === 'CASHIER' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Laci Kas Kasir
            </button>
          </div>

          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold self-start sm:self-center">
            {activeHistoryTab === 'KAS_BESAR' ? 'Riwayat Aliran Brankas' : 'Riwayat Laci Kasir'}
          </span>
        </div>

        {/* Tab Body */}
        <div className="p-4 md:p-6">
          <AnimatePresence mode="wait">
            {activeHistoryTab === 'KAS_BESAR' ? (
              /* KAS BESAR HISTORY SUB-PANEL */
              <motion.div
                key="kas-besar"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3"
              >
                {mutations.filter(m => m.target === 'KAS_BESAR').length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm font-semibold text-slate-400">Belum ada mutasi Kas Besar.</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-1">
                    {mutations
                      .filter(m => m.target === 'KAS_BESAR')
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(m => (
                        <div 
                          key={m.id} 
                          className="flex justify-between items-center p-3.5 border border-slate-100 hover:border-slate-200 rounded-2xl text-sm transition-all bg-white hover:shadow-xs group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              m.type === 'MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {m.type === 'MASUK' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                {m.note || m.source}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(m.timestamp).toLocaleString('id-ID', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })}
                              </p>
                            </div>
                          </div>
                          <p className={`font-black text-right ${m.type === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {m.type === 'MASUK' ? '+' : '-'}{formatRupiah(m.amount)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            ) : (
              /* CASHIER DRAWER MUTATION TIMELINE SECTION WITH FILTERS */
              <motion.div
                key="cashier"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                {/* Advanced Filter Panel */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
                  {/* Date From */}
                  <div className="flex-1 min-w-[130px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dari Tanggal</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Date To */}
                  <div className="flex-1 min-w-[130px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sampai Tanggal</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Cashier Uid Dropdown (Visible if there is at least one cashier) */}
                  {cashiersList.length >= 1 && (
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih Kasir</label>
                      <div className="relative">
                        <select
                          value={selectedCashierUid}
                          onChange={(e) => setSelectedCashierUid(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                        >
                          <option value="ALL">Semua Kasir</option>
                          {cashiersList.map(c => (
                            <option key={c.uid} value={c.uid}>{c.name}</option>
                          ))}
                        </select>
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <div className="absolute right-3 top-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-500 pointer-events-none"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline List Content */}
                <div className="space-y-4">
                  {isLoadingSessions ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                      <p className="text-xs font-bold">Memuat riwayat laci kasir...</p>
                    </div>
                  ) : cashierMutations.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">Tidak ada riwayat mutasi kasir untuk filter terpilih.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Coba sesuaikan rentang tanggal atau cashier.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l border-slate-200 space-y-4 pr-1">
                      {cashierMutations.map((m) => (
                        <div 
                          key={m.id} 
                          className={`relative flex flex-col sm:flex-row justify-between sm:items-center p-3.5 border rounded-2xl text-sm transition-all bg-white hover:shadow-xs group ${
                            m.label.includes('Buka') 
                              ? 'border-l-4 border-l-emerald-500 border-slate-100 hover:border-slate-200' 
                              : m.label.includes('Tutup') 
                                ? 'border-l-4 border-l-rose-500 border-slate-100 hover:border-slate-200' 
                                : 'border-l-4 border-l-sky-500 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {/* Timeline dot accent */}
                          <div className={`absolute -left-[30px] top-[22px] w-2.5 h-2.5 rounded-full border-2 border-white shrink-0 ${
                            m.label.includes('Buka') 
                              ? 'bg-emerald-500 shadow-emerald-200 shadow' 
                              : m.label.includes('Tutup') 
                                ? 'bg-rose-500 shadow-rose-200 shadow' 
                                : 'bg-sky-500 shadow-sky-200 shadow'
                          }`}></div>

                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              m.type === 'MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {m.type === 'MASUK' ? <ArrowUpCircle className="w-4.5 h-4.5" /> : <ArrowDownCircle className="w-4.5 h-4.5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800">{m.label}</span>
                                {m.label.includes('Buka') && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Buka</span>
                                )}
                                {m.label.includes('Tutup') && (
                                  <span className="text-[9px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">Tutup</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{m.sub}</p>
                            </div>
                          </div>

                          <div className="mt-3 sm:mt-0 flex sm:flex-col items-start sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                            <p className={`font-black tracking-tight text-base ${
                              m.type === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {m.type === 'MASUK' ? '+' : '-'}{formatRupiah(m.amount)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(m.time).toLocaleString('id-ID', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Premium Breathing Room Spacer at the bottom to prevent viewport cut-off */}
      <div className="pb-12 shrink-0"></div>
      </div>
    </div>
  );
}
