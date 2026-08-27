import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Select,
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
import { getProduct, updateVariation } from '../../api/products';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useSnackbar } from '../../context/SnackbarContext';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPriceRange,
} from '../../utils/format';

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {String(value)}
      </Typography>
    </Stack>
  );
}

function imageSrc(img) {
  if (!img) return null;
  return img.guid || img.url || null;
}

const BUSINESS_META_KEYS = [
  '_sku',
  'hsn_prod_id',
  '_tax_status',
  '_tax_class',
  '_weight',
  '_length',
  '_width',
  '_height',
  'total_sales',
];

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingVid, setSavingVid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    getProduct(id)
      .then((r) => {
        setData(r.data);
        const map = {};
        for (const v of r.data.variations || []) {
          map[v.ID] = {
            sku: v.sku || '',
            size: v.size || '',
            regular_price: v.regular_price ?? '',
            sale_price: v.sale_price ?? '',
            stock_quantity: v.stock_quantity ?? '',
            stock_status: v.stock_status || 'instock',
          };
        }
        setDrafts(map);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const setDraft = (vid, key, value) => {
    setDrafts((d) => ({ ...d, [vid]: { ...d[vid], [key]: value } }));
  };

  const saveVariation = async (vid) => {
    setSavingVid(vid);
    try {
      const d = drafts[vid] || {};
      const { data: updated } = await updateVariation(id, vid, {
        sku: d.sku,
        size: d.size,
        regular_price: d.regular_price === '' ? null : Number(d.regular_price),
        sale_price: d.sale_price === '' ? null : Number(d.sale_price),
        stock_quantity: d.stock_quantity === '' ? null : Number(d.stock_quantity),
        stock_status: d.stock_status,
      });
      setData(updated);
      showToast(`Variation #${vid} saved`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSavingVid(null);
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (error) {
    return <EmptyState error title="Product not found" description={error} />;
  }

  const variations = data.variations || [];
  const categories = data.categories || [];
  const tags = data.tags || [];
  const visibility = data.visibility || [];
  const featuredImage = data.featured_image;
  const gallery = data.gallery || [];
  const meta = data.meta || {};

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/products')}
        sx={{ mb: 1 }}
      >
        Back to products
      </Button>
      <PageHeader
        title={data.name}
        subtitle={`#${data.ID ?? data.id} · /${data.slug}`}
        actions={
          <>
            <StatusBadge value={data.stock_status} />
            <StatusBadge value={data.status || data.post_status} />
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/admin/products/${id}/edit`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Images
              </Typography>
              {featuredImage || gallery.length > 0 ? (
                <Stack spacing={1.5}>
                  {featuredImage && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Featured
                      </Typography>
                      <Box
                        component="img"
                        src={imageSrc(featuredImage)}
                        alt={data.name}
                        sx={{
                          display: 'block',
                          width: '100%',
                          maxHeight: 280,
                          objectFit: 'contain',
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          mt: 0.5,
                        }}
                      />
                    </Box>
                  )}
                  {gallery.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Gallery
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {gallery.map((img) => (
                          <Box
                            key={img.ID}
                            component="img"
                            src={imageSrc(img)}
                            alt={img.title || 'Gallery'}
                            sx={{
                              width: 72,
                              height: 72,
                              objectFit: 'cover',
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              ) : (
                <EmptyState title="No images" />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Pricing & stock
              </Typography>
              <Row label="SKU" value={data.sku} />
              <Row label="Type" value={data.product_type || data.type} />
              <Row label="Regular price" value={formatCurrency(data.regular_price)} />
              <Row label="Sale price" value={data.sale_price ? formatCurrency(data.sale_price) : null} />
              <Row label="Current price" value={formatCurrency(data.price)} />
              <Row
                label="Price range"
                value={formatPriceRange(data.min_price, data.max_price)}
              />
              <Row label="On sale" value={data.onsale ? 'Yes' : data.onsale === 0 ? 'No' : null} />
              <Row label="Stock qty" value={data.stock_quantity != null ? formatNumber(data.stock_quantity) : null} />
              <Row label="Stock status" value={data.stock_status} />
              <Row label="Manage stock" value={data.manage_stock} />
              <Row label="Backorders" value={data.backorders} />
              <Row label="Tax status" value={data.tax_status} />
              <Row label="Tax class" value={data.tax_class} />
              <Row label="Weight" value={data.weight} />
              <Row
                label="Dimensions"
                value={
                  data.length || data.width || data.height
                    ? `${data.length || '—'} × ${data.width || '—'} × ${data.height || '—'}`
                    : null
                }
              />
              <Row label="Sales" value={formatNumber(data.total_sales ?? 0)} />
              <Row label="Created" value={formatDateTime(data.created_at)} />
              <Row label="Modified" value={formatDateTime(data.updated_at)} />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Catalog
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Categories
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {categories.length === 0 ? (
                    <Typography variant="body2">—</Typography>
                  ) : (
                    categories.map((c) => (
                      <Chip key={c.term_id} size="small" label={c.name} variant="outlined" />
                    ))
                  )}
                </Stack>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tags
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {tags.length === 0 ? (
                    <Typography variant="body2">—</Typography>
                  ) : (
                    tags.map((t) => (
                      <Chip key={t.term_id} size="small" label={t.name} />
                    ))
                  )}
                </Stack>
              </Box>
              <Row
                label="Visibility"
                value={
                  visibility.map((v) => v.name || v.slug).join(', ') || '—'
                }
              />
              <Row label="Featured" value={data.featured ? 'Yes' : 'No'} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Short description
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-wrap', mb: 2 }}
              >
                {data.short_description || data.post_excerpt || '—'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography fontWeight={600} gutterBottom>
                Description
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={
                  data.description || data.post_content
                    ? { __html: data.description || data.post_content }
                    : undefined
                }
              >
                {!data.description && !data.post_content ? 'No description' : null}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Variations ({variations.length}) — editable
              </Typography>
              {variations.length === 0 ? (
                <EmptyState title="No variations" />
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Regular</TableCell>
                        <TableCell>Sale</TableCell>
                        <TableCell>Stock qty</TableCell>
                        <TableCell>Stock</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {variations.map((v) => {
                        const d = drafts[v.ID] || {};
                        return (
                          <TableRow key={v.ID}>
                            <TableCell>#{v.ID}</TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={d.sku ?? ''}
                                onChange={(e) => setDraft(v.ID, 'sku', e.target.value)}
                                sx={{ minWidth: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={d.size ?? ''}
                                onChange={(e) => setDraft(v.ID, 'size', e.target.value)}
                                sx={{ minWidth: 80 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={d.regular_price ?? ''}
                                onChange={(e) => setDraft(v.ID, 'regular_price', e.target.value)}
                                sx={{ width: 90 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={d.sale_price ?? ''}
                                onChange={(e) => setDraft(v.ID, 'sale_price', e.target.value)}
                                sx={{ width: 90 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={d.stock_quantity ?? ''}
                                onChange={(e) => setDraft(v.ID, 'stock_quantity', e.target.value)}
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={d.stock_status || 'instock'}
                                  onChange={(e) => setDraft(v.ID, 'stock_status', e.target.value)}
                                >
                                  <MenuItem value="instock">In stock</MenuItem>
                                  <MenuItem value="outofstock">Out of stock</MenuItem>
                                  <MenuItem value="onbackorder">On backorder</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="contained"
                                disabled={savingVid === v.ID}
                                onClick={() => saveVariation(v.ID)}
                              >
                                {savingVid === v.ID ? 'Saving…' : 'Save'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} gutterBottom>
                Business meta
              </Typography>
              {BUSINESS_META_KEYS.filter((k) => meta[k] != null && meta[k] !== '').length ===
              0 ? (
                <Typography variant="body2" color="text.secondary">
                  No additional meta
                </Typography>
              ) : (
                BUSINESS_META_KEYS.map((k) => (
                  <Row key={k} label={k} value={meta[k]} />
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
