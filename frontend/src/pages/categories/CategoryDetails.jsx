import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assignCategoryProducts, getCategory } from '../../api/categories';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useSnackbar } from '../../context/SnackbarContext';
import { formatNumber, formatPriceRange } from '../../utils/format';

function Row({ label, value }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value != null && value !== '' ? value : '—'}</Typography>
    </Stack>
  );
}

export default function CategoryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productIdsText, setProductIdsText] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    setLoading(true);
    getCategory(id)
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const parseIds = () =>
    productIdsText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => !Number.isNaN(n));

  const runAssign = async (action) => {
    const product_ids = parseIds();
    if (!product_ids.length) {
      showToast('Enter one or more product IDs', 'error');
      return;
    }
    setAssigning(true);
    try {
      await assignCategoryProducts(id, product_ids, action);
      showToast(
        action === 'remove' ? 'Products removed from category' : 'Products assigned',
        'success'
      );
      setProductIdsText('');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setAssigning(false);
    }
  };

  if (loading && !data) return <LoadingSkeleton variant="detail" />;
  if (error && !data) return <EmptyState error title="Category not found" description={error} />;

  const products = data.products || [];
  const children = data.children || [];

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/categories')}
        sx={{ mb: 1 }}
      >
        Back to categories
      </Button>
      <PageHeader
        title={data.name}
        subtitle={`#${data.term_id ?? data.id} · /${data.slug}`}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/admin/categories/new')}
            >
              Add category
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/admin/categories/${id}/edit`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={600} gutterBottom>
            Category information
          </Typography>
          <Row label="ID" value={`#${data.term_id ?? data.id}`} />
          <Row label="Name" value={data.name} />
          <Row label="Slug" value={data.slug} />
          <Row
            label="Product count"
            value={formatNumber(data.product_count ?? data.count ?? 0)}
          />
          <Row label="Term group" value={data.term_group} />
          {children.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Children
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {children.map((c) => (
                  <Chip
                    key={c.term_id}
                    label={`${c.name} (${c.product_count ?? 0})`}
                    onClick={() => navigate(`/admin/categories/${c.term_id}`)}
                    clickable
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={600} gutterBottom>
            Assign / remove products
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
            <TextField
              size="small"
              label="Product IDs"
              placeholder="e.g. 101, 102, 103"
              value={productIdsText}
              onChange={(e) => setProductIdsText(e.target.value)}
              sx={{ minWidth: 280, flex: 1 }}
              helperText="Comma-separated product post IDs"
            />
            <Button
              variant="contained"
              disabled={assigning}
              onClick={() => runAssign('add')}
            >
              Assign
            </Button>
            <Button
              variant="outlined"
              color="warning"
              disabled={assigning}
              onClick={() => runAssign('remove')}
            >
              Remove
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={600} gutterBottom>
            Products ({products.length})
          </Typography>
          {products.length === 0 ? (
            <EmptyState title="No products in this category" />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p) => (
                  <TableRow
                    key={p.ID ?? p.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/products/${p.ID ?? p.id}`)}
                  >
                    <TableCell>#{p.ID ?? p.id}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.sku || '—'}</TableCell>
                    <TableCell>{formatPriceRange(p.min_price, p.max_price)}</TableCell>
                    <TableCell>
                      <StatusBadge value={p.stock_status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
