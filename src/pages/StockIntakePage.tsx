import { useEffect, useState, useCallback } from 'react';
import { Truck as TruckIcon, Plus, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StockIntake, Product, Branch } from '../lib/types';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

interface IntakeLineItem {
  product: Product;
  quantity: number;
  notes: string;
}

export default function StockIntakePage() {
  const { user } = useAuth();
  const [intakes, setIntakes] = useState<StockIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [supplierNote, setSupplierNote] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [lineItems, setLineItems] = useState<IntakeLineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stock_intakes')
      .select('*, branch:branches(name), staff:profiles!recorded_by(full_name)')
      .order('created_at', { ascending: false });
    setIntakes((data as StockIntake[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => {
      setBranches(data || []);
      if (data && data.length > 0) setSelectedBranch(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (productSearch.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .or(`car_make.ilike.%${productSearch}%,car_model.ilike.%${productSearch}%,sku.ilike.%${productSearch}%`)
        .eq('is_active', true)
        .limit(8);
      setSearchResults(data || []);
      setShowProductSearch(true);
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  const addProduct = (product: Product) => {
    if (lineItems.find(i => i.product.id === product.id)) {
      setProductSearch('');
      setShowProductSearch(false);
      return;
    }
    setLineItems(l => [...l, { product, quantity: 1, notes: '' }]);
    setProductSearch('');
    setShowProductSearch(false);
  };

  const handleSave = async () => {
    if (lineItems.length === 0 || !user) return;
    setSaving(true);
    const ref = `STK-${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: intake } = await supabase.from('stock_intakes').insert({
      intake_ref: ref,
      branch_id: selectedBranch,
      recorded_by: user.id,
      supplier_note: supplierNote,
      total_items: lineItems.reduce((s, i) => s + i.quantity, 0),
      notes: intakeNotes,
    }).select().maybeSingle();

    if (intake) {
      await supabase.from('stock_intake_items').insert(
        lineItems.map(i => ({
          intake_id: intake.id,
          product_id: i.product.id,
          quantity_added: i.quantity,
          notes: i.notes,
        }))
      );
      await Promise.all(
        lineItems.map(i =>
          supabase.from('products').update({ quantity: i.product.quantity + i.quantity }).eq('id', i.product.id)
        )
      );
    }

    setSaving(false);
    setShowNew(false);
    setLineItems([]);
    setSupplierNote('');
    setIntakeNotes('');
    load();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900">Stock Intake</h3>
          <p className="text-slate-500 text-sm">{intakes.length} intake records</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Intake
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : intakes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <TruckIcon size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">No stock intakes recorded</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier Note</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {intakes.map(intake => (
                <tr key={intake.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded font-mono font-bold">{intake.intake_ref}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{(intake.branch as { name?: string } | null)?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900">{intake.total_items}</span>
                    <span className="text-xs text-slate-500 ml-1">units</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-40 truncate">{intake.supplier_note || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(intake.created_at).toLocaleDateString('en-GH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Intake Modal */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New Stock Intake"
        size="xl"
        footer={
          <>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || lineItems.length === 0} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : `Save Intake (${lineItems.reduce((s, i) => s + i.quantity, 0)} units)`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier Note</label>
              <input
                type="text"
                value={supplierNote}
                onChange={e => setSupplierNote(e.target.value)}
                placeholder="Optional supplier note..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Product search */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Add Products</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search existing product by make, model, SKU..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showProductSearch && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0 transition-colors text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{p.car_make} {p.car_model} {p.car_year}</p>
                        <p className="text-xs text-slate-500">{p.light_type} · {p.side} · SKU: {p.sku} · Current stock: {p.quantity}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">Intake Items</p>
              {lineItems.map((item, i) => (
                <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.product.car_make} {item.product.car_model} {item.product.car_year}</p>
                    <p className="text-xs text-slate-500">{item.product.light_type} · {item.product.side} · Current: {item.product.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 flex-shrink-0">Add qty:</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => setLineItems(l => l.map((x, j) => j === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x))}
                      className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button onClick={() => setLineItems(l => l.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end bg-blue-50 rounded-xl px-4 py-2">
                <span className="text-sm font-bold text-blue-800">
                  Total: {lineItems.reduce((s, i) => s + i.quantity, 0)} units across {lineItems.length} products
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
