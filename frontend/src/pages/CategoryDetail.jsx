import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCategory } from '../api/client';
import Badge from '../components/Badge';
import { ArrowLeft } from 'lucide-react';

export default function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategory(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-rose-600">{error}</div>;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <button onClick={() => navigate('/admin/categories')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to Categories
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
        <p className="text-sm text-gray-400 mt-1">term_id #{data.term_id} · /{data.slug}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Products in this category ({(data.products || []).length})</h2>
        </div>
        {(data.products || []).length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No products assigned</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Name', 'SKU', 'Price', 'Stock'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.ID} onClick={() => navigate(`/admin/products/${p.ID}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">#{p.ID}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku || '—'}</td>
                  <td className="px-4 py-3">₹{Number(p.min_price || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><Badge value={p.stock_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
