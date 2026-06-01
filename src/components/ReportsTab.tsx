import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Transaction, Product, Tenant } from '../types';
import { formatRupiah, formatDate } from '../utils';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { 
  TrendingUp, 
  Coins, 
  ShoppingBag, 
  Receipt, 
  Calendar, 
  ChevronRight, 
  X, 
  CheckCircle, 
  ChevronLeft,
  ArrowDownCircle,
  Clock,
  Printer,
  ChevronDown,
  Target,
  Edit2,
  Save,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportsTabProps {
  transactions: Transaction[];
  onResetData?: () => void;
  products?: Product[];
  tenant?: Tenant;
}

export default function ReportsTab({ transactions, onResetData, products, tenant }: ReportsTabProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Monthly Sales Target States
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem('pos_monthly_sales_target');
    return saved ? parseInt(saved, 10) : 12000000; // default target Rp 12.000.000
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTargetInput, setTempTargetInput] = useState(monthlyTarget.toString());

  // Actual total store-wide revenue for the current calendar month
  const currentMonthRevenue = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return transactions.reduce((acc, tx) => {
      const txDate = new Date(tx.timestamp);
      if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
        return acc + tx.totalPrice;
      }
      return acc;
    }, 0);
  }, [transactions]);

  const targetProgress = useMemo(() => {
    if (monthlyTarget <= 0) return 0;
    return Math.min(100, Math.round((currentMonthRevenue / monthlyTarget) * 100));
  }, [currentMonthRevenue, monthlyTarget]);

  const targetRemaining = useMemo(() => {
    return Math.max(0, monthlyTarget - currentMonthRevenue);
  }, [currentMonthRevenue, monthlyTarget]);

  // Hover state for daily breakdown chart tooltip
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Daily Sales Target Breakdown calculations
  const dailySalesBreakdown = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const daysCount = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Calculate daily target based on the monthly target divided by total days in the month
    const dailyTarget = Math.round(monthlyTarget / daysCount);
    
    // Initialize array for each day of the month
    const breakdown = Array.from({ length: daysCount }, (_, i) => {
      const dayNum = i + 1;
      return {
        day: dayNum,
        revenue: 0,
        dailyTarget,
        meetsTarget: false,
        percent: 0,
      };
    });
    
    // Fill in values from actual transactions of the current calendar month
    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
        const d = txDate.getDate();
        if (d >= 1 && d <= daysCount) {
          breakdown[d - 1].revenue += tx.totalPrice;
        }
      }
    });
    
    // Calculate target % and meets target status
    breakdown.forEach(item => {
      item.percent = dailyTarget > 0 ? Math.round((item.revenue / dailyTarget) * 100) : 0;
      item.meetsTarget = item.revenue >= dailyTarget;
    });
    
    return {
      breakdown,
      dailyTarget,
      totalDays: daysCount,
      activeDay: today.getDate()
    };
  }, [transactions, monthlyTarget]);

  const handleSaveTarget = () => {
    let num = parseInt(tempTargetInput, 10);
    if (isNaN(num) || num <= 0) {
      num = 12000000;
    }
    setMonthlyTarget(num);
    setTempTargetInput(num.toString());
    localStorage.setItem('pos_monthly_sales_target', num.toString());
    setIsEditingTarget(false);
  };

  // Date Range Picker States
  const [datePreset, setDatePreset] = useState<'Semua' | 'Hari Ini' | '7 Hari Terakhir' | 'Bulan Ini' | 'Kustom'>('Semua');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [taxFilter, setTaxFilter] = useState<'Semua' | 'Hanya Pajak'>('Semua');

  // Clean memo of transactions that fit the active date limits and tax filter
  const dateFilteredTransactions = useMemo(() => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);

      const txHasTax = (tx.tax ?? 0) > 0;
      if (taxFilter === 'Hanya Pajak' && !txHasTax) {
        return false;
      }

      if (datePreset === 'Semua') {
        return true;
      }

      if (datePreset === 'Hari Ini') {
        return txDate >= todayStart && txDate <= todayEnd;
      }

      if (datePreset === '7 Hari Terakhir') {
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(todayStart.getDate() - 6);
        return txDate >= sevenDaysAgo && txDate <= todayEnd;
      }

      if (datePreset === 'Bulan Ini') {
        const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        return txDate >= startOfMonth && txDate <= todayEnd;
      }

      if (datePreset === 'Kustom') {
        if (customStartDate) {
          const startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (txDate < startDate) return false;
        }
        if (customEndDate) {
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (txDate > endDate) return false;
        }
        return true;
      }

      return true;
    });
  }, [transactions, datePreset, customStartDate, customEndDate]);

  // Helper to determine product category
  const getCategoryForItem = (productId: string, name: string): string => {
    // Check active products
    const activeProd = products?.find(p => p.id === productId);
    if (activeProd) return activeProd.category;
    
    // Check initial mock products
    const mockProd = INITIAL_PRODUCTS.find(p => p.id === productId);
    if (mockProd) return mockProd.category;
    
    // Guess based on keywords
    const lowerName = name.toLowerCase();
    if (lowerName.includes('mie') || lowerName.includes('indomie') || lowerName.includes('roti') || lowerName.includes('makanan')) return 'Makanan';
    if (lowerName.includes('teh') || lowerName.includes('kopi') || lowerName.includes('jus') || lowerName.includes('susu') || lowerName.includes('botol') || lowerName.includes('minuman')) return 'Minuman';
    if (lowerName.includes('beras') || lowerName.includes('minyak') || lowerName.includes('gula') || lowerName.includes('garam') || lowerName.includes('telur') || lowerName.includes('sembako')) return 'Sembako';
    if (lowerName.includes('sabun') || lowerName.includes('shampoo') || lowerName.includes('odol') || lowerName.includes('mandi') || lowerName.includes('lifebuoy')) return 'Sabun & Mandi';
    
    return 'Lain-lain';
  };

  // Dynamic list of categories from products (and mock products for default coverage)
  const categoriesList = useMemo(() => {
    const categoriesSet = new Set<string>();
    
    // Add categories from current products list
    products?.forEach(p => {
      if (p.category) categoriesSet.add(p.category);
    });
    
    // Add categories from INITIAL_PRODUCTS as well
    INITIAL_PRODUCTS.forEach(p => {
      if (p.category) categoriesSet.add(p.category);
    });
    
    // Convert to array and sort
    const list = Array.from(categoriesSet).sort();
    return ['Semua', ...list];
  }, [products]);

  // General metrics calculations, respecting category filter and date range filter
  const summary = useMemo(() => {
    let revenue = 0;
    let capital = 0;
    let itemsSold = 0;
    let matchingTxCount = 0;
    let taxTotal = 0;
    let taxReceiptsCount = 0;
    let taxableRevenue = 0;

    dateFilteredTransactions.forEach(tx => {
      let txHasMatchingCategoryItem = false;
      let txRevenue = 0;
      let txCapital = 0;

      tx.items.forEach(it => {
        const itemCategory = getCategoryForItem(it.productId, it.name);
        if (selectedCategory === 'Semua' || itemCategory === selectedCategory) {
          txRevenue += it.price * it.quantity;
          txCapital += it.cost * it.quantity;
          itemsSold += it.quantity;
          txHasMatchingCategoryItem = true;
        }
      });

      if (txHasMatchingCategoryItem) {
        revenue += txRevenue;
        capital += txCapital;
        matchingTxCount++;

        if (tx.tax > 0) {
          taxTotal += tx.tax;
          taxReceiptsCount += 1;
          taxableRevenue += txRevenue;
        }
      }
    });

    const profit = revenue - capital;
    const averageBasket = matchingTxCount > 0 ? Math.round(revenue / matchingTxCount) : 0;
    const taxSharePercent = taxReceiptsCount > 0 && matchingTxCount > 0 ? Math.round((taxReceiptsCount / matchingTxCount) * 100) : 0;

    return {
      revenue,
      capital,
      profit,
      itemsSold,
      count: matchingTxCount,
      averageBasket,
      taxTotal,
      taxReceiptsCount,
      taxableRevenue,
      taxSharePercent
    };
  }, [dateFilteredTransactions, selectedCategory, products]);

  const taxReceiptTransactions = useMemo(() => {
    return dateFilteredTransactions.filter(tx => {
      const hasTax = (tx.tax ?? 0) > 0;
      if (!hasTax) return false;
      if (selectedCategory === 'Semua') return true;
      return tx.items.some(it => getCategoryForItem(it.productId, it.name) === selectedCategory);
    });
  }, [dateFilteredTransactions, selectedCategory, products]);

  // Grouping sales by product Category, respecting date range filter
  const salesByCategory = useMemo(() => {
    const categories: Record<string, { revenue: number; quantity: number }> = {};
    
    dateFilteredTransactions.forEach(tx => {
      tx.items.forEach(it => {
        const itemCategory = getCategoryForItem(it.productId, it.name);
        if (!categories[itemCategory]) {
          categories[itemCategory] = { revenue: 0, quantity: 0 };
        }
        categories[itemCategory].revenue += it.price * it.quantity;
        categories[itemCategory].quantity += it.quantity;
      });
    });

    return categories;
  }, [dateFilteredTransactions, products]);

  // Grouping tax by product Category
  const taxByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    
    dateFilteredTransactions.forEach(tx => {
      if (tx.tax > 0) {
        // We need to apportion tax to items. 
        // A simple way is by revenue weight of items that match the category.
        const totalTxRevenue = tx.items.reduce((s, i) => s + (i.price * i.quantity), 0);
        
        tx.items.forEach(it => {
          const itemCategory = getCategoryForItem(it.productId, it.name);
          if (!categories[itemCategory]) categories[itemCategory] = 0;
          
          const itemRevenue = it.price * it.quantity;
          const apportionedTax = (itemRevenue / totalTxRevenue) * tx.tax;
          categories[itemCategory] += apportionedTax;
        });
      }
    });

    return categories;
  }, [dateFilteredTransactions, products]);

  // Product sales counts (Best Sellers), filtered by category and date range filter
  const topSellers = useMemo(() => {
    const counts: Record<string, { qty: number; revenue: number; emoji: string }> = {};
    
    dateFilteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const itemCategory = getCategoryForItem(item.productId, item.name);
        if (selectedCategory !== 'Semua' && itemCategory !== selectedCategory) return;

        if (!counts[item.name]) {
          counts[item.name] = { qty: 0, revenue: 0, emoji: '📦' };
        }
        counts[item.name].qty += item.quantity;
        counts[item.name].revenue += item.price * item.quantity;
        
        // Try mapping popular Indonesian items to emojis
        if (item.name.includes('Indomie')) counts[item.name].emoji = '🍜';
        else if (item.name.includes('Teh Botol')) counts[item.name].emoji = '🧃';
        else if (item.name.includes('Beras')) counts[item.name].emoji = '🌾';
        else if (item.name.includes('Minyak')) counts[item.name].emoji = '🧴';
        else if (item.name.includes('Gula')) counts[item.name].emoji = '🍬';
        else if (item.name.includes('Lifebuoy') || item.name.includes('Sabun')) counts[item.name].emoji = '🧼';
        else if (item.name.includes('Kopi')) counts[item.name].emoji = '☕';
        else if (item.name.includes('Roti')) counts[item.name].emoji = '🍞';
      });
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // top 5
  }, [dateFilteredTransactions, selectedCategory, products]);

  // Payment methods breakdown percentage/totals, filtered by category and date range filter
  const paymentBreakdown = useMemo(() => {
    let tunaiCount = 0;
    let qrisCount = 0;
    let kartuCount = 0;

    let tunaiVal = 0;
    let qrisVal = 0;
    let kartuVal = 0;

    dateFilteredTransactions.forEach(tx => {
      let txCategorySum = 0;
      tx.items.forEach(it => {
        const itemCategory = getCategoryForItem(it.productId, it.name);
        if (selectedCategory === 'Semua' || itemCategory === selectedCategory) {
          txCategorySum += it.price * it.quantity;
        }
      });

      if (txCategorySum > 0) {
        if (tx.paymentMethod === 'Tunai') {
          tunaiCount++;
          tunaiVal += txCategorySum;
        } else if (tx.paymentMethod === 'QRIS') {
          qrisCount++;
          qrisVal += txCategorySum;
        } else if (tx.paymentMethod === 'Kartu') {
          kartuCount++;
          kartuVal += txCategorySum;
        }
      }
    });

    const totalVal = (tunaiVal + qrisVal + kartuVal) || 1;

    return {
      tunai: { count: tunaiCount, value: tunaiVal, pctChange: Math.round((tunaiVal / totalVal) * 100) },
      qris: { count: qrisCount, value: qrisVal, pctChange: Math.round((qrisVal / totalVal) * 100) },
      kartu: { count: kartuCount, value: kartuVal, pctChange: Math.round((kartuVal / totalVal) * 100) }
    };
  }, [dateFilteredTransactions, selectedCategory, products]);

  // Filter transaction log histories, respecting category, search query and date range filter
  const filteredHistory = useMemo(() => {
    return dateFilteredTransactions.filter(tx => {
      let textMatch = true;
      if (historySearchQuery.trim()) {
        const searchLower = historySearchQuery.toLowerCase();
        const matchId = tx.id.toLowerCase().includes(searchLower);
        const matchProduct = tx.items.some(it => it.name.toLowerCase().includes(searchLower));
        const matchPay = tx.paymentMethod.toLowerCase().includes(searchLower);
        textMatch = matchId || matchProduct || matchPay;
      }
      if (!textMatch) return false;

      if (selectedCategory === 'Semua') return true;
      return tx.items.some(it => getCategoryForItem(it.productId, it.name) === selectedCategory);
    }).slice().reverse(); // Show newest transactions first
  }, [dateFilteredTransactions, historySearchQuery, selectedCategory, products]);

  // Mock sales-by-hour calculations for line graph, respecting category filter and date range filter
  const salesByHourArray = useMemo(() => {
    const hourSalesMap: Record<number, number> = {};
    for (let h = 8; h <= 21; h++) {
      hourSalesMap[h] = 0;
    }

    dateFilteredTransactions.forEach(tx => {
      let txCategorySum = 0;
      tx.items.forEach(it => {
        const itemCategory = getCategoryForItem(it.productId, it.name);
        if (selectedCategory === 'Semua' || itemCategory === selectedCategory) {
          txCategorySum += it.price * it.quantity;
        }
      });

      if (txCategorySum > 0) {
        const dt = new Date(tx.timestamp);
        const hour = dt.getHours();
        if (hourSalesMap[hour] !== undefined) {
          hourSalesMap[hour] += txCategorySum;
        } else {
          const defaultHr = 8 + (tx.timestamp.length % 12);
          hourSalesMap[defaultHr] = (hourSalesMap[defaultHr] || 0) + txCategorySum;
        }
      }
    });

    return Object.entries(hourSalesMap).map(([hour, val]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      value: val
    }));
  }, [dateFilteredTransactions, selectedCategory, products]);

  // Max value for y-axis in trend graph to scale lines
  const maxSalesInHour = useMemo(() => {
    const vals = salesByHourArray.map(h => h.value);
    const max = Math.max(...vals);
    return max > 0 ? max : 10000;
  }, [salesByHourArray]);

  // Group net profit by date based on selected date preset or range, respecting category filter
  const dailyProfitData = useMemo(() => {
    let daysToGenerate: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (datePreset === 'Hari Ini') {
      // Just today
      daysToGenerate = [new Date(today)];
    } else if (datePreset === '7 Hari Terakhir') {
      // 7 days ending today
      daysToGenerate = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
      });
    } else if (datePreset === 'Bulan Ini') {
      // Days from start of month up to today
      const currentDay = today.getDate();
      daysToGenerate = Array.from({ length: currentDay }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
        return d;
      });
    } else if (datePreset === 'Kustom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > 0 && diffDays <= 15) {
        daysToGenerate = Array.from({ length: diffDays }, (_, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          return d;
        });
      } else if (diffDays > 15) {
        // Range is larger, let's show last 15 days of that range for visual layout cleanliness
        daysToGenerate = Array.from({ length: 15 }, (_, i) => {
          const d = new Date(end);
          d.setDate(end.getDate() - (14 - i));
          return d;
        });
      } else {
        daysToGenerate = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          return d;
        });
      }
    } else {
      // 'Semua' - show the last 7 days of activity
      daysToGenerate = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
      });
    }

    return daysToGenerate.map(date => {
      const dateStringStr = date.toDateString(); // To group reliably
      
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayLabel = dayNames[date.getDay()];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const dateLabel = `${date.getDate()} ${monthNames[date.getMonth()]}`;

      // Sum profit for transactions matching this date string
      let dailyRevenue = 0;
      let dailyCapital = 0;

      transactions.forEach(tx => {
        const txDate = new Date(tx.timestamp);
        if (txDate.toDateString() === dateStringStr) {
          tx.items.forEach(it => {
            const itemCategory = getCategoryForItem(it.productId, it.name);
            if (selectedCategory === 'Semua' || itemCategory === selectedCategory) {
              dailyRevenue += it.price * it.quantity;
              dailyCapital += it.cost * it.quantity;
            }
          });
        }
      });

      const dailyProfit = dailyRevenue - dailyCapital;

      return {
        dayName: dayLabel,
        dateLabel,
        profit: dailyProfit,
        revenue: dailyRevenue,
      };
    });
  }, [transactions, selectedCategory, datePreset, customStartDate, customEndDate, products]);

  // Max daily profit to scale charts
  const maxDailyProfit = useMemo(() => {
    const profits = dailyProfitData.map(d => d.profit);
    const max = Math.max(...profits);
    return max > 0 ? max : 50000;
  }, [dailyProfitData]);

  const handleExportPDF = () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let y = 15;

      const checkPageOverflow = (heightNeeded: number) => {
        if (y + heightNeeded > 275) {
          doc.addPage();
          y = 15;
        }
      };

      // Header: Logo and Title Info
      if (tenant?.receiptLogo) {
        try {
          let format = 'PNG';
          if (tenant.receiptLogo.startsWith('data:image/jpeg') || tenant.receiptLogo.startsWith('data:image/jpg')) {
            format = 'JPEG';
          } else if (tenant.receiptLogo.startsWith('data:image/gif')) {
            format = 'GIF';
          } else if (tenant.receiptLogo.startsWith('data:image/webp')) {
            format = 'WEBP';
          }
          doc.addImage(tenant.receiptLogo, format, 15, y, 20, 20);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(tenant.name || 'TOKO KASIR CLOUD', 38, y + 6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text(tenant.address || 'Koneksi Cloud SaaS Berbasis Google Auth', 38, y + 11);
          if (tenant.phone) {
            doc.text(`Telp: ${tenant.phone}`, 38, y + 16);
          }
          y += 24;
        } catch (error) {
          console.error("PDF logo loading error:", error);
          // Fallback
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42);
          doc.text(tenant?.name || 'TOKO KASIR CLOUD', 15, y + 6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(tenant?.address || 'Koneksi Cloud SaaS Berbasis Google Auth', 15, y + 11);
          if (tenant?.phone) {
            doc.text(`Telp: ${tenant.phone}`, 15, y + 16);
          }
          y += 22;
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(tenant?.name || 'TOKO KASIR CLOUD', 15, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(tenant?.address || 'Koneksi Cloud SaaS Berbasis Google Auth', 15, y + 11);
        if (tenant?.phone) {
          doc.text(`Telp: ${tenant.phone}`, 15, y + 16);
        }
        y += 22;
      }

      // Divider Line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 6;

      // Report Header Metadata Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const periodText = datePreset === 'Semua' ? 'Semua Waktu' : datePreset === 'Kustom' ? `${customStartDate || 'Awal'} s/d ${customEndDate || 'Akhir'}` : datePreset;
      const filterText = taxFilter === 'Hanya Pajak' ? ' - HANYA nota pajak' : '';
      doc.text(`LAPORAN TRANSAKSI PENJUALAN${filterText} - ${periodText.toUpperCase()}`, 15, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Kategori Barang: ${selectedCategory}`, 15, y);
      const printedTime = new Date().toLocaleString('id-ID');
      doc.text(`Tanggal Cetak: ${printedTime}`, 130, y);
      y += 8;

      // Metrics block grid
      checkPageOverflow(50);
      
      // Card row 1
      // 1. Total Pendapatan
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(15, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('TOTAL PENDAPATAN', 18, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(formatRupiah(summary.revenue), 18, y + 12);

      // 2. Total Modal
      doc.rect(76, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('ESTIMASI MODAL', 79, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(summary.capital), 79, y + 12);

      // 3. Laba Bersih
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(187, 247, 208); // emerald-250
      doc.rect(137, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61); // emerald-700
      doc.text('LABA BERSIH', 140, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(21, 128, 61);
      doc.text(formatRupiah(summary.profit), 140, y + 12);

      y += 21;

      // Card row 2
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      
      // 4. Jumlah Transaksi
      doc.rect(15, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('BANYAK TRANSAKSI', 18, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${summary.count} Transaksi`, 18, y + 12);

      // 5. Avg Basket
      doc.rect(76, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('RATA-RATA KERANJANG', 79, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(summary.averageBasket), 79, y + 12);

      // 6. Total Item Terjual
      doc.rect(137, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL ITEM TERJUAL', 140, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${summary.itemsSold} unit`, 140, y + 12);

      y += 24;

      // Tax summary cards
      checkPageOverflow(30);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL PAJAK', 18, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(summary.taxTotal), 18, y + 12);

      doc.rect(76, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('NOTA KENA PAJAK', 79, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${summary.taxReceiptsCount} Nota`, 79, y + 12);

      doc.rect(137, y, 58, 18, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('OMZET KENA PAJAK', 140, y + 5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(summary.taxableRevenue), 140, y + 12);

      y += 24;

      // Section 1: Methods of payment
      checkPageOverflow(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('METODE PEMBAYARAN', 15, y);
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Metode Pembayaran', 18, y);
      doc.text('Frekuensi', 70, y);
      doc.text('Total Transaksi', 120, y);
      doc.text('Kontribusi (%)', 165, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      const payMethods = [
        { name: 'Tunai (Cash)', stats: paymentBreakdown.tunai },
        { name: 'QRIS (E-Wallet)', stats: paymentBreakdown.qris },
        { name: 'Kartu (Debit/Kredit)', stats: paymentBreakdown.kartu }
      ];

      payMethods.forEach((item) => {
        doc.text(item.name, 18, y);
        doc.text(`${item.stats.count} Transaksi`, 70, y);
        doc.text(formatRupiah(item.stats.value), 120, y);
        doc.text(`${item.stats.pctChange}%`, 165, y);
        y += 5.5;
      });
      y += 4;

      // Section 2: Best Selling Items
      checkPageOverflow(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('PRODUK PALING TERLARIS (TOP 5)', 15, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Nama Produk / Barang', 18, y);
      doc.text('Kuantitas Terjual', 120, y);
      doc.text('Total Uang Omset', 160, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      if (topSellers.length === 0) {
        doc.text('Belum ada transaksi produk terdaftar selama periode waktu terpilih.', 18, y);
        y += 6;
      } else {
        topSellers.forEach((prod, index) => {
          doc.text(`${index + 1}.  ${prod.name}`, 18, y);
          doc.text(`${prod.qty} unit`, 120, y);
          doc.text(formatRupiah(prod.revenue), 160, y);
          y += 5.5;
        });
      }
      y += 4;

      // Section 3: Categories Sales
      checkPageOverflow(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('PENJUALAN BERDASARKAN KATEGORI', 15, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Golongan Kategori', 18, y);
      doc.text('Kuantitas Terjual', 120, y);
      doc.text('Total Omset Kategori', 160, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      const catSales = Object.entries(salesByCategory) as Array<[string, { revenue: number; quantity: number }]>;
      if (catSales.length === 0) {
        doc.text('Tidak ada catatan penjualan per kategori dalam rentang waktu terpilih.', 18, y);
        y += 6;
      } else {
        catSales.forEach(([categoryName, data]) => {
          doc.text(categoryName, 18, y);
          doc.text(`${data.quantity} unit`, 120, y);
          doc.text(formatRupiah(data.revenue), 160, y);
          y += 5.5;
        });
      }
      y += 5;

      // Section 4: Transaction Log
      checkPageOverflow(60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('RIWAYAT TRANSAKSI TERBARU (MAKSIMAL 30 NOTA)', 15, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFontSize(8.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('ID Nota / Transaksi', 18, y);
      doc.text('Waktu Tanggal', 65, y);
      doc.text('Cara Bayar', 108, y);
      doc.text('Pajak', 145, y);
      doc.text('Total Uang Belanja', 175, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      const logToPrint = filteredHistory.slice(0, 30);
      if (logToPrint.length === 0) {
        doc.text('Belum ada riwayat transaksi lunas tercatat.', 18, y);
        y += 6;
      } else {
        logToPrint.forEach((tx) => {
          checkPageOverflow(6);
          doc.text(tx.id, 18, y);
          doc.text(new Date(tx.timestamp).toLocaleString('id-ID'), 65, y);
          doc.text(tx.paymentMethod, 108, y);
          doc.text(tx.tax > 0 ? formatRupiah(tx.tax) : '-', 145, y);
          doc.text(formatRupiah(tx.totalPrice), 175, y);
          y += 5.5;
        });
        if (filteredHistory.length > 30) {
          checkPageOverflow(8);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`... dan ${filteredHistory.length - 30} transaksi lunas lainnya disembunyikan agar dokumen tetap rapi.`, 18, y);
          y += 5;
        }
      }
      
      // Page numbers footer drawing across the whole document
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text(`Dicetak dari Kasir Portable Cloud • Halaman ${i} dari ${pageCount}`, 15, 288);
        doc.text(`ID Toko: ${tenant?.id || 'LOCAL-OFFLINE'}`, 160, 288);
      }

      // Save PDF format naming
      const formattedPeriod = periodText.replace(/ s\/d /g, '_').replace(/\s+/g, '_').toLowerCase();
      doc.save(`Laporan_Bulan_${formattedPeriod}.pdf`);

    } catch (error) {
      console.error("Gagal cetak PDF:", error);
      alert('Maaf, terjadi kesalahan saat mencoba menyusun file PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 overflow-y-auto text-slate-800" id="reports-tab-interface">
      
      {/* Date Range Picker Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm mb-4 flex flex-col gap-4 shrink-0" id="reports-date-filter-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-700 font-bold flex items-center justify-center shadow-inner shadow-indigo-100/50">
              <Calendar className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm leading-tight">Periode Waktu Laporan</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Filter semua grafik dan performa toko berdasarkan rentang waktu pilihan Anda</p>
            </div>
          </div>

          {/* Preset Buttons & Actions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none" id="date-preset-selectors">
            {(['Semua', 'Hari Ini', '7 Hari Terakhir', 'Bulan Ini', 'Kustom'] as const).map(preset => (
              <button
                key={`date-preset-${preset}`}
                onClick={() => setDatePreset(preset)}
                className={`px-3.5 py-2.5 rounded-2xl text-[11px] font-black tracking-wide transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                  datePreset === preset
                    ? 'bg-indigo-600 text-white border-indigo-650 shadow-indigo-250/20 shadow-md scale-[1.01]'
                    : 'bg-slate-100 hover:bg-slate-200 border-transparent text-slate-600'
                }`}
              >
                {preset === 'Semua' ? '🌐 Semua Waktu' : preset}
              </button>
            ))}
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="px-3.5 py-2.5 rounded-2xl text-[11px] font-black tracking-wide transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-[0.98] bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className={`w-3.5 h-3.5 ${isGeneratingPDF ? 'animate-spin' : ''}`} /> 
              {isGeneratingPDF ? 'Memproses...' : 'Cetak ke PDF'}
            </button>
          </div>
        </div>

        {/* Custom Date Picker Inputs - Expandable with micro-interactions via motion */}
        <AnimatePresence>
          {datePreset === 'Kustom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              id="custom-date-inputs-animation-wrapper"
            >
              <div 
                className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 mt-1"
                id="custom-date-inputs-panel"
              >
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Mulai:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    id="filter-start-date"
                  />
                </div>
                <div className="hidden sm:block text-slate-400 font-bold text-xs">sampai</div>
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Selesai:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    id="filter-end-date"
                  />
                </div>
                
                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-black tracking-wider uppercase px-2.5 py-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer sm:ml-auto"
                  >
                    Reset Tanggal
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Monthly Sales Target Card */}
      <div 
        className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg mb-5 flex flex-col gap-5 relative overflow-hidden shrink-0" 
        id="monthly-sales-target-card"
      >
        {/* Ambient subtle light-glow on background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        {/* Header summary metrics row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full relative z-10">
          {/* Left column: Badge & text summary */}
          <div className="flex items-start sm:items-center gap-4 w-full md:w-auto">
            <div className="bg-indigo-950 p-4 rounded-2xl text-indigo-400 border border-indigo-900 shrink-0 flex items-center justify-center shadow-lg">
              <Target className="w-7 h-7 stroke-[2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] bg-indigo-950 text-indigo-300 px-3 py-1 rounded-xl border border-indigo-900/60 uppercase tracking-widest font-black">
                  Target Penjualan Bulanan
                </span>
                {targetProgress >= 100 && (
                  <span className="flex items-center gap-1.5 text-[9px] bg-emerald-950 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-900/40 uppercase tracking-wider font-extrabold animate-pulse">
                    <Award className="w-3.5 h-3.5 text-emerald-400" /> Target Tercapai 🎉
                  </span>
                )}
              </div>
              
              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="text-2xl font-black font-mono tracking-tight text-white">{formatRupiah(currentMonthRevenue)}</span>
                <span className="text-xs text-slate-400 font-bold">dari target</span>
                
                {isEditingTarget ? (
                  <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                    <input
                      type="number"
                      value={tempTargetInput}
                      onChange={(e) => setTempTargetInput(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-indigo-500/40 font-mono text-xs focus:ring-2 focus:ring-indigo-550 focus:outline-none"
                      placeholder="Nilai target Rupiah"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTarget}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white cursor-pointer transition-colors shadow-sm"
                      title="Simpan Target"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTarget(false);
                        setTempTargetInput(monthlyTarget.toString());
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-705 rounded-xl text-slate-350 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-indigo-400 font-mono">{formatRupiah(monthlyTarget)}</span>
                    <button
                      onClick={() => {
                        setIsEditingTarget(true);
                        setTempTargetInput(monthlyTarget.toString());
                      }}
                      className="p-1 px-3 bg-indigo-950/80 hover:bg-indigo-900/90 rounded-xl text-[9px] font-black tracking-wider uppercase text-indigo-300 cursor-pointer transition-all border border-indigo-900/50 hover:border-indigo-800 flex items-center gap-1 active:scale-95"
                      title="Ubah Target Penjualan"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10.5px] text-slate-300 mt-2 font-bold leading-relaxed">
                {targetProgress >= 100 
                  ? `Selamat! Omset toko berhasil melewati target bulanan sebesar ${formatRupiah(currentMonthRevenue - monthlyTarget)}!` 
                  : `Butuh ${formatRupiah(targetRemaining)} lagi untuk mencapai target omset bulan ini.`}
              </p>
            </div>
          </div>

          {/* Right column: Progress Ring graphic & percentage indicators */}
          <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-4 md:pt-0 shrink-0">
            <div className="flex flex-col items-end text-right">
              <span className="text-[32px] font-black font-mono tracking-tighter text-indigo-300 leading-none">{targetProgress}%</span>
              <span className="text-[8.5px] text-slate-400 font-black tracking-widest uppercase mt-1">Tingkat Pencapaian</span>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="relative w-16 h-16 shrink-0 flex items-center justify-center"
              id="target-progress-ring-svg"
            >
              <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="rgba(99, 102, 241, 0.1)"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Foreground circle with dash-offset */}
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={targetProgress >= 100 ? "#10B981" : "#6366f1"}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - targetProgress / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {targetProgress >= 100 ? (
                  <span className="text-emerald-400 text-lg">⭐</span>
                ) : (
                  <span className="text-indigo-400 text-sm font-black">🎯</span>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Slim separator line */}
        <div className="border-t border-slate-800/80 w-full relative z-10" />

        {/* NEW Component: Daily target comparison graph bar chart */}
        <div className="w-full relative z-10 flex flex-col gap-2" id="daily-sales-target-breakdown-panel">
          <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-black uppercase tracking-wider px-1">
            <span>Performa Omset Harian vs Target Harian: {formatRupiah(dailySalesBreakdown.dailyTarget)}</span>
            <span className="text-indigo-400 hidden sm:inline">Sentuh Batang Untuk Selisih Real-time</span>
          </div>

          <div className="w-full bg-slate-950/30 border border-slate-800/50 rounded-2xl p-2.5 flex flex-col justify-end min-h-[142px] relative">
            
            {/* Horizontal Target Baseline Marker Grid */}
            <div className="absolute left-0 right-0 border-t border-dashed border-indigo-500/15 z-0 top-[38%] pointer-events-none" />
            <div className="absolute right-3 top-[38%] -translate-y-1/2 bg-slate-950/90 text-[7px] text-indigo-300 border border-indigo-950/80 font-mono font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider z-15 pointer-events-none">
              Garis Target Harian
            </div>

            {/* Bars row */}
            <div className="flex items-end justify-between gap-[2px] sm:gap-[4px] h-20 w-full relative z-10 px-0.5 mt-1.5">
              {dailySalesBreakdown.breakdown.map((item) => {
                // Visual height capping representation at max 150% of the daily target for extreme sales spikes
                const renderHeight = item.revenue === 0 ? 4 : Math.min(100, Math.max(8, (item.revenue / (dailySalesBreakdown.dailyTarget * 1.5)) * 100));
                const isCurrentDate = item.day === dailySalesBreakdown.activeDay;

                return (
                  <div
                    key={`daily-bar-${item.day}`}
                    className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                    onMouseEnter={() => setHoveredDay(item.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => setHoveredDay(item.day)}
                  >
                    {/* Visual Pillar */}
                    <div
                      style={{ height: `${renderHeight}%` }}
                      className={`w-full rounded-t transition-all duration-300 ${
                        isCurrentDate 
                          ? 'ring-[1.5px] ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.3)] bg-gradient-to-t from-amber-600 to-amber-350' 
                          : item.revenue === 0
                            ? 'bg-slate-800/60 hover:bg-slate-700/80'
                            : item.meetsTarget
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-350 shadow-[0_0_8px_rgba(16,185,129,0.25)] hover:scale-x-105'
                              : 'bg-gradient-to-t from-indigo-650 to-indigo-500 group-hover:from-indigo-550 group-hover:to-indigo-400 hover:scale-x-105'
                      }`}
                    />
                    
                    {/* Day index number */}
                    <span className={`text-[8px] font-mono mt-1.5 ${isCurrentDate ? 'text-amber-450 font-black' : 'text-slate-500'}`}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Hover Caption Panel */}
            <div className="h-5.5 mt-3.5 flex items-center justify-center font-mono text-[9px] text-slate-300 border-t border-slate-900/60 pt-2.5 shrink-0 z-10 select-none">
              {hoveredDay !== null ? (
                (() => {
                  const dayItem = dailySalesBreakdown.breakdown[hoveredDay - 1];
                  const diff = dayItem.revenue - dailySalesBreakdown.dailyTarget;
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">Hari Ke-{hoveredDay}:</span>
                      <span className="text-white font-extrabold">{formatRupiah(dayItem.revenue)}</span>
                      <span className="text-slate-500 font-normal">|</span>
                      <span className={dayItem.meetsTarget ? 'text-emerald-400 font-extrabold' : 'text-indigo-405 font-bold'}>
                        {dayItem.percent}% dari Target
                      </span>
                      <span className="text-slate-500 font-normal">|</span>
                      <span className={diff >= 0 ? 'text-emerald-450 font-black' : 'text-rose-450 font-medium'}>
                        {diff >= 0 ? `+${formatRupiah(diff)} 🎉` : `${formatRupiah(diff)} ⏳`}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-450 font-semibold flex items-center gap-1.5 text-[8.5px] uppercase tracking-wider">
                  <span>Siklus Bulan Ini: Hari ke-1 s/d hari ke-{dailySalesBreakdown.totalDays}</span>
                  <span className="text-slate-700">•</span>
                  <span>Sentuh pilar batang untuk melihat detail margin harian</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Selector Section */}
      <div className="bg-white p-4 rounded-3xl border border-slate-150 shadow-sm mb-5 flex flex-col gap-4 shrink-0" id="reports-category-filter-card">
        
        {/* Tax Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-150">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-700 font-bold flex items-center justify-center shadow-inner shadow-emerald-100/50">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm leading-tight">Filter Pajak</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Tampilkan semua nota atau hanya nota yang dikenakan pajak</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none" id="reports-tax-filter-chips">
            {(['Semua', 'Hanya Pajak'] as const).map(filter => (
              <button
                key={`tax-filter-${filter}`}
                onClick={() => setTaxFilter(filter)}
                className={`px-4 py-2.5 rounded-2xl text-[11px] font-black tracking-wide transition-all duration-150 shadow-sm cursor-pointer whitespace-nowrap border active:scale-[0.98] ${
                  taxFilter === filter
                    ? 'bg-emerald-600 text-white border-emerald-650 shadow-emerald-200 shadow-md scale-[1.01]'
                    : 'bg-white text-slate-605 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {filter === 'Semua' ? '🌐 Semua Nota' : '🧾 Hanya Pajak'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-700 font-bold flex items-center justify-center shadow-inner shadow-indigo-100/50">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm leading-tight">Filter Kategori</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Analisis performa per kelompok barang secara real-time</p>
            </div>
          </div>

          {/* Dynamic Horizontal Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none" id="reports-category-chips">
          {categoriesList.map(category => (
            <button
              key={`rep-cat-${category}`}
              onClick={() => setSelectedCategory(category)}
              className={`px-4.5 py-2.5 rounded-2xl text-[11px] font-black tracking-wide transition-all duration-150 shadow-sm cursor-pointer whitespace-nowrap border active:scale-[0.98] ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white border-indigo-650 shadow-indigo-200 shadow-md scale-[1.01]'
                  : 'bg-white text-slate-605 hover:bg-slate-50 border-slate-200'
              }`}
            >
              {category === 'Semua' ? '🌐 Kategori: Semua' : `${category}`}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* --- TAX ANALYTICS DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5" id="tax-analytics-dashboard">
        {/* Total Tax Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-3xl text-white shadow-lg border border-emerald-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <Coins className="w-6 h-6 text-emerald-100" />
            </div>
            <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-lg uppercase tracking-widest">Global PPN 11%</span>
          </div>
          <h3 className="text-[11px] font-bold text-emerald-100/80 uppercase tracking-widest mb-1">Total Pajak Terkumpul</h3>
          <p className="text-3xl font-black">{formatRupiah(summary.taxTotal)}</p>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-bold">
            <span className="text-emerald-100/60">Berdasarkan {summary.taxReceiptsCount} Nota</span>
            <span className="bg-emerald-400/20 text-emerald-100 px-2 py-0.5 rounded-md">Periode ini</span>
          </div>
        </div>

        {/* Taxable Turnover Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-50 p-2.5 rounded-2xl">
                <ShoppingBag className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Omzet Kena Pajak</p>
                <p className="text-lg font-black text-slate-800">{formatRupiah(summary.taxableRevenue)}</p>
              </div>
            </div>
            <div className="space-y-3 mt-2">
               <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Rasio Nota Pajak</span>
                  <span className="text-indigo-600">{summary.taxSharePercent}%</span>
               </div>
               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-700" style={{ width: `${summary.taxSharePercent}%` }}></div>
               </div>
            </div>
          </div>
        </div>

        {/* Tax by Category Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Pajak per Kategori</h4>
          <div className="space-y-3 overflow-y-auto max-h-[120px] scrollbar-none pr-1">
            {Object.keys(taxByCategory).length === 0 ? (
              <p className="text-[10px] text-slate-400 italic py-4 text-center">Belum ada data pajak per kategori.</p>
            ) : (
              (Object.entries(taxByCategory) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .map(([cat, val]) => (
                  <div key={`tax-cat-${cat}`} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-700 truncate mr-2">{cat}</span>
                      <span className="text-emerald-600 shrink-0">{formatRupiah(Math.round(val))}</span>
                    </div>
                    <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${summary.taxTotal > 0 ? ((val as number) / summary.taxTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-5" id="tax-report-summary-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Laporan Nota Pajak</h3>
            <p className="text-[10px] text-slate-500 mt-1">Daftar transaksi dengan pajak pada periode dan kategori yang dipilih.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100">
               PAJAK: {tenant?.taxMethod === 'include' ? 'INCLUDE' : 'EXCLUDE'} ({tenant?.taxPercentage ?? 0}%)
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{taxReceiptTransactions.length} Nota Pajak</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">{formatRupiah(summary.taxTotal)} Pajak</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{formatRupiah(taxReceiptTransactions.reduce((sum, tx) => sum + (tx.totalPrice ?? 0), 0))} Omset</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border-collapse" id="tax-receipts-table">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <th className="py-3 px-3">ID Nota</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Metode</th>
                <th className="py-3 px-3 text-right">Pajak</th>
                <th className="py-3 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {taxReceiptTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-3 text-center text-slate-400 text-xs font-semibold">
                    Tidak ada transaksi pajak yang cocok untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                taxReceiptTransactions.slice(0, 8).map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-700">#{tx.id.split('-').slice(-1)[0]}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(tx.timestamp).split(',')[0]}</td>
                    <td className="py-3 px-3 text-slate-600">{tx.paymentMethod}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatRupiah(tx.tax ?? 0)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">{formatRupiah(tx.totalPrice)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upper Cards row of statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-5" id="reporting-metrics-summary">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-revenue">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Omset (Kotor)</span>
          <h4 className="text-base font-extrabold text-slate-805 mt-1">{formatRupiah(summary.revenue)}</h4>
          <span className="text-[9px] text-slate-400 mt-2">Seluruh pemasukan</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-profit">
          <span className="text-[10px] text-[#10B981] font-bold uppercase tracking-wider">Laba Bersih</span>
          <h4 className="text-base font-black text-emerald-600 mt-1">{formatRupiah(summary.profit)}</h4>
          <span className="text-[9px] text-[#10B981] font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md mt-2 self-start">
            Margin {summary.revenue > 0 ? Math.round((summary.profit / summary.revenue) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-transactions">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Transaksi</span>
          <h4 className="text-base font-extrabold text-slate-805 mt-1">{summary.count}x</h4>
          <span className="text-[9px] text-slate-400 mt-2">Nota belanja dibuat</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-items-sold">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Barang Terjual</span>
          <h4 className="text-base font-extrabold text-slate-805 mt-1">{summary.itemsSold} pcs</h4>
          <span className="text-[9px] text-slate-400 mt-2">Volume produk keluar</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-average-basket">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rata-rata Keranjang</span>
          <h4 className="text-sm font-bold text-slate-800 mt-1">{formatRupiah(summary.averageBasket)}</h4>
          <span className="text-[9px] text-slate-400 mt-2">Nilai belanja per nota</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-capital">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Modal Terbayar</span>
          <h4 className="text-sm font-bold text-slate-600 mt-1">{formatRupiah(summary.capital)}</h4>
          <span className="text-[9px] text-slate-400 mt-2">Harga beli barang terjual</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-tax">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pajak</span>
          <h4 className="text-base font-extrabold text-slate-805 mt-1">{formatRupiah(summary.taxTotal)}</h4>
          <span className="text-[9px] text-slate-400 mt-2">Pajak yang dikumpulkan selama periode</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="report-stat-tax-receipts">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nota Kena Pajak</span>
          <h4 className="text-base font-extrabold text-slate-805 mt-1">{summary.taxReceiptsCount}x</h4>
          <span className="text-[9px] text-slate-400 mt-2">{summary.taxSharePercent}% dari transaksi</span>
        </div>

      </div>

      {/* Grid of Custom Graph Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        
        {/* Real-time Sales hourly Trend graph (custom stylized responsive SVG line chart) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm lg:col-span-8 flex flex-col" id="sales-trend-graph">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Grafik Tren Penjualan Operasional</h4>
              <p className="text-[10px] text-slate-400">Total akumulasi transaksi per jam (08:00 - 21:00) pada rentang waktu terpilih</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-1.5 px-2.5 text-xs text-indigo-750 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Terkini
            </div>
          </div>

          <div className="h-44 w-full relative flex items-end pt-5 pb-2" id="trend-line-svg-container">
            {summary.revenue === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-mono italic">
                Belum ada data transaksi masuk malam ini.
              </div>
            ) : (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 540 120" preserveAspectRatio="none">
                {/* Horizontal guide grids */}
                <line x1="0" y1="3" x2="540" y2="3" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="40" x2="540" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="80" x2="540" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="120" x2="540" y2="120" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Generates standard responsive polyline */}
                {(() => {
                  const points = salesByHourArray.map((point, index) => {
                    const x = (index / (salesByHourArray.length - 1)) * 540;
                    const normalizedValue = point.value / maxSalesInHour;
                    // Y grows downward in SVG, so subtract from max height (120 - scaledVal)
                    const y = 120 - (normalizedValue * 105) - 5;
                    return `${x},${y}`;
                  }).join(' ');

                  // Fill area gradient points path
                  const fillPoints = `0,120 ${points} 540,120`;

                  return (
                    <>
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>
                      {/* Area block Indigo */}
                      <polygon points={fillPoints} fill="url(#chart-grad)" />
                      {/* Solid Line stroke */}
                      <polyline points={points} fill="none" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Interactive Point indicators */}
                      {salesByHourArray.map((point, index) => {
                        const x = (index / (salesByHourArray.length - 1)) * 540;
                        const y = 120 - ((point.value / maxSalesInHour) * 105) - 5;
                        if (point.value <= 0) return null;
                        return (
                          <g key={`gpt-${index}`} className="group/dot cursor-pointer">
                            <circle cx={x} cy={y} r="5" fill="#4F46E5" stroke="#ffffff" strokeWidth="2" className="shadow" />
                            <circle cx={x} cy={y} r="8" fill="#4F46E5" opacity="0.15" className="animate-ping" />
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>

          {/* X axis labels (Hour ranges) */}
          <div className="flex justify-between px-1 text-[9px] font-bold text-slate-400 font-mono border-t border-slate-100 pt-1.5 mt-1">
            {salesByHourArray.filter((_, idx) => idx % 2 === 0).map((pt, idx) => (
              <span key={`lbl-${idx}`}>{pt.hour}</span>
            ))}
          </div>
        </div>

        {/* Payment and Category breakdown right bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between" id="payment-mix-reporting">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm mb-0.5">Komposisi Pembayaran</h4>
            <p className="text-[10px] text-slate-400 mb-4 font-medium">Metode transaksi paling sering dipakai pelanggan</p>
          </div>

          <div className="space-y-4 py-1 flex-1 flex flex-col justify-center">
            
            {/* Tunai progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">🪙 Tunai</span>
                <span className="font-mono text-emerald-600">{formatRupiah(paymentBreakdown.tunai.value)} <span className="text-slate-400 font-normal">({paymentBreakdown.tunai.pctChange}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.tunai.pctChange}%` }}
                ></div>
              </div>
            </div>

            {/* QRIS progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">📱 QRIS Dompet Digital</span>
                <span className="font-mono text-emerald-600">{formatRupiah(paymentBreakdown.qris.value)} <span className="text-slate-400 font-normal">({paymentBreakdown.qris.pctChange}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.qris.pctChange}%` }}
                ></div>
              </div>
            </div>

            {/* Debit Card progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">💳 Kartu Debit/Kredit</span>
                <span className="font-mono text-emerald-600">{formatRupiah(paymentBreakdown.kartu.value)} <span className="text-slate-400 font-normal">({paymentBreakdown.kartu.pctChange}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.kartu.pctChange}%` }}
                ></div>
              </div>
            </div>

          </div>

          <p className="text-[9px] text-slate-400 font-medium font-mono text-center pt-2 mt-2 border-t border-slate-50">
            Total Transaksi Masuk: {transactions.length} kali
          </p>
        </div>

      </div>

      {/* Daily Profit Bar Chart (Laba Bersih Harian) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-250/60 shadow-md mb-5 flex flex-col transition-all duration-200 animate-fade-in" id="daily-profit-bar-chart">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm">📊</span>
              <h4 className="font-extrabold text-[#111827] text-sm tracking-tight">
                Grafik Laba Bersih Harian ({datePreset === 'Semua' ? '7 Hari Terakhir' : datePreset === 'Kustom' ? 'Periode Kustom' : datePreset})
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">
              Total keuntungan bersih toko setelah memangkas modal beli item {selectedCategory !== 'Semua' ? `(Khusus kategori: ${selectedCategory})` : ''}
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 rounded-2xl p-2.5 px-4 text-[10.5px] font-black flex items-center gap-2.5 shadow-sm border border-emerald-100/50">
            <Coins className="w-4 h-4 text-emerald-600" /> Total Laba Periode Ini: <span className="font-mono text-emerald-700 bg-white/80 px-2 py-0.5 rounded-lg border border-emerald-100">{formatRupiah(summary.profit)}</span>
          </div>
        </div>

        <div className="h-48 w-full relative flex flex-col justify-end pt-5 pb-2" id="profit-bar-svg-container">
          {summary.profit === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 font-mono italic p-6 text-center gap-2">
              <span>📭 Belum ada data keuntungan untuk kategori "{selectedCategory}" pada rentang waktu ini.</span>
              <span className="text-[10px] text-slate-400/80 font-normal">Buat transaksi baru di tab Kasir atau pilih kategori lain!</span>
            </div>
          ) : (
            <div className="w-full h-full relative" id="bar-chart-rendered-svg">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 540 120" preserveAspectRatio="none">
                {/* Horizontal guide grids with soft dash */}
                <line x1="0" y1="3" x2="540" y2="3" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="40" x2="540" y2="40" stroke="#f8fafc" strokeWidth="1" />
                <line x1="0" y1="80" x2="540" y2="80" stroke="#f8fafc" strokeWidth="1" />
                <line x1="0" y1="120" x2="540" y2="120" stroke="#e2e8f0" strokeWidth="1.5" />

                {dailyProfitData.map((data, index) => {
                  const totalBars = dailyProfitData.length;
                  const colSpacing = 540 / totalBars;
                  // Auto-scale width of bars dynamically depending on screen density
                  const barWidth = Math.min(32, Math.max(10, Math.floor(colSpacing * 0.5)));
                  const x = (index * colSpacing) + (colSpacing / 2) - (barWidth / 2);
                  
                  const activeHeight = (data.profit / maxDailyProfit) * 105;
                  const clampedHeight = Math.max(activeHeight > 0 ? activeHeight : 0, data.profit > 0 ? 4 : 0);
                  const y = 120 - clampedHeight;

                  return (
                    <g key={`bar-group-${index}`} className="group/bar cursor-pointer">
                      {/* Invisible hover helper for massive hover zone */}
                      <rect
                        x={x - Math.max(2, (colSpacing - barWidth) / 2)}
                        y="0"
                        width={colSpacing}
                        height="120"
                        fill="transparent"
                        className="peer"
                      />

                      {/* Foreground profit bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={clampedHeight}
                        rx={barWidth > 12 ? "6" : "3"}
                        ry={barWidth > 12 ? "6" : "3"}
                        fill={data.profit > 0 ? "url(#bar-indigo-grad)" : "#e2e8f0"}
                        className="transition-all duration-300 hover:brightness-110 shadow-sm"
                      />

                      {/* Spark glow ring around hovered bar */}
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={barWidth + 4}
                        height={clampedHeight + 4}
                        rx={barWidth > 12 ? "8" : "4"}
                        ry={barWidth > 12 ? "8" : "4"}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="2"
                        className="opacity-0 group-hover/bar:opacity-40 transition-opacity duration-200 pointer-events-none"
                      />

                      {/* Interactive floating bubble indicator on hover */}
                      <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                        {/* Shadow Speech Bubble card background */}
                        <g transform={`translate(${Math.max(10, Math.min(x - 39, 540 - 120))}, ${Math.max(0, y - 32)})`}>
                          <rect
                            width="110"
                            height="24"
                            rx="8"
                            fill="#1e293b"
                            className="shadow-2xl opacity-95"
                          />
                          <text
                            x="55"
                            y="15"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="black"
                            textAnchor="middle"
                            fontFamily="monospace, sans-serif"
                          >
                            {formatRupiah(data.profit)}
                          </text>
                        </g>
                      </g>

                      {/* Flat quick-read value above bars, only show if not overly crowded */}
                      {data.profit > 0 && totalBars <= 10 && (
                        <text
                          x={x + (barWidth / 2)}
                          y={y - 6}
                          textAnchor="middle"
                          fontSize="8px"
                          fontWeight="black"
                          className="fill-indigo-700/85 font-mono"
                        >
                          {data.profit >= 1000 ? `+${Math.round(data.profit / 1000)}k` : `+${data.profit}`}
                        </text>
                      )}
                    </g>
                  );
                })}

                <defs>
                  <linearGradient id="bar-indigo-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
        </div>

        {/* X-axis indicators for Daily Profit Bars, self-hiding dense text with beautiful circular dots */}
        <div className="flex justify-between text-[11px] font-black text-slate-500 font-mono border-t border-slate-100 pt-3.5 mt-2 select-none gap-1">
          {dailyProfitData.map((data, index) => {
            const totalBars = dailyProfitData.length;
            // Adaptive logic to hide labels on dense views to keep design pristine
            const showLabel = totalBars <= 8 || 
                              (totalBars <= 15 && index % 2 === 0) || 
                              (totalBars > 15 && index % 4 === 0) || 
                              index === totalBars - 1;

            return (
              <div key={`lbl-day-${index}`} className="flex flex-col items-center flex-1 text-center group">
                {showLabel ? (
                  <>
                    <span className="text-slate-800 font-extrabold group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-[10px]">
                      {totalBars <= 8 ? data.dayName : data.dateLabel.split(' ')[0]}
                    </span>
                    <span className="text-[8.5px] text-slate-400 font-extrabold mt-0.5">
                      {totalBars <= 8 ? data.dateLabel : data.dateLabel.split(' ')[1]}
                    </span>
                  </>
                ) : (
                  <div className="h-6 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors"></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of Best Sellers and Historic Transaction Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Best seller products list */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm lg:col-span-5 flex flex-col" id="best-sellers-card">
          <h4 className="font-extrabold text-slate-805 text-sm mb-0.5">5 Produk Terlaris (Best Seller)</h4>
          <p className="text-[10px] text-slate-400 mb-3">Barang yang paling banyak diborong pembeli</p>

          <div className="flex-1 divide-y divide-slate-100 flex flex-col justify-center">
            {topSellers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic font-mono">
                Belum ada penjualan tercatat harian.
              </div>
            ) : (
              topSellers.map((item, idx) => (
                <div key={`best-${idx}`} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-lg bg-slate-50 p-1.5 rounded-xl block border border-slate-100 select-none">{item.emoji}</span>
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-755 truncate leading-none">{item.name}</h5>
                      <span className="text-[10px] text-emerald-600 font-bold tracking-tight">{formatRupiah(item.revenue)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-right">
                    <span className="font-black text-slate-800 text-sm">{item.qty}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">pcs</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History Transactions Logger Section */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm lg:col-span-15 overflow-hidden flex flex-col" id="history-logs-box">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3.5">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Riwayat Transaksi Real-time</h4>
              <p className="text-[10px] text-slate-400 font-medium">Klik pada baris nota untuk mencetak ulang atau melihat e-receipt pembeli</p>
            </div>
            
            {/* Search filter in histories */}
            <input 
              type="text" 
              placeholder="Cari ID nota atau metode..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] outline-none focus:ring-2 focus:ring-indigo-550 w-full sm:w-48 transition-colors max-w-full font-semibold text-slate-705"
              id="history-filter-input"
            />
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-64 flex-1">
            <table className="w-full text-left border-collapse" id="history-transactions-table">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-150">
                  <th className="py-2.5 px-3">ID Nota</th>
                  <th className="py-2.5 px-3">Jam (WIB)</th>
                  <th className="py-2.5 px-3">Kasir</th>
                  <th className="py-2.5 px-3 text-center text-ellipsis">Metode</th>
                  <th className="py-2.5 px-3 text-right">Jumlah Item</th>
                  <th className="py-2.5 px-3 text-right">Pajak</th>
                  <th className="py-2.5 px-3 text-right">Total Transaksi</th>
                  <th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                      Tidak ada transaksi yang cocok / belum ada aktivitas kasir hari ini.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(tx => (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedTransaction(tx)}
                      className="hover:bg-indigo-50/20 active:bg-indigo-50/40 transition-colors cursor-pointer"
                      id={`history-row-${tx.id}`}
                    >
                      <td className="py-2 px-3 font-mono text-indigo-600 font-bold">#{tx.id.split('-').slice(-1)[0]}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono font-medium">{formatDate(tx.timestamp).split(',')[1] || formatDate(tx.timestamp)}</td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[80px]" title={tx.cashierName || 'Kasir Default'}>{tx.cashierName || 'Kasir Default'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold mx-auto block w-max ${
                          tx.paymentMethod === 'Tunai' 
                            ? 'bg-amber-100 text-amber-700' 
                            : tx.paymentMethod === 'QRIS'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {tx.items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                      </td>
                      <td className="py-2 px-3 text-right">
                        {tx.tax > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">Ya</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold">Tidak</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600 font-black font-mono">
                        {formatRupiah(tx.totalPrice)}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400 font-normal">
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- RECEIPT MODAL DETAILED IN POPUP --- */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" id="history-receipt-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-slate-850 my-auto text-left relative overflow-hidden"
              id="history-receipt-popup"
            >
              {/* Paper Roll Mock styling */}
              <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-b from-slate-200 to-transparent"></div>
              
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 transition-colors rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mt-3 mb-4">
                {tenant?.receiptLogo ? (
                  <img 
                    src={tenant.receiptLogo} 
                    alt="Logo Toko" 
                    className="max-h-20 max-w-full object-contain mb-1.5"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Receipt className="w-8 h-8 text-indigo-600 mb-1" />
                )}
                <h4 className="font-black text-slate-850 text-sm tracking-wide uppercase">
                  {tenant?.name || "WARUNG KELONTONG REJEKI"}
                </h4>
                {selectedTransaction.tax > 0 && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1">
                    Nota Kena Pajak
                  </span>
                )}
                <div className="text-[9.5px] text-slate-400 max-w-[240px] mt-1 font-medium leading-normal whitespace-pre-line">
                  {tenant?.address || "Jl. Maju Bersama No. 99, Bandung"}
                  {tenant?.phone ? (
                    <div className="mt-0.5">Telp: {tenant.phone}</div>
                  ) : (
                    <div className="mt-0.5">Telp: 0812-3456-7890</div>
                  )}
                </div>
              </div>

              {/* Receipt divider */}
              <div className="border-t border-dashed border-slate-300 my-3"></div>

              {/* Info meta detail */}
              <div className="space-y-1 text-[10px] font-mono text-slate-500 font-semibold uppercase">
                <div className="flex justify-between">
                  <span>Nota ID</span>
                  <span className="text-slate-800 font-bold">#{selectedTransaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal</span>
                  <span className="text-slate-800">{formatDate(selectedTransaction.timestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir</span>
                  <span className="text-slate-800">{(selectedTransaction as any).cashierName || localStorage.getItem('pos_cashier_name') || 'Kasir'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cara Bayar</span>
                  <span className="text-slate-800 font-bold">{selectedTransaction.paymentMethod}</span>
                </div>
              </div>

              {/* Receipt divider */}
              <div className="border-t border-dashed border-slate-300 my-3"></div>

              {/* Items listing */}
              <div className="space-y-3 ps-1" id="printed-receipt-items">
                {selectedTransaction.items.map((item, id) => (
                  <div key={`rcp-it-${id}`} className="flex flex-col text-xs font-semibold">
                    <div className="flex justify-between items-start text-slate-805 leading-tight">
                      <span className="truncate pr-4 flex-1">{item.name}</span>
                      <span className="font-mono">{formatRupiah(item.price * item.quantity)}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 font-semibold mt-0.5">
                      {item.quantity} pcs x {formatRupiah(item.price)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Receipt divider */}
              <div className="border-t border-dashed border-slate-300 my-4"></div>

              {/* Financial calculations */}
              <div className="space-y-1.5 text-xs font-semibold uppercase font-mono">
                
                {/* Subtotal */}
                <div className="flex justify-between text-slate-500">
                  <span>Total Harga</span>
                  <span className="text-slate-805">{formatRupiah(selectedTransaction.totalPrice)}</span>
                </div>

                {selectedTransaction.tax > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Pajak</span>
                    <span className="text-slate-805">{formatRupiah(selectedTransaction.tax)}</span>
                  </div>
                )}

                {/* Amount Paid */}
                <div className="flex justify-between text-slate-500">
                  <span>Uang Diterima</span>
                  <span className="text-slate-805">{formatRupiah(selectedTransaction.amountPaid)}</span>
                </div>

                <div className="border-t border-dashed border-slate-200 my-1"></div>

                {/* Kembalian / Change change */}
                <div className="flex justify-between text-slate-805 font-black text-sm">
                  <span>Kembalian</span>
                  <span className="text-indigo-650 font-extrabold">{formatRupiah(selectedTransaction.change)}</span>
                </div>

              </div>

              {/* Receipt divider */}
              <div className="border-t border-dashed border-slate-300 my-4"></div>

              {/* Footer messages */}
              <div className="text-center text-[10px] text-slate-400 font-bold flex flex-col items-center">
                <span className="uppercase tracking-wider font-mono">=== SUKSES LUNAS ===</span>
                <div className="mt-1.5 font-sans leading-relaxed text-slate-500 whitespace-pre-line select-text max-w-[250px]">
                  {tenant?.receiptFooter || "Terima kasih atas kunjungan Anda!\nBarang yang dibeli tidak dapat ditukar."}
                </div>
                <div 
                  onClick={() => {
                    const addr = tenant?.printerAddress || '58:56:00:11:22:33';
                    const autocutMsg = tenant?.printerAutoCut !== false 
                      ? ' & mengaktifkan pisau pemotong otomatis (Auto-Cut).' 
                      : ' (sobek kertas manual).';
                    alert(`[SIMULASI RE-PRINT BLUETOOTH]
Menghubungkan kembali ke printer [${addr}]... OK!
Mengirim ulang data salinan nota transaksi... OK!
Hasil cetak salinan nota berhasil diterbitkan${autocutMsg}`);
                  }}
                  className="bg-indigo-50 p-2.5 rounded-2xl border border-indigo-150 mt-3 hover:bg-indigo-100 cursor-pointer text-indigo-750 flex items-center gap-1.5 transition-all text-[9.5px] w-full justify-center font-extrabold shadow-sm shadow-indigo-50"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" /> CETAK NOTA KASIR DENGAN BLUETOOTH PRINTER
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
