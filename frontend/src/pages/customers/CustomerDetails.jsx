import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
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
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCustomer } from '../../api/customers';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate, formatDateTime, formatNumber, fullName } from '../../utils/format';

function Row({ label, value }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value != null && value !== '' ? value : '—'}</Typography>
    </Stack>
  );
}

function AddressCard({ title, a }) {
  if (!a) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={600} gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary">—</Typography>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <Row label="Name" value={fullName(a.first_name, a.last_name)} />
        <Row label="Company" value={a.company} />
        <Row label="Address 1" value={a.address_1} />
        <Row label="Address 2" value={a.address_2} />
        <Row label="City" value={a.city} />
        <Row label="State" value={a.state} />
        <Row label="Postcode" value={a.postcode} />
        <Row label="Country" value={a.country} />
        <Row label="Email" value={a.email} />
        <Row label="Phone" value={a.phone} />
      </CardContent>
    </Card>
  );
}

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getCustomer(id)
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (error) return <EmptyState error title="Customer not found" description={error} />;

  const name =
    fullName(data.first_name, data.last_name) !== '—'
      ? fullName(data.first_name, data.last_name)
      : data.display_name || data.username || `Customer #${id}`;
  const stats = data.statistics || {};
  const orders = data.orders || [];
  const payments = data.payments || [];
  const billing = data.billing || data.addresses?.billing;
  const shipping = data.shipping || data.addresses?.shipping;

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/customers')}
        sx={{ mb: 1 }}
      >
        Back to customers
      </Button>
      <PageHeader
        title={name}
        subtitle={data.email}
        actions={
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/admin/customers/${id}/edit`)}
          >
            Edit
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Customer information
              </Typography>
              <Row label="Customer ID" value={`#${data.customer_id ?? data.id}`} />
              <Row label="User ID" value={data.user_id != null ? `#${data.user_id}` : null} />
              <Row label="Username" value={data.username || data.user_login} />
              <Row label="Display name" value={data.display_name} />
              <Row label="First name" value={data.first_name} />
              <Row label="Last name" value={data.last_name} />
              <Row label="Email" value={data.email || data.user_email} />
              <Row label="Phone" value={data.phone} />
              <Row label="Country" value={data.country} />
              <Row label="State" value={data.state} />
              <Row label="City" value={data.city} />
              <Row label="Postcode" value={data.postcode} />
              <Row
                label="Registered"
                value={formatDateTime(data.date_registered || data.user_registered)}
              />
              <Row label="Last active" value={formatDateTime(data.date_last_active)} />
              <Row
                label="User status"
                value={data.user_status != null ? String(data.user_status) : null}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Statistics
              </Typography>
              <Row label="Total orders" value={formatNumber(stats.total_orders)} />
              <Row label="Completed" value={formatNumber(stats.completed_orders)} />
              <Row label="Processing" value={formatNumber(stats.processing_orders)} />
              <Row label="Pending" value={formatNumber(stats.pending_orders)} />
              <Row label="Cancelled" value={formatNumber(stats.cancelled_orders)} />
              <Row label="Failed" value={formatNumber(stats.failed_orders)} />
              <Row label="Total spent" value={formatCurrency(stats.total_spent)} />
              <Row label="Avg order value" value={formatCurrency(stats.average_order_value)} />
              <Row label="First order" value={formatDate(stats.first_order_date)} />
              <Row label="Last order" value={formatDate(stats.last_order_date)} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AddressCard title="Billing address" a={billing} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AddressCard title="Shipping address" a={shipping} />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={600} gutterBottom>
            Orders ({orders.length})
          </Typography>
          {orders.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Txn</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o) => (
                  <TableRow
                    key={o.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                  >
                    <TableCell>#{o.id}</TableCell>
                    <TableCell>{formatDate(o.date_created_gmt)}</TableCell>
                    <TableCell>
                      <StatusBadge value={o.status} />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(o.total_amount)}</TableCell>
                    <TableCell>
                      {o.payment_method_title || o.payment_method || '—'}
                    </TableCell>
                    <TableCell>{o.transaction_id || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={600} gutterBottom>
              Payments ({payments.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Payment ID</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Paytm Order</TableCell>
                  <TableCell>Txn</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/payments/${p.id}`)}
                  >
                    <TableCell>#{p.id}</TableCell>
                    <TableCell>#{p.order_id}</TableCell>
                    <TableCell>{p.paytm_order_id || '—'}</TableCell>
                    <TableCell>{p.transaction_id || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge value={String(p.status ?? '')} />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(p.total_amount)}</TableCell>
                    <TableCell>{formatDateTime(p.date_added)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
