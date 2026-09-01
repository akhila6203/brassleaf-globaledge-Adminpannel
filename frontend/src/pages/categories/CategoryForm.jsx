import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCategory,
  getCategory,
  updateCategory,
} from '../../api/categories';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../context/SnackbarContext';

const empty = { name: '', slug: '' };

export default function CategoryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getCategory(id)
      .then((r) => {
        const c = r.data;
        setForm({
          name: c.name || '',
          slug: c.slug || '',
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
      const payload = { ...form };
      if (isEdit) {
        await updateCategory(id, payload);
        showToast('Category updated', 'success');
        navigate(`/admin/categories/${id}`);
      } else {
        const { data } = await createCategory(payload);
        showToast('Category created', 'success');
        navigate(`/admin/categories/${data.term_id || data.id || ''}`);
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
        title={isEdit ? 'Edit category' : 'Add category'}
        actions={
          <Button variant="outlined" onClick={() => navigate('/admin/categories')}>
            Cancel
          </Button>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField label="Name" value={form.name} onChange={set('name')} required fullWidth />
            <TextField label="Slug" value={form.slug} onChange={set('slug')} fullWidth />
            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
