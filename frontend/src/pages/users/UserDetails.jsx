import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUser } from '../../api/users';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/format';

function Row({ label, value }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Stack>
  );
}

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getUser(id)
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (error) return <EmptyState error title="User not found" description={error} />;

  const roles = Array.isArray(data.roles)
    ? data.roles.join(', ')
    : typeof data.capabilities === 'object'
      ? Object.keys(data.capabilities || {}).join(', ')
      : data.capabilities;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/users')} sx={{ mb: 1 }}>
        Back to users
      </Button>
      <PageHeader
        title={data.display_name || data.login || data.user_login}
        subtitle={data.email || data.user_email}
        actions={
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/admin/users/${id}/edit`)}
          >
            Edit
          </Button>
        }
      />
      <Card variant="outlined" sx={{ maxWidth: 640 }}>
        <CardContent>
          <Row label="ID" value={`#${data.id ?? data.ID}`} />
          <Row label="Login" value={data.login || data.user_login} />
          <Row label="Email" value={data.email || data.user_email} />
          <Row label="Display name" value={data.display_name} />
          <Row label="First name" value={data.first_name} />
          <Row label="Last name" value={data.last_name} />
          <Row label="Nickname" value={data.nickname} />
          <Row
            label="Registered"
            value={formatDateTime(data.registered || data.user_registered)}
          />
          <Row label="Status" value={data.status ?? data.user_status} />
          <Row label="Roles / capabilities" value={roles} />
        </CardContent>
      </Card>
    </Box>
  );
}
