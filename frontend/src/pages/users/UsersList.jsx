import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Stack, TextField } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../../api/users';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import useDebounce from '../../hooks/useDebounce';
import { formatDate, formatNumber } from '../../utils/format';

function roleLabel(row) {
  if (Array.isArray(row.roles) && row.roles.length) return row.roles.join(', ');
  if (row.capabilities && typeof row.capabilities === 'object') {
    return Object.keys(row.capabilities).join(', ') || '—';
  }
  return row.role || '—';
}

export default function UsersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getUsers({
      page: page + 1,
      limit,
      search: debouncedSearch || undefined,
      sort: 'registered',
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
      id: 'id',
      label: 'ID',
      width: 80,
      render: (r) => `#${r.id ?? r.ID}`,
    },
    {
      id: 'user',
      label: 'User',
      render: (r) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{r.display_name || r.login || r.user_login}</Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{r.email || r.user_email}</Box>
        </Box>
      ),
    },
    { id: 'login', label: 'Login', render: (r) => r.login || r.user_login },
    { id: 'role', label: 'Role', render: roleLabel },
    {
      id: 'registered',
      label: 'Registered',
      render: (r) => formatDate(r.registered || r.user_registered),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Users / Admins"
        subtitle={`${formatNumber(state.total)} WordPress admin users`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/users/new')}
          >
            Add user
          </Button>
        }
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search name, email, login…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
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
        onRowClick={(row) => navigate(`/admin/users/${row.id ?? row.ID}`)}
      />
    </Box>
  );
}
