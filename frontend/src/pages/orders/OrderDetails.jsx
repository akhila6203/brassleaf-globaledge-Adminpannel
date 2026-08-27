import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  addOrderNote,
  getOrder,
  updateOrderStatus,
  updateShipment,
} from '../../api/orders';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useSnackbar } from '../../context/SnackbarContext';
import { formatCurrency, formatDateTime, fullName } from '../../utils/format';
import { ORDER_STATUSES } from '../../utils/status';

function Row({ label, value }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value != null && value !== '' ? value : '—'}
      </Typography>
    </Stack>
  );
}

function AddressBlock({ title, a }) {
  if (!a) {
    return (
      <Box>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography color="text.secondary">—</Typography>
      </Box>
    );
  }
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

function ItemsTable({ title, items, columns, empty = 'None' }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography fontWeight={600} gutterBottom>
          {title}
        </Typography>
        {!items || items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {empty}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.id} align={c.align || 'left'}>
                    {c.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.order_item_id || item.id || JSON.stringify(item)}>
                  {columns.map((c) => (
                    <TableCell key={c.id} align={c.align || 'left'}>
                      {c.render ? c.render(item) : item[c.id] ?? '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [customerNote, setCustomerNote] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [shipment, setShipment] = useState({
    tracking_number: '',
    tracking_provider: '',
    shipment_status: '',
  });
  const [shipSaving, setShipSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getOrder(id)
      .then((r) => {
        setData(r.data);
        setStatus(r.data.status || '');
        setShipment({
          tracking_number: r.data.tracking_number || '',
          tracking_provider: r.data.tracking_provider || '',
          shipment_status: r.data.shipment_status || '',
        });
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await updateOrderStatus(id, status);
      showToast('Order status updated', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setNoteSaving(true);
    try {
      const res = await addOrderNote(id, note.trim(), customerNote);
      setData(res.data);
      setNote('');
      setCustomerNote(false);
      showToast('Note added', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleShipmentSave = async () => {
    setShipSaving(true);
    try {
      const res = await updateShipment(id, shipment);
      setData(res.data);
      showToast('Shipment updated', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setShipSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (error) return <EmptyState error title="Order not found" description={error} />;

  const billing = data.billing || data.addresses?.find((a) => a.address_type === 'billing');
  const shipping =
    data.shipping || data.addresses?.find((a) => a.address_type === 'shipping');
  const lineItems = data.line_items || (data.items || []).filter((i) => i.order_item_type === 'line_item');
  const shippingItems =
    data.shipping_items || (data.items || []).filter((i) => i.order_item_type === 'shipping');
  const taxItems = data.tax_items || (data.items || []).filter((i) => i.order_item_type === 'tax');
  const couponItems =
    data.coupon_items || (data.items || []).filter((i) => i.order_item_type === 'coupon');
  const notes = data.notes || [];
  const paytm = data.paytm;

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/orders')}
        sx={{ mb: 1 }}
      >
        Back to orders
      </Button>
      <PageHeader
        title={`Order #${data.id}`}
        subtitle={formatDateTime(data.date_created_gmt)}
        actions={<StatusBadge value={data.status} />}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Summary
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Row label="Total" value={formatCurrency(data.total_amount)} />
                  <Row label="Tax" value={formatCurrency(data.tax_amount)} />
                  <Row
                    label="Discount"
                    value={formatCurrency(data.discount_total_amount)}
                  />
                  <Row
                    label="Discount tax"
                    value={formatCurrency(data.discount_tax_amount)}
                  />
                  <Row
                    label="Shipping"
                    value={formatCurrency(data.shipping_total_amount)}
                  />
                  <Row
                    label="Shipping tax"
                    value={formatCurrency(data.shipping_tax_amount)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Row label="Currency" value={data.currency} />
                  <Row label="Paid" value={formatDateTime(data.date_paid_gmt)} />
                  <Row label="Completed" value={formatDateTime(data.date_completed_gmt)} />
                  <Row label="Updated" value={formatDateTime(data.date_updated_gmt)} />
                  <Row label="Order key" value={data.order_key} />
                  <Row label="Created via" value={data.created_via} />
                  <Row
                    label="Customer ID"
                    value={
                      data.customer_id ? (
                        <Link
                          component={RouterLink}
                          to={`/admin/customers/${data.customer_id}`}
                        >
                          #{data.customer_id}
                        </Link>
                      ) : null
                    }
                  />
                  <Row label="Customer note" value={data.customer_note} />
                  <Row label="IP" value={data.ip_address} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <ItemsTable
            title="Line items"
            items={lineItems}
            empty="No line items"
            columns={[
              {
                id: 'name',
                label: 'Name',
                render: (i) => i.order_item_name || '—',
              },
              {
                id: 'product_id',
                label: 'Product ID',
                render: (i) => (i.product_id ? `#${i.product_id}` : '—'),
              },
              {
                id: 'variation_id',
                label: 'Variation',
                render: (i) =>
                  i.variation_id && Number(i.variation_id) !== 0
                    ? `#${i.variation_id}`
                    : '—',
              },
              { id: 'sku', label: 'SKU', render: (i) => i.sku || '—' },
              { id: 'size', label: 'Size', render: (i) => i.size || '—' },
              { id: 'qty', label: 'Qty', align: 'right', render: (i) => i.qty || '—' },
              {
                id: 'subtotal',
                label: 'Subtotal',
                align: 'right',
                render: (i) => formatCurrency(i.line_subtotal),
              },
              {
                id: 'tax',
                label: 'Tax',
                align: 'right',
                render: (i) => formatCurrency(i.line_tax),
              },
              {
                id: 'total',
                label: 'Total',
                align: 'right',
                render: (i) => formatCurrency(i.line_total),
              },
            ]}
          />

          <ItemsTable
            title="Shipping items"
            items={shippingItems}
            columns={[
              { id: 'name', label: 'Method', render: (i) => i.order_item_name || '—' },
              { id: 'method_id', label: 'Method ID', render: (i) => i.method_id || '—' },
              {
                id: 'instance_id',
                label: 'Instance',
                render: (i) => i.instance_id || '—',
              },
              {
                id: 'cost',
                label: 'Cost',
                align: 'right',
                render: (i) => formatCurrency(i.cost ?? i.line_total),
              },
              {
                id: 'tax',
                label: 'Tax',
                align: 'right',
                render: (i) => formatCurrency(i.total_tax ?? i.line_tax),
              },
            ]}
          />

          <ItemsTable
            title="Tax items"
            items={taxItems}
            columns={[
              { id: 'name', label: 'Name', render: (i) => i.order_item_name || '—' },
              {
                id: 'total',
                label: 'Total',
                align: 'right',
                render: (i) => formatCurrency(i.line_total ?? i.cost),
              },
            ]}
          />

          <ItemsTable
            title="Coupon items"
            items={couponItems}
            columns={[
              { id: 'name', label: 'Coupon', render: (i) => i.order_item_name || '—' },
              {
                id: 'discount',
                label: 'Discount',
                align: 'right',
                render: (i) => formatCurrency(i.line_total ?? i.cost),
              },
            ]}
          />

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Addresses
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AddressBlock title="Billing" a={billing} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AddressBlock title="Shipping" a={shipping} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Payment
              </Typography>
              <Row
                label="Method"
                value={data.payment_method_title || data.payment_method}
              />
              <Row label="Transaction ID" value={data.transaction_id} />
              {paytm && (
                <>
                  <Typography fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                    Paytm
                  </Typography>
                  <Row label="Payment ID" value={paytm.id ? `#${paytm.id}` : null} />
                  <Row label="Paytm Order ID" value={paytm.paytm_order_id} />
                  <Row label="Txn ID" value={paytm.transaction_id} />
                  <Row
                    label="Status"
                    value={
                      paytm.status != null ? (
                        <StatusBadge value={String(paytm.status)} />
                      ) : null
                    }
                  />
                  <Row label="Gateway" value={paytm.gateway?.GATEWAYNAME} />
                  <Row label="Payment mode" value={paytm.gateway?.PAYMENTMODE} />
                  <Row label="Bank TXN" value={paytm.gateway?.BANKTXNID} />
                  <Row label="Amount" value={paytm.gateway?.TXNAMOUNT} />
                  <Row label="TXN date" value={paytm.gateway?.TXNDATE} />
                  <Row
                    label="Date added"
                    value={formatDateTime(paytm.date_added)}
                  />
                  {paytm.id && (
                    <Button
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => navigate(`/admin/payments/${paytm.id}`)}
                    >
                      View payment
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Order notes
              </Typography>
              {notes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No notes yet
                </Typography>
              ) : (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {notes.map((n) => (
                    <Box
                      key={n.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="body2">{n.content}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {n.author || 'System'} · {formatDateTime(n.date || n.date_gmt)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Add note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={customerNote}
                      onChange={(e) => setCustomerNote(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Customer note"
                />
                <Button
                  variant="contained"
                  disabled={noteSaving || !note.trim()}
                  onClick={handleAddNote}
                >
                  {noteSaving ? 'Adding…' : 'Add note'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Update status
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                fullWidth
                variant="contained"
                disabled={saving || status === data.status}
                onClick={handleStatusUpdate}
              >
                {saving ? 'Updating…' : 'Save status'}
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Shipment
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Tracking number"
                value={shipment.tracking_number}
                onChange={(e) =>
                  setShipment((s) => ({ ...s, tracking_number: e.target.value }))
                }
                sx={{ mb: 1.5 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Tracking provider"
                value={shipment.tracking_provider}
                onChange={(e) =>
                  setShipment((s) => ({ ...s, tracking_provider: e.target.value }))
                }
                sx={{ mb: 1.5 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Shipment status"
                value={shipment.shipment_status}
                onChange={(e) =>
                  setShipment((s) => ({ ...s, shipment_status: e.target.value }))
                }
                sx={{ mb: 2 }}
                placeholder="e.g. shipped"
              />
              <Button
                fullWidth
                variant="outlined"
                disabled={shipSaving}
                onClick={handleShipmentSave}
              >
                {shipSaving ? 'Saving…' : 'Save shipment'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
