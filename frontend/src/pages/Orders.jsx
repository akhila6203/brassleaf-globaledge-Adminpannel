import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../api/client';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import { ShoppingCart } from 'lucide-react';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Orders() {
  const navigate = useNavigate();
  const [state, setState] = useState({ data: [], total: 0, page: 1, pages: 1, loading: true, error: null });
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');

  const [sort, setSort] = useState('date');
  const [dir, setDir] = useState('desc');

  const load = useCallback(
    (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      getOrders({ page, limit: 20, search, status: statusFilter || undefined, sort, dir })
        .then((r) =>
          setState({ data: r.data.data, total: r.data.total, page: r.data.page, pages: r.data.pages, loading: false, error: null })
        )
        .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })));
    },
    [search, statusFilter, sort, dir]
  );

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">{state.total.toLocaleString()} orders total</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar placeholder="Search email or name…" onSearch={setSearch} className="w-64" />
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All statuses</option>
          <option value="wc-processing">Processing</option>
          <option value="wc-cancelled">Cancelled</option>
          <option value="wc-failed">Failed</option>
          <option value="wc-completed">Completed</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="date">Sort: date</option>
          <option value="total">Sort: total</option>
          <option value="id">Sort: ID</option>
          <option value="status">Sort: status</option>
        </select>
        <select value={dir} onChange={(e) => setDir(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {state.loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : state.error ? (
          <div className="p-8 text-center text-rose-600">{state.error}</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Order', 'Customer', 'Date', 'Status', 'Total', 'Payment'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <ShoppingCart className="mx-auto mb-2 text-gray-300" size={32} />
                      No orders found
                    </td>
                  </tr>
                ) : (
                  state.data.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">#{o.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{[o.first_name, o.last_name].filter(Boolean).join(' ') || '—'}</p>
                        <p className="text-xs text-gray-400">{o.billing_email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(o.date_created_gmt)}</td>
                      <td className="px-4 py-3"><Badge value={o.status} /></td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{o.payment_method_title || o.payment_method}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination page={state.page} pages={state.pages} onPage={load} />
          </>
        )}
      </div>
    </div>
  );
}
