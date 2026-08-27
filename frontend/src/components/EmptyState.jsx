import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Button, Typography } from '@mui/material';

export default function EmptyState({
  title = 'Nothing here yet',
  description,
  error = false,
  actionLabel,
  onAction,
  icon,
}) {
  const Icon = icon || (error ? ErrorOutlineIcon : InboxOutlinedIcon);

  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      <Icon sx={{ fontSize: 48, mb: 1.5, opacity: 0.45, color: error ? 'error.main' : 'inherit' }} />
      <Typography variant="h6" color={error ? 'error.main' : 'text.primary'} gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ maxWidth: 420, mx: 'auto', mb: actionLabel ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
