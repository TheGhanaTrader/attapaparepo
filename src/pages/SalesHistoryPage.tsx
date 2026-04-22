import { useEffect, useState, useCallback } from 'react';
import { Search, ShoppingCart, CreditCard, Banknote, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Sale } from '../lib/types';
import Modal from '../components/ui/Modal';

const PAGE_SIZE = 20;

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<{ product?: { car_make: string; car_model: string; light_type: string; side: string }; quantity: number; unit_price: number; total_price: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('sales')
      .select(`
        *,
        staff:profiles!staff_id(full_name),
        fair_guy:fair_guys(name),
        branch:branches(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) q = q.ilike('transaction_ref', `%${search}%`);
    if (filterPayment) q = q.eq('payment_type', filterPayment);
    if (filterDate) q = q.gte('created_at', filterDate).lt('created_at', filterDate + 'T23:59:59');

    const { data, count } = await q;
    setSales((data as Sale[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, filterPayment, filterDate]);

  useEffect(() => { load(); }, [load]);

  const openSale = async (sale: Sale) => {
    setViewSale(sale);
    const { data } = await supabase
      .from('sale_items')
      .select('*, product:products(car_make, car_model, light_type, side)')
      .eq('sale_id', sale.id);
    setSaleItems(data || []);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fmt = (n: number) => `GHS ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

  const totalAmount = sales.reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-xl font-black text-slate-900">Sales History</h3>
        <p className="text-slate-500 text-sm">{total.toLocaleString()} transactions</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: fmt(totalAmount), color: 'text-slate-900' },
          { label: 'Cash', value: fmt(sales.filter(s => s.payment_type === 'cash').reduce((a, s) => a + Number(s.total_amount), 0)), color: 'text-emerald-700' },
          { label: 'Credit', value: fmt(sales.filter(s => s.payment_type === 'credit').reduce((a, s) => a + Number(s.total_amount), 0)), color: 'text-amber-700' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500 font-medium">{item.label} (this view)</p>
            <p className={`text-xl font-black mt-0.5 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reference..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterPayment}
          onChange={e => { setFilterPayment(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => { setFilterDate(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ShoppingCart size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">No sales found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fair Guy</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono font-bold">{sale.transaction_ref}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(sale.created_at).toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {(sale.staff as { full_name?: string } | null)?.full_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold w-fit px-2 py-1 rounded-full ${
                          sale.payment_type === 'cash'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {sale.payment_type === 'cash' ? <Banknote size={11} /> : <CreditCard size={11} />}
                          {sale.payment_type === 'cash' ? 'Cash' : 'Credit'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {(sale.fair_guy as { name?: string } | null)?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {fmt(Number(sale.total_amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          sale.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          sale.status === 'returned' ? 'bg-blue-50 text-blue-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openSale(sale)}
                          className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
                <div className="flex gap-1">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                    <ChevronLeft size={14} />
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sale Detail Modal */}
      <Modal open={!!viewSale} onClose={() => setViewSale(null)} title="Sale Details" size="lg">
        {viewSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs font-medium">Transaction Ref</p>
                <p className="font-bold text-blue-600">{viewSale.transaction_ref}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Date & Time</p>
                <p className="font-semibold text-slate-900">{new Date(viewSale.created_at).toLocaleString('en-GH')}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Staff</p>
                <p className="font-semibold text-slate-900">{(viewSale.staff as { full_name?: string } | null)?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Payment Type</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-block mt-0.5 ${
                  viewSale.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {viewSale.payment_type === 'cash' ? 'Cash' : 'Credit'}
                </span>
              </div>
              {viewSale.payment_type === 'credit' && (
                <div>
                  <p className="text-slate-500 text-xs font-medium">Fair Guy</p>
                  <p className="font-semibold text-slate-900">{(viewSale.fair_guy as { name?: string } | null)?.name || '—'}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-bold text-slate-900 mb-3">Items</p>
              <div className="space-y-2">
                {saleItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.product?.car_make} {item.product?.car_model} — {item.product?.light_type} ({item.product?.side})
                      </p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity} × {fmt(Number(item.unit_price))}</p>
                    </div>
                    <p className="font-bold text-slate-900">{fmt(Number(item.total_price))}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-2xl font-black text-slate-900">{fmt(Number(viewSale.total_amount))}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
