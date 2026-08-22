import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findChartApiUsage, runCensus, TARGET_PROPS } from '../scripts/chart-api-census.mjs';

const IMPORT_LINE = "import { BarChart, LineChart, ScatterChart, TimeSeriesChart, ChartFrame } from '@micha.bigler/ui-core-micha';\n";

function propsFound(entry) {
  return TARGET_PROPS.filter((p) => entry.props[p]);
}

// UCM-CHART-14: this WO exists because a grep could not see JSX structure. First-round fixtures
// (below) cover what broke the ad-hoc scans behind this series' wrong consumer counts (see
// work-orders/UCM-CHART-14.md's own table of six). A second, independent review round (both
// `reviewer` and `ui_reviewer`) found the FIRST version of this file could itself produce a WRONG,
// non-UNPARSED answer -- worse than honest UNPARSED -- and that two of these very fixtures did not
// actually exercise the trap their name claimed. Both are fixed; the second-round traps are in the
// next describe block. Each fixture asserts the EXACT props found, not just "found something".
describe('findChartApiUsage -- traps that broke ad-hoc grep scans (UCM-CHART-14)', () => {
  it('trap 1: an arrow function inside a prop value does not truncate the tag at its own "=>"', () => {
    const source = `${IMPORT_LINE}
      function Panel() {
        return (
          <ScatterChart
            getPointStyle={(point) => ({ hollow: point.isStatusQuo, color: point.isStatusQuo ? undefined : '#123' })}
            aspect={1.8}
          />
        );
      }
    `;
    const [entry] = findChartApiUsage(source);
    expect(entry.component).toBe('ScatterChart');
    expect(entry.unparsed).toBe(false);
    expect(propsFound(entry)).toEqual(['aspect']);
  });

  // Second-round finding: the original fixture put the comment BETWEEN two already-closed tags
  // (JSX children), never exercising an open tag's own attribute-scan while a comment is active.
  // This version puts both a line comment AND a block comment, each carrying an apostrophe, INSIDE
  // the attribute list itself -- the position that actually needs string/comment tracking to be
  // correct, since a naive apostrophe could be misread as a string-open.
  it('trap 2: an apostrophe inside a comment WITHIN the attribute list does not desynchronise string tracking', () => {
    const source = `${IMPORT_LINE}
      function Panel() {
        return (
          <ChartFrame
            // don't confuse this line comment's apostrophe with a string open
            minHeight={300}
            /* it's a block comment here too */
            title="Body weight"
          />
        );
      }
    `;
    const [entry] = findChartApiUsage(source);
    expect(entry.component).toBe('ChartFrame');
    expect(propsFound(entry)).toEqual(['minHeight']);
  });

  // Second-round finding: the original fixture's nested keys (`angle`/`left`/`top`) were not even
  // in TARGET_PROPS, so a parser that falsely collected ANY nested key would still have passed.
  // This version nests `aspect` and `height` themselves as object keys several levels deep -- the
  // exact prop names the census is looking for -- so a depth-tracking bug that leaks nested keys
  // up as top-level attributes is now something this test can actually catch.
  it('trap 3: nested braces are tracked by depth -- a nested key with a TARGET PROP NAME is never mistaken for a top-level attribute', () => {
    const source = `${IMPORT_LINE}
      function Panel() {
        return (
          <BarChart
            xAxis={[{ scaleType: 'band', tickLabelStyle: { aspect: 'not-real', height: 999 } }]}
            margin={{ top: 8 }}
          />
        );
      }
    `;
    const [entry] = findChartApiUsage(source);
    // `margin` IS a top-level attribute (found); the nested `aspect`/`height` keys -- despite being
    // real TARGET_PROPS names -- must never surface as attributes of the tag itself.
    expect(propsFound(entry)).toEqual(['margin']);
  });

  it('trap 4: a prop many lines below the component name is still attributed to the same tag', () => {
    const source = `${IMPORT_LINE}
      function Panel() {
        return (
          <ChartFrame
            title="Body weight"
            subtitle="Last 12 months"
            variant="outlined"
            titleVariant="h6"
            exportOptions
            meta="Updated daily"
            aspect={1.8}
          >
            {children}
          </ChartFrame>
        );
      }
    `;
    const [entry] = findChartApiUsage(source);
    expect(entry.component).toBe('ChartFrame');
    expect(propsFound(entry)).toEqual(['aspect']);
  });
});

