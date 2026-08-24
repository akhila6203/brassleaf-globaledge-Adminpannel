import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/client';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import { Tag } from 'lucide-react';

export default function Categories() {
  const navigate = useNavigate();
  const [state, setState] = useState({ data: [], total: 0, page: 1, pages: 1, loading: true, error: null });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('asc');

  const load = useCallback(
    (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      getCategories({ page, limit: 20, search, sort, dir })
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
        <h1 className="text-2xl font-bold text-gray-900">Product Categories</h1>
        <p className="text-sm text-gray-500 mt-1">taxonomy = product_cat in wpwd_term_taxonomy</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar placeholder="Search category…" onSearch={setSearch} className="w-64" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="name">Sort: name</option>
          <option value="count">Sort: product count</option>
          <option value="id">Sort: ID</option>
        </select>
        <select value={dir} onChange={(e) => setDir(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </div>

      {state.loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : state.error ? (
        <div className="text-rose-600">{state.error}</div>
      ) : state.data.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
          <Tag className="mx-auto mb-2 text-gray-300" size={32} />
          No categories found
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.data.map((cat) => (
              <div key={cat.term_id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-emerald-600" />
                    <h3 className="font-semibold text-gray-800">{cat.name}</h3>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    {cat.product_count} products
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono">/{cat.slug} · term_id {cat.term_id}</p>
                <button
                  onClick={() => navigate(`/admin/categories/${cat.term_id}`)}
                  className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium pt-1"
                >
                  View details →
                </button>
              </div>
            ))}
          </div>
          <Pagination page={state.page} pages={state.pages} onPage={load} />
        </>
      )}
    </div>
  );
}
