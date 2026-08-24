import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../api/client';
import Badge from '../components/Badge';
import { ArrowLeft } from 'lucide-react';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function AddressCard({ title, a }) {
  if (!a) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</p>
      <p className="font-medium text-gray-800">{[a.first_name, a.last_name].filter(Boolean).join(' ')}</p>
      {a.company && <p className="text-sm text-gray-600">{a.company}</p>}
      <p className="text-sm text-gray-600">{a.address_1}</p>
      {a.address_2 && <p className="text-sm text-gray-600">{a.address_2}</p>}
      <p className="text-sm text-gray-600">{[a.city, a.state, a.postcode].filter(Boolean).join(', ')}</p>
      <p className="text-sm text-gray-600">{a.country}</p>
      {a.email && <p className="text-sm text-gray-400 mt-1">{a.email}</p>}
      {a.phone && <p className="text-sm text-gray-400">{a.phone}</p>}
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getOrder(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-rose-600">{error}</div>;

  const billing = data.addresses?.find((a) => a.address_type === 'billing');
  const shipping = data.addresses?.find((a) => a.address_type === 'shipping');
  const lineItems = (data.items || []).filter((i) => i.order_item_type === 'line_item');
  const shippingItems = (data.items || []).filter((i) => i.order_item_type === 'shipping');

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{data.id}</h1>
          <p className="text-sm text-gray-400 mt-1">{fmtDate(data.date_created_gmt)}</p>
        </div>
        <Badge value={data.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Total', v: `₹${Number(data.total_amount).toLocaleString('en-IN')}` },
          { l: 'Tax', v: `₹${Number(data.tax_amount || 0).toLocaleString('en-IN')}` },
          { l: 'Shipping', v: `₹${Number(data.shipping_total_amount || 0).toLocaleString('en-IN')}` },
          { l: 'Discount', v: `₹${Number(data.discount_total_amount || 0).toLocaleString('en-IN')}` },
          { l: 'Payment', v: data.payment_method_title || data.payment_method },
          { l: 'Transaction ID', v: data.transaction_id || '—' },
          { l: 'Date Paid', v: fmtDate(data.date_paid_gmt) },
          { l: 'Order Key', v: data.order_key || '—' },
        ].map(({ l, v }) => (
          <div key={l} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400">{l}</p>
            <p className="mt-1 text-sm font-semibold text-gray-800 break-all">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AddressCard title="Billing Address" a={billing} />
        <AddressCard title="Shipping Address" a={shipping} />
      </div>

      {data.paytm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Paytm (wpwd_paytm_order_data)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Paytm Order ID</p>
              <p className="font-mono mt-0.5">{data.paytm.paytm_order_id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Transaction ID</p>
              <p className="font-mono mt-0.5">{data.paytm.transaction_id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <div className="mt-0.5"><Badge value={String(data.paytm.status)} /></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Line Items ({lineItems.length})</h2>
        </div>
        <table className="min-w-full text-sm divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Product', 'Size', 'Product ID', 'Qty', 'Subtotal', 'Total', 'Tax'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineItems.map((item) => (
              <tr key={item.order_item_id}>
                <td className="px-4 py-3 font-medium text-gray-800">{item.order_item_name}</td>
                <td className="px-4 py-3 text-gray-500">{item.size || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">#{item.product_id}</td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3">₹{Number(item.line_subtotal || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 font-semibold">₹{Number(item.line_total || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-gray-500">₹{Number(item.line_tax || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shippingItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Shipping</h2>
          </div>
          {shippingItems.map((s) => (
            <div key={s.order_item_id} className="px-5 py-3 text-sm text-gray-700">{s.order_item_name}</div>
          ))}
        </div>
      )}

      {data.customer_note && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Customer Note</p>
          <p className="text-sm text-amber-900">{data.customer_note}</p>
        </div>
      )}
    </div>
  );
}