// Second review round -- the four NEW traps that surfaced against the first version's three-pass
// design (a raw regex tag-open search with no string/comment context, and no regex-literal
// tracking at all). All four are wrong-answer risks, not merely UNPARSED risks -- exactly the
// class of bug this WO's own F1 finding is about (a false measurement nobody flagged).
describe('findChartApiUsage -- second-round traps: string/comment-blind matching and regex literals', () => {
  it('does not count JSX-looking text inside a STRING literal as a real element', () => {
    const source = `${IMPORT_LINE}
      const example = '<BarChart aspect />';
      function Panel() {
        return <LineChart margin={{ top: 1 }} />;
      }
    `;
    const entries = findChartApiUsage(source);
    expect(entries).toHaveLength(1);
    expect(entries[0].component).toBe('LineChart');
  });

  it('does not count JSX-looking text inside a LINE comment as a real element', () => {
    const source = `${IMPORT_LINE}
      // <BarChart aspect />
      function Panel() {
        return <LineChart margin={{ top: 1 }} />;
      }
    `;
    const entries = findChartApiUsage(source);
    expect(entries).toHaveLength(1);
    expect(entries[0].component).toBe('LineChart');
  });

  it('does not count JSX-looking text inside a BLOCK comment as a real element', () => {
    const source = `${IMPORT_LINE}
      /* an old example: <BarChart aspect /> -- removed */
      function Panel() {
        return <LineChart margin={{ top: 1 }} />;
      }
    `;
    const entries = findChartApiUsage(source);
    expect(entries).toHaveLength(1);
    expect(entries[0].component).toBe('LineChart');
  });

  // The concrete case found in review: a regex literal's `}`/`>` characters must not be read as
  // real brace/tag-close tokens, or a later real prop on the same tag gets silently dropped.
  it('a regex literal in a prop value does not corrupt brace depth or close the tag early', () => {
    const source = `${IMPORT_LINE}
      function Panel() {
        return (
          <BarChart
            data={/[}>]/}
            aspect={1.8}
          />
        );
      }
    `;
    const [entry] = findChartApiUsage(source);
    expect(entry.unparsed).toBe(false);
    expect(propsFound(entry)).toEqual(['aspect']);
  });

  // A component nested INSIDE another target component's own prop expression -- the outer tag's
  // scan must not swallow the inner one, and each must report its OWN props independently.
  it('finds a target component nested inside another target component\'s prop expression', () => {
    const source = `${IMPORT_LINE}
      function Panel() {
        return (
          <ChartFrame minHeight={300} content={<BarChart aspect={1.8} />} />
        );
      }
    `;
    const entries = findChartApiUsage(source);
    const frame = entries.find((e) => e.component === 'ChartFrame');
    const bar = entries.find((e) => e.component === 'BarChart');
    expect(entries).toHaveLength(2);
    expect(propsFound(frame)).toEqual(['minHeight']);
    expect(propsFound(bar)).toEqual(['aspect']);
  });

  // Regression test for a bug this WO's OWN verification run found (not review, an actual real-
  // world run against hram): the regex-literal heuristic originally included `<`/`>` in the set of
  // characters that can precede a regex-starting `/`. Every JSX CLOSING tag (`</Something>`) has a
  // `/` immediately after a `<` -- so `</ChartFrame>` itself was misread as opening a regex
  // literal, silently corrupting brace depth for the rest of the file and turning every multi-line
  // `<ChartFrame>...</ChartFrame>` usage in the estate into a false UNPARSED. This fixture is
  // shaped like the real file that exposed it: a target component with real JSX children,
  // including an interleaved NON-target component's own closing tag before the target's own.
  it('a target component with real JSX children (own closing tag, and a sibling non-target closing tag) is not corrupted by the </Tag> regex-heuristic bug', () => {
    const source = `${IMPORT_LINE}
      function Panel() {
        return (
          <ChartFrame minHeight={320} toolbar={<Toolbar><Button>Go</Button></Toolbar>}>
            <ScatterChart aspect={1.8}>
              <ScatterReferenceLine from={{ x: 0, y: 0 }} to={{ x: 1, y: 1 }} />
            </ScatterChart>
          </ChartFrame>
        );
      }
    `;
    const entries = findChartApiUsage(source);
    const frame = entries.find((e) => e.component === 'ChartFrame');
    const scatter = entries.find((e) => e.component === 'ScatterChart');
    expect(frame).toBeDefined();
    expect(frame.unparsed).toBe(false);
    expect(propsFound(frame)).toEqual(['minHeight']);
    expect(scatter).toBeDefined();
    expect(scatter.unparsed).toBe(false);
    expect(propsFound(scatter)).toEqual(['aspect']);
  });
});

