#!/usr/bin/env node
// UCM-CHART-14: a parser, not a grep. This is the whole point of this file -- five wrong consumer
// counts in this series (see work-orders/UCM-CHART-14.md) all came from a grep pattern that could
// not see JSX structure: a prop several lines below the component name, an arrow function's `=>`
// inside a prop value, an apostrophe inside a comment, a `>` inside a nested `{}` expression. A
// regex line-match cannot tell any of those apart from the thing it's looking for. This script
// tracks string/template/comment/regex-literal state and brace depth in ONE continuous pass over
// each file, so its answer is reproducible output, not a claim someone has to trust.
//
// Second review round (both `reviewer` and `ui_reviewer`, independently) found the first version's
// three-pass design (a raw `RegExp.exec` tag-open search, oblivious to string/comment context, then
// a per-tag bounds scan, then a per-tag attribute scan) could itself produce a WRONG, non-UNPARSED
// answer -- worse than an honest UNPARSED, because nothing flags it: JSX-looking text inside a
// string or comment counted as a real element, and a regex literal's `}`/`>` characters (e.g.
// `data={/[}>]/}`) corrupted brace-depth tracking and closed a tag early. Both are fixed here by
// giving every stage the SAME shared state, tracked once, forward, per file.
//
// Dev script only -- never imported by the published package (kept out of package.json's `files`/
// `exports`), never writes anything, and degrades to "not present" for a missing/frontend-less
// sibling repo rather than throwing.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The five props this WO's series has spent five work orders removing/relocating -- what a census
// exists to count is exactly "who still passes one of these".
export const TARGET_PROPS = ['aspect', 'height', 'minHeight', 'margin', 'xAxisAngle'];
export const TARGET_COMPONENTS = ['BarChart', 'LineChart', 'ScatterChart', 'TimeSeriesChart', 'ChartFrame'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build', '.git']);
const PACKAGE_SPECIFIER = '@micha.bigler/ui-core-micha';

/**
 * Finds every `import { ... } from '@micha.bigler/ui-core-micha'` in `source` and returns a map
 * of LOCAL name -> CANONICAL export name, restricted to `TARGET_COMPONENTS`. Import declarations
 * are a much simpler grammar than JSX (no nested arbitrary expressions in the specifier list), so
 * a regex is appropriate here -- unlike the JSX scan below, which is not.
 */
function findImportedLocalNames(source) {
  const localToCanonical = new Map();
  const importRe = /import\s*\{([^}]*)\}\s*from\s*['"]@micha\.bigler\/ui-core-micha['"]/g;
  let match;
  while ((match = importRe.exec(source)) !== null) {
    const specifiers = match[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const spec of specifiers) {
      const asMatch = spec.match(/^(\w+)\s+as\s+(\w+)$/);
      const canonical = asMatch ? asMatch[1] : spec;
      const local = asMatch ? asMatch[2] : spec;
      if (TARGET_COMPONENTS.includes(canonical)) localToCanonical.set(local, canonical);
    }
  }
  return localToCanonical;
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (source[i] === '\n') line += 1;
  return line;
}

const IDENT_START = /[A-Za-z_$]/;
const IDENT_CHAR = /[A-Za-z0-9_$]/;
// Regex-literal-start heuristic: a `/` is treated as opening a regex literal (not division) only
// when the last significant character before it is one of these -- the common "a regex can only
// start where a VALUE is expected, not follow one" rule real JS tokenizers use. Not a full parser;
// documented, and sufficient for `data={/[}>]/}`-shaped prop values, the concrete case found in
// review. A `/` following an identifier/number/`)`/`]` is treated as division and left alone.
//
// Regression found DURING this same fix's own verification run (before it ever reached review):
// `<` and `>` were originally in this set on the theory that `/` can start a regex right after a
// comparison operator -- but `<`/`>` are also exactly what precede the `/` in EVERY JSX closing
// tag (`</Something>`) and self-closing tag (`Something />`). With them included, `</ChartFrame>`
// itself was misread as a regex-literal start, consuming everything up to the next stray `/` in
// the file and corrupting brace depth for the rest of the scan -- turning every multi-line
// ChartFrame usage in the estate into a false UNPARSED. A `/` genuinely starting a regex right
// after `<`/`>` (e.g. `a < /regex/.test(b)`) does not occur in practice in this codebase; dropped.
const REGEX_PRECEDING_CHARS = new Set(['(', '{', '[', ',', ';', ':', '=', '&', '|', '!', '?', '+', '-', '*', '%', '^', '~']);

/**
 * Extracts top-level (tag-depth-0, RELATIVE TO `tagSource`) attribute names from `tagSource` (a
 * full, already-correctly-bounded `<Name ...>` span). Shares the same string/template/comment/
 * regex tracking as the outer scanner, so a prop value containing a regex literal, a nested
 * object, or a comment can never be mistaken for a top-level attribute name -- `sx={{ aspect: 1
 * }}` never reports a false `aspect` (an object key inside an expression, not a JSX attribute),
 * and `data={/[}>]/}` never corrupts this function's own depth count either.
 */
function extractTopLevelAttributeNames(tagSource) {
  const found = new Set();
  let depth = 0;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  let inRegex = false;
  let inRegexClass = false;
  let lastSignificant = null;

  for (let i = 0; i < tagSource.length; i += 1) {
    const c = tagSource[i];
    const next = tagSource[i + 1];

    if (inLineComment) { if (c === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (c === '*' && next === '/') { inBlockComment = false; i += 1; } continue; }
    if (inRegex) {
      if (c === '\\') { i += 1; continue; }
      if (c === '[') { inRegexClass = true; continue; }
      if (c === ']') { inRegexClass = false; continue; }
      if (c === '/' && !inRegexClass) {
        inRegex = false;
        let j = i + 1;
        while (j < tagSource.length && /[a-z]/i.test(tagSource[j])) j += 1;
        i = j - 1;
      }
      continue;
    }
    if (inString) {
      if (c === '\\') { i += 1; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '/' && next === '/') { inLineComment = true; i += 1; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i += 1; continue; }
    if (c === '/' && (lastSignificant === null || REGEX_PRECEDING_CHARS.has(lastSignificant))) {
      inRegex = true; inRegexClass = false; lastSignificant = '/'; continue;
    }
    if (c === '"' || c === "'" || c === '`') { inString = c; lastSignificant = c; continue; }
    if (c === '{') { depth += 1; lastSignificant = c; continue; }
    if (c === '}') { depth = Math.max(0, depth - 1); lastSignificant = c; continue; }

    if (depth === 0 && IDENT_START.test(c) && (i === 0 || !IDENT_CHAR.test(tagSource[i - 1]))) {
      let j = i + 1;
      while (j < tagSource.length && IDENT_CHAR.test(tagSource[j])) j += 1;
      found.add(tagSource.slice(i, j));
      lastSignificant = tagSource[j - 1];
      i = j - 1;
      continue;
    }
    if (!/\s/.test(c)) lastSignificant = c;
  }
  return found;
}

/**
 * The single-pass scanner. Walks `source` exactly ONCE, maintaining ONE shared state for strings,
 * template literals (+ `${}` expression nesting), line/block comments, regex literals, and brace
 * depth -- so tag-open detection and tag-close detection agree on where the real code is, instead
 * of a separate context-blind pass for each. A `<Name` is only recognised as a real JSX tag open
 * when the scanner is not currently inside a string/comment/regex, which is what stops `// <BarChart
 * aspect />` or `"<BarChart aspect />"` from being counted. Multiple target tags can be pending at
 * once (a component nested inside another's own prop expression, e.g. `<ChartFrame content={<>
 * <BarChart aspect /></>} />`) -- each is closed independently, at the exact brace depth it opened
 * at, so a nested tag closing does not consume or corrupt the outer tag's own remaining scan.
 *
 * A tag still open when the file ends is reported UNPARSED, never dropped (Definition of Done).
 */
function scanForComponents(source, localToCanonical) {
  const results = [];
  const openTags = []; // { canonical, tagStart, closeAtDepth, line }
  const localNames = [...localToCanonical.keys()];

  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  let inRegex = false;
  let inRegexClass = false;
  let depth = 0;
  const templateDepthStack = [];
  let lastSignificant = null;

  const closePendingAtCurrentDepth = (closeIndex) => {
    for (let k = openTags.length - 1; k >= 0; k -= 1) {
      if (openTags[k].closeAtDepth === depth) {
        const tag = openTags.splice(k, 1)[0];
        const tagSource = source.slice(tag.tagStart, closeIndex + 1);
        const attrNames = extractTopLevelAttributeNames(tagSource);
        const props = {};
        for (const prop of TARGET_PROPS) props[prop] = attrNames.has(prop);
        results.push({ component: tag.canonical, line: tag.line, unparsed: false, props });
      }
    }
  };

  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    const next = source[i + 1];

    if (inLineComment) { if (c === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (c === '*' && next === '/') { inBlockComment = false; i += 1; } continue; }
    if (inRegex) {
      if (c === '\\') { i += 1; continue; }
      if (c === '[') { inRegexClass = true; continue; }
      if (c === ']') { inRegexClass = false; continue; }
      if (c === '/' && !inRegexClass) {
        inRegex = false;
        let j = i + 1;
        while (j < source.length && /[a-z]/i.test(source[j])) j += 1;
        i = j - 1;
      }
      continue;
    }
    if (inString) {
      if (c === '\\') { i += 1; continue; }
      if (inString === '`' && c === '$' && next === '{') {
        templateDepthStack.push(depth);
        depth += 1;
        i += 1;
        inString = null;
        lastSignificant = '{';
        continue;
      }
      if (c === inString) inString = null;
      continue;
    }

    if (c === '/' && next === '/') { inLineComment = true; i += 1; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i += 1; continue; }
    if (c === '/' && (lastSignificant === null || REGEX_PRECEDING_CHARS.has(lastSignificant))) {
      inRegex = true; inRegexClass = false; lastSignificant = '/'; continue;
    }
    if (c === '"' || c === "'" || c === '`') { inString = c; lastSignificant = c; continue; }

    if (c === '{') { depth += 1; lastSignificant = c; continue; }
    if (c === '}') {
      if (templateDepthStack.length && depth - 1 === templateDepthStack[templateDepthStack.length - 1]) {
        templateDepthStack.pop();
        depth -= 1;
        inString = '`';
        lastSignificant = '}';
        continue;
      }
      depth = Math.max(0, depth - 1);
      lastSignificant = c;
      continue;
    }

    if (c === '<') {
      let matchedName = null;
      for (const name of localNames) {
        if (source.startsWith(name, i + 1)) {
          const after = source[i + 1 + name.length];
          if (after === undefined || /[\s/>]/.test(after)) { matchedName = name; break; }
        }
      }
      if (matchedName) {
        openTags.push({
          canonical: localToCanonical.get(matchedName),
          tagStart: i,
          closeAtDepth: depth,
          line: lineNumberAt(source, i),
        });
        i += matchedName.length;
        lastSignificant = matchedName[matchedName.length - 1];
        continue;
      }
      lastSignificant = c;
      continue;
    }

    if (c === '>') {
      closePendingAtCurrentDepth(i);
      lastSignificant = c;
      continue;
    }

    if (!/\s/.test(c)) lastSignificant = c;
  }

  for (const tag of openTags) {
    results.push({ component: tag.canonical, line: tag.line, unparsed: true, props: {} });
  }
  return results;
}

/**
 * The pure analysis function -- no filesystem access, so this is what the fixture tests below
 * exercise directly. Returns one entry per JSX element found whose tag name resolves (via the
 * file's own imports) to one of `TARGET_COMPONENTS`.
 *
 * Documented, accepted heuristic limitation (unchanged from the first version, not solved by the
 * single-pass rewrite): `<` is only ever treated as a JSX tag open, never as a less-than
 * comparison against an uppercase-starting identifier (`foo < BarChart`). Real component
 * references are never used in a numeric/relational comparison in practice, so this is judged a
 * theoretical gap, not a practical one -- unlike the string/comment/regex-literal blindness fixed
 * above, which were concrete, plausible false positives.
 */
export function findChartApiUsage(source) {
  const localToCanonical = findImportedLocalNames(source);
  if (localToCanonical.size === 0) return [];
  return scanForComponents(source, localToCanonical);
}

function walkSourceFiles(rootDir) {
  const files = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const dot = entry.name.lastIndexOf('.');
        if (dot === -1) continue;
        if (SOURCE_EXTENSIONS.has(entry.name.slice(dot))) files.push(full);
      }
    }
  }
  walk(rootDir);
  return files;
}

