import { Box, Skeleton, Stack } from '@mui/material';

export default function LoadingSkeleton({ rows = 6, variant = 'table' }) {
  if (variant === 'cards') {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={110} />
        ))}
      </Box>
    );
  }

  if (variant === 'detail') {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width="40%" height={40} />
        <Skeleton variant="rounded" height={180} />
        <Skeleton variant="rounded" height={240} />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Skeleton variant="rounded" height={48} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={52} />
      ))}
    </Stack>
  );
}
