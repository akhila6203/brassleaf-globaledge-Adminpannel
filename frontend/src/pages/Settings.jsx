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
import { getSettings, updateSettings } from '../api/settings';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PageHeader from '../components/PageHeader';
import { useSnackbar } from '../context/SnackbarContext';

const defaults = {
  store_name: 'Brassleaf',
  store_email: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
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
      .then((r) => setForm({ ...defaults, ...(r.data || {}) }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
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
      <PageHeader title="Settings" subtitle="Store configuration" />
      {loading ? (
        <LoadingSkeleton variant="detail" />
      ) : (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}. Form values can still be edited and retried when the API is ready.
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
