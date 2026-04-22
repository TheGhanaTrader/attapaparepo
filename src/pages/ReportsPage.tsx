import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, CreditCard, Package, Users, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailySale {
  day: string;
  total: number;
  cash: number;
  credit: number;
  count: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [summary, setSummary] = useState({ totalSales: 0, cashSales: 0, creditSales: 0, totalReturns: 0, totalDebts: 0, topProducts: [] as { name: string; count: number }[] });

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [salesRes, returnsRes, debtsRes, topProductsRes] = await Promise.all([
      supabase.from('sales').select('total_amount, payment_type, created_at').gte('created_at', since).eq('status', 'completed'),
      supabase.from('returns').select('total_refund').gte('created_at', since),
      supabase.from('fair_guys').select('total_owed').eq('is_active', true),
      supabase.from('sale_items').select('product_id, quantity, product:products(car_make, car_model, light_type)').gte('created_at', since),
    ]);

    const sales = salesRes.data || [];
    const totalSales = sales.reduce((s, r) => s + Number(r.total_amount), 0);
    const cashSales = sales.filter(r => r.payment_type === 'cash').reduce((s, r) => s + Number(r.total_amount), 0);
    const creditSales = sales.filter(r => r.payment_type === 'credit').reduce((s, r) => s + Number(r.total_amount), 0);
    const totalReturns = (returnsRes.data || []).reduce((s, r) => s + Number(r.total_refund), 0);
    const totalDebts = (debtsRes.data || []).reduce((s, r) => s + Number(r.total_owed), 0);

    // Build product map for top products
    const productMap: Record<string, { name: string; count: number }> = {};
    (topProductsRes.data || []).forEach(item => {
      const prod = item.product as { car_make?: string; car_model?: string; light_type?: string } | null;
      if (prod && item.product_id) {
        const name = `${prod.car_make} ${prod.car_model} (${prod.light_type})`;
        if (!productMap[item.product_id]) productMap[item.product_id] = { name, count: 0 };
        productMap[item.product_id].count += item.quantity;
      }
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 8);

    // Build daily data
    const byDay: Record<string, DailySale> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      byDay[d] = { day: d, total: 0, cash: 0, credit: 0, count: 0 };
    }
    sales.forEach(s => {
      const d = s.created_at.split('T')[0];
      if (byDay[d]) {
        byDay[d].total += Number(s.total_amount);
        byDay[d].count += 1;
        if (s.payment_type === 'cash') byDay[d].cash += Number(s.total_amount);
        else byDay[d].credit += Number(s.total_amount);
      }
    });
    setDailySales(Object.values(byDay));
    setSummary({ totalSales, cashSales, creditSales, totalReturns, totalDebts, topProducts });
    setLoading(false);
  };

  const fmt = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  const maxVal = Math.max(...dailySales.map(d => d.total), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900">Reports</h3>
          <p className="text-slate-500 text-sm">Financial and inventory analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Revenue', value: fmt(summary.totalSales), icon: TrendingUp, color: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Cash Sales', value: fmt(summary.cashSales), icon: TrendingUp, color: 'bg-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Credit Sales', value: fmt(summary.creditSales), icon: CreditCard, color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Total Returns', value: fmt(summary.totalReturns), icon: Package, color: 'bg-slate-500', text: 'text-slate-600', bg: 'bg-slate-50' },
              { label: 'Outstanding Debts', value: fmt(summary.totalDebts), icon: Users, color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.bg}`}>
                    <Icon size={18} className={card.text} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Sales Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-bold text-slate-900">Sales Trend ({period})</h4>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />Total</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Cash</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Credit</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-48 overflow-x-auto">
              {dailySales.map((day, i) => {
                const heightPct = (day.total / maxVal) * 100;
                const cashPct = day.total > 0 ? (day.cash / day.total) * 100 : 0;
                const isRecent = i >= dailySales.length - 7;
                return (
                  <div key={day.day} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
                    <div
                      className="w-full bg-blue-100 rounded-t-md transition-all hover:bg-blue-200 cursor-pointer relative overflow-hidden"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${day.day}: ${fmt(day.total)}`}
                    >
                      {day.total > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-emerald-400 rounded-t-md"
                          style={{ height: `${cashPct}%` }}
                        />
                      )}
                    </div>
                    {(period === '7d' || (period === '30d' && i % 5 === 0)) && (
                      <span className="text-xs text-slate-400 rotate-45 origin-left whitespace-nowrap" style={{ fontSize: '9px' }}>
                        {new Date(day.day).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-bold text-slate-900 mb-4">Top Selling Products</h4>
            {summary.topProducts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No sales data in this period</p>
            ) : (
              <div className="space-y-3">
                {summary.topProducts.map((p, i) => {
                  const maxCount = summary.topProducts[0].count;
                  const pct = (p.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400 w-5 flex-shrink-0">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                          <span className="text-xs font-bold text-slate-600 ml-2 flex-shrink-0">{p.count} units</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
