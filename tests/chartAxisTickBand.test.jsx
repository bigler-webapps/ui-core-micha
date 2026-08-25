// @vitest-environment jsdom
import React from 'react';
import {
  afterAll, afterEach, beforeAll, describe, expect, it,
} from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { BarChart } from '../src/components/charts/BarChart';

// UCM-CHART-16: MUI's own tick-label fit check (`shortenLabels`, weighed against
// `tickLabelsMaxHeight`) depends on a REAL SVG text measurement (`getBBox`), which jsdom does not
// implement -- `SVGElement.prototype.getBBox` is not a function here, so MUI's own
// `getStringSize` falls back to `getBoundingClientRect`, which jsdom always reports as 0x0. Every
// measured height therefore comes back 0, MUI's fit check trivially "fits" any text, and the real
// defect (every tick label blanked) can never be observed by rendering the unmocked chart as-is --
// a test that skips this setup would pass whether or not the resolver's band is correct, i.e. be
// exactly the "mocked prop-assertion" trap this package's own tests warn against elsewhere.
//
// This installs a deterministic `getBBox` instead, so the SAME code MUI itself runs is actually
// exercised: height scaled off the measurement span's own `fontSize`, at a ratio (1.28) chosen to
// sit inside the real near-miss window this WO's own work order measured against a real browser
// (`resolveXAxisGeometry`'s `TICK_TEXT_HEIGHT_FACTOR` comment) -- large enough that the pre-fix
// unconditional floor already fails a titled axis at the theme's own default tick font, small
// enough that the untitled default (never broken) still passes. Width is deliberately near-zero so
// only the HEIGHT dimension of MUI's fit check is exercised; each chart also sets an explicit
// `width` so MUI's real responsive sizing (ResizeObserver, unavailable in jsdom) never enters into
// it.
function installHeightOnlyTextMeasurement() {
  const original = SVGElement.prototype.getBBox;
  // eslint-disable-next-line func-names
  SVGElement.prototype.getBBox = function getBBox() {
    const fontSize = Number.parseFloat(this.style.fontSize) || 12;
    return { x: 0, y: 0, width: 1, height: fontSize * 1.28 };
  };
  return () => {
    SVGElement.prototype.getBBox = original;
  };
}

describe('x-axis tick band leaves MUI room for one real line of tick text (UCM-CHART-16)', () => {
  let restoreGetBBox;

  beforeAll(() => {
    restoreGetBBox = installHeightOnlyTextMeasurement();
  });

  afterAll(() => {
    restoreGetBBox();
  });

  afterEach(cleanup);

  // WO scope item 1's own signature: an axis title AND horizontal tick labels sharing the same
  // band, at the theme's own default tick font -- no explicit `height`/`tickLabelStyle` overrides
  // anywhere, so this exercises the resolver's own default reservation end to end, the exact path
  // two hram consumers had to work around by hand.
  it('renders non-empty tick labels when the axis has both a title and horizontal ticks', () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <BarChart
          series={[{ data: [24, 36, 28], label: 'Opened' }]}
          xAxis={[{ data: ['A', 'B', 'C'] }]}
          xAxisLabel="Category"
          width={600}
        />
      </ThemeProvider>,
    );
    const tickTexts = Array.from(container.querySelectorAll('.MuiChartsAxis-bottom .MuiChartsAxis-tickLabel'))
      .map((node) => node.textContent);
    expect(tickTexts).toHaveLength(3);
    expect(tickTexts.every((text) => text.length > 0)).toBe(true);
  });

  // Non-goal guardrail: the rotated path projects its own band from real measured/estimated text
  // width and must stay exactly as before -- this WO only touches the flat (angle 0) case.
  it('leaves the rotated tick path unaffected', () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <BarChart
          series={[{ data: [24, 36, 28, 12, 9, 7, 15] }]}
          xAxis={[{
            data: Array.from({ length: 7 }, (_, i) => `A rather long category label ${i}`),
          }]}
          xLabels="angled"
          width={600}
        />
      </ThemeProvider>,
    );
    const tickTexts = Array.from(container.querySelectorAll('.MuiChartsAxis-bottom .MuiChartsAxis-tickLabel'))
      .map((node) => node.textContent);
    expect(tickTexts).toHaveLength(7);
    expect(tickTexts.every((text) => text.length > 0)).toBe(true);
  });
});
