import React, { useId, useRef, useState } from 'react';
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
import { exportChartPng, exportChartSvg } from './exportChart';

/**
 * Chart-type-agnostic chart scaffolding. Children may be an X-Charts primitive or a bespoke SVG.
 */
export function ChartFrame({
  title,
  subtitle,
  toolbar,
  loading = false,
  error = false,
  isEmpty = false,
  emptyMessage,
  minHeight,
  aspect,
  exportOptions = false,
  onExportSvg,
  onExportPng,
  ariaLabel,
  children,
  variant = 'outlined',
  sx,
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const chartRef = useRef(null);
  const [exportError, setExportError] = useState(false);
  const options = exportOptions === true ? {} : exportOptions || {};
  const exportsEnabled = Boolean(exportOptions);
  const hasCustomAriaLabel = Boolean(ariaLabel);
  const chartLabel = ariaLabel || title;

  const runExport = async (type) => {
    setExportError(false);
    try {
      const filename = options.filename || 'chart';
      const result = type === 'svg'
        ? exportChartSvg(chartRef.current, `${filename}.svg`)
        : await exportChartPng(chartRef.current, `${filename}.png`);
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
    <Paper variant={variant} sx={{ p: 2, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography id={titleId} variant="h6">{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {toolbar && <Box>{toolbar}</Box>}
      </Box>

      <Box
        ref={chartRef}
        role="img"
        aria-label={chartLabel}
        aria-labelledby={hasCustomAriaLabel ? undefined : titleId}
        sx={{
          width: '100%',
          minHeight,
          aspectRatio: aspect,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </Box>

      {exportError && <Alert severity="error" sx={{ mt: 2 }}>{t('ChartFrame.EXPORT_ERROR')}</Alert>}

      {exportsEnabled && (
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
