import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, Search, Plus, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Return, Product, Branch, Sale } from '../lib/types';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

export default function ReturnsPage() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProcess, setShowProcess] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [saleRef, setSaleRef] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<{ id: string; product?: Product; quantity: number; unit_price: number; total_price: number }[]>([]);
  const [returnItems, setReturnItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('returns')
      .select('*, branch:branches(name), staff:profiles!processed_by(full_name)')
      .order('created_at', { ascending: false });
    setReturns((data as Return[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => {
      setBranches(data || []);
      if (data && data.length > 0) setSelectedBranch(data[0].id);
    });
  }, []);

  const lookupSale = async () => {
    if (!saleRef.trim()) return;
    setLookingUp(true);
    const { data: sale } = await supabase.from('sales').select('*').eq('transaction_ref', saleRef.trim()).maybeSingle();
    if (sale) {
      setFoundSale(sale);
      const { data: items } = await supabase.from('sale_items').select('*, product:products(*)').eq('sale_id', sale.id);
      setSaleItems(items || []);
      setReturnItems((items || []).map((i: { product_id: string; unit_price: number }) => ({ product_id: i.product_id, quantity: 0, unit_price: i.unit_price })));
    } else {
      setFoundSale(null);
      setSaleItems([]);
    }
    setLookingUp(false);
  };

  const processReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.quantity > 0);
    if (itemsToReturn.length === 0 || !user) return;
    setSaving(true);

    const totalRefund = itemsToReturn.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const retRef = `RET-${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: ret } = await supabase.from('returns').insert({
      return_ref: retRef,
      original_sale_id: foundSale?.id || null,
      branch_id: selectedBranch,
      processed_by: user.id,
      reason,
      total_refund: totalRefund,
      notes,
    }).select().maybeSingle();

    if (ret) {
      await supabase.from('return_items').insert(
        itemsToReturn.map(i => ({
          return_id: ret.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          refund_amount: i.unit_price * i.quantity,
        }))
      );
      await Promise.all(
        itemsToReturn.map(i => {
          const saleItem = saleItems.find(s => s.product_id === i.product_id);
          const currentQty = (saleItem?.product as Product | undefined)?.quantity || 0;
          return supabase.from('products').update({ quantity: currentQty + i.quantity }).eq('id', i.product_id);
        })
      );
    }

    setSaving(false);
    setShowProcess(false);
    setFoundSale(null);
    setSaleItems([]);
    setReturnItems([]);
    setSaleRef('');
    setReason('');
    setNotes('');
    load();
  };

  const fmt = (n: number) => `GHS ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900">Returns</h3>
          <p className="text-slate-500 text-sm">{returns.length} processed returns</p>
        </div>
        <button
          onClick={() => setShowProcess(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Process Return
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RotateCcw size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">No returns processed yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Return Ref</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Original Sale</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map(ret => (
                <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono font-bold">{ret.return_ref}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{ret.original_sale_id ? 'Linked' : 'Manual'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{(ret.branch as { name?: string } | null)?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-32 truncate">{ret.reason || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(ret.created_at).toLocaleDateString('en-GH')}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(Number(ret.total_refund))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Process Return Modal */}
      <Modal
        open={showProcess}
        onClose={() => { setShowProcess(false); setFoundSale(null); setSaleItems([]); }}
        title="Process Return"
        size="lg"
        footer={
          <>
            <button onClick={() => { setShowProcess(false); setFoundSale(null); setSaleItems([]); }} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
            <button
              onClick={processReturn}
              disabled={saving || returnItems.filter(i => i.quantity > 0).length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Processing...' : 'Process Return'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Lookup by Sale Reference (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saleRef}
                onChange={e => setSaleRef(e.target.value)}
                placeholder="e.g. ATP-20240101-0001"
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={lookupSale} disabled={lookingUp} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
                {lookingUp ? '...' : 'Lookup'}
              </button>
            </div>
          </div>

          {foundSale && (
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-blue-900">Sale found: {foundSale.transaction_ref}</p>
              <p className="text-blue-700 text-xs mt-0.5">Total: {fmt(Number(foundSale.total_amount))} · {new Date(foundSale.created_at).toLocaleDateString('en-GH')}</p>
            </div>
          )}

          {saleItems.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Items to Return</p>
              <div className="space-y-2">
                {saleItems.map((item, i) => {
                  const ri = returnItems[i];
                  const prod = item.product as Product | undefined;
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{prod?.car_make} {prod?.car_model} — {prod?.light_type} ({prod?.side})</p>
                        <p className="text-xs text-slate-500">Price: {fmt(item.unit_price)} · Sold: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Return qty:</label>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={ri?.quantity || 0}
                          onChange={e => {
                            const v = Math.min(Number(e.target.value), item.quantity);
                            setReturnItems(r => r.map((x, j) => j === i ? { ...x, quantity: v } : x));
                          }}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
              <div className="relative">
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Return reason..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {saleItems.length > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Total Refund</span>
              <span className="text-xl font-black text-slate-900">
                {fmt(returnItems.reduce((s, i) => s + i.unit_price * i.quantity, 0))}
              </span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
