import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUser } from '../api/client';
import Badge from '../components/Badge';
import { ArrowLeft } from 'lucide-react';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN');
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUser(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-rose-600">{error}</div>;

  const billingKeys = (data.meta || []).filter((m) => m.meta_key.startsWith('billing_') || m.meta_key.startsWith('shipping_'));

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to Users
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{data.display_name || data.user_login}</h1>
        <p className="text-sm text-gray-400 mt-1">wpwd_users.ID #{data.ID} · @{data.user_login}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(data.roles || []).map((r) => (
          <span key={r} className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">{r}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { l: 'Email', v: data.user_email },
          { l: 'Registered', v: fmtDate(data.user_registered) },
          { l: 'Status', v: data.user_status === 0 ? 'Active' : data.user_status },
        ].map(({ l, v }) => (
          <div key={l} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400">{l}</p>
            <p className="mt-1 text-sm font-semibold text-gray-800 break-all">{v}</p>
          </div>
        ))}
      </div>

      {billingKeys.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Address meta (wpwd_usermeta)</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {billingKeys.map((m) => (
              <div key={m.meta_key}>
                <dt className="text-xs text-gray-400">{m.meta_key}</dt>
                <dd className="text-gray-800">{m.meta_value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Orders (wpwd_wc_orders.customer_id = user ID)</h2>
        </div>
        {(data.orders || []).length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No orders</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Order', 'Date', 'Status', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">#{o.id}</td>
                  <td className="px-4 py-3">{fmtDate(o.date_created_gmt)}</td>
                  <td className="px-4 py-3"><Badge value={o.status} /></td>
                  <td className="px-4 py-3 font-semibold">₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
