/** FlyAI returns China local timestamps without an offset. Never normalize invalid dates. */
export function chinaIso(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const local = value.replace(' ', 'T');
  const calendar = new Date(`${local}Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 19) !== local) return null;
  return `${local}+08:00`;
}

export function validSegmentTimeline(segments: unknown): segments is Array<Record<string, unknown>> {
  if (!Array.isArray(segments) || segments.length === 0) return false;
  let precedingArrival = -Infinity;
  for (const segment of segments) {
    if (!segment || typeof segment !== 'object' || Array.isArray(segment)) return false;
    const departure = chinaIso(segment.depDateTime);
    const arrival = chinaIso(segment.arrDateTime);
    if (!departure || !arrival) return false;
    const depTime = Date.parse(departure);
    const arrTime = Date.parse(arrival);
    if (arrTime <= depTime || depTime < precedingArrival) return false;
    precedingArrival = arrTime;
  }
  return true;
}
