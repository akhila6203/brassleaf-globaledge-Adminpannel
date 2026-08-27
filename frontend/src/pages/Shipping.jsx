import {
  Box,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { getShippingZones } from '../api/shipping';
import DataTable from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import { formatNumber } from '../utils/format';

export default function Shipping() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getShippingZones({
      page: page + 1,
      limit,
      search: search || undefined,
    })
      .then((r) =>
        setState({
          rows: r.data.data || r.data.zones || r.data || [],
          total: r.data.total ?? (Array.isArray(r.data.data) ? r.data.data.length : 0),
          loading: false,
          error: null,
        })
      )
      .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message, rows: [] })));
  }, [page, limit, search]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { id: 'id', label: 'ID', render: (r) => `#${r.id ?? r.zone_id ?? '—'}` },
    {
      id: 'name',
      label: 'Zone',
      render: (r) => <Box sx={{ fontWeight: 600 }}>{r.name || r.zone_name || '—'}</Box>,
    },
    {
      id: 'order',
      label: 'Order',
      render: (r) => formatNumber(r.zone_order ?? r.order ?? 0),
    },
    {
      id: 'methods',
      label: 'Methods',
      render: (r) => formatNumber(r.methods_count ?? r.methods?.length ?? 0),
    },
    {
      id: 'regions',
      label: 'Regions',
      render: (r) =>
        Array.isArray(r.locations)
          ? r.locations.map((l) => l.code || l).join(', ') || '—'
          : r.regions || '—',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Shipping"
        subtitle="Shipping zones and delivery methods"
      />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Manage zones via <code>/api/shipping</code>. Empty or error states appear until the
            endpoint is available on the Node API.
          </Typography>
        </CardContent>
      </Card>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search zones…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 260 }}
        />
      </Stack>
      <DataTable
        columns={columns}
        rows={Array.isArray(state.rows) ? state.rows : []}
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
        emptyTitle="No shipping zones"
      />
    </Box>
  );
}
