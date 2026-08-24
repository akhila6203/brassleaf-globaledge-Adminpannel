import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomer } from '../api/client';
import Badge from '../components/Badge';
import { ArrowLeft } from 'lucide-react';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function metaVal(meta, key) {
  const m = meta?.find((x) => x.meta_key === key);
  return m?.meta_value || '';
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCustomer(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-rose-600">{error}</div>;

  const { meta = [], orders = [] } = data;
  const billingAddr = [
    metaVal(meta, 'billing_address_1'),
    metaVal(meta, 'billing_city'),
    metaVal(meta, 'billing_state'),
    metaVal(meta, 'billing_postcode'),
    metaVal(meta, 'billing_country'),
  ].filter(Boolean).join(', ');

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <button onClick={() => navigate('/admin/customers')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to Customers
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {[data.first_name, data.last_name].filter(Boolean).join(' ') || data.username}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          lookup #{data.customer_id} · WP user #{data.user_id} · @{data.username}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { l: 'Email', v: data.email },
          { l: 'Phone', v: metaVal(meta, 'billing_phone') || '—' },
          { l: 'Country', v: data.country || '—' },
          { l: 'Registered', v: fmtDate(data.date_registered || data.user_registered) },
          { l: 'Last Active', v: fmtDate(data.date_last_active) },
          { l: 'User Status', v: data.user_status === 0 ? 'Active' : String(data.user_status) },
        ].map(({ l, v }) => (
          <div key={l} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400">{l}</p>
            <p className="mt-1 text-sm font-semibold text-gray-800 break-all">{v}</p>
          </div>
        ))}
      </div>

      {billingAddr && (
        <div className="bg-gray-50 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-2">Default Billing Address</h2>
          <p className="text-sm text-gray-600">{metaVal(meta, 'billing_first_name')} {metaVal(meta, 'billing_last_name')}</p>
          <p className="text-sm text-gray-600">{billingAddr}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent Orders ({orders.length})</h2>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No orders</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Order', 'Date', 'Status', 'Total', 'Payment'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">#{o.id}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(o.date_created_gmt)}</td>
                  <td className="px-4 py-3"><Badge value={o.status} /></td>
                  <td className="px-4 py-3 font-semibold">₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{o.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
