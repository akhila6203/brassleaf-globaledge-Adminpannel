import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Stack, TextField } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoupons } from '../../api/coupons';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import useDebounce from '../../hooks/useDebounce';
import { formatCurrency, formatDate, formatNumber } from '../../utils/format';

export default function CouponsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getCoupons({
      page: page + 1,
      limit,
      search: debouncedSearch || undefined,
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
    { id: 'id', label: 'ID', render: (r) => `#${r.id ?? r.ID}` },
    {
      id: 'code',
      label: 'Code',
      render: (r) => <Box sx={{ fontWeight: 600 }}>{r.code || r.post_title}</Box>,
    },
    {
      id: 'type',
      label: 'Type',
      render: (r) => r.discount_type || r.type || '—',
    },
    {
      id: 'amount',
      label: 'Amount',
      render: (r) =>
        r.discount_type === 'percent' || r.type === 'percent'
          ? `${r.amount ?? r.coupon_amount ?? 0}%`
          : formatCurrency(r.amount ?? r.coupon_amount),
    },
    {
      id: 'usage',
      label: 'Usage',
      render: (r) =>
        `${formatNumber(r.usage_count ?? 0)}${r.usage_limit ? ` / ${r.usage_limit}` : ''}`,
    },
    {
      id: 'expiry',
      label: 'Expires',
      render: (r) => formatDate(r.date_expires || r.expiry_date),
    },
    {
      id: 'status',
      label: 'Status',
      render: (r) => <StatusBadge value={r.status || r.post_status || 'publish'} />,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Coupons"
        subtitle={`${formatNumber(state.total)} coupons`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/coupons/new')}
          >
            Add coupon
          </Button>
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search coupon code…"
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
        onRowClick={(row) => navigate(`/admin/coupons/${row.id ?? row.ID}/edit`)}
        emptyTitle="No coupons"
        emptyDescription="Coupons will appear when the /api/coupons endpoint is available."
      />
    </Box>
  );
}
