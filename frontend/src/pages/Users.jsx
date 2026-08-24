import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../api/client';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import { UserCircle } from 'lucide-react';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Users() {
  const navigate = useNavigate();
  const [state, setState] = useState({ data: [], total: 0, page: 1, pages: 1, loading: true, error: null });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState('id');
  const [dir, setDir] = useState('asc');

  const load = useCallback(
    (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      getUsers({ page, limit: 20, search, role: role || undefined, sort, dir })
        .then((r) =>
          setState({ data: r.data.data, total: r.data.total, page: r.data.page, pages: r.data.pages, loading: false, error: null })
        )
        .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })));
    },
    [search, role, sort, dir]
  );

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">{state.total.toLocaleString()} rows in wpwd_users</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar placeholder="Search login, email, name…" onSearch={setSearch} className="w-72" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All roles</option>
          <option value="administrator">Administrator</option>
          <option value="customer">Customer</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="id">Sort: ID</option>
          <option value="login">Sort: login</option>
          <option value="email">Sort: email</option>
          <option value="registered">Sort: registered</option>
        </select>
        <select value={dir} onChange={(e) => setDir(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
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
                  {['ID', 'Login', 'Name', 'Email', 'Roles', 'Registered'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      <UserCircle className="mx-auto mb-2 text-gray-300" size={32} />
                      No users found
                    </td>
                  </tr>
                ) : (
                  state.data.map((u) => (
                    <tr key={u.ID} onClick={() => navigate(`/admin/users/${u.ID}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">#{u.ID}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{u.user_login}</td>
                      <td className="px-4 py-3 text-gray-700">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.display_name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.user_email}</td>
                      <td className="px-4 py-3">
                        {(u.roles || []).map((r) => (
                          <span key={r} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full mr-1">{r}</span>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(u.user_registered)}</td>
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
