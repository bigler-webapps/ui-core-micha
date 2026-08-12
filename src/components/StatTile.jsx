import { Box, Typography } from '@mui/material';

/**
 * A small bordered KPI tile: muted label, one bold tabular value, optional caption.
 * Promoted from two independent builds (hram's `ResearchComponents/StatTile.jsx`, the inline
 * version in fitness-monitor's `BodyHistoryPage.jsx`) -- `flex: 1` with a `minWidth` floor covers
 * both builds' row behaviours with one rule, and `tabular-nums` is unconditional so a row of
 * tiles reads as a row.
 */
export default function StatTile({ label, value, caption, accent = false, children, minWidth = 120 }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth,
        border: '1px solid',
        borderColor: accent ? 'primary.main' : 'divider',
        borderWidth: accent ? 2 : 1,
        borderRadius: 1,
        p: { xs: 1, sm: 1.5 },
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      {value !== undefined && (
        <Typography variant="h5" component="div" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" color="text.secondary" display="block">
          {caption}
        </Typography>
      )}
      {children}
    </Box>
  );
}
