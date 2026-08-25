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
      'ChartFrame.EXPORT_SVG_TOOLTIP': 'Scalable vector image of the chart alone, without the legend.',
      'ChartFrame.EXPORT_PNG_LABEL': 'Export PNG',
      'ChartFrame.EXPORT_PNG_TOOLTIP': 'Image of the whole card area as shown, including the legend, size key, and footnotes.',
      'ChartFrame.EXPORT_ERROR': 'The chart could not be exported.',
    },
  },
  fr: {
    translation: {
      'ChartFrame.LOADING': 'Chargement du graphique.',
      'ChartFrame.EMPTY_DEFAULT': 'Aucune donnée disponible.',
      'ChartFrame.ERROR_DEFAULT': 'Impossible de charger le graphique.',
      'ChartFrame.EXPORT_SVG_LABEL': 'Exporter en SVG',
      'ChartFrame.EXPORT_SVG_TOOLTIP': 'Image vectorielle du graphique seul, sans la légende.',
      'ChartFrame.EXPORT_PNG_LABEL': 'Exporter en PNG',
      'ChartFrame.EXPORT_PNG_TOOLTIP': 'Image de toute la zone de la carte, telle qu’affichée, légende, clé de taille et notes de bas de page comprises.',
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

  it('renders the title as h6 by default', () => {
    renderFrame();

    const title = screen.getByText('Chart title');
    expect(title.tagName).toBe('H6');
    expect(title.classList.contains('MuiTypography-h6')).toBe(true);
  });

  it('renders the title at an overridden typography variant', () => {
    renderFrame({ titleVariant: 'subtitle2' });

    const title = screen.getByText('Chart title');
    expect(title.classList.contains('MuiTypography-subtitle2')).toBe(true);
    expect(title.classList.contains('MuiTypography-h6')).toBe(false);
  });

  it('leaves the subtitle, toolbar, and footer unchanged for either title variant', () => {
    for (const titleVariant of [undefined, 'subtitle2']) {
      const view = renderFrame({
        titleVariant,
        toolbar: <button type="button">Period selector</button>,
        meta: 'Panel metadata',
        exportOptions: true,
      });

      const subtitle = screen.getByText('Chart subtitle');
      expect(subtitle.tagName).toBe('P');
      expect(subtitle.classList.contains('MuiTypography-body2')).toBe(true);
      expect(screen.getByRole('button', { name: 'Period selector' })).toBeTruthy();

      const metaNode = screen.getByText('Panel metadata');
      expect(metaNode.classList.contains('MuiTypography-caption')).toBe(true);
      const foot = metaNode.parentElement;
      expect(foot.contains(screen.getByRole('button', { name: 'Export SVG' }))).toBe(true);
      expect(foot.contains(screen.getByRole('button', { name: 'Export PNG' }))).toBe(true);
      expect(window.getComputedStyle(foot).justifyContent).toBe('space-between');
      expect(window.getComputedStyle(foot).borderTopStyle).toBe('solid');

      view.unmount();
    }
  });

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
    expect(chartExport.exportChartPng).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'chart.png',
      '#fff',
    );
    await vi.waitFor(() => expect(onExportPng).toHaveBeenCalledOnce());
  });

  // UCM-CHART-17: the two formats now genuinely differ (chart-only vector vs. the whole card as
  // shown) -- each button must say so, without silently renaming itself in the process (MUI
  // Tooltip's default `aria-label` behaviour would do exactly that; `describeChild` avoids it).
  it('describes what each export format contains without replacing the button\'s own accessible name', () => {
    renderFrame({ exportOptions: true });
    const svgButton = screen.getByRole('button', { name: 'Export SVG' });
    const pngButton = screen.getByRole('button', { name: 'Export PNG' });
    expect(svgButton.getAttribute('title')).toBe('Scalable vector image of the chart alone, without the legend.');
    expect(pngButton.getAttribute('title')).toBe('Image of the whole card area as shown, including the legend, size key, and footnotes.');
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

  // CHART-9: ChartFrame's content box is a whole CARD (title, toolbar, chart, legend, footnotes,
  // export links), not a single chart. `minHeight` is always just a floor content can exceed.
  describe('minHeight resolution (CHART-9)', () => {
    function contentBoxStyle() {
      return window.getComputedStyle(screen.getByTestId('chart-body').parentElement);
    }

    it('sizes the content box from minHeight alone as a floor, never a fixed height', () => {
      renderFrame({ minHeight: 300 });
      const style = contentBoxStyle();
      expect(style.minHeight).toBe('300px');
      expect(style.height).toBe('auto');
    });

    it('does not receive a fixed height when content exceeds minHeight -- the regression itself', () => {
      const i18n = i18next.createInstance();
      i18n.init({ lng: 'en', resources, interpolation: { escapeValue: false } });
      render(
        <ThemeProvider theme={createTheme()}>
          <I18nextProvider i18n={i18n}>
            <ChartFrame title="Chart title" minHeight={100}>
              <svg data-testid="chart-body" style={{ height: 500 }} />
            </ChartFrame>
          </I18nextProvider>
        </ThemeProvider>,
      );
      const style = contentBoxStyle();
      expect(style.minHeight).toBe('100px');
      expect(style.height).toBe('auto');
    });

    it('leaves minHeight unset (auto) when the caller passes none', () => {
      renderFrame();
      const style = contentBoxStyle();
      expect(style.minHeight).toBe('auto');
      expect(style.height).toBe('auto');
    });
  });

  // UCM-CHART-13: `height` was destructured but never applied to the box -- genuinely dead, no
  // consumer lost anything when it went. `aspect` is DIFFERENT: it WAS applied (`aspectRatio` on
  // the box, through 3.0.1). UCM-CHART-13 shipped claiming no consumer passed it either -- that was
  // false (a head-truncated grep missed four live call sites in fitness-monitor); UCM-CHART-14
  // corrects the record and rewrites `aspect`'s own error message, which previously said "never
  // applied" -- the opposite of what happened, and actively misleading for the four callers who
  // will actually see it. Both props are gone; passing either throws in dev, naming the real
  // replacement, the same mechanism the four chart presets use (`UCM-CHART-12`).
  describe('removed height/aspect props throw in dev, naming their replacement (UCM-CHART-13/14)', () => {
    it('throws when a caller still passes height, naming minHeight AND size as the replacement', () => {
      expect(() => renderFrame({ height: 380 })).toThrow(/ChartFrame.*height.*minHeight.*size/s);
    });

    it('throws when a caller still passes aspect, naming size as the replacement -- WITHOUT claiming it was never applied', () => {
      const message = (() => {
        try { renderFrame({ aspect: 1.8 }); } catch (err) { return err.message; }
        throw new Error('expected renderFrame to throw');
      })();
      expect(message).toMatch(/ChartFrame.*aspect.*size/s);
      // ui_reviewer finding: the prior version of this test only checked /size/, which a message
      // naming JUST size (and dropping minHeight) would still pass -- the card's own floor is
      // still minHeight, so the message must say so too, not only point at the chart's `size`.
      expect(message).toMatch(/minHeight/);
      // UCM-CHART-14 F2: the message must not repeat the false "never applied" claim that shipped
      // in UCM-CHART-13 -- aspect DID apply aspectRatio to the box, and removing it is a real,
      // visible change for the four callers who will hit this. A test only matching /size/ would
      // pass on either wording, which is exactly how the false message shipped unnoticed.
      expect(message).not.toMatch(/never applied/i);
      expect(message).toMatch(/was applied/i);
    });

    it('attributes the height removal to UCM-CHART-13/v3.1.0 (unchanged -- height\'s message was already true)', () => {
      expect(() => renderFrame({ height: 380 })).toThrow(/UCM-CHART-13.*v3\.1\.0/);
    });

    it('attributes the aspect removal to UCM-CHART-14/v3.1.1 (the corrected message, not the original false one)', () => {
      expect(() => renderFrame({ aspect: 1.8 })).toThrow(/UCM-CHART-14.*v3\.1\.1/);
    });

    it('does not throw when only minHeight is passed', () => {
      expect(() => renderFrame({ minHeight: 320 })).not.toThrow();
    });

    it('stays inert in production even when height/aspect are passed', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() => renderFrame({ height: 380, aspect: 1.8 })).not.toThrow();
      } finally {
        process.env.NODE_ENV = original;
      }
    });

    it('applies nothing to the box for a still-passed height/aspect (dev-mode error aside) -- confirmed via the production path', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        renderFrame({ minHeight: 320, height: 380, aspect: 1.8 });
        const style = window.getComputedStyle(screen.getByTestId('chart-body').parentElement);
        expect(style.minHeight).toBe('320px');
        expect(style.height).toBe('auto');
        expect(style.aspectRatio).toBe('auto');
      } finally {
        process.env.NODE_ENV = original;
      }
    });
  });
});
