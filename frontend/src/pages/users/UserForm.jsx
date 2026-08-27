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
import { createUser, getUser, updateUser } from '../../api/users';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import { useSnackbar } from '../../context/SnackbarContext';

const empty = {
  login: '',
  email: '',
  password: '',
  display_name: '',
  first_name: '',
  last_name: '',
  roles: ['administrator'],
};

export default function UserForm() {
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
    getUser(id)
      .then((r) => {
        const u = r.data;
        const roles = Array.isArray(u.roles)
          ? u.roles
          : u.capabilities && typeof u.capabilities === 'object'
            ? Object.keys(u.capabilities)
            : ['administrator'];
        setForm({
          login: u.login || u.user_login || '',
          email: u.email || u.user_email || '',
          password: '',
          display_name: u.display_name || '',
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          roles: roles.length ? roles : ['administrator'],
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
        login: form.login,
        email: form.email,
        display_name: form.display_name,
        first_name: form.first_name,
        last_name: form.last_name,
        roles: Array.isArray(form.roles) ? form.roles : [form.roles],
      };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        await updateUser(id, payload);
        showToast('User updated', 'success');
        navigate(`/admin/users/${id}`);
      } else {
        if (!form.password) throw new Error('Password is required');
        const { data } = await createUser({ ...payload, password: form.password });
        showToast('User created', 'success');
        navigate(`/admin/users/${data.id || data.ID || ''}`);
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
        title={isEdit ? 'Edit user' : 'Add admin user'}
        actions={
          <Button variant="outlined" onClick={() => navigate('/admin/users')}>
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
            <TextField
              label="Username / login"
              value={form.login}
              onChange={set('login')}
              required
              fullWidth
              disabled={isEdit}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              fullWidth
            />
            <TextField
              label={isEdit ? 'New password (optional)' : 'Password'}
              type="password"
              value={form.password}
              onChange={set('password')}
              required={!isEdit}
              fullWidth
            />
            <TextField
              label="Display name"
              value={form.display_name}
              onChange={set('display_name')}
              fullWidth
            />
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
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={form.roles[0] || 'administrator'}
                onChange={(e) => setForm((f) => ({ ...f, roles: [e.target.value] }))}
              >
                <MenuItem value="administrator">Administrator</MenuItem>
                <MenuItem value="shop_manager">Shop manager</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
