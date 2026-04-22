import { Search, Bell, Building2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
  onNavigate?: (page: string, productId?: string) => void;
}

export default function Header({ title, onNavigate }: HeaderProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('products')
        .select('*')
        .or(`car_make.ilike.%${query}%,car_model.ilike.%${query}%,sku.ilike.%${query}%,light_type.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(8);
      setResults(data || []);
      setShowResults(true);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (product: Product) => {
    setQuery('');
    setShowResults(false);
    if (onNavigate) onNavigate('inventory', product.id);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-20">
      <h2 className="text-slate-900 font-semibold text-lg flex-shrink-0">{title}</h2>

      {/* Search */}
      <div ref={containerRef} className="flex-1 max-w-md relative ml-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products by make, model, type..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
            {results.map(product => (
              <button
                key={product.id}
                onClick={() => handleSelect(product)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xs font-bold">
                    {product.light_type === 'Headlight' ? 'HL' :
                     product.light_type === 'Taillight' ? 'TL' :
                     product.light_type === 'Fog Light' ? 'FL' : 'BL'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {product.car_make} {product.car_model} {product.car_year}
                  </p>
                  <p className="text-xs text-slate-500">{product.light_type} · {product.side} · SKU: {product.sku}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                  product.quantity > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {product.quantity > 0 ? `In Stock (${product.quantity})` : 'Out of Stock'}
                </span>
              </button>
            ))}
          </div>
        )}

        {showResults && results.length === 0 && query.length >= 2 && !searching && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 text-center animate-fade-in">
            <p className="text-sm text-slate-500">No products found for "{query}"</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {profile?.role === 'ceo' && (
          <button className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors relative">
            <Bell size={18} />
          </button>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <Building2 size={14} className="text-blue-600" />
          <span className="text-xs font-medium text-slate-700">Main Branch</span>
        </div>
      </div>
    </header>
  );
}
