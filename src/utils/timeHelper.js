/**
 * Helper utilities for music time formatting and parsing
 */

/**
 * Formats seconds into HH:MM:SS or MM:SS string
 * @param {number} seconds
 * @returns {string}
 */
function formatSeconds(seconds) {
  const s = Math.floor(seconds || 0);
  const m = Math.floor(s / 60);
  const remainingSecs = s % 60;
  if (m < 60) {
    return `${String(m).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  }
  const h = Math.floor(m / 60);
  const remainingMins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(remainingMins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
}

/**
 * Parses a time string (e.g. "90", "1:30", "01:25:00") into total seconds
 * @param {string|number} input
 * @returns {number|null}
 */
function parseTimeToSeconds(input) {
  if (input === undefined || input === null) return null;
  const str = String(input).trim();
  if (!str) return null;

  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  const parts = str.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.some((p) => isNaN(p) || p < 0)) return null;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

module.exports = {
  formatSeconds,
  parseTimeToSeconds
};
