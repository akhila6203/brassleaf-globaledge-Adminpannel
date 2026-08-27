import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCustomer,
  getCustomer,
  updateCustomer,
} from '../../api/customers';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../context/SnackbarContext';

const empty = {
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  phone: '',
  billing_company: '',
  billing_address_1: '',
  billing_address_2: '',
  billing_city: '',
  billing_state: '',
  billing_postcode: '',
  billing_country: '',
  shipping_first_name: '',
  shipping_last_name: '',
  shipping_company: '',
  shipping_address_1: '',
  shipping_address_2: '',
  shipping_city: '',
  shipping_state: '',
  shipping_postcode: '',
  shipping_country: '',
  shipping_phone: '',
};

function fromAddress(prefix, addr = {}, fallback = {}) {
  return {
    [`${prefix}company`]: addr.company || '',
    [`${prefix}address_1`]: addr.address_1 || '',
    [`${prefix}address_2`]: addr.address_2 || '',
    [`${prefix}city`]: addr.city || fallback.city || '',
    [`${prefix}state`]: addr.state || fallback.state || '',
    [`${prefix}postcode`]: addr.postcode || fallback.postcode || '',
    [`${prefix}country`]: addr.country || fallback.country || '',
  };
}

export default function CustomerForm() {
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
    getCustomer(id)
      .then((r) => {
        const c = r.data;
        const billing = c.billing || c.addresses?.billing || {};
        const shipping = c.shipping || c.addresses?.shipping || {};
        setForm({
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          email: c.email || '',
          username: c.username || c.user_login || '',
          phone: c.phone || billing.phone || '',
          ...fromAddress('billing_', billing, c),
          shipping_first_name: shipping.first_name || '',
          shipping_last_name: shipping.last_name || '',
          shipping_phone: shipping.phone || '',
          ...fromAddress('shipping_', shipping),
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateCustomer(id, form);
        showToast('Customer updated', 'success');
        navigate(`/admin/customers/${id}`);
      } else {
        const { data } = await createCustomer(form);
        showToast('Customer created', 'success');
        navigate(`/admin/customers/${data.customer_id || data.id || ''}`);
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
        title={isEdit ? 'Edit customer' : 'Add customer'}
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
            <Typography fontWeight={600}>Customer information</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First name"
                value={form.first_name}
                onChange={set('first_name')}
                fullWidth
              />
              <TextField
                label="Last name"
                value={form.last_name}
                onChange={set('last_name')}
                fullWidth
              />
            </Stack>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Username"
                value={form.username}
                onChange={set('username')}
                fullWidth
                disabled={isEdit}
              />
              <TextField label="Phone" value={form.phone} onChange={set('phone')} fullWidth />
            </Stack>

            <Divider />
            <Typography fontWeight={600}>Billing address</Typography>
            <TextField
              label="Company"
              value={form.billing_company}
              onChange={set('billing_company')}
              fullWidth
            />
            <TextField
              label="Address 1"
              value={form.billing_address_1}
              onChange={set('billing_address_1')}
              fullWidth
            />
            <TextField
              label="Address 2"
              value={form.billing_address_2}
              onChange={set('billing_address_2')}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="City"
                value={form.billing_city}
                onChange={set('billing_city')}
                fullWidth
              />
              <TextField
                label="State"
                value={form.billing_state}
                onChange={set('billing_state')}
                fullWidth
              />
              <TextField
                label="Postcode"
                value={form.billing_postcode}
                onChange={set('billing_postcode')}
                fullWidth
              />
              <TextField
                label="Country"
                value={form.billing_country}
                onChange={set('billing_country')}
                fullWidth
              />
            </Stack>

            <Divider />
            <Typography fontWeight={600}>Shipping address</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First name"
                value={form.shipping_first_name}
                onChange={set('shipping_first_name')}
                fullWidth
              />
              <TextField
                label="Last name"
                value={form.shipping_last_name}
                onChange={set('shipping_last_name')}
                fullWidth
              />
              <TextField
                label="Phone"
                value={form.shipping_phone}
                onChange={set('shipping_phone')}
                fullWidth
              />
            </Stack>
            <TextField
              label="Company"
              value={form.shipping_company}
              onChange={set('shipping_company')}
              fullWidth
            />
            <TextField
              label="Address 1"
              value={form.shipping_address_1}
              onChange={set('shipping_address_1')}
              fullWidth
            />
            <TextField
              label="Address 2"
              value={form.shipping_address_2}
              onChange={set('shipping_address_2')}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="City"
                value={form.shipping_city}
                onChange={set('shipping_city')}
                fullWidth
              />
              <TextField
                label="State"
                value={form.shipping_state}
                onChange={set('shipping_state')}
                fullWidth
              />
              <TextField
                label="Postcode"
                value={form.shipping_postcode}
                onChange={set('shipping_postcode')}
                fullWidth
              />
              <TextField
                label="Country"
                value={form.shipping_country}
                onChange={set('shipping_country')}
                fullWidth
              />
            </Stack>

            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
