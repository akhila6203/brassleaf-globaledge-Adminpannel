import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCoupon, getCoupon, updateCoupon } from '../../api/coupons';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../context/SnackbarContext';

const empty = {
  code: '',
  discount_type: 'percent',
  amount: '',
  usage_limit: '',
  usage_limit_per_user: '',
  description: '',
  status: 'publish',
  expiry_date: '',
  minimum_amount: '',
  maximum_amount: '',
  individual_use: false,
  free_shipping: false,
  product_ids: '',
  excluded_product_ids: '',
  product_categories: '',
  excluded_product_categories: '',
  customer_email: '',
};

export default function CouponForm() {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getCoupon(id)
      .then((r) => {
        const c = r.data;
        const meta = c.meta || {};
        setForm({
          code: c.code || c.post_title || '',
          discount_type: c.discount_type || 'percent',
          amount: c.amount ?? c.coupon_amount ?? '',
          usage_limit: c.usage_limit ?? '',
          usage_limit_per_user: c.usage_limit_per_user ?? '',
          description: c.description || '',
          status: c.status || c.post_status || 'publish',
          expiry_date: c.expiry_date || c.date_expires || '',
          minimum_amount: c.minimum_amount || meta.minimum_amount || '',
          maximum_amount: c.maximum_amount || meta.maximum_amount || '',
          individual_use: c.individual_use === 'yes' || c.individual_use === true,
          free_shipping: c.free_shipping === 'yes' || c.free_shipping === true,
          product_ids: meta.product_ids || c.product_ids || '',
          excluded_product_ids: meta.excluded_product_ids || '',
          product_categories: meta.product_categories || '',
          excluded_product_categories: meta.excluded_product_categories || '',
          customer_email: meta.customer_email || '',
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        amount: form.amount === '' ? 0 : Number(form.amount),
        usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
        usage_limit_per_user:
          form.usage_limit_per_user === '' ? null : Number(form.usage_limit_per_user),
        date_expires: form.expiry_date,
      };
      if (isEdit) {
        await updateCoupon(id, payload);
        showToast('Coupon updated', 'success');
      } else {
        await createCoupon(payload);
        showToast('Coupon created', 'success');
      }
      navigate('/admin/coupons');
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
        title={isEdit ? 'Edit coupon' : 'Add coupon'}
        actions={
          <Button variant="outlined" onClick={() => navigate('/admin/coupons')}>
            Cancel
          </Button>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 720 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Typography fontWeight={600}>Basics</Typography>
            <TextField label="Code" value={form.code} onChange={set('code')} required fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Discount type</InputLabel>
                <Select
                  label="Discount type"
                  value={form.discount_type}
                  onChange={set('discount_type')}
                >
                  <MenuItem value="percent">Percentage</MenuItem>
                  <MenuItem value="fixed_cart">Fixed cart</MenuItem>
                  <MenuItem value="fixed_product">Fixed product</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Amount"
                type="number"
                value={form.amount}
                onChange={set('amount')}
                required
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status} onChange={set('status')}>
                  <MenuItem value="publish">Published</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Description"
              value={form.description}
              onChange={set('description')}
              multiline
              minRows={2}
              fullWidth
            />

            <Typography fontWeight={600}>Limits</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Usage limit"
                type="number"
                value={form.usage_limit}
                onChange={set('usage_limit')}
                fullWidth
              />
              <TextField
                label="Usage limit per user"
                type="number"
                value={form.usage_limit_per_user}
                onChange={set('usage_limit_per_user')}
                fullWidth
              />
              <TextField
                label="Expiry date"
                type="date"
                value={form.expiry_date ? String(form.expiry_date).slice(0, 10) : ''}
                onChange={set('expiry_date')}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Minimum amount"
                value={form.minimum_amount}
                onChange={set('minimum_amount')}
                fullWidth
              />
              <TextField
                label="Maximum amount"
                value={form.maximum_amount}
                onChange={set('maximum_amount')}
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox checked={form.individual_use} onChange={set('individual_use')} />
                }
                label="Individual use only"
              />
              <FormControlLabel
                control={
                  <Checkbox checked={form.free_shipping} onChange={set('free_shipping')} />
                }
                label="Allow free shipping"
              />
            </Stack>

            <Typography fontWeight={600}>Restrictions</Typography>
            <TextField
              label="Product IDs"
              value={form.product_ids}
              onChange={set('product_ids')}
              helperText="Comma-separated product IDs"
              fullWidth
            />
            <TextField
              label="Excluded product IDs"
              value={form.excluded_product_ids}
              onChange={set('excluded_product_ids')}
              fullWidth
            />
            <TextField
              label="Product category IDs"
              value={form.product_categories}
              onChange={set('product_categories')}
              helperText="Comma-separated term IDs"
              fullWidth
            />
            <TextField
              label="Excluded category IDs"
              value={form.excluded_product_categories}
              onChange={set('excluded_product_categories')}
              fullWidth
            />
            <TextField
              label="Customer emails"
              value={form.customer_email}
              onChange={set('customer_email')}
              helperText="Comma-separated emails"
              fullWidth
            />

            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create coupon'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
