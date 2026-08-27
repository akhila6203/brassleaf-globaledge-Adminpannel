import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../../api/orders';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import useDebounce from '../../hooks/useDebounce';
import { formatCurrency, formatDate, formatNumber, fullName } from '../../utils/format';
import { ORDER_STATUSES } from '../../utils/status';

export default function OrdersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getOrders({
      page: page + 1,
      limit,
      search: debouncedSearch || undefined,
      status: status || undefined,
      sort: 'date',
      dir: 'desc',
    })
      .then((r) =>
        setState({
          rows: r.data.data || [],
          total: r.data.total || 0,
          loading: false,
          error: null,
        })
      )
      .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message, rows: [] })));
  }, [page, limit, debouncedSearch, status]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { id: 'id', label: 'ID', width: 90, render: (r) => `#${r.id}` },
    {
      id: 'date',
      label: 'Date',
      render: (r) => formatDate(r.date_created_gmt),
    },
    {
      id: 'status',
      label: 'Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      id: 'customer_name',
      label: 'Customer name',
      render: (r) => fullName(r.first_name, r.last_name),
    },
    {
      id: 'email',
      label: 'Email',
      render: (r) => r.billing_email || '—',
    },
    {
      id: 'customer_id',
      label: 'Customer ID',
      render: (r) => (r.customer_id != null ? `#${r.customer_id}` : '—'),
    },
    {
      id: 'total',
      label: 'Total',
      align: 'right',
      render: (r) => formatCurrency(r.total_amount),
    },
    {
      id: 'tax',
      label: 'Tax',
      align: 'right',
      render: (r) => formatCurrency(r.tax_amount),
    },
    {
      id: 'currency',
      label: 'Currency',
      render: (r) => r.currency || '—',
    },
    {
      id: 'payment',
      label: 'Payment method',
      render: (r) => r.payment_method_title || r.payment_method || '—',
    },
    {
      id: 'transaction_id',
      label: 'Transaction ID',
      render: (r) => r.transaction_id || '—',
    },
  ];

  return (
    <Box>
      <PageHeader title="Orders" subtitle={`${formatNumber(state.total)} orders`} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">All statuses</MenuItem>
            {ORDER_STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
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
        onRowClick={(row) => navigate(`/admin/orders/${row.id}`)}
      />
    </Box>
  );
}
