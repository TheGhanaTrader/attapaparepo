import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuditLog } from '../lib/types';

const PAGE_SIZE = 30;

const ACTION_COLORS: Record<string, string> = {
  SALE_COMPLETED: 'bg-emerald-50 text-emerald-700',
  PRODUCT_ADDED: 'bg-blue-50 text-blue-700',
  PRODUCT_UPDATED: 'bg-amber-50 text-amber-700',
  PRODUCT_DELETED: 'bg-red-50 text-red-700',
  RETURN_PROCESSED: 'bg-slate-50 text-slate-700',
  STOCK_INTAKE: 'bg-teal-50 text-teal-700',
  DEFAULT: 'bg-slate-50 text-slate-600',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audit_logs')
      .select('*, profile:profiles(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterAction) q = q.eq('action', filterAction);
    if (filterDate) q = q.gte('created_at', filterDate).lt('created_at', filterDate + 'T23:59:59');

    const { data, count } = await q;
    setLogs((data as AuditLog[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, filterAction, filterDate]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const actions = ['SALE_COMPLETED', 'PRODUCT_ADDED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 'RETURN_PROCESSED', 'STOCK_INTAKE'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-xl font-black text-slate-900">Audit Logs</h3>
        <p className="text-slate-500 text-sm">{total.toLocaleString()} events recorded</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => { setFilterDate(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ScrollText size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">No audit logs found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => {
                  const colorClass = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {(log.profile as { full_name?: string } | null)?.full_name || 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colorClass}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 capitalize">{log.entity_type}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-48 truncate">
                        {log.details && Object.keys(log.details).length > 0
                          ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
    </div>
  );
}
