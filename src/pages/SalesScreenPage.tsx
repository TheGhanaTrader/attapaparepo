import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, X, ShoppingBag, CreditCard, Banknote, CheckCircle, ChevronDown, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, FairGuy, Branch, CartItem } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/ui/Modal';

export default function SalesScreenPage() {
  const { user, profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [fairGuys, setFairGuys] = useState<FairGuy[]>([]);
  const [selectedFairGuy, setSelectedFairGuy] = useState('');
  const [showAddFairGuy, setShowAddFairGuy] = useState(false);
  const [newFairGuy, setNewFairGuy] = useState({ name: '', phone: '', location: '', notes: '' });
  const [completing, setCompleting] = useState(false);
  const [successSale, setSuccessSale] = useState<{ ref: string; total: number } | null>(null);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('branches').select('*').eq('is_active', true).then(({ data }) => {
      setBranches(data || []);
      if (data && data.length > 0) setSelectedBranch(data[0].id);
    });
    supabase.from('fair_guys').select('*').eq('is_active', true).order('name').then(({ data }) => {
      setFairGuys(data || []);
    });
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .or(`car_make.ilike.%${searchQuery}%,car_model.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .gt('quantity', 0)
        .limit(10);
      setSearchResults(data || []);
      setShowSearch(true);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addToCart = (product: Product) => {
    setCart(c => {
      const existing = c.find(i => i.product.id === product.id);
      if (existing) {
        return c.map(i => i.product.id === product.id
          ? { ...i, quantity: Math.min(i.quantity + 1, product.quantity) }
          : i
        );
      }
      return [...c, { product, quantity: 1, unit_price: 0 }];
    });
    setSearchQuery('');
    setShowSearch(false);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(c => c.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return i;
      if (newQty > i.product.quantity) return i;
      return { ...i, quantity: newQty };
    }));
  };

  const updatePrice = (productId: string, price: string) => {
    setCart(c => c.map(i => i.product.id === productId ? { ...i, unit_price: Number(price) || 0 } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart(c => c.filter(i => i.product.id !== productId));
  };

  const total = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const canComplete = cart.length > 0 && cart.every(i => i.unit_price > 0) && (paymentType === 'cash' || selectedFairGuy);

  const handleAddFairGuy = async () => {
    if (!newFairGuy.name.trim()) return;
    const { data } = await supabase.from('fair_guys').insert({
      ...newFairGuy,
      created_by: user?.id,
      branch_id: selectedBranch || null,
    }).select().maybeSingle();
    if (data) {
      setFairGuys(f => [...f, data]);
      setSelectedFairGuy(data.id);
    }
    setShowAddFairGuy(false);
    setNewFairGuy({ name: '', phone: '', location: '', notes: '' });
  };

  const handleCompleteSale = async () => {
    if (!canComplete) return;
    setError('');
    setCompleting(true);

    const ref = `ATP-${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = total;
    const isCredit = paymentType === 'credit';

    const saleData = {
      transaction_ref: ref,
      branch_id: selectedBranch,
      staff_id: user!.id,
      payment_type: paymentType,
      fair_guy_id: isCredit ? selectedFairGuy : null,
      subtotal: totalAmount,
      total_amount: totalAmount,
      amount_paid: isCredit ? 0 : totalAmount,
      balance_due: isCredit ? totalAmount : 0,
      status: 'completed',
    };

    const { data: sale, error: saleErr } = await supabase.from('sales').insert(saleData).select().maybeSingle();
    if (saleErr || !sale) {
      setError(saleErr?.message || 'Failed to record sale');
      setCompleting(false);
      return;
    }

    // Insert items and update stock
    await Promise.all([
      supabase.from('sale_items').insert(
        cart.map(i => ({
          sale_id: sale.id,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.unit_price * i.quantity,
        }))
      ),
      ...cart.map(i =>
        supabase.from('products').update({ quantity: i.product.quantity - i.quantity }).eq('id', i.product.id)
      ),
      ...(isCredit && selectedFairGuy ? [
        supabase.from('fair_guys').update({ total_owed: (fairGuys.find(f => f.id === selectedFairGuy)?.total_owed || 0) + totalAmount }).eq('id', selectedFairGuy),
      ] : []),
    ]);

    await supabase.from('audit_logs').insert({
      user_id: user!.id,
      action: 'SALE_COMPLETED',
      entity_type: 'sale',
      entity_id: sale.id,
      details: { ref, total: totalAmount, payment_type: paymentType },
    });

    setSuccessSale({ ref, total: totalAmount });
    setCart([]);
    setPaymentType('cash');
    setSelectedFairGuy('');
    setCompleting(false);
  };

  if (successSale) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-lg">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">Sale Complete!</h3>
          <p className="text-slate-500 mt-2 text-sm">Transaction Reference:</p>
          <code className="text-blue-600 font-bold text-lg mt-1 block">{successSale.ref}</code>
          <div className="mt-4 bg-slate-50 rounded-2xl px-6 py-4">
            <p className="text-3xl font-black text-slate-900">
              GHS {successSale.total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-500 mt-1">Total Amount</p>
          </div>
          <button
            onClick={() => setSuccessSale(null)}
            className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-5">
        <h3 className="text-xl font-black text-slate-900">Scan to Sell</h3>
        <p className="text-slate-500 text-sm">Search for products and complete the sale</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Search + Cart */}
        <div className="lg:col-span-3 space-y-4">
          {/* Branch + Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex gap-3">
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="flex-shrink-0 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div ref={searchRef} className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product by make, model, SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showSearch && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden animate-fade-in">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 text-xs font-bold">
                            {p.light_type === 'Headlight' ? 'HL' : p.light_type === 'Taillight' ? 'TL' : p.light_type === 'Fog Light' ? 'FL' : 'BL'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">{p.car_make} {p.car_model} {p.car_year}</p>
                          <p className="text-xs text-slate-500">{p.light_type} · {p.side} · {p.variant}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex-shrink-0">
                          {p.quantity} in stock
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {showSearch && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-4 text-center">
                    <p className="text-sm text-slate-500">No in-stock products found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <ShoppingBag size={16} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Cart ({cart.length} items)</span>
            </div>

            {cart.length === 0 ? (
              <div className="py-14 text-center">
                <ShoppingBag size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm font-medium">Search and add products to cart</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map(item => (
                  <div key={item.product.id} className="px-5 py-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-bold">
                          {item.product.light_type === 'Headlight' ? 'HL' : item.product.light_type === 'Taillight' ? 'TL' : item.product.light_type === 'Fog Light' ? 'FL' : 'BL'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">
                          {item.product.car_make} {item.product.car_model} {item.product.car_year}
                        </p>
                        <p className="text-xs text-slate-500">{item.product.light_type} · {item.product.side}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity */}
                      <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                        <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors">
                          <Minus size={13} />
                        </button>
                        <span className="text-sm font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors">
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="flex-1">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">GHS</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Enter price"
                            value={item.unit_price || ''}
                            onChange={e => updatePrice(item.product.id, e.target.value)}
                            className={`w-full pl-12 pr-3 py-2 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-colors ${
                              item.unit_price > 0
                                ? 'border-emerald-300 bg-emerald-50 focus:ring-emerald-400 text-emerald-800'
                                : 'border-orange-300 bg-orange-50 focus:ring-orange-400 text-orange-800'
                            }`}
                          />
                        </div>
                        {item.unit_price === 0 && (
                          <p className="text-xs text-orange-600 mt-1 font-medium">Price required to proceed</p>
                        )}
                      </div>

                      {/* Line total */}
                      <div className="text-right w-24 flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900">
                          GHS {(item.unit_price * item.quantity).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-400">× {item.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Total */}
          <div className="bg-navy-900 rounded-2xl p-5 text-white">
            <p className="text-blue-200 text-sm font-medium">Total Amount</p>
            <p className="text-4xl font-black mt-1">
              GHS {total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-blue-300 text-xs mt-1">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Payment type */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-700 mb-3">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentType('cash')}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                  paymentType === 'cash'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Banknote size={22} className={paymentType === 'cash' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${paymentType === 'cash' ? 'text-emerald-700' : 'text-slate-600'}`}>Cash</span>
              </button>
              <button
                onClick={() => setPaymentType('credit')}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                  paymentType === 'credit'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard size={22} className={paymentType === 'credit' ? 'text-amber-600' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${paymentType === 'credit' ? 'text-amber-700' : 'text-slate-600'}`}>Credit</span>
              </button>
            </div>
          </div>

          {/* Fair Guy selector */}
          {paymentType === 'credit' && (
            <div className="bg-white rounded-2xl border border-amber-200 p-4 animate-fade-in">
              <p className="text-sm font-bold text-slate-700 mb-3">Select Fair Guy</p>
              <div className="relative mb-2">
                <select
                  value={selectedFairGuy}
                  onChange={e => setSelectedFairGuy(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none bg-white"
                >
                  <option value="">Choose fair guy...</option>
                  {fairGuys.map(f => (
                    <option key={f.id} value={f.id}>{f.name} {f.total_owed > 0 ? `(owes GHS ${Number(f.total_owed).toLocaleString()})` : ''}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={() => setShowAddFairGuy(true)}
                className="flex items-center gap-2 text-sm text-amber-700 font-semibold hover:text-amber-800 transition-colors"
              >
                <UserPlus size={15} />
                Add new fair guy
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleCompleteSale}
            disabled={!canComplete || completing}
            className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              canComplete && !completing
                ? 'bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 active:scale-95'
                : 'bg-slate-300'
            }`}
          >
            {completing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle size={20} />
                Complete Sale
              </span>
            )}
          </button>

          {!canComplete && cart.length > 0 && (
            <p className="text-xs text-slate-400 text-center">
              {cart.some(i => i.unit_price === 0) ? 'Enter price for all items' : 'Select a fair guy for credit sale'}
            </p>
          )}
        </div>
      </div>

      {/* Add Fair Guy Modal */}
      <Modal
        open={showAddFairGuy}
        onClose={() => setShowAddFairGuy(false)}
        title="Add New Fair Guy"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAddFairGuy(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleAddFairGuy} disabled={!newFairGuy.name.trim()} className="px-4 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50">
              Add Fair Guy
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newFairGuy.name}
              onChange={e => setNewFairGuy(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={newFairGuy.phone}
              onChange={e => setNewFairGuy(f => ({ ...f, phone: e.target.value }))}
              placeholder="Phone number"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
            <input
              type="text"
              value={newFairGuy.location}
              onChange={e => setNewFairGuy(f => ({ ...f, location: e.target.value }))}
              placeholder="Optional location"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={newFairGuy.notes}
              onChange={e => setNewFairGuy(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
