// Short, granularity-aware x-axis tick labels.
//
// Not a style choice -- MUI X-Charts has a known, unfixed bug (mui-x#18768,
// duplicate of #18399): when the measured space for a tick label gets
// tight, its ellipsize() logic doesn't truncate the text, it collapses it
// to an empty string (the <tspan> stays in the DOM with no content). It
// only reproduces with long label text ("08/05, 10:00 AM"-style, ~16
// characters) combined with this app's actual font metrics (DM Sans) --
// short labels like "05.08." or "10:00" leave enough margin that the bug
// never triggers. Same fix already proven in jg-ferien's ActivitySection.

// `locale` defaults to "de-CH" only as a fallback for callers that don't
// pass the app's active i18n language (found in review: an earlier version
// hardcoded "de-CH" always, showing German month names to en/fr users).

export function formatShortTime(date, locale = 'de-CH') {
  // hour12 forced false regardless of locale -- an English 12-hour label
  // ("10:00 AM") is exactly the longer style that triggered the original
  // collapse bug; staying short is the point, not locale fidelity here.
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatShortDate(date, locale = 'de-CH') {
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

export function formatShortMonth(date, locale = 'de-CH') {
  return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

// "All" spans years -- day/month labels repeat (e.g. every "01.04." shows up
// once per year) and read as meaningless noise; a bare year number is the
// only granularity dense multi-year history can show cleanly.
export function formatShortYear(date, locale = 'de-CH') {
  return date.toLocaleDateString(locale, { year: 'numeric' });
}
