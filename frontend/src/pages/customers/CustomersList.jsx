import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Stack, TextField } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers } from '../../api/customers';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import useDebounce from '../../hooks/useDebounce';
import { formatCurrency, formatDate, formatNumber, fullName } from '../../utils/format';

export default function CustomersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getCustomers({
      page: page + 1,
      limit,
      search: debouncedSearch || undefined,
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
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      id: 'customer_id',
      label: 'Customer ID',
      width: 100,
      render: (r) => `#${r.customer_id ?? r.id}`,
    },
    {
      id: 'user_id',
      label: 'User ID',
      render: (r) => (r.user_id != null ? `#${r.user_id}` : '—'),
    },
    {
      id: 'full_name',
      label: 'Full name',
      render: (r) =>
        fullName(r.first_name, r.last_name) !== '—'
          ? fullName(r.first_name, r.last_name)
          : r.display_name || '—',
    },
    { id: 'username', label: 'Username', render: (r) => r.username || '—' },
    { id: 'email', label: 'Email', render: (r) => r.email || '—' },
    { id: 'country', label: 'Country', render: (r) => r.country || '—' },
    { id: 'state', label: 'State', render: (r) => r.state || '—' },
    { id: 'city', label: 'City', render: (r) => r.city || '—' },
    { id: 'postcode', label: 'Postcode', render: (r) => r.postcode || '—' },
    {
      id: 'registered',
      label: 'Registered',
      render: (r) => formatDate(r.date_registered || r.user_registered),
    },
    {
      id: 'last_active',
      label: 'Last active',
      render: (r) => formatDate(r.date_last_active),
    },
    {
      id: 'orders',
      label: 'Orders',
      render: (r) => formatNumber(r.orders_count ?? r.order_count ?? 0),
    },
    {
      id: 'lifetime_value',
      label: 'Lifetime value',
      align: 'right',
      render: (r) => formatCurrency(r.lifetime_value ?? r.total_spent ?? r.total_spend),
    },
    {
      id: 'last_order_date',
      label: 'Last order date',
      render: (r) => formatDate(r.last_order_date),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Customers"
        subtitle={`${formatNumber(state.total)} customers`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/customers/new')}
          >
            Add customer
          </Button>
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
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
        onRowClick={(row) =>
          navigate(`/admin/customers/${row.customer_id ?? row.user_id ?? row.id}`)
        }
      />
    </Box>
  );
}
