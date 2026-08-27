import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { getPayment, reconcilePayment } from '../../api/payments';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useSnackbar } from '../../context/SnackbarContext';
import { formatCurrency, formatDateTime, fullName } from '../../utils/format';

function Row({ label, value }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value != null && value !== '' ? value : '—'}
      </Typography>
    </Stack>
  );
}

function AddressBlock({ title, a }) {
  if (!a) return null;
  const hasAny = Object.values(a).some((v) => v);
  if (!hasAny) return null;
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Typography fontWeight={600}>{fullName(a.first_name, a.last_name)}</Typography>
      {a.company && <Typography variant="body2">{a.company}</Typography>}
      {a.address_1 && <Typography variant="body2">{a.address_1}</Typography>}
      {a.address_2 && <Typography variant="body2">{a.address_2}</Typography>}
      <Typography variant="body2">
        {[a.city, a.state, a.postcode].filter(Boolean).join(', ') || '—'}
      </Typography>
      {a.country && <Typography variant="body2">{a.country}</Typography>}
      {a.email && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {a.email}
        </Typography>
      )}
      {a.phone && (
        <Typography variant="body2" color="text.secondary">
          {a.phone}
        </Typography>
      )}
    </Box>
  );
}

function GatewayTable({ data }) {
  const entries = Object.entries(data || {}).filter(
    ([, v]) => v != null && v !== '' && typeof v !== 'object'
  );
  if (entries.length === 0) {
    return <EmptyState title="No gateway response" />;
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Field</TableCell>
          <TableCell>Value</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map(([key, value]) => (
          <TableRow key={key}>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{key}</TableCell>
            <TableCell sx={{ wordBreak: 'break-word' }}>{String(value)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function PaymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reconcileStatus, setReconcileStatus] = useState('1');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getPayment(id)
      .then((r) => {
        setData(r.data);
        setReconcileStatus(String(r.data.status ?? '0'));
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReconcile = async () => {
    setSaving(true);
    try {
      const res = await reconcilePayment(id, { status: reconcileStatus });
      setData(res.data);
      showToast('Payment reconciled', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (error) return <EmptyState error title="Payment not found" description={error} />;

  const gatewayMap = data.paytm_response || data.gateway || {};
  const customer = data.customer_record || data.customer;
  const customerId = customer?.customer_id || customer?.user_id || data.order?.customer_id;
  const customerName =
    fullName(customer?.first_name, customer?.last_name) !== '—'
      ? fullName(customer?.first_name, customer?.last_name)
      : customer?.username || data.billing_email || '—';

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/payments')}
        sx={{ mb: 1 }}
      >
        Back to payments
      </Button>
      <PageHeader
        title={`Payment #${data.payment_id ?? data.id}`}
        subtitle={`Order #${data.order_id} · ${formatDateTime(data.date_added)}`}
        actions={<StatusBadge value={String(data.status ?? '')} />}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Payment
              </Typography>
              <Row label="Payment ID" value={`#${data.payment_id ?? data.id}`} />
              <Row label="Order ID" value={`#${data.order_id}`} />
              <Row label="Paytm Order ID" value={data.paytm_order_id} />
              <Row label="Transaction ID" value={data.transaction_id || data.TXNID} />
              <Row label="Status" value={data.status_label || data.status} />
              <Row
                label="Amount"
                value={formatCurrency(data.amount ?? data.TXNAMOUNT ?? data.total_amount)}
              />
              <Row label="Currency" value={data.currency} />
              <Row label="Payment mode" value={data.PAYMENTMODE || data.gateway?.PAYMENTMODE} />
              <Row label="Gateway" value={data.GATEWAYNAME || data.gateway?.GATEWAYNAME} />
              <Row label="Bank TXN" value={data.BANKTXNID || data.gateway?.BANKTXNID} />
              <Row label="Refund" value={data.REFUNDAMT || data.gateway?.REFUNDAMT} />
              <Row label="TXN type" value={data.TXNTYPE || data.gateway?.TXNTYPE} />
              <Row label="Response code" value={data.RESPCODE || data.gateway?.RESPCODE} />
              <Row label="Response message" value={data.RESPMSG || data.gateway?.RESPMSG} />
              <Row label="MID" value={data.MID || data.gateway?.MID} />
              <Row
                label="TXN date"
                value={formatDateTime(data.TXNDATE || data.gateway?.TXNDATE)}
              />
              <Row label="Date added" value={formatDateTime(data.date_added)} />
              <Row label="Date modified" value={formatDateTime(data.date_modified)} />
              <Row label="Order status" value={data.order_status} />
              <Row
                label="Payment method"
                value={data.payment_method_title || data.payment_method}
              />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Gateway response
              </Typography>
              <GatewayTable data={gatewayMap} />
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Billing address
              </Typography>
              <AddressBlock title="" a={data.billing_address} />
              {!data.billing_address && <Typography color="text.secondary">—</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Related order
              </Typography>
              {data.order ? (
                <Stack spacing={1}>
                  <Row
                    label="Order"
                    value={
                      <Link component={RouterLink} to={`/admin/orders/${data.order.id}`}>
                        #{data.order.id}
                      </Link>
                    }
                  />
                  <Row
                    label="Status"
                    value={<StatusBadge value={data.order.status} />}
                  />
                  <Row label="Total" value={formatCurrency(data.order.total_amount)} />
                  <Row label="Email" value={data.order.billing_email} />
                  <Row
                    label="Created"
                    value={formatDateTime(data.order.date_created_gmt)}
                  />
                </Stack>
              ) : (
                <Stack spacing={1}>
                  <Row
                    label="Order"
                    value={
                      <Link component={RouterLink} to={`/admin/orders/${data.order_id}`}>
                        #{data.order_id}
                      </Link>
                    }
                  />
                  <Row
                    label="Status"
                    value={
                      data.order_status ? <StatusBadge value={data.order_status} /> : '—'
                    }
                  />
                  <Row label="Total" value={formatCurrency(data.total_amount)} />
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Customer
              </Typography>
              <Row
                label="Name"
                value={
                  customerId ? (
                    <Link component={RouterLink} to={`/admin/customers/${customerId}`}>
                      {customerName}
                    </Link>
                  ) : (
                    customerName
                  )
                }
              />
              <Row label="Email" value={customer?.email || data.billing_email} />
              <Row label="Phone" value={customer?.phone || data.billing_address?.phone} />
              {customer?.customer_id && (
                <Row label="Customer ID" value={`#${customer.customer_id}`} />
              )}
              {customer?.user_id && <Row label="User ID" value={`#${customer.user_id}`} />}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Reconcile status
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={reconcileStatus}
                  onChange={(e) => setReconcileStatus(e.target.value)}
                >
                  <MenuItem value="1">Success (1)</MenuItem>
                  <MenuItem value="0">Pending / failed (0)</MenuItem>
                </Select>
              </FormControl>
              <Button
                fullWidth
                variant="contained"
                disabled={saving || reconcileStatus === String(data.status)}
                onClick={handleReconcile}
              >
                {saving ? 'Saving…' : 'Update status'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
