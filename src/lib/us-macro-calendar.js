/**
 * High-impact US macro dates curated from official schedules.
 * FOMC: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 * CPI: BLS release calendar (Consumer Price Index, typically 8:30 AM ET).
 */

const FOMC_DECISION_DAYS_2026 = [
  { date: "2026-01-28", summaryProjections: false },
  { date: "2026-03-18", summaryProjections: true },
  { date: "2026-04-29", summaryProjections: false },
  { date: "2026-06-17", summaryProjections: true },
  { date: "2026-07-29", summaryProjections: false },
  { date: "2026-09-16", summaryProjections: true },
  { date: "2026-10-28", summaryProjections: false },
  { date: "2026-12-09", summaryProjections: true },
];

/** BLS CPI news releases (data refer to prior month). */
const CPI_RELEASES_2026 = [
  { date: "2026-01-13", forPeriod: "Dec 2025" },
  { date: "2026-02-13", forPeriod: "Jan 2026" },
  { date: "2026-03-11", forPeriod: "Feb 2026" },
  { date: "2026-04-10", forPeriod: "Mar 2026" },
  { date: "2026-05-12", forPeriod: "Apr 2026" },
  { date: "2026-06-10", forPeriod: "May 2026" },
  { date: "2026-07-14", forPeriod: "Jun 2026" },
  { date: "2026-08-12", forPeriod: "Jul 2026" },
  { date: "2026-09-11", forPeriod: "Aug 2026" },
  { date: "2026-10-14", forPeriod: "Sep 2026" },
  { date: "2026-11-10", forPeriod: "Oct 2026" },
  { date: "2026-12-10", forPeriod: "Nov 2026" },
];

/**
 * @param {string} fromIso YYYY-MM-DD
 * @param {string} toIso YYYY-MM-DD
 * @returns {Array<{ kind: string, date: string, title: string, detail: string, impact: string, dayOrder: number }>}
 */
export function getMacroEventsBetween(fromIso, toIso) {
  const out = [];

  for (const row of FOMC_DECISION_DAYS_2026) {
    if (row.date < fromIso || row.date > toIso) continue;
    out.push({
      kind: "fomc",
      date: row.date,
      title: "FOMC decision",
      detail: row.summaryProjections
        ? "Statement, projections & press conference"
        : "Statement & press conference",
      impact: "high",
      /** Earlier macro: CPI 8:30a before FOMC ~2p when stacking same day (rare). */
      dayOrder: 1,
    });
  }

  for (const row of CPI_RELEASES_2026) {
    if (row.date < fromIso || row.date > toIso) continue;
    out.push({
      kind: "cpi",
      date: row.date,
      title: "CPI release",
      detail: `8:30 AM ET · ${row.forPeriod} data`,
      impact: "high",
      dayOrder: 0,
    });
  }

  out.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.dayOrder - b.dayOrder;
  });

  return out;
}
