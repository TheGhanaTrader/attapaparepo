import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Plus, CreditCard as Edit2, Trash2, AlertTriangle, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, Branch } from '../lib/types';
import { LIGHT_TYPES } from '../lib/carData';
import Modal from '../components/ui/Modal';

interface InventoryPageProps {
  onNavigate: (page: string) => void;
  highlightId?: string;
}

const PAGE_SIZE = 20;

export default function InventoryPage({ onNavigate, highlightId }: InventoryPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*, branch:branches(name)', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`car_make.ilike.%${search}%,car_model.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (filterType) query = query.eq('light_type', filterType);
    if (filterBranch) query = query.eq('branch_id', filterBranch);
    if (filterStock === 'low') query = query.lt('quantity', 5);
    if (filterStock === 'out') query = query.eq('quantity', 0);
    if (filterStock === 'in') query = query.gt('quantity', 0);

    const { data, count } = await query;
    setProducts(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, filterType, filterBranch, filterStock]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { supabase.from('branches').select('*').then(({ data }) => setBranches(data || [])); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('products').update({ is_active: false }).eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    setSaving(true);
    await supabase.from('products').update({ quantity: editQty, reference_price: editPrice }).eq('id', editProduct.id);
    setSaving(false);
    setEditProduct(null);
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900">Inventory</h3>
          <p className="text-slate-500 text-sm">{total.toLocaleString()} products</p>
        </div>
        <button
          onClick={() => onNavigate('add-product')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search make, model, SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Types</option>
            {LIGHT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterBranch}
            onChange={e => { setFilterBranch(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select
            value={filterStock}
            onChange={e => { setFilterStock(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          {(search || filterType || filterBranch || filterStock) && (
            <button
              onClick={() => { setSearch(''); setFilterType(''); setFilterBranch(''); setFilterStock(''); setPage(0); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter size={13} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Package size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">No products found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new product</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type / Side</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ref. Price</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map(product => {
                    const isLow = product.quantity > 0 && product.quantity <= product.quantity_threshold;
                    const isOut = product.quantity === 0;
                    const isHighlighted = product.id === highlightId;
                    return (
                      <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isHighlighted ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {product.car_make} {product.car_model}
                            </p>
                            <p className="text-xs text-slate-500">{product.car_year} · {product.variant}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            product.light_type === 'Headlight' ? 'bg-blue-50 text-blue-700' :
                            product.light_type === 'Taillight' ? 'bg-red-50 text-red-700' :
                            product.light_type === 'Fog Light' ? 'bg-amber-50 text-amber-700' :
                            'bg-teal-50 text-teal-700'
                          }`}>
                            {product.light_type}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">{product.side}</span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{product.sku}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {(product.branch as { name?: string } | null)?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {(isOut || isLow) && (
                              <AlertTriangle size={12} className={isOut ? 'text-red-500' : 'text-orange-500'} />
                            )}
                            <span className={`text-sm font-bold ${
                              isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-emerald-600'
                            }`}>
                              {product.quantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {product.reference_price > 0
                            ? `GHS ${Number(product.reference_price).toLocaleString()}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setEditProduct(product); setEditQty(product.quantity); setEditPrice(product.reference_price); }}
                              className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Edit Product"
        size="sm"
        footer={
          <>
            <button onClick={() => setEditProduct(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button onClick={handleEditSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editProduct && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-900">{editProduct.car_make} {editProduct.car_model}</p>
              <p className="text-sm text-slate-500">{editProduct.light_type} · {editProduct.side} · {editProduct.sku}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Stock Quantity</label>
              <input
                type="number"
                min={0}
                value={editQty}
                onChange={e => setEditQty(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Reference Price (GHS)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editPrice}
                onChange={e => setEditPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Product"
        size="sm"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60">
              {deleting ? 'Removing...' : 'Remove Product'}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div>
            <p className="text-slate-700">Are you sure you want to remove <strong>{deleteTarget.car_make} {deleteTarget.car_model} ({deleteTarget.light_type})</strong>?</p>
            <p className="text-slate-500 text-sm mt-2">The product will be archived and won't appear in inventory.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
