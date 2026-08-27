import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
} from '../../api/categories';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../context/SnackbarContext';

const empty = { name: '', slug: '', description: '', parent: 0 };

export default function CategoryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const { showToast } = useSnackbar();
  const [form, setForm] = useState(empty);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories({ limit: 200 })
      .then((r) => {
        const rows = r.data.data || r.data || [];
        setParents(rows.filter((c) => String(c.term_id || c.id) !== String(id)));
      })
      .catch(() => setParents([]));
  }, [id]);

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
          description: c.description || '',
          parent: c.parent || 0,
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
      const payload = {
        ...form,
        parent: form.parent === '' || form.parent == null ? 0 : Number(form.parent),
      };
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
            <FormControl fullWidth>
              <InputLabel>Parent category</InputLabel>
              <Select
                label="Parent category"
                value={form.parent || 0}
                onChange={set('parent')}
              >
                <MenuItem value={0}>None (top-level)</MenuItem>
                {parents.map((c) => (
                  <MenuItem key={c.term_id || c.id} value={c.term_id || c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Description"
              value={form.description}
              onChange={set('description')}
              multiline
              minRows={3}
              fullWidth
            />
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
