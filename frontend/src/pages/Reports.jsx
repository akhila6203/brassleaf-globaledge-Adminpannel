import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCustomers } from '../api/customers';
import {
  downloadReports,
  emailCustomerInvoices,
  getReportSummary,
  getReports,
} from '../api/reports';
import DataTable from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import { useSnackbar } from '../context/SnackbarContext';
import useDebounce from '../hooks/useDebounce';
import { formatCurrency, formatDate, formatNumber, fullName } from '../utils/format';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'select_date', label: 'Select date' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom Date Range' },
];

function StatCard({ label, value }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { showToast } = useSnackbar();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [range, setRange] = useState('today');
  const [selectDate, setSelectDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: null });
  const [summary, setSummary] = useState(null);
  const [rangeLabel, setRangeLabel] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [downloading, setDownloading] = useState('');
  const [emailing, setEmailing] = useState(false);

  useEffect(() => {
    getCustomers({ limit: 500, sort: 'name', dir: 'asc' })
      .then((r) => setCustomers(r.data.data || []))
      .catch(() => setCustomers([]));
  }, []);

  const customerIds = useMemo(
    () => selectedCustomers.map((c) => c.user_id ?? c.customer_id ?? c.id).filter(Boolean),
    [selectedCustomers]
  );

  const filterParams = useMemo(
    () => ({
      range,
      date: range === 'select_date' ? selectDate : undefined,
      date_from: range === 'custom' ? dateFrom : undefined,
      date_to: range === 'custom' ? dateTo : undefined,
      customer_ids: customerIds.length ? customerIds.join(',') : undefined,
      search: debouncedSearch || undefined,
    }),
    [range, selectDate, dateFrom, dateTo, customerIds.join(','), debouncedSearch]
  );

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      getReports({ page: page + 1, limit, ...filterParams }),
      getReportSummary(filterParams),
    ])
      .then(([listRes, summaryRes]) => {
        setState({
          rows: listRes.data.data || [],
          total: listRes.data.total || 0,
          loading: false,
          error: null,
        });
        setSummary(summaryRes.data);
        setRangeLabel(listRes.data.range?.label || summaryRes.data.range?.label || '');
        setSelectedOrders(new Set());
      })
      .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message, rows: [] })));
  }, [page, limit, filterParams]);

  useEffect(() => {
    setPage(0);
  }, [filterParams]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadOpts = () => ({
    customerIds,
    orderIds: [...selectedOrders],
    range,
    date: range === 'select_date' ? selectDate : undefined,
    dateFrom: range === 'custom' ? dateFrom : undefined,
    dateTo: range === 'custom' ? dateTo : undefined,
  });

  const runDownload = async (type) => {
    setDownloading(type);
    try {
      await downloadReports({ type, ...downloadOpts() });
      showToast(
        type === 'invoice' ? 'Invoices downloaded' : 'Packing slips downloaded',
        'success'
      );
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setDownloading('');
    }
  };

  const runEmailCustomers = async () => {
    const orderIds = [...selectedOrders];
    if (!orderIds.length && !customerIds.length) {
      showToast('Select customers or orders to email invoices', 'error');
      return;
    }
    setEmailing(true);
    try {
      const { data } = await emailCustomerInvoices({
        order_ids: orderIds,
        customer_ids: customerIds,
        range,
        date: range === 'select_date' ? selectDate : undefined,
        date_from: range === 'custom' ? dateFrom : undefined,
        date_to: range === 'custom' ? dateTo : undefined,
      });
      showToast(`Invoice emailed to ${data.sent} customer(s)`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setEmailing(false);
    }
  };

  const toggleOrder = (orderId) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedOrders.size === state.rows.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(state.rows.map((r) => r.order_id)));
    }
  };

  const columns = [
    {
      id: 'select',
      label: (
        <Checkbox
          size="small"
          checked={state.rows.length > 0 && selectedOrders.size === state.rows.length}
          indeterminate={selectedOrders.size > 0 && selectedOrders.size < state.rows.length}
          onChange={toggleAll}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: 48,
      render: (r) => (
        <Checkbox
          size="small"
          checked={selectedOrders.has(r.order_id)}
          onChange={() => toggleOrder(r.order_id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'order_id',
      label: 'Order',
      width: 90,
      render: (r) => `#${r.order_id}`,
    },
    {
      id: 'customer',
      label: 'Customer',
      render: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {r.customer_name || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.billing_email || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'invoice',
      label: 'Invoice #',
      render: (r) => (r.invoice_number != null ? `#${r.invoice_number}` : '—'),
    },
    {
      id: 'packing_slip',
      label: 'Packing slip #',
      render: (r) => (r.packing_slip_number != null ? `#${r.packing_slip_number}` : '—'),
    },
    {
      id: 'total',
      label: 'Total',
      align: 'right',
      render: (r) => formatCurrency(r.total_amount),
    },
    {
      id: 'date',
      label: 'Order date',
      render: (r) => formatDate(r.date_created_gmt),
    },
    {
      id: 'actions',
      label: 'Download',
      render: (r) => (
        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            variant="outlined"
            disabled={!r.has_invoice || downloading}
            onClick={() =>
              downloadReports({ type: 'invoice', orderIds: [r.order_id] })
                .then(() => showToast('Invoice downloaded', 'success'))
                .catch((e) => showToast(e.message, 'error'))
            }
          >
            Invoice
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!r.has_packing_slip || downloading}
            onClick={() =>
              downloadReports({ type: 'packing-slip', orderIds: [r.order_id] })
                .then(() => showToast('Packing slip downloaded', 'success'))
                .catch((e) => showToast(e.message, 'error'))
            }
          >
            Slip
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle={`Live WooCommerce data${rangeLabel ? ` for ${rangeLabel}` : ''}`}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              disabled={emailing}
              onClick={runEmailCustomers}
            >
              {emailing ? 'Sending…' : 'Email invoices'}
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              disabled={Boolean(downloading)}
              onClick={() => runDownload('invoice')}
            >
              {downloading === 'invoice' ? 'Downloading…' : 'Download invoices'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={Boolean(downloading)}
              onClick={() => runDownload('packing-slip')}
            >
              {downloading === 'packing-slip' ? 'Downloading…' : 'Download packing slips'}
            </Button>
          </Stack>
        }
      />

      <Stack spacing={2} sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <TextField
            select
            size="small"
            label="Range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {RANGE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="body2" color="text.secondary">
            Asia/Kolkata
          </Typography>
        </Stack>

        {range === 'select_date' && (
          <TextField
            size="small"
            type="date"
            label="Select date"
            value={selectDate}
            onChange={(e) => setSelectDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ maxWidth: 220 }}
          />
        )}

        {range === 'custom' && (
          <Stack direction="row" spacing={1.5}>
            <TextField
              size="small"
              type="date"
              label="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        )}

        <Autocomplete
          multiple
          options={customers}
          value={selectedCustomers}
          onChange={(_, value) => setSelectedCustomers(value)}
          getOptionLabel={(c) =>
            `${fullName(c.first_name, c.last_name) !== '—' ? fullName(c.first_name, c.last_name) : c.username || 'Customer'} (${c.email || 'no email'})`
          }
          isOptionEqualToValue={(a, b) =>
            (a.customer_id ?? a.id) === (b.customer_id ?? b.id)
          }
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.customer_id ?? option.id}
                label={fullName(option.first_name, option.last_name)}
                size="small"
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label="Filter by customers"
              placeholder="Select customers"
            />
          )}
          sx={{ maxWidth: 640 }}
        />

        <TextField
          size="small"
          placeholder="Search order, email, or document number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280, maxWidth: 420 }}
        />
      </Stack>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Total Sales" value={formatCurrency(summary.total_sales)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Total Collected" value={formatCurrency(summary.total_collected)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Refunded Amount" value={formatCurrency(summary.refunded_amount)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Subtotal" value={formatCurrency(summary.subtotal)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Net Sales" value={formatCurrency(summary.net_sales)} />
          </Grid>
        </Grid>
      )}

      <DataTable
        columns={columns}
        rows={state.rows}
        loading={state.loading}
        error={state.error}
        page={page}
        rowsPerPage={limit}
        total={state.total}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => {
          setLimit(n);
          setPage(0);
        }}
        emptyTitle="No documents found"
        emptyDescription="Try changing the date range, customer filter, or search."
      />
    </Box>
  );
}