describe('findChartApiUsage -- import resolution and non-traps', () => {
  it('only counts components actually imported from @micha.bigler/ui-core-micha -- a same-named local component is not a consumer', () => {
    const source = `
      import { BarChart } from './my-local-chart';
      function Panel() {
        return <BarChart aspect={1.8} />;
      }
    `;
    expect(findChartApiUsage(source)).toEqual([]);
  });

  it('resolves an aliased import back to its canonical export name', () => {
    const source = `
      import { BarChart as Bar } from '@micha.bigler/ui-core-micha';
      function Panel() {
        return <Bar aspect={1.8} />;
      }
    `;
    const [entry] = findChartApiUsage(source);
    expect(entry.component).toBe('BarChart');
    expect(propsFound(entry)).toEqual(['aspect']);
  });

  it('reports no elements in a file with no matching import at all (the fast path)', () => {
    expect(findChartApiUsage('const BarChart = 1; const x = <BarChart aspect={1} />;')).toEqual([]);
  });

  it('reports a boolean-shorthand attribute (no value) the same as a valued one', () => {
    const source = `${IMPORT_LINE}
      const el = <ChartFrame minHeight />;
    `;
    const [entry] = findChartApiUsage(source);
    expect(propsFound(entry)).toEqual(['minHeight']);
  });

  it('finds a clean element with none of the target props as an entry with an empty prop list', () => {
    const source = `${IMPORT_LINE}
      const el = <BarChart xAxisLabel="Month" series={[]} />;
    `;
    const [entry] = findChartApiUsage(source);
    expect(entry.unparsed).toBe(false);
    expect(propsFound(entry)).toEqual([]);
  });

  it('finds multiple distinct elements in the same file, each with its own props', () => {
    const source = `${IMPORT_LINE}
      const a = <BarChart aspect={1} />;
      const b = <LineChart margin={{ top: 1 }} />;
    `;
    const entries = findChartApiUsage(source);
    expect(entries).toHaveLength(2);
    expect(entries[0].component).toBe('BarChart');
    expect(entries[1].component).toBe('LineChart');
  });
});

