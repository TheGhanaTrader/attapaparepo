import { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Branch } from '../lib/types';
import { CAR_MAKES, LIGHT_TYPES, VARIANTS, SIDES, CONDITIONS } from '../lib/carData';
import { useAuth } from '../contexts/AuthContext';

interface AddProductPageProps {
  onNavigate: (page: string) => void;
}

export default function AddProductPage({ onNavigate }: AddProductPageProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    car_make: '',
    car_model: '',
    car_year: '',
    light_type: '',
    variant: 'Normal/Halogen',
    side: '',
    condition: 'Foreign Used',
    quantity: 1,
    quantity_threshold: 5,
    reference_price: 0,
    branch_id: '',
    notes: '',
  });

  const selectedMake = CAR_MAKES.find(m => m.name === form.car_make);
  const selectedModel = selectedMake?.models.find(m => m.name === form.car_model);

  useEffect(() => {
    supabase.from('branches').select('*').eq('is_active', true).then(({ data }) => {
      setBranches(data || []);
      if (data && data.length > 0 && !form.branch_id) {
        setForm(f => ({ ...f, branch_id: data[0].id }));
      }
    });
  }, []);

  const generateSku = () => {
    const makeCode = form.car_make.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
    const modelCode = form.car_model.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase();
    const typeCode = form.light_type === 'Headlight' ? 'HL' : form.light_type === 'Taillight' ? 'TL' : form.light_type === 'Fog Light' ? 'FL' : 'BL';
    const sideCode = form.side === 'Left' ? 'L' : form.side === 'Right' ? 'R' : form.side === 'Center' ? 'C' : form.side === 'Pair' ? 'P' : 'S';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${makeCode}${modelCode}${typeCode}${sideCode}${rand}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.car_make || !form.car_model || !form.car_year || !form.light_type || !form.side || !form.branch_id) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    const sku = generateSku();
    const { error: dbError } = await supabase.from('products').insert({
      ...form,
      sku,
      created_by: user?.id,
    });
    setSaving(false);
    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({
          car_make: '', car_model: '', car_year: '', light_type: '', variant: 'Normal/Halogen',
          side: '', condition: 'Foreign Used', quantity: 1, quantity_threshold: 5,
          reference_price: 0, branch_id: branches[0]?.id || '', notes: '',
        });
      }, 2000);
    }
  };

  const field = (label: string, required = true) => (
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const selectClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none";
  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Product Added!</h3>
        <p className="text-slate-500 mt-2">The product has been added to inventory successfully.</p>
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={() => setSuccess(false)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
            Add Another
          </button>
          <button onClick={() => onNavigate('inventory')} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
            View Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h3 className="text-xl font-black text-slate-900">Add Product</h3>
        <p className="text-slate-500 text-sm mt-1">Enter product details to add to inventory</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Package size={18} className="text-blue-600" />
            <h4 className="font-bold text-slate-900">Vehicle Information</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {field('Car Make')}
              <div className="relative">
                <select
                  value={form.car_make}
                  onChange={e => setForm(f => ({ ...f, car_make: e.target.value, car_model: '', car_year: '' }))}
                  className={selectClass}
                >
                  <option value="">Select Make</option>
                  {CAR_MAKES.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              {field('Model')}
              <div className="relative">
                <select
                  value={form.car_model}
                  onChange={e => setForm(f => ({ ...f, car_model: e.target.value, car_year: '' }))}
                  className={selectClass}
                  disabled={!form.car_make}
                >
                  <option value="">Select Model</option>
                  {selectedMake?.models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {field('Year')}
              <div className="relative">
                <select
                  value={form.car_year}
                  onChange={e => setForm(f => ({ ...f, car_year: e.target.value }))}
                  className={selectClass}
                  disabled={!form.car_model}
                >
                  <option value="">Select Year</option>
                  {selectedModel?.years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              {field('Condition')}
              <div className="relative">
                <select
                  value={form.condition}
                  onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                  className={selectClass}
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h4 className="font-bold text-slate-900">Light Details</h4>

          <div className="grid grid-cols-3 gap-4">
            <div>
              {field('Type')}
              <div className="relative">
                <select
                  value={form.light_type}
                  onChange={e => setForm(f => ({ ...f, light_type: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Select Type</option>
                  {LIGHT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              {field('Variant')}
              <div className="relative">
                <select
                  value={form.variant}
                  onChange={e => setForm(f => ({ ...f, variant: e.target.value }))}
                  className={selectClass}
                >
                  {VARIANTS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              {field('Side')}
              <div className="relative">
                <select
                  value={form.side}
                  onChange={e => setForm(f => ({ ...f, side: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Select Side</option>
                  {SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h4 className="font-bold text-slate-900">Stock & Pricing</h4>

          <div className="grid grid-cols-3 gap-4">
            <div>
              {field('Quantity')}
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div>
              {field('Low Stock Alert')}
              <input
                type="number"
                min={1}
                value={form.quantity_threshold}
                onChange={e => setForm(f => ({ ...f, quantity_threshold: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div>
              {field('Ref. Price (GHS)', false)}
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.reference_price}
                onChange={e => setForm(f => ({ ...f, reference_price: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {field('Branch')}
              <div className="relative">
                <select
                  value={form.branch_id}
                  onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              {field('Notes', false)}
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => onNavigate('inventory')} className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : 'Add to Inventory'}
          </button>
        </div>
      </form>
    </div>
  );
}
