import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    Clock,
    Globe,
    Activity,
    AlertTriangle,
    RefreshCw,
    Search
} from 'lucide-react';
import { apiService } from '../lib/api';

interface LoginStats {
    summary: { totalFailures24h: number };
    recent: {
        id: number;
        tenant_id: string;
        ip_address: string;
        status: 'FAILED' | 'RATE_LIMITED' | 'SUCCESS';
        reason: string;
        attempted_at: string;
    }[];
    topTargets7d: { tenant_id: string; fail_count: string }[];
}

export default function LoginAuditDashboard() {
    const [stats, setStats] = useState<LoginStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await apiService.getLoginStats();
            setStats(data);
        } catch (err) {
            console.error("Gagal memuat audit log:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const filteredLogs = stats?.recent.filter(log =>
        log.tenant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address.includes(searchTerm) ||
        log.reason.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in p-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${stats?.summary.totalFailures24h === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Insiden (24 Jam)</p>
                            <h4 className="text-2xl font-black text-white">{stats?.summary.totalFailures24h}</h4>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm md:col-span-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-indigo-500" /> Target Serangan Tertinggi (7 Hari)
                    </h5>
                    <div className="flex flex-wrap gap-2">
                        {stats?.topTargets7d.map(target => (
                            <div key={target.tenant_id} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-800">{target.tenant_id}</span>
                                <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-1.5 py-0.5 rounded-lg">
                                    {target.fail_count}x Gagal
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                    <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Log Keamanan Sesi Terbaru</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Memantau upaya login tidak sah secara real-time</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari IP atau ID Toko..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-100">
                                <th className="px-6 py-4">Waktu</th>
                                <th className="px-6 py-4">ID Toko</th>
                                <th className="px-6 py-4">Alamat IP</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Alasan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-[11px] font-mono text-slate-500">{new Date(log.attempted_at).toLocaleString('id-ID')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-black text-indigo-600">{log.tenant_id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-medium text-slate-600">{log.ip_address}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${log.status === 'RATE_LIMITED' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {log.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-bold text-slate-700">{log.reason}</span>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-bold">Tidak ada log kegagalan ditemukan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}