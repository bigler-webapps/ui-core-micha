import { describe, expect, it } from 'vitest';

import {
  formatShortDate,
  formatShortMonth,
  formatShortTime,
  formatShortYear,
} from '../src/components/charts/chartLabels';
import { yearTickInterval } from '../src/components/charts/yearTickInterval';

// 2026-08-05 14:07, a fixed instant so assertions aren't flaky around
// midnight/year boundaries.
const FIXED = new Date(2026, 7, 5, 14, 7, 0);

describe('chart label helpers', () => {
  it('ports fitness-monitor short-label behaviour, including locale fallback and forced 24-hour time', () => {
    expect(formatShortDate(FIXED, 'de-CH')).toBe('05.08.');
    expect(formatShortDate(FIXED, 'de-CH').length).toBeLessThan(10);
    expect(formatShortTime(FIXED, 'de-CH')).toBe('14:07');
    expect(formatShortTime(FIXED, 'en-US')).toBe('14:07');
    expect(formatShortMonth(FIXED, 'de-CH')).toMatch(/26$/);
    expect(formatShortMonth(FIXED, 'de-CH').length).toBeLessThan(10);
    expect(formatShortYear(FIXED, 'de-CH')).toBe('2026');
    expect(formatShortYear(FIXED, 'en-US')).toBe('2026');
    expect(formatShortDate(FIXED, 'en-US')).toBe('08/05');
    expect(formatShortDate(FIXED)).toBe(formatShortDate(FIXED, 'de-CH'));
  });

  it('returns one tick per year and proves dense unfiltered dates produce duplicate year labels', () => {
    const denseDates = [];
    for (let year = 2022; year <= 2025; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        denseDates.push(new Date(year, month, 1));
      }
    }

    const unfilteredLabels = denseDates.map((date) => formatShortYear(date, 'de-CH'));
    expect(new Set(unfilteredLabels).size).toBeLessThan(unfilteredLabels.length);

    const ticks = yearTickInterval(denseDates);
    expect(ticks).toHaveLength(4);
    expect(ticks.every((date) => date.getMonth() === 0 && date.getDate() === 1)).toBe(true);
    expect(ticks.map((date) => formatShortYear(date, 'de-CH'))).toEqual([
      '2022',
      '2023',
      '2024',
      '2025',
    ]);
  });
});
