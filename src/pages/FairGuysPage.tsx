import { useEffect, useState, useCallback } from 'react';
import { Search, Users, Plus, CreditCard, ChevronDown, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FairGuy } from '../lib/types';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

export default function FairGuysPage() {
  const { user } = useAuth();
  const [fairGuys, setFairGuys] = useState<FairGuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOwed, setFilterOwed] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState<FairGuy | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<{ amount: number; payment_method: string; notes: string; created_at: string }[]>([]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [newFairGuy, setNewFairGuy] = useState({ name: '', phone: '', location: '', notes: '' });
  const [savingFairGuy, setSavingFairGuy] = useState(false);
  const [selectedFG, setSelectedFG] = useState<FairGuy | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('fair_guys').select('*').eq('is_active', true).order('total_owed', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    if (filterOwed === 'has') q = q.gt('total_owed', 0);
    if (filterOwed === 'cleared') q = q.eq('total_owed', 0);
    const { data } = await q;
    setFairGuys(data || []);
    setLoading(false);
  }, [search, filterOwed]);

  useEffect(() => { load(); }, [load]);

  const handleAddFairGuy = async () => {
    if (!newFairGuy.name.trim()) return;
    setSavingFairGuy(true);
    await supabase.from('fair_guys').insert({ ...newFairGuy, created_by: user?.id });
    setSavingFairGuy(false);
    setShowAdd(false);
    setNewFairGuy({ name: '', phone: '', location: '', notes: '' });
    load();
  };

  const openPayment = async (fg: FairGuy) => {
    setShowPayment(fg);
    setPayAmount('');
    setPayNotes('');
    const { data } = await supabase.from('debt_payments').select('*').eq('fair_guy_id', fg.id).order('created_at', { ascending: false }).limit(10);
    setPaymentHistory(data || []);
  };

  const handlePayment = async () => {
    if (!showPayment || !payAmount) return;
    setSavingPayment(true);
    const amount = parseFloat(payAmount);
    await Promise.all([
      supabase.from('debt_payments').insert({
        fair_guy_id: showPayment.id,
        amount,
        notes: payNotes,
        recorded_by: user?.id,
      }),
      supabase.from('fair_guys').update({
        total_owed: Math.max(0, Number(showPayment.total_owed) - amount),
      }).eq('id', showPayment.id),
    ]);
    setSavingPayment(false);
    setShowPayment(null);
    load();
  };

  const fmt = (n: number) => `GHS ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  const totalOwed = fairGuys.reduce((s, f) => s + Number(f.total_owed), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900">Fair Guys</h3>
          <p className="text-slate-500 text-sm">{fairGuys.length} credit customers</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Fair Guy
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <p className="text-xs text-red-600 font-medium">Total Outstanding</p>
          <p className="text-2xl font-black text-red-700 mt-0.5">{fmt(totalOwed)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4">
          <p className="text-xs text-slate-500 font-medium">Active Debtors</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{fairGuys.filter(f => f.total_owed > 0).length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
          <p className="text-xs text-emerald-600 font-medium">Cleared</p>
          <p className="text-2xl font-black text-emerald-700 mt-0.5">{fairGuys.filter(f => f.total_owed === 0).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterOwed}
          onChange={e => setFilterOwed(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Fair Guys</option>
          <option value="has">Has Debt</option>
          <option value="cleared">Cleared</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fairGuys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">No fair guys found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {fairGuys.map(fg => (
              <div key={fg.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-sm">{fg.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{fg.name}</p>
                  <p className="text-xs text-slate-500">
                    {fg.phone && `${fg.phone} · `}
                    {fg.location || 'No location'} ·{' '}
                    Since {new Date(fg.created_at).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 mr-4">
                  <p className={`text-lg font-black ${Number(fg.total_owed) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmt(Number(fg.total_owed))}
                  </p>
                  <p className="text-xs text-slate-400">Outstanding</p>
                </div>
                <div className="flex gap-2">
                  {Number(fg.total_owed) > 0 && (
                    <button
                      onClick={() => openPayment(fg)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <CreditCard size={13} />
                      Record Payment
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedFG(fg); openPayment(fg); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    History
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Fair Guy Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Fair Guy"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleAddFairGuy} disabled={savingFairGuy || !newFairGuy.name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {savingFairGuy ? 'Adding...' : 'Add Fair Guy'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {[
            { key: 'name', label: 'Name', required: true, placeholder: 'Full name' },
            { key: 'phone', label: 'Phone', required: false, placeholder: 'Phone number' },
            { key: 'location', label: 'Location', required: false, placeholder: 'Optional location' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{f.label}{f.required && <span className="text-red-500 ml-1">*</span>}</label>
              <input
                type="text"
                value={newFairGuy[f.key as keyof typeof newFairGuy]}
                onChange={e => setNewFairGuy(n => ({ ...n, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={newFairGuy.notes}
              onChange={e => setNewFairGuy(n => ({ ...n, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={!!showPayment}
        onClose={() => setShowPayment(null)}
        title="Record Payment"
        size="md"
        footer={
          <>
            <button onClick={() => setShowPayment(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handlePayment} disabled={savingPayment || !payAmount} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60">
              {savingPayment ? 'Recording...' : 'Record Payment'}
            </button>
          </>
        }
      >
        {showPayment && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl px-4 py-3">
              <p className="font-semibold text-slate-900">{showPayment.name}</p>
              <p className="text-sm text-red-700 font-semibold mt-0.5">Outstanding: {fmt(Number(showPayment.total_owed))}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount Paid (GHS) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
              <input
                type="text"
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {paymentHistory.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Recent Payments</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {paymentHistory.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                      <span className="text-slate-600">{new Date(p.created_at).toLocaleDateString('en-GH')}</span>
                      <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