/**
 * Locates an app's frontend source root: `frontend/src` first (this estate's usual layout), then
 * a bare `src/` fallback. Returns `null` (never throws) if neither exists -- a repo with no
 * frontend, or absent entirely, is reported as "not present", not an error.
 */
function findAppSourceRoot(appDir) {
  const candidates = [join(appDir, 'frontend', 'src'), join(appDir, 'src')];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
  }
  return null;
}

export function runCensus(workspaceRoot, { excludeDirs = ['ui-core-micha'] } = {}) {
  let appNames;
  try {
    appNames = readdirSync(workspaceRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !excludeDirs.includes(e.name))
      .map((e) => e.name);
  } catch (err) {
    return { workspaceRoot, apps: [], error: `workspace root unreadable: ${err.message}` };
  }

  const apps = appNames.map((appName) => {
    const appDir = join(workspaceRoot, appName);
    const sourceRoot = findAppSourceRoot(appDir);
    if (!sourceRoot) return { app: appName, present: false, entries: [] };

    const entries = [];
    for (const file of walkSourceFiles(sourceRoot)) {
      let source;
      try {
        source = readFileSync(file, 'utf8');
      } catch {
        continue; // unreadable file (permissions, symlink race) -- not a parse failure, skip quietly
      }
      if (!source.includes(PACKAGE_SPECIFIER)) continue; // fast path: no ucm import at all
      const usages = findChartApiUsage(source);
      for (const usage of usages) {
        entries.push({ ...usage, file: relative(workspaceRoot, file).replace(/\\/g, '/') });
      }
    }
    return { app: appName, present: true, entries };
  });

  return { workspaceRoot, apps };
}

