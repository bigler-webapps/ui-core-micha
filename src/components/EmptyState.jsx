import { Box, Button, Typography } from '@mui/material';
import { cloneElement } from 'react';

/**
 * A shared, compact presentation for an empty section: optional decorative icon,
 * title, supporting description, and an optional outlined action.
 */
export default function EmptyState({ icon, title, description, action, sx }) {
  return (
    <Box
      sx={[{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        p: 2,
        textAlign: 'center',
      }, sx]}
    >
      {icon && (
        <Box sx={{ color: 'text.secondary', display: 'flex' }}>
          {cloneElement(icon, { 'aria-hidden': true, focusable: false })}
        </Box>
      )}
      <Typography component="p">{title}</Typography>
      {description && (
        <Typography component="p" variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      {action && (
        <Button type="button" variant="outlined" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
