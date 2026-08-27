import { Chip } from '@mui/material';
import { statusColor, statusLabel } from '../utils/status';

export default function StatusBadge({ value, size = 'small' }) {
  if (value == null || value === '') {
    return <Chip size={size} label="—" variant="outlined" />;
  }
  return (
    <Chip
      size={size}
      label={statusLabel(value)}
      color={statusColor(value)}
      variant="filled"
      sx={{ fontWeight: 500 }}
    />
  );
}
