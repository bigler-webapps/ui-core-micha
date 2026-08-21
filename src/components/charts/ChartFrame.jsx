import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { exportChartPng, exportChartSvg } from './exportChart';
import { resolveChartHeight, warnOnHeightMismatch } from './chartDefaults';

export const CHART_FRAME_ROOT_SX = { p: 2 };
export const CHART_FRAME_ALERT_SX = { mt: 2 };

/**
 * Chart-type-agnostic chart scaffolding. Children may be an X-Charts primitive or a bespoke SVG.
 *
 * `minHeight` (CHART-8): a floor under an `aspect`-derived responsive height when `aspect` is
 * set and `height` is not; otherwise (no `height`, no `aspect`) it sizes the content box itself.
 * Once `height` is set, `height` sizes the box and it never reserves more than that, even if
 * `minHeight` is also passed and larger.
 */
export function ChartFrame({
  title,
  subtitle,
  toolbar,
  controls,
  loading = false,
  error = false,
  isEmpty = false,
  emptyMessage,
  minHeight,
  height,
  aspect,
  exportOptions = false,
  onExportSvg,
  onExportPng,
  meta,
  ariaLabel,
  children,
  variant = 'outlined',
  titleVariant = 'h6',
  sx,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const titleId = useId();
  const chartRef = useRef(null);
  const [exportError, setExportError] = useState(false);
  const options = exportOptions === true ? {} : exportOptions || {};
  const exportsEnabled = Boolean(exportOptions);
  const hasMeta = meta !== undefined && meta !== null && meta !== false && meta !== '';
  const hasCustomAriaLabel = Boolean(ariaLabel);
  const chartLabel = ariaLabel || title;
  const callerSx = Array.isArray(sx) ? sx : [sx];

  useEffect(() => warnOnHeightMismatch('ChartFrame', { minHeight, height }), [minHeight, height]);
  const { wrapperMinHeight, chartHeight } = resolveChartHeight({ minHeight, height, aspect });

  const runExport = async (type) => {
    setExportError(false);
    try {
      const filename = options.filename || 'chart';
      const result = type === 'svg'
        ? exportChartSvg(chartRef.current, `${filename}.svg`)
        : await exportChartPng(
          chartRef.current,
          `${filename}.png`,
          theme.palette.background.paper,
        );
      const callback = type === 'svg' ? onExportSvg : onExportPng;
      callback?.(result);
    } catch (_error) {
      setExportError(true);
    }
  };

  let content = children;
  if (loading) {
    content = <CircularProgress aria-label={t('ChartFrame.LOADING')} />;
  } else if (error) {
    content = <Alert severity="error">{typeof error === 'string' ? error : t('ChartFrame.ERROR_DEFAULT')}</Alert>;
  } else if (isEmpty) {
    content = <Alert severity="info">{emptyMessage || t('ChartFrame.EMPTY_DEFAULT')}</Alert>;
  }

  return (
    <Paper variant={variant} sx={[CHART_FRAME_ROOT_SX, ...callerSx]}>
      {/* THEME-11: mb: 2 -> mb: 1 (16 -> 8px) -- one line item in the estate-wide chart-furniture
          trim; the controls row below keeps its own mb: 2, not named in that WO's scope. */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1 }}>
        <Box>
          <Typography id={titleId} variant={titleVariant}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {toolbar && <Box>{toolbar}</Box>}
      </Box>

      {/* A full-width control row between the header and the chart. Distinct from `toolbar`
          (which shares the header row with the title, so a wide control set squeezes the title)
          and from `children` (which the loading/error/empty states replace -- controls must stay
          operable in those states, e.g. to switch away from a view that has no data). */}
      {controls && <Box sx={{ mb: 2 }}>{controls}</Box>}

      <Box
        ref={chartRef}
        role="img"
        aria-label={chartLabel}
        aria-labelledby={hasCustomAriaLabel ? undefined : titleId}
        sx={{
          width: '100%',
          minHeight: wrapperMinHeight,
          height: chartHeight,
          aspectRatio: aspect,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </Box>

      {exportError && <Alert severity="error" sx={CHART_FRAME_ALERT_SX}>{t('ChartFrame.EXPORT_ERROR')}</Alert>}

      {/* `meta` opts the card into the single bordered foot row (meta left, exports right).
          Without it the markup below is byte-for-byte the pre-`meta` structure -- a bare Stack,
          no wrapper, `mt: 2` on the Stack itself. 16 other panels render this path, so it must
          not gain or lose a node. */}
      {hasMeta ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            mt: 2,
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary">{meta}</Typography>
          {exportsEnabled && (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {options.svg !== false && (
                <Button size="small" onClick={() => runExport('svg')}>
                  {t('ChartFrame.EXPORT_SVG_LABEL')}
                </Button>
              )}
              {options.png !== false && (
                <Button size="small" onClick={() => runExport('png')}>
                  {t('ChartFrame.EXPORT_PNG_LABEL')}
                </Button>
              )}
            </Stack>
          )}
        </Box>
      ) : exportsEnabled && (
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          {options.svg !== false && (
            <Button size="small" onClick={() => runExport('svg')}>
              {t('ChartFrame.EXPORT_SVG_LABEL')}
            </Button>
          )}
          {options.png !== false && (
            <Button size="small" onClick={() => runExport('png')}>
              {t('ChartFrame.EXPORT_PNG_LABEL')}
            </Button>
          )}
        </Stack>
      )}
    </Paper>
  );
}