// Definition of Done: "A tag it cannot close is reported as UNPARSED, never skipped and never
// counted as clean" -- a census that silently drops what it cannot read is the failure it exists
// to prevent.
describe('findChartApiUsage -- UNPARSED, never silently skipped', () => {
  it('reports a tag that never closes as UNPARSED rather than dropping it', () => {
    const source = `${IMPORT_LINE}
      const el = <BarChart aspect={1.8} xAxisLabel="Month unterminated
    `; // no closing `>` or `/>` anywhere after this point
    const entries = findChartApiUsage(source);
    expect(entries).toHaveLength(1);
    expect(entries[0].unparsed).toBe(true);
    expect(entries[0].component).toBe('BarChart');
  });

  it('keeps scanning after an UNPARSED tag and still finds a later, well-formed one', () => {
    // An unmatched `{` (not a string) leaves brace depth permanently elevated but string tracking
    // intact -- so a LATER tag, opening at that same (now-baseline) depth, can still close
    // correctly relative to it. `BarChart` never returns to its own start depth and is UNPARSED;
    // `LineChart` opens and closes entirely within the leaked depth and is found correctly.
    const source = `${IMPORT_LINE}
      const broken = <BarChart aspect={1.8} xAxis={{ scaleType: 'band';
      const el2 = <LineChart margin={{ top: 1 }} />;
    `;
    const entries = findChartApiUsage(source);
    const bar = entries.find((e) => e.component === 'BarChart');
    const lineChart = entries.find((e) => e.component === 'LineChart');
    expect(bar.unparsed).toBe(true);
    expect(lineChart).toBeDefined();
    expect(lineChart.unparsed).toBe(false);
    expect(propsFound(lineChart)).toEqual(['margin']);
  });

  // An UNTERMINATED STRING is a genuinely different case from an unmatched brace: nothing can
  // recover from it without guessing where the string was meant to end, so honestly reporting
  // "nothing found after this point" is the correct behaviour, not a bug -- the alternative (the
  // first version of this scanner's per-tag-independent design) would have silently RESYNCHRONISED
  // past a real syntax error, which is exactly the kind of confident-but-wrong answer this WO's
  // second review round exists to rule out.
  it('an unterminated string desyncs the rest of the file -- reported as UNPARSED, not silently resynchronised', () => {
    const source = `${IMPORT_LINE}
      const broken = <BarChart aspect={1.8} xAxisLabel="unterminated;
      const el2 = <LineChart margin={{ top: 1 }} />;
    `;
    const entries = findChartApiUsage(source);
    expect(entries).toHaveLength(1);
    expect(entries[0].component).toBe('BarChart');
    expect(entries[0].unparsed).toBe(true);
  });
});

describe('runCensus -- filesystem walking degrades gracefully (UCM-CHART-14 Risks)', () => {
  let workspaceRoot;

  afterEach(() => {
    if (workspaceRoot) rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('reports "not present" for a sibling with no frontend/src or src, and never throws', () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'ucm-census-'));
    mkdirSync(join(workspaceRoot, 'empty-repo'));

    const result = runCensus(workspaceRoot);
    const entry = result.apps.find((a) => a.app === 'empty-repo');
    expect(entry.present).toBe(false);
  });

  it('finds a real usage under frontend/src, and reports a clean sibling with no ucm import as present with zero entries', () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'ucm-census-'));
    const appSrc = join(workspaceRoot, 'sample-app', 'frontend', 'src');
    mkdirSync(appSrc, { recursive: true });
    writeFileSync(
      join(appSrc, 'Panel.jsx'),
      `${IMPORT_LINE}\nconst el = <BarChart aspect={1.8} />;\n`,
    );
    mkdirSync(join(workspaceRoot, 'clean-app', 'src'), { recursive: true });
    writeFileSync(join(workspaceRoot, 'clean-app', 'src', 'index.js'), 'export const x = 1;\n');

    const result = runCensus(workspaceRoot);
    const sample = result.apps.find((a) => a.app === 'sample-app');
    const clean = result.apps.find((a) => a.app === 'clean-app');
    expect(sample.present).toBe(true);
    expect(sample.entries).toHaveLength(1);
    expect(sample.entries[0].props.aspect).toBe(true);
    expect(clean.present).toBe(true);
    expect(clean.entries).toHaveLength(0);
  });

  it('excludes ui-core-micha itself from the sibling walk by default', () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'ucm-census-'));
    mkdirSync(join(workspaceRoot, 'ui-core-micha', 'src'), { recursive: true });

    const result = runCensus(workspaceRoot);
    expect(result.apps.find((a) => a.app === 'ui-core-micha')).toBeUndefined();
  });
});
