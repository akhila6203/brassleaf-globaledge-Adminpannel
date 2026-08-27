import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategories } from '../../api/categories';
import { uploadMedia } from '../../api/media';
import { createProduct, getProduct, updateProduct } from '../../api/products';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../context/SnackbarContext';

const empty = {
  name: '',
  sku: '',
  slug: '',
  type: 'simple',
  regular_price: '',
  sale_price: '',
  stock_status: 'instock',
  stock_quantity: '',
  manage_stock: false,
  tax_status: 'taxable',
  tax_class: '',
  weight: '',
  length: '',
  width: '',
  height: '',
  short_description: '',
  description: '',
  status: 'publish',
  category_ids: [],
  thumbnail_id: '',
  gallery: [],
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [featuredPreview, setFeaturedPreview] = useState(null);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories({ limit: 200 })
      .then((r) => setCategories(r.data.data || r.data || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getProduct(id)
      .then((r) => {
        const p = r.data;
        setForm({
          name: p.name || '',
          sku: p.sku || '',
          slug: p.slug || '',
          type: p.product_type || p.type || 'simple',
          regular_price: p.regular_price ?? p.min_price ?? '',
          sale_price: p.sale_price ?? '',
          stock_status: p.stock_status || 'instock',
          stock_quantity: p.stock_quantity ?? '',
          manage_stock: p.manage_stock === 'yes' || p.manage_stock === true,
          tax_status: p.tax_status || 'taxable',
          tax_class: p.tax_class || '',
          weight: p.weight || '',
          length: p.length || '',
          width: p.width || '',
          height: p.height || '',
          short_description: p.short_description || p.post_excerpt || '',
          description: p.description || p.post_content || '',
          status: p.status || p.post_status || 'publish',
          category_ids: (p.categories || []).map((c) => c.term_id),
          thumbnail_id: p.thumbnail_id || '',
          gallery: p.galleryIds || [],
        });
        setFeaturedPreview(p.featured_image?.guid || null);
        setGalleryPreviews(
          (p.gallery || []).map((g) => ({ id: g.ID, url: g.guid || g.url }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleFeaturedUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await uploadMedia(fd);
      const attId = data.id || data.ID;
      setForm((f) => ({ ...f, thumbnail_id: attId }));
      setFeaturedPreview(data.guid || data.url || URL.createObjectURL(file));
      showToast('Featured image uploaded', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await uploadMedia(fd);
        uploaded.push({
          id: data.id || data.ID,
          url: data.guid || data.url || URL.createObjectURL(file),
        });
      }
      setForm((f) => ({
        ...f,
        gallery: [...f.gallery, ...uploaded.map((u) => u.id)],
      }));
      setGalleryPreviews((g) => [...g, ...uploaded]);
      showToast('Gallery images uploaded', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeGalleryId = (attId) => {
    setForm((f) => ({
      ...f,
      gallery: f.gallery.filter((g) => String(g) !== String(attId)),
    }));
    setGalleryPreviews((g) => g.filter((x) => String(x.id) !== String(attId)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        regular_price: form.regular_price === '' ? null : Number(form.regular_price),
        sale_price: form.sale_price === '' ? null : Number(form.sale_price),
        stock_quantity: form.stock_quantity === '' ? null : Number(form.stock_quantity),
        thumbnail_id: form.thumbnail_id || undefined,
        gallery: form.gallery,
        category_ids: form.category_ids,
      };
      if (isEdit) {
        await updateProduct(id, payload);
        showToast('Product updated', 'success');
        navigate(`/admin/products/${id}`);
      } else {
        const { data } = await createProduct(payload);
        showToast('Product created', 'success');
        navigate(`/admin/products/${data.id || data.ID || ''}`);
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit product' : 'Add product'}
        subtitle={isEdit ? `Product #${id}` : 'Create a new catalog item'}
        actions={
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 880 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Typography fontWeight={600}>Basics</Typography>
            <TextField label="Name" value={form.name} onChange={set('name')} required fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="SKU" value={form.sku} onChange={set('sku')} fullWidth />
              <TextField label="Slug" value={form.slug} onChange={set('slug')} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select label="Type" value={form.type} onChange={set('type')}>
                  <MenuItem value="simple">Simple</MenuItem>
                  <MenuItem value="variable">Variable</MenuItem>
                  <MenuItem value="grouped">Grouped</MenuItem>
                  <MenuItem value="external">External</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status} onChange={set('status')}>
                  <MenuItem value="publish">Published</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="private">Private</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Typography fontWeight={600}>Pricing & stock</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Regular price"
                type="number"
                value={form.regular_price}
                onChange={set('regular_price')}
                fullWidth
              />
              <TextField
                label="Sale price"
                type="number"
                value={form.sale_price}
                onChange={set('sale_price')}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl fullWidth>
                <InputLabel>Stock status</InputLabel>
                <Select
                  label="Stock status"
                  value={form.stock_status}
                  onChange={set('stock_status')}
                >
                  <MenuItem value="instock">In stock</MenuItem>
                  <MenuItem value="outofstock">Out of stock</MenuItem>
                  <MenuItem value="onbackorder">On backorder</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Stock quantity"
                type="number"
                value={form.stock_quantity}
                onChange={set('stock_quantity')}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Checkbox checked={form.manage_stock} onChange={set('manage_stock')} />
                }
                label="Manage stock"
                sx={{ minWidth: 160 }}
              />
            </Stack>

            <Typography fontWeight={600}>Tax & shipping</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Tax status</InputLabel>
                <Select label="Tax status" value={form.tax_status} onChange={set('tax_status')}>
                  <MenuItem value="taxable">Taxable</MenuItem>
                  <MenuItem value="shipping">Shipping only</MenuItem>
                  <MenuItem value="none">None</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Tax class"
                value={form.tax_class}
                onChange={set('tax_class')}
                fullWidth
              />
              <TextField label="Weight" value={form.weight} onChange={set('weight')} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Length" value={form.length} onChange={set('length')} fullWidth />
              <TextField label="Width" value={form.width} onChange={set('width')} fullWidth />
              <TextField label="Height" value={form.height} onChange={set('height')} fullWidth />
            </Stack>

            <Typography fontWeight={600}>Categories</Typography>
            <FormControl fullWidth>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                label="Categories"
                value={form.category_ids}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category_ids: e.target.value,
                  }))
                }
                input={<OutlinedInput label="Categories" />}
                renderValue={(selected) =>
                  categories
                    .filter((c) => selected.includes(c.term_id || c.id))
                    .map((c) => c.name)
                    .join(', ')
                }
              >
                {categories.map((c) => (
                  <MenuItem key={c.term_id || c.id} value={c.term_id || c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography fontWeight={600}>Images</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <Box>
                <Button variant="outlined" component="label" disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Featured image'}
                  <input hidden type="file" accept="image/*" onChange={handleFeaturedUpload} />
                </Button>
                {featuredPreview && (
                  <Box
                    component="img"
                    src={featuredPreview}
                    alt="Featured"
                    sx={{
                      display: 'block',
                      mt: 1,
                      width: 120,
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                )}
              </Box>
              <Box>
                <Button variant="outlined" component="label" disabled={uploading}>
                  Add gallery images
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                  />
                </Button>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {galleryPreviews.map((g) => (
                    <Box key={g.id} sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={g.url}
                        alt=""
                        sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1 }}
                      />
                      <Button size="small" onClick={() => removeGalleryId(g.id)}>
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>

            <Typography fontWeight={600}>Descriptions</Typography>
            <TextField
              label="Short description"
              value={form.short_description}
              onChange={set('short_description')}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={set('description')}
              multiline
              minRows={5}
              fullWidth
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={saving || uploading}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
