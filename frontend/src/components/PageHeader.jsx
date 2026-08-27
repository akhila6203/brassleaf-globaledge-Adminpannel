import { Box, Button, Stack, Typography } from '@mui/material';

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '1.85rem' } }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export function HeaderButton(props) {
  return <Button {...props} />;
}
