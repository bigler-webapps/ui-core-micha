// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const chartExport = vi.hoisted(() => ({
  exportChartSvg: vi.fn(() => new Blob()),
  exportChartPng: vi.fn(() => Promise.resolve(new Blob())),
}));

vi.mock('../src/components/charts/exportChart', () => chartExport);

import { ChartFrame } from '../src/components/charts/ChartFrame';

const resources = {
  en: {
    translation: {
      'ChartFrame.LOADING': 'Loading chart.',
      'ChartFrame.EMPTY_DEFAULT': 'No data available.',
      'ChartFrame.ERROR_DEFAULT': 'The chart could not be loaded.',
      'ChartFrame.EXPORT_SVG_LABEL': 'Export SVG',
      'ChartFrame.EXPORT_PNG_LABEL': 'Export PNG',
      'ChartFrame.EXPORT_ERROR': 'The chart could not be exported.',
    },
  },
  fr: {
    translation: {
      'ChartFrame.LOADING': 'Chargement du graphique.',
      'ChartFrame.EMPTY_DEFAULT': 'Aucune donnée disponible.',
      'ChartFrame.ERROR_DEFAULT': 'Impossible de charger le graphique.',
      'ChartFrame.EXPORT_SVG_LABEL': 'Exporter en SVG',
      'ChartFrame.EXPORT_PNG_LABEL': 'Exporter en PNG',
      'ChartFrame.EXPORT_ERROR': 'Impossible d’exporter le graphique.',
    },
  },
};

function renderFrame(props = {}, language = 'en') {
  const i18n = i18next.createInstance();
  i18n.init({ lng: language, resources, interpolation: { escapeValue: false } });
  return render(
    <ThemeProvider theme={createTheme()}>
      <I18nextProvider i18n={i18n}>
        <ChartFrame title="Chart title" subtitle="Chart subtitle" {...props}>
          <svg data-testid="chart-body" />
        </ChartFrame>
      </I18nextProvider>
    </ThemeProvider>,
  );
}

describe('ChartFrame', () => {
  afterEach(cleanup);

  it('renders its title, subtitle, toolbar, and accessible chart region', () => {
    renderFrame({ toolbar: <button type="button">Period selector</button> });

    expect(screen.getByText('Chart title')).toBeTruthy();
    expect(screen.getByText('Chart subtitle')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Period selector' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Chart title' })).toBeTruthy();
  });

  it('lets a custom ariaLabel override the title as the accessible name', () => {
    renderFrame({ ariaLabel: 'Custom accessible description' });

    expect(screen.getByRole('img', { name: 'Custom accessible description' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Chart title' })).toBeNull();
  });

  it('enforces loading, error, empty, then children state precedence', () => {
    const loading = renderFrame({ loading: true, error: 'Failure', isEmpty: true });
    expect(screen.getByLabelText('Loading chart.')).toBeTruthy();
    expect(screen.queryByText('Failure')).toBeNull();
    expect(screen.queryByTestId('chart-body')).toBeNull();
    loading.unmount();

    const failure = renderFrame({ error: 'Failure', isEmpty: true });
    expect(screen.getByText('Failure')).toBeTruthy();
    expect(screen.queryByTestId('chart-body')).toBeNull();
    failure.unmount();

    renderFrame();
    expect(screen.getByTestId('chart-body')).toBeTruthy();
  });

  it('renders an empty message before children when empty', () => {
    renderFrame({ isEmpty: true, emptyMessage: 'No observations' });
    expect(screen.getByText('No observations')).toBeTruthy();
    expect(screen.queryByTestId('chart-body')).toBeNull();
  });

  it('shows export controls only when enabled and invokes the SVG callback', () => {
    const onExportSvg = vi.fn();
    const disabled = renderFrame();
    expect(screen.queryByRole('button', { name: 'Export SVG' })).toBeNull();
    disabled.unmount();

    renderFrame({ exportOptions: { png: false }, onExportSvg });
    fireEvent.click(screen.getByRole('button', { name: 'Export SVG' }));
    expect(chartExport.exportChartSvg).toHaveBeenCalledOnce();
    expect(onExportSvg).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Export PNG' })).toBeNull();
  });

  it('invokes the PNG callback when the PNG export control is used', async () => {
    const onExportPng = vi.fn();
    renderFrame({ exportOptions: true, onExportPng });

    fireEvent.click(screen.getByRole('button', { name: 'Export PNG' }));
    await vi.waitFor(() => expect(chartExport.exportChartPng).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(onExportPng).toHaveBeenCalledOnce());
  });

  it('keeps the controls row rendered in the loading, error and empty states', () => {
    const controls = <button type="button">View selector</button>;

    const loading = renderFrame({ controls, loading: true });
    expect(screen.getByRole('button', { name: 'View selector' })).toBeTruthy();
    loading.unmount();

    const empty = renderFrame({ controls, isEmpty: true });
    expect(screen.getByRole('button', { name: 'View selector' })).toBeTruthy();
    expect(screen.queryByTestId('chart-body')).toBeNull();
    empty.unmount();

    renderFrame({ controls, error: 'Failure' });
    expect(screen.getByRole('button', { name: 'View selector' })).toBeTruthy();
  });

  it('renders the meta foot row alongside the export controls when meta is set', () => {
    renderFrame({ meta: 'Morris screening · 19 parameters · 2 regimes', exportOptions: true });

    const metaNode = screen.getByText('Morris screening · 19 parameters · 2 regimes');
    expect(metaNode).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export SVG' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeTruthy();
    // meta and the exports share one bordered foot row rather than stacking
    const foot = metaNode.parentElement;
    expect(foot.contains(screen.getByRole('button', { name: 'Export SVG' }))).toBe(true);
    expect(window.getComputedStyle(foot).justifyContent).toBe('space-between');
    expect(window.getComputedStyle(foot).borderTopStyle).toBe('solid');
  });

  it('leaves the export-only layout structurally untouched when meta is omitted', () => {
    renderFrame({ exportOptions: true });

    const paper = document.querySelector('.MuiPaper-root');
    const stack = screen.getByRole('button', { name: 'Export SVG' }).closest('[class*="MuiStack"]');

    // The export Stack must remain a DIRECT child of the Paper -- the meta foot row introduces a
    // wrapper Box, and 16 existing panels render this no-meta path.
    expect(stack.parentElement).toBe(paper);
    const stackStyle = window.getComputedStyle(stack);
    expect(stackStyle.borderTopStyle).not.toBe('solid');
    expect(stackStyle.justifyContent).not.toBe('space-between');
    expect(paper.textContent).not.toContain('undefined');
  });

  it('uses resolved i18n strings for its own empty state', () => {
    renderFrame({ isEmpty: true }, 'fr');
    expect(screen.getByText('Aucune donnée disponible.')).toBeTruthy();
  });
});
