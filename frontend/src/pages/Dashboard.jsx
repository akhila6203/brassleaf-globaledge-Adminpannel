import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  AlertTriangle,
  CreditCard,
  FolderTree,
  IndianRupee,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboard } from '../api/dashboard';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate, formatNumber, fullName } from '../utils/format';

const STATUS_COLORS = ['#0f766e', '#0369a1', '#ca8a04', '#dc2626', '#64748b', '#7c3aed', '#ea580c'];

function KpiCard({ label, value, sub, icon: Icon }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(15,118,110,0.1)',
                color: 'primary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon size={18} />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard()
      .then((r) => {
        if (!cancelled) {
          setData(r.data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const o = data?.orders || {};
  const p = data?.products || {};
  const pay = data?.payments || {};

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Live store overview from the Brassleaf WordPress / WooCommerce database"
      />

      {loading && <LoadingSkeleton variant="cards" />}

      {!loading && error && (
        <EmptyState
          error
          title="Dashboard unavailable"
          description={error}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      )}

      {!loading && !error && data && (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Total Revenue"
                value={formatCurrency(o.total_revenue)}
                sub={`Avg order ${formatCurrency(o.avg_order_value)}`}
                icon={IndianRupee}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Today Sales"
                value={formatCurrency(o.today_sales)}
                sub={`Month ${formatCurrency(o.monthly_sales)}`}
                icon={TrendingUp}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Total Orders"
                value={formatNumber(o.total_orders)}
                sub={`${formatNumber(o.processing)} processing`}
                icon={ShoppingCart}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Customers"
                value={formatNumber(data.customers?.total_customers)}
                sub={`${formatNumber(data.users?.total_users)} users`}
                icon={Users}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <KpiCard label="Pending" value={formatNumber(o.pending)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <KpiCard label="Processing" value={formatNumber(o.processing)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <KpiCard label="Shipped" value={formatNumber(o.shipped)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <KpiCard label="Completed" value={formatNumber(o.completed)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <KpiCard label="Cancelled" value={formatNumber(o.cancelled)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <KpiCard label="Failed / Refunded" value={`${formatNumber(o.failed)} / ${formatNumber(o.refunded)}`} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Products"
                value={formatNumber(p.total_products)}
                sub={`${formatNumber(p.draft_products)} draft · ${formatNumber(p.total_variations)} variations`}
                icon={Package}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Stock alerts"
                value={formatNumber(p.outofstock)}
                sub={`${formatNumber(p.low_stock)} low stock`}
                icon={AlertTriangle}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Categories"
                value={formatNumber(data.categories?.total_categories)}
                icon={FolderTree}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KpiCard
                label="Payments collected"
                value={formatCurrency(pay.total_collected)}
                sub={`${formatNumber(pay.successful)} ok · ${formatNumber(pay.failed_or_pending)} pending/fail · ${formatNumber(pay.total_payments)} total`}
                icon={CreditCard}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <TrendingUp size={18} color="#0f766e" />
                    <Typography fontWeight={600}>Revenue — last 12 months</Typography>
                  </Stack>
                  {(data.revenueByMonth || []).length === 0 ? (
                    <EmptyState title="No revenue data" description="No orders in the last 12 months." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={data.revenueByMonth}>
                        <defs>
                          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0f766e"
                          strokeWidth={2}
                          fill="url(#rev)"
                          name="Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={600} sx={{ mb: 2 }}>
                    Orders by status
                  </Typography>
                  {(data.ordersByStatus || []).length === 0 ? (
                    <EmptyState title="No order status data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={data.ordersByStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ status, count }) => `${String(status).replace('wc-', '')}: ${count}`}
                        >
                          {(data.ordersByStatus || []).map((_, i) => (
                            <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={600} sx={{ mb: 2 }}>
                    Daily sales — last 30 days
                  </Typography>
                  {(data.dailySales || []).length === 0 ? (
                    <EmptyState title="No daily sales" />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={data.dailySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(d) => formatDate(d)}
                        />
                        <YAxis
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          labelFormatter={(d) => formatDate(d)}
                          formatter={(v) => formatCurrency(v)}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0369a1"
                          fill="rgba(3,105,161,0.15)"
                          name="Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={600} sx={{ mb: 2 }}>
                    Top products by revenue
                  </Typography>
                  {(data.topProducts || []).length === 0 ? (
                    <EmptyState title="No product sales" />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.topProducts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="product_name"
                          width={120}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Bar dataKey="gross_revenue" fill="#0f766e" name="Revenue" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={600} sx={{ mb: 1.5 }}>
                    Recent orders
                  </Typography>
                  {(data.recentOrders || []).length === 0 ? (
                    <EmptyState title="No recent orders" />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.recentOrders.map((row) => (
                          <TableRow
                            key={row.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/orders/${row.id}`)}
                          >
                            <TableCell>#{row.id}</TableCell>
                            <TableCell>
                              <StatusBadge value={row.status} />
                            </TableCell>
                            <TableCell>{formatCurrency(row.total_amount)}</TableCell>
                            <TableCell>{formatDate(row.date_created_gmt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={600} sx={{ mb: 1.5 }}>
                    Recent customers
                  </Typography>
                  {(data.recentCustomers || []).length === 0 ? (
                    <EmptyState title="No recent customers" />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Registered</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.recentCustomers.map((row) => (
                          <TableRow
                            key={row.customer_id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/customers/${row.customer_id}`)}
                          >
                            <TableCell>
                              {fullName(row.first_name, row.last_name) !== '—'
                                ? fullName(row.first_name, row.last_name)
                                : row.username}
                            </TableCell>
                            <TableCell>{row.email || '—'}</TableCell>
                            <TableCell>{formatDate(row.date_registered)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={600} sx={{ mb: 1.5 }}>
                    Top customers
                  </Typography>
                  {(data.topCustomers || []).length === 0 ? (
                    <EmptyState title="No customer spend data" />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer</TableCell>
                          <TableCell>Orders</TableCell>
                          <TableCell>Spent</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.topCustomers.map((row) => (
                          <TableRow key={row.user_id || row.email}>
                            <TableCell>
                              <Box sx={{ fontWeight: 600 }}>
                                {fullName(row.first_name, row.last_name)}
                              </Box>
                              <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{row.email}</Box>
                            </TableCell>
                            <TableCell>{formatNumber(row.order_count)}</TableCell>
                            <TableCell>{formatCurrency(row.total_spent)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
}
