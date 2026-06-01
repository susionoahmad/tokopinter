import React, { useState } from 'react';
import { LockKeyhole, Coins, User, KeyRound, ArrowRight } from 'lucide-react';
import { Tenant } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LockScreenProps {
  tenant: Tenant;
  onUnlock: (role: 'owner' | 'cashier', cashierName?: string, cashierUid?: string) => void;
  onExitTenant: () => void;
}

export default function LockScreen({ tenant, onUnlock, onExitTenant }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setErrorMsg('');
    }
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Check PIN matches
    if (pin === tenant.adminPin) {
      onUnlock('owner');
      setPin('');
    } else {
      const cashier = tenant.cashiers?.find(c => c.pin === pin);
      if (cashier) {
        onUnlock('cashier', cashier.name, cashier.uid);
        setPin('');
      } else {
        setErrorMsg('PIN yang Anda masukkan salah!');
        setPin('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto" id="screen-lock-overlay">
      {/* Decorative Blur Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#6366F1]/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#10B981]/15 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[32px] overflow-hidden text-slate-100 p-6 flex flex-col items-center shadow-2xl relative"
        id="lock-screen-box"
      >
        {/* Lock Info */}
        <div className="text-center w-full mb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
            <LockKeyhole className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-black tracking-wide font-sans">{tenant.name}</h2>
          <span className="text-[10px] bg-slate-800 text-slate-400 font-mono font-bold px-2 py-0.5 rounded border border-slate-700">
            KODE: {tenant.id}
          </span>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Masukkan PIN Kasir atau PIN Owner untuk Membuka Aplikasi
          </p>
        </div>

        {/* PIN Entry Display dots instead of numbers */}
        <div className="flex gap-3 justify-center items-center py-2.5 mb-2 h-8" id="pin-dots">
          {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
            <div
              key={`dot-${i}`}
              className={`w-3 h-3 rounded-full transition-all duration-150 ${
                i < pin.length 
                  ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] scale-110' 
                  : 'border border-slate-700 bg-slate-800/40'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        <AnimatePresence>
          {errorMsg && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-rose-400 text-xs font-bold font-mono tracking-tight pb-2"
            >
              ⚠️ {errorMsg}
            </motion.p>
          )}
        </AnimatePresence>

        {/* PIN Numeric Lock Pad Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 w-full max-w-[260px]" id="pin-pad-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={`key-${num}`}
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xl flex items-center justify-center border border-slate-800 transition-colors shadow-sm select-none active:scale-95 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="w-16 h-16 rounded-full hover:bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center select-none active:scale-95 cursor-pointer"
          >
            HAPUS
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xl flex items-center justify-center border border-slate-800 transition-colors shadow-sm select-none active:scale-95 cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full hover:bg-slate-800 text-slate-400 font-bold text-sm flex items-center justify-center select-none active:scale-95 cursor-pointer"
          >
            ⌫
          </button>
        </div>

        {/* Action Button */}
        <div className="w-full flex gap-2">
          <button
            onClick={onExitTenant}
            className="flex-1 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 font-bold text-xs rounded-xl text-slate-300 transition-colors cursor-pointer"
          >
            Ganti Toko
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={pin.length === 0}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-extrabold text-xs rounded-xl text-white transition-all shadow shadow-indigo-500/10 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
          >
            Buka Kunci <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
