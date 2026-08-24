import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct } from '../api/client';
import Badge from '../components/Badge';
import { ArrowLeft } from 'lucide-react';

function MetaRow({ k, v }) {
  if (!v) return null;
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-4 text-xs font-mono text-gray-400 align-top whitespace-nowrap">{k}</td>
      <td className="py-2 text-sm text-gray-700 break-all max-w-sm">
        {String(v).slice(0, 300)}{String(v).length > 300 ? '…' : ''}
      </td>
    </tr>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProduct(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-rose-600">{error}</div>;

  const { variations = [], categories = [], meta = [], images = [] } = data;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <button onClick={() => navigate('/admin/products')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-sm text-gray-400 mt-1">ID #{data.ID} · /{data.slug}</p>
        </div>
        <Badge value={data.stock_status} />
      </div>

      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((img) => (
            <img key={img.ID} src={img.guid} alt={img.title} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <span key={c.term_id} className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">
              {c.name}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Price', v: data.min_price != null ? `₹${Number(data.min_price).toLocaleString('en-IN')}` : '—' },
          { l: 'SKU', v: data.sku || '—' },
          { l: 'Stock Status', v: <Badge value={data.stock_status} /> },
          { l: 'Total Sales', v: data.total_sales ?? 0 },
          { l: 'Rating', v: data.average_rating > 0 ? `${data.average_rating} / 5 (${data.rating_count})` : '—' },
          { l: 'Tax Status', v: data.tax_status },
          { l: 'Virtual', v: data.virtual ? 'Yes' : 'No' },
          { l: 'Downloadable', v: data.downloadable ? 'Yes' : 'No' },
        ].map(({ l, v }) => (
          <div key={l} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400">{l}</p>
            <div className="mt-1 text-sm font-semibold text-gray-800">{v}</div>
          </div>
        ))}
      </div>

      {variations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Variations ({variations.length})</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Size', 'SKU', 'Price', 'Regular', 'Sale', 'Stock Qty', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variations.map((v) => (
                <tr key={v.ID} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">#{v.ID}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{v.size || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{v.sku || '—'}</td>
                  <td className="px-4 py-2">{v.price ? `₹${Number(v.price).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{v.regular_price ? `₹${Number(v.regular_price).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-2 text-emerald-600">{v.sale_price ? `₹${Number(v.sale_price).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-2">{v.stock_quantity ?? '—'}</td>
                  <td className="px-4 py-2"><Badge value={v.stock_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Product Metadata (wpwd_postmeta)</h2>
        </div>
        <div className="px-5 py-3 overflow-x-auto">
          <table className="text-sm w-full">
            <tbody>
              {meta.map((m) => (
                <MetaRow key={m.meta_key} k={m.meta_key} v={m.meta_value} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
