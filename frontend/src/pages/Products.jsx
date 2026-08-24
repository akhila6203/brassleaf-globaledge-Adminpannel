import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, getCategories } from '../api/client';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import { Package } from 'lucide-react';

function fmtPrice(min, max) {
  if (!min && !max) return '—';
  const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
  return min === max || !max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export default function Products() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    data: [], total: 0, page: 1, pages: 1, loading: true, error: null,
  });
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sort, setSort] = useState('date');
  const [dir, setDir] = useState('desc');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories({ limit: 100, sort: 'name', dir: 'asc' })
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(
    (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      getProducts({
        page,
        limit: 20,
        search,
        stock_status: stockFilter || undefined,
        category: catFilter || undefined,
        sort,
        dir,
      })
        .then((r) =>
          setState({
            data: r.data.data,
            total: r.data.total,
            page: r.data.page,
            pages: r.data.pages,
            loading: false,
            error: null,
          })
        )
        .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })));
    },
    [search, stockFilter, catFilter, sort, dir]
  );

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-1">{state.total} products from wpwd_posts</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar placeholder="Search name or SKU…" onSearch={setSearch} className="w-64" />
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All stock</option>
          <option value="instock">In Stock</option>
          <option value="outofstock">Out of Stock</option>
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.term_id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="date">Sort: date</option>
          <option value="name">Sort: name</option>
          <option value="price">Sort: price</option>
          <option value="sales">Sort: sales</option>
          <option value="sku">Sort: SKU</option>
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
                  {['ID', 'Product', 'SKU', 'Price', 'Stock', 'Sales', 'Image'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      <Package className="mx-auto mb-2 text-gray-300" size={32} />
                      No products found
                    </td>
                  </tr>
                ) : (
                  state.data.map((p) => (
                    <tr key={p.ID} onClick={() => navigate(`/admin/products/${p.ID}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{p.ID}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.slug}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{fmtPrice(p.min_price, p.max_price)}</td>
                      <td className="px-4 py-3"><Badge value={p.stock_status} /></td>
                      <td className="px-4 py-3 text-gray-600">{p.total_sales ?? 0}</td>
                      <td className="px-4 py-3">
                        {p.image_url ? <img src={p.image_url} alt="" className="w-10 h-10 object-cover rounded" /> : '—'}
                      </td>
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
