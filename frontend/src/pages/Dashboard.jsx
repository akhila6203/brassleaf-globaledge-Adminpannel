import { useEffect, useState } from 'react';
import { getDashboard } from '../api/client';
import StatCard from '../components/StatCard';
import {
  ShoppingCart, Users, Package, TrendingUp, IndianRupee,
  CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

function fmt(n) {
  return n == null ? '—' : Number(n).toLocaleString('en-IN');
}
function fmtCurrency(n) {
  return n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboard()
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard…</div>;
  if (error)   return <div className="p-8 text-rose-600">Error: {error}</div>;

  const { orders, products, users, customers, stock, payments, revenueByMonth, topProducts } = data;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Brassleaf WooCommerce — read-only overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={fmtCurrency(orders?.total_revenue)}
          sub={`Avg order ${fmtCurrency(orders?.avg_order_value)}`}
          icon={IndianRupee}
          color="emerald"
        />
        <StatCard
          label="Total Orders"
          value={fmt(orders?.total_orders)}
          sub={`${fmt(orders?.processing)} processing`}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          label="Customers"
          value={fmt(customers?.total_customers)}
          sub={`${fmt(users?.total_users)} WP users`}
          icon={Users}
          color="violet"
        />
        <StatCard
          label="Products"
          value={fmt(products?.total_products)}
          sub={`${fmt(products?.total_variations)} variations`}
          icon={Package}
          color="amber"
        />
      </div>

      {/* Order status row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Processing" value={fmt(orders?.processing)} icon={CheckCircle} color="blue" />
        <StatCard label="Cancelled"  value={fmt(orders?.cancelled)}  icon={XCircle}     color="rose" />
        <StatCard label="Failed"     value={fmt(orders?.failed)}     icon={AlertCircle} color="amber" />
      </div>

      {/* Stock status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="In Stock"     value={fmt(stock?.instock)}              icon={Package}      color="emerald" />
        <StatCard label="Out of Stock" value={fmt(stock?.outofstock)}           icon={Package}      color="rose" />
        <StatCard label="Paytm success" value={fmt(payments?.successful)}       icon={CheckCircle}  color="emerald" />
        <StatCard label="Paytm pending" value={fmt(payments?.failed_or_pending)} icon={AlertCircle} color="amber" />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-600" />
          Revenue — Last 12 Months
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueByMonth}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#059669" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => fmtCurrency(v)} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#059669"
              strokeWidth={2}
              fill="url(#rev)"
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Top Products by Revenue</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topProducts} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="product_name" width={180} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmtCurrency(v)} />
            <Bar dataKey="gross_revenue" fill="#059669" name="Revenue" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
