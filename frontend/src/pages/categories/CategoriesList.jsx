import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Stack, TextField } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../../api/categories';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import useDebounce from '../../hooks/useDebounce';
import { formatNumber } from '../../utils/format';

export default function CategoriesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getCategories({
      page: page + 1,
      limit,
      search: debouncedSearch || undefined,
      sort: 'name',
      dir: 'asc',
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
    { id: 'term_id', label: 'ID', width: 80, render: (r) => `#${r.term_id ?? r.id}` },
    {
      id: 'name',
      label: 'Name',
      render: (r) => <Box sx={{ fontWeight: 600 }}>{r.name}</Box>,
    },
    { id: 'slug', label: 'Slug', render: (r) => r.slug || '—' },
    {
      id: 'count',
      label: 'Product count',
      render: (r) => formatNumber(r.product_count ?? r.count ?? 0),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Categories"
        subtitle={`${formatNumber(state.total)} product categories`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/categories/new')}
          >
            Add category
          </Button>
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search categories…"
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
        onRowClick={(row) => navigate(`/admin/categories/${row.term_id ?? row.id}`)}
      />
    </Box>
  );
}