/**
 * Reports EVERY element found (Definition of Done: "every `<ChartFrame>` and every ucm chart
 * preset element"), not just the ones carrying a target prop -- a clean element is printed as
 * `(clean)`, not omitted, so "this app has zero matching elements at all" and "this app has
 * elements, all clean" stay visibly distinct instead of looking identical.
 */
function formatReport(result) {
  const lines = [];
  let totalUnparsed = 0;
  for (const { app, present, entries } of result.apps) {
    if (!present) { lines.push(`${app}: not present (no frontend/src or src)`); continue; }
    if (entries.length === 0) continue;
    lines.push(`${app}:`);
    for (const entry of entries) {
      if (entry.unparsed) {
        totalUnparsed += 1;
        lines.push(`  UNPARSED  ${entry.file}:${entry.line}  <${entry.component}>  -- could not close this tag, not counted as clean`);
        continue;
      }
      const activeProps = TARGET_PROPS.filter((p) => entry.props[p]);
      const propsText = activeProps.length > 0 ? activeProps.join(' ') : '(clean)';
      lines.push(`  ${entry.file}:${entry.line}  <${entry.component} ${propsText}>`);
    }
  }
  if (totalUnparsed > 0) {
    lines.push('');
    lines.push(`${totalUnparsed} tag(s) could not be parsed -- see UNPARSED lines above. Not counted as clean.`);
  }
  return lines.join('\n');
}

// `pathToFileURL` (not manual string-building) is what makes this comparison correct on Windows,
// where a bare `file://${path}` is missing the extra slash before the drive letter that
// `import.meta.url` actually has (`file:///C:/...`) -- a naive comparison silently never matches,
// so `node scripts/chart-api-census.mjs` would run to completion with zero output and no error.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const workspaceRoot = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const result = runCensus(workspaceRoot);
  // eslint-disable-next-line no-console
  console.log(formatReport(result));
}
