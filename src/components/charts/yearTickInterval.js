/** Return one January tick for every calendar year represented in dates. */
export function yearTickInterval(dates) {
  const years = new Set(dates.map((date) => date.getFullYear()));
  return [...years]
    .sort((first, second) => first - second)
    .map((year) => new Date(year, 0, 1));
}
