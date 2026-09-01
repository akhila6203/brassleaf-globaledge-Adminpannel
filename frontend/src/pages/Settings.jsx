import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api/settings';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PageHeader from '../components/PageHeader';
import { useSnackbar } from '../context/SnackbarContext';

const defaults = {
  store_name: 'Brassleaf',
  store_email: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  paytm: {
    enabled: true,
    description: '',
    environment: 'staging',
    merchant_id: '',
    merchant_key: '',
    website: 'WEBSTAGING',
    other_website_name: '',
    is_webhook: false,
    emi_subvention: false,
    bank_offer: false,
    dc_emi: false,
    has_merchant_key: false,
    merchant_key_masked: '',
  },
};

export default function Settings() {
  const { showToast } = useSnackbar();
  const [form, setForm] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getSettings()
      .then((r) => {
        const data = r.data || {};
        setForm({
          ...defaults,
          ...data,
          paytm: { ...defaults.paytm, ...(data.paytm || {}) },
        });
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setPaytm = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, paytm: { ...f.paytm, [key]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        store_name: form.store_name,
        store_email: form.store_email,
        currency: form.currency,
        timezone: form.timezone,
        paytm: {
          enabled: form.paytm.enabled,
          description: form.paytm.description,
          environment: form.paytm.environment,
          merchant_id: form.paytm.merchant_id,
          website: form.paytm.website,
          other_website_name: form.paytm.other_website_name,
          is_webhook: form.paytm.is_webhook,
          emi_subvention: form.paytm.emi_subvention,
          bank_offer: form.paytm.bank_offer,
          dc_emi: form.paytm.dc_emi,
        },
      };
      if (form.paytm.merchant_key && !form.paytm.merchant_key.includes('*')) {
        payload.paytm.merchant_key = form.paytm.merchant_key;
      }
      const { data } = await updateSettings(payload);
      setForm({
        ...defaults,
        ...data,
        paytm: {
          ...defaults.paytm,
          ...(data.paytm || {}),
          merchant_key: '',
        },
      });
      showToast('Settings saved', 'success');
      setError('');
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Store configuration and payment gateway" />
      {loading ? (
        <LoadingSkeleton variant="detail" />
      ) : (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 720 }}>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <Typography fontWeight={600}>General</Typography>
              <TextField
                label="Store name"
                value={form.store_name}
                onChange={set('store_name')}
                fullWidth
              />
              <TextField
                label="Store email"
                type="email"
                value={form.store_email}
                onChange={set('store_email')}
                fullWidth
              />
              <Divider />
              <Typography fontWeight={600}>Localization</Typography>
              <TextField
                label="Currency"
                value={form.currency}
                onChange={set('currency')}
                fullWidth
              />
              <TextField
                label="Timezone"
                value={form.timezone}
                onChange={set('timezone')}
                fullWidth
              />
              <Divider />
              <Typography fontWeight={600}>Paytm payment gateway</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.paytm.enabled)}
                    onChange={setPaytm('enabled')}
                  />
                }
                label="Enable Paytm payments"
              />
              <TextField
                label="Description"
                value={form.paytm.description}
                onChange={setPaytm('description')}
                multiline
                minRows={2}
                fullWidth
              />
              <TextField
                select
                label="Environment"
                value={form.paytm.environment}
                onChange={setPaytm('environment')}
                fullWidth
              >
                <MenuItem value="staging">Staging / test</MenuItem>
                <MenuItem value="production">Production</MenuItem>
              </TextField>
              <TextField
                label="Merchant ID"
                value={form.paytm.merchant_id}
                onChange={setPaytm('merchant_id')}
                fullWidth
                required
              />
              <TextField
                label="Merchant key"
                type="password"
                value={form.paytm.merchant_key}
                onChange={setPaytm('merchant_key')}
                placeholder={
                  form.paytm.has_merchant_key
                    ? `Saved key ${form.paytm.merchant_key_masked}`
                    : 'Enter merchant key'
                }
                fullWidth
              />
              <TextField
                label="Website"
                value={form.paytm.website}
                onChange={setPaytm('website')}
                fullWidth
                helperText="e.g. WEBSTAGING or your Paytm website name"
              />
              <TextField
                label="Other website name"
                value={form.paytm.other_website_name}
                onChange={setPaytm('other_website_name')}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.paytm.is_webhook)}
                    onChange={setPaytm('is_webhook')}
                  />
                }
                label="Enable webhook"
              />
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.paytm.emi_subvention)}
                      onChange={setPaytm('emi_subvention')}
                    />
                  }
                  label="EMI subvention"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.paytm.bank_offer)}
                      onChange={setPaytm('bank_offer')}
                    />
                  }
                  label="Bank offer"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.paytm.dc_emi)}
                      onChange={setPaytm('dc_emi')}
                    />
                  }
                  label="DC EMI"
                />
              </Stack>
              <Stack direction="row" justifyContent="flex-end">
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
