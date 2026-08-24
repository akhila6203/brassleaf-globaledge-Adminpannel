import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments, getPaymentStats } from '../api/client';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import StatCard from '../components/StatCard';
import { CreditCard, IndianRupee, CheckCircle, XCircle } from 'lucide-react';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Payments() {
  const navigate = useNavigate();
  const [state, setState] = useState({ data: [], total: 0, page: 1, pages: 1, loading: true, error: null });
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date');
  const [dir, setDir] = useState('desc');

  useEffect(() => {
    getPaymentStats()
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  const load = useCallback(
    (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      getPayments({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: search || undefined,
        sort,
        dir,
      })
        .then((r) =>
          setState({ data: r.data.data, total: r.data.total, page: r.data.page, pages: r.data.pages, loading: false, error: null })
        )
        .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })));
    },
    [statusFilter, search, sort, dir]
  );

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">wpwd_paytm_order_data joined to wpwd_wc_orders</p>
      </div>

      {stats?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Transactions" value={stats.summary.total_transactions} icon={CreditCard} color="blue" />
          <StatCard label="Successful" value={stats.summary.successful} icon={CheckCircle} color="emerald" />
          <StatCard label="Failed / Pending" value={stats.summary.failed_or_pending} icon={XCircle} color="rose" />
          <StatCard
            label="Total Collected"
            value={`₹${Number(stats.summary.total_collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={IndianRupee}
            color="amber"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar placeholder="Search txn, email, order ID…" onSearch={setSearch} className="w-72" />
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All statuses</option>
          <option value="1">Successful</option>
          <option value="0">Pending / Failed</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="date">Sort: date</option>
          <option value="amount">Sort: amount</option>
          <option value="order">Sort: order ID</option>
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
                  {['Paytm Order ID', 'Transaction ID', 'Customer', 'Order', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      <CreditCard className="mx-auto mb-2 text-gray-300" size={32} />
                      No payments found
                    </td>
                  </tr>
                ) : (
                  state.data.map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/admin/orders/${p.order_id}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.paytm_order_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.transaction_id || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}</p>
                        <p className="text-xs text-gray-400">{p.billing_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400">#{p.order_id}</span>
                        <div className="mt-0.5"><Badge value={p.order_status} /></div>
                      </td>
                      <td className="px-4 py-3 font-semibold">₹{Number(p.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><Badge value={String(p.status)} /></td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.date_added)}</td>
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
