import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { alpha, darken, useTheme } from '@mui/material/styles';

/**
 * A soft tinted annotation chip -- two variants (`caveat`, `status`), four semantic tones. Colour
 * is derived from `theme.palette[tone]` (fill `alpha(main, .12)`, border `alpha(main, .30)`, text
 * and dot `darken(main, .3)`) rather than restated as a literal, so all four tones track the theme
 * and pass AA against the blended fill.
 *
 * Promoted from two independent builds (hram's `ResearchComponents/SoftChip.jsx`, the inline lane
 * pill in cockpit's `BoardView.jsx`). `status` uses the baseline's `overline` typography variant --
 * the second build (cockpit) had already converged on 11/600, uppercase, .4px tracking, which is
 * `overline` in all but the weight step, so this satisfies the kit's shadow-check without a new
 * baseline variant. `caveat` keeps its raw 12/500 -- there is no baseline variant for it (`caption`
 * is 12/400) and adding one is a baseline decision that does not belong in this promotion; the
 * corresponding kitSxRegistry entry carries a stated exemption rather than a silent one.
 */
const TINT = 0.12;
const BORDER_TINT = 0.3;

export const SOFT_CHIP_ROOT_SX = {
  height: 'auto',
};

export const SOFT_CHIP_CAVEAT_SX = {
  borderRadius: 1,
  fontSize: 12,
  fontWeight: 500,
};

export const SOFT_CHIP_STATUS_SX = {
  borderRadius: '999px',
};

export default function SoftChip({
  label,
  tone = 'warning',
  variant = 'caveat',
  icon,
  border = true,
  title,
  ...rest
}) {
  const theme = useTheme();
  const palette = theme.palette[tone] ?? theme.palette.warning;
  const isStatus = variant === 'status';
  const dotColor = darken(palette.main, 0.3);

  const chip = (
    <Chip
      size="small"
      label={isStatus ? (
        <Typography variant="overline" component="span" sx={{ color: 'inherit' }}>
          {label}
        </Typography>
      ) : label}
      icon={icon ?? (
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: dotColor,
            flex: 'none',
          }}
        />
      )}
      sx={[
        SOFT_CHIP_ROOT_SX,
        isStatus ? SOFT_CHIP_STATUS_SX : SOFT_CHIP_CAVEAT_SX,
        {
          bgcolor: alpha(palette.main, TINT),
          color: darken(palette.main, 0.3),
          border: '1px solid',
          borderColor: border ? alpha(palette.main, BORDER_TINT) : 'transparent',
          cursor: title ? 'help' : 'default',
          '& .MuiChip-label': { px: 1, py: 0.5 },
          '& .MuiChip-icon': { ml: 1, mr: -0.5 },
        },
      ]}
      {...rest}
    />
  );

  return title ? (
    <Tooltip title={title} enterTouchDelay={0}>
      {chip}
    </Tooltip>
  ) : (
    chip
  );
}
