/** US equities session helpers (NYSE regular 9:30–16:00 ET; extended approx. to 20:00 ET). */

export const US_EASTERN_TZ = "America/New_York";

/**
 * @param {number} ms
 * @param {{ timeZone?: string }} [opts]
 */
export function formatClockInZone(ms, opts = {}) {
  const { timeZone = US_EASTERN_TZ } = opts;
  return new Date(ms).toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * @param {number} ms
 * @returns {{ market: string, earlyHours: boolean, afterHours: boolean }}
 */
export function inferSessionFromWallClock(ms) {
  const d = new Date(ms);
  const w = d.toLocaleDateString("en-US", {
    timeZone: US_EASTERN_TZ,
    weekday: "short",
  });
  if (w === "Sat" || w === "Sun") {
    return { market: "closed", earlyHours: false, afterHours: false };
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: US_EASTERN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = +parts.find((p) => p.type === "hour").value;
  const minute = +parts.find((p) => p.type === "minute").value;
  const mins = hour * 60 + minute;

  if (mins >= 9 * 60 + 30 && mins < 16 * 60) {
    return { market: "open", earlyHours: false, afterHours: false };
  }
  if (mins >= 16 * 60 && mins < 20 * 60) {
    return { market: "extended-hours", earlyHours: false, afterHours: true };
  }
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) {
    return { market: "extended-hours", earlyHours: true, afterHours: false };
  }
  return { market: "closed", earlyHours: false, afterHours: false };
}

function etWeekdayShort(ms) {
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: US_EASTERN_TZ,
    weekday: "short",
  });
}

function etHourMinute(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: US_EASTERN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  return {
    h: +parts.find((p) => p.type === "hour").value,
    m: +parts.find((p) => p.type === "minute").value,
  };
}

/**
 * Next weekday minute matching hour:minute in America/New_York, strictly after afterMs.
 * @param {number} afterMs
 * @param {number} hour
 * @param {number} minute
 * @returns {number | null}
 */
export function findNextWallTime(afterMs, hour, minute) {
  let t = Math.floor(afterMs / 60000) * 60000 + 60000;
  const end = afterMs + 8 * 86400000;
  while (t < end) {
    const w = etWeekdayShort(t);
    if (w === "Sat" || w === "Sun") {
      t += 86400000;
      continue;
    }
    const { h, m } = etHourMinute(t);
    if (h === hour && m === minute) return t;
    t += 60000;
  }
  return null;
}

/**
 * @param {{ market: string | null, earlyHours?: boolean, afterHours?: boolean }} session
 * @param {number} nowMs
 * @returns {{ targetMs: number | null, countdownLabel: string }}
 */
export function getCountdownTarget(session, nowMs) {
  const market = session.market ?? "closed";
  const earlyHours = !!session.earlyHours;
  const afterHours = !!session.afterHours;

  if (market === "open") {
    const targetMs = findNextWallTime(nowMs, 16, 0);
    return { targetMs, countdownLabel: "Closes in" };
  }

  if (market === "extended-hours") {
    if (earlyHours) {
      const targetMs = findNextWallTime(nowMs, 9, 30);
      return { targetMs, countdownLabel: "Regular session in" };
    }
    if (afterHours) {
      const targetMs = findNextWallTime(nowMs, 20, 0);
      return { targetMs, countdownLabel: "After-hours ends in" };
    }
    const targetMs = findNextWallTime(nowMs, 9, 30);
    return { targetMs, countdownLabel: "Opens in" };
  }

  const targetMs = findNextWallTime(nowMs, 9, 30);
  return { targetMs, countdownLabel: "Opens in" };
}

/**
 * @param {number} ms
 * @returns {string | null}
 */
export function formatCountdown(ms) {
  if (ms == null || ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const hr = h % 24;
    return `${d}d ${hr}h ${m}m`;
  }
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
