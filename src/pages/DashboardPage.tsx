import { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingCart, CreditCard, AlertTriangle,
  Users, RotateCcw, Package, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Sale, Product, FairGuy } from '../lib/types';
import { useAuth } from "../contexts/AuthContext";

interface Stats {
  todaySales: number;
  todayCash: number;
  todayCredit: number;
  monthSales: number;
  totalOutstanding: number;
  lowStockCount: number;
  totalProducts: number;
  totalFairGuys: number;
}

interface RecentSale extends Sale {
  staff?: { full_name: string };
  fair_guy?: { name: string };
  items?: { product?: { car_make: string; car_model: string; light_type: string } }[];
}

function StatCard({
  label, value, icon: Icon, color, sub, trend
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  sub?: string;
  trend?: { value: string; up: boolean };
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-full ${
            trend.up ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
          }`}>
            {trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [stats, setStats] = useState<Stats>({
    todaySales: 0, todayCash: 0, todayCredit: 0,
    monthSales: 0, totalOutstanding: 0, lowStockCount: 0,
    totalProducts: 0, totalFairGuys: 0,
  });
  const { user } = useAuth();
const [role, setRole] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
  const checkRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role !== "admin") {
      // ❌ BLOCK STAFF
      window.location.href = "/sales";
      return;
    }

    setRole(data.role);
    loadData();
  };

  checkRole();
}, [user]);

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [salesRes, monthSalesRes, productsRes, fairGuysRes, recentRes, lowStockRes] = await Promise.all([
      supabase.from('sales').select('total_amount, payment_type').gte('created_at', today).eq('status', 'completed'),
      supabase.from('sales').select('total_amount').gte('created_at', monthStart).eq('status', 'completed'),
      supabase.from('products').select('id, quantity, quantity_threshold').eq('is_active', true),
      supabase.from('fair_guys').select('total_owed').eq('is_active', true),
      supabase.from('sales').select(`
        id, transaction_ref, total_amount, payment_type, created_at, status,
        staff:profiles!staff_id(full_name),
        fair_guy:fair_guys(name)
      `).order('created_at', { ascending: false }).limit(8),
      supabase.from('products').select('*').lt('quantity', 5).eq('is_active', true).order('quantity', { ascending: true }).limit(10),
    ]);

    const todaySalesList = salesRes.data || [];
    const todaySales = todaySalesList.reduce((s, r) => s + Number(r.total_amount), 0);
    const todayCash = todaySalesList.filter(r => r.payment_type === 'cash').reduce((s, r) => s + Number(r.total_amount), 0);
    const todayCredit = todaySalesList.filter(r => r.payment_type === 'credit').reduce((s, r) => s + Number(r.total_amount), 0);
    const monthSales = (monthSalesRes.data || []).reduce((s, r) => s + Number(r.total_amount), 0);
    const products = productsRes.data || [];
    const totalOutstanding = (fairGuysRes.data || []).reduce((s, r) => s + Number(r.total_owed), 0);
    const lowStockCount = products.filter(p => p.quantity <= p.quantity_threshold).length;

    setStats({
      todaySales, todayCash, todayCredit, monthSales,
      totalOutstanding, lowStockCount,
      totalProducts: products.length,
      totalFairGuys: (fairGuysRes.data || []).length,
    });
    setRecentSales((recentRes.data as RecentSale[]) || []);
    setLowStockItems((lowStockRes.data as Product[]) || []);
    setLoading(false);
  };

  const fmt = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Dashboard</h3>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                dateFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={fmt(stats.todaySales)}
          icon={TrendingUp}
          color="bg-blue-600"
          sub={`${recentSales.filter(s => s.created_at?.startsWith(new Date().toISOString().split('T')[0])).length} transactions`}
        />
        <StatCard
          label="Cash Sales"
          value={fmt(stats.todayCash)}
          icon={ShoppingCart}
          color="bg-emerald-600"
        />
        <StatCard
          label="Credit Sales"
          value={fmt(stats.todayCredit)}
          icon={CreditCard}
          color="bg-amber-500"
        />
        <StatCard
          label="Monthly Revenue"
          value={fmt(stats.monthSales)}
          icon={Calendar}
          color="bg-slate-700"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Outstanding Debts"
          value={fmt(stats.totalOutstanding)}
          icon={Users}
          color="bg-red-500"
          sub={`${stats.totalFairGuys} fair guys`}
        />
        <StatCard
          label="Low Stock Items"
          value={stats.lowStockCount.toString()}
          icon={AlertTriangle}
          color="bg-orange-500"
          sub="Need restocking"
        />
        <StatCard
          label="Total Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          color="bg-teal-600"
          sub="Active SKUs"
        />
        <StatCard
          label="Returns Today"
          value="0"
          icon={RotateCcw}
          color="bg-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900">Recent Sales</h4>
            <button
              onClick={() => onNavigate('sales-history')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSales.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">No sales yet today</div>
            ) : (
              recentSales.map(sale => (
                <div key={sale.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    sale.payment_type === 'cash' ? 'bg-emerald-50' : 'bg-amber-50'
                  }`}>
                    {sale.payment_type === 'cash'
                      ? <ShoppingCart size={14} className="text-emerald-600" />
                      : <CreditCard size={14} className="text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{sale.transaction_ref}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {(sale.staff as { full_name?: string } | null)?.full_name || 'Staff'} ·{' '}
                      {new Date(sale.created_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">{fmt(Number(sale.total_amount))}</p>
                    <span className={`text-xs font-medium ${
                      sale.payment_type === 'cash' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {sale.payment_type === 'cash' ? 'Cash' : 'Credit'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900">Low Stock</h4>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">All stock levels are good</div>
            ) : (
              lowStockItems.map(product => (
                <div key={product.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    product.quantity === 0 ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    <AlertTriangle size={13} className={product.quantity === 0 ? 'text-red-600' : 'text-orange-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {product.car_make} {product.car_model}
                    </p>
                    <p className="text-xs text-slate-500">{product.light_type} · {product.side}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    product.quantity === 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {product.quantity === 0 ? 'Out' : `${product.quantity} left`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
