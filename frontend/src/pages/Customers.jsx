import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers } from '../api/client';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import { Users } from 'lucide-react';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Customers() {
  const navigate = useNavigate();
  const [state, setState] = useState({ data: [], total: 0, page: 1, pages: 1, loading: true, error: null });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('active');
  const [dir, setDir] = useState('desc');

  const load = useCallback(
    (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      getCustomers({ page, limit: 20, search, sort, dir })
        .then((r) =>
          setState({ data: r.data.data, total: r.data.total, page: r.data.page, pages: r.data.pages, loading: false, error: null })
        )
        .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })));
    },
    [search, sort, dir]
  );

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">{state.total.toLocaleString()} rows in wpwd_wc_customer_lookup</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar placeholder="Search name, email, username…" onSearch={setSearch} className="w-72" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="active">Sort: last active</option>
          <option value="registered">Sort: registered</option>
          <option value="email">Sort: email</option>
          <option value="name">Sort: name</option>
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
                  {['Customer', 'Email', 'Location', 'Orders', 'Lifetime Value', 'Registered', 'Last Active'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      <Users className="mx-auto mb-2 text-gray-300" size={32} />
                      No customers found
                    </td>
                  </tr>
                ) : (
                  state.data.map((c) => (
                    <tr key={c.customer_id} onClick={() => navigate(`/admin/customers/${c.customer_id}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.username}</p>
                        <p className="text-xs text-gray-400">{c.username}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.email}</td>
                      <td className="px-4 py-3 text-gray-500">{[c.city, c.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-3 font-medium">{c.order_count}</td>
                      <td className="px-4 py-3 font-semibold">
                        {c.lifetime_value ? `₹${Number(c.lifetime_value).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(c.date_registered || c.user_registered)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(c.date_last_active)}</td>
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
