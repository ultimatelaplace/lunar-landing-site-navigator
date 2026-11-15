// Same formulas as pipeline/ephemeris.py and pipeline/visibility.py, checked by tests/js.
export const MOON_RADIUS_M = 1737400;
export const SUN_RADIUS_M = 695700000;
export const EARTH_RADIUS_M = 6378137;
const STRIPS = 21;
const DEG = Math.PI / 180;

export function siteFrame(latDeg, lonDeg, heightM) {
  const lat = latDeg * DEG, lon = lonDeg * DEG;
  const up = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  const east = [-Math.sin(lon), Math.cos(lon), 0];
  const north = [
    up[1] * east[2] - up[2] * east[1],
    up[2] * east[0] - up[0] * east[2],
    up[0] * east[1] - up[1] * east[0],
  ];
  const r = MOON_RADIUS_M + heightM;
  return { position: up.map((u) => u * r), east, north, up };
}

export function horizonAt(profile, azDeg) {
  const a = ((azDeg % 360) + 360) % 360;
  const i = Math.floor(a), f = a - i;
  return (1 - f) * profile[i % 360] + f * profile[(i + 1) % 360];
}

function strip(k, radiusDeg) {
  const u = ((k + 0.5) / STRIPS) * 2 - 1;
  const offset = radiusDeg * u;
  return [offset, Math.sqrt(Math.max(radiusDeg * radiusDeg - offset * offset, 0))];
}

export function visibleFraction(profile, azDeg, elDeg, radiusDeg) {
  let seen = 0, total = 0;
  const stretch = 1 / Math.cos(elDeg * DEG);
  for (let k = 0; k < STRIPS; k++) {
    const [offset, half] = strip(k, radiusDeg);
    const h = horizonAt(profile, azDeg + offset * stretch);
    seen += Math.min(Math.max(elDeg + half - h, 0), 2 * half);
    total += 2 * half;
  }
  return seen / Math.max(total, 1e-12);
}

export function wholeDiskVisible(profile, azDeg, elDeg, radiusDeg) {
  if (elDeg - radiusDeg < horizonAt(profile, azDeg)) return false;
  const stretch = 1 / Math.cos(elDeg * DEG);
  for (let k = 0; k < STRIPS; k++) {
    const [offset, half] = strip(k, radiusDeg);
    if (elDeg - half < horizonAt(profile, azDeg + offset * stretch)) return false;
  }
  return true;
}

function look(frame, x, y, z) {
  const vx = x - frame.position[0], vy = y - frame.position[1], vz = z - frame.position[2];
  const dist = Math.hypot(vx, vy, vz);
  const e = (vx * frame.east[0] + vy * frame.east[1] + vz * frame.east[2]) / dist;
  const n = (vx * frame.north[0] + vy * frame.north[1] + vz * frame.north[2]) / dist;
  const u = (vx * frame.up[0] + vy * frame.up[1] + vz * frame.up[2]) / dist;
  const az = ((Math.atan2(e, n) / DEG) % 360 + 360) % 360;
  return [az, Math.asin(Math.min(Math.max(u, -1), 1)) / DEG, dist];
}

// bodies: Float32Array, 6 values per time step (Sun xyz, Earth xyz) in meters from the Moon's center.
// Steps [from, to) are filled; the arrays still cover all count steps so indexes stay global.
export function series(bodies, count, profile, latDeg, lonDeg, groundM, observerM, from = 0, to = count) {
  const frame = siteFrame(latDeg, lonDeg, groundM + observerM);
  const flat = new Array(360).fill(-Math.acos(MOON_RADIUS_M / (MOON_RADIUS_M + observerM)) / DEG);
  const out = {
    sun: new Float32Array(count), sunFlat: new Float32Array(count), earth: new Uint8Array(count), earthFlat: new Uint8Array(count),
    sunAz: new Float32Array(count), sunEl: new Float32Array(count),
    earthAz: new Float32Array(count), earthEl: new Float32Array(count),
  };
  for (let t = from; t < to; t++) {
    const b = t * 6;
    const [sa, se, sd] = look(frame, bodies[b], bodies[b + 1], bodies[b + 2]);
    const [ea, ee, ed] = look(frame, bodies[b + 3], bodies[b + 4], bodies[b + 5]);
    const sr = Math.asin(SUN_RADIUS_M / sd) / DEG;
    const er = Math.asin(EARTH_RADIUS_M / ed) / DEG;
    out.sun[t] = visibleFraction(profile, sa, se, sr);
    out.sunFlat[t] = visibleFraction(flat, sa, se, sr);
    out.earth[t] = wholeDiskVisible(profile, ea, ee, er) ? 1 : 0;
    out.earthFlat[t] = wholeDiskVisible(flat, ea, ee, er) ? 1 : 0;
    out.sunAz[t] = sa; out.sunEl[t] = se; out.earthAz[t] = ea; out.earthEl[t] = ee;
  }
  return out;
}

function longestRun(test, from, to) {
  let best = 0, run = 0;
  for (let t = from; t < to; t++) {
    run = test(t) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

// Metrics over time steps [from, to); stepHours is the length of one step.
export function metrics(s, from, to, stepHours) {
  let sun = 0, flat = 0, earth = 0;
  for (let t = from; t < to; t++) { sun += s.sun[t]; flat += s.sunFlat[t]; earth += s.earth[t]; }
  const n = to - from;
  return {
    sunShare: sun / n,
    flatSunShare: flat / n,
    longestDarkH: longestRun((t) => s.sun[t] === 0, from, to) * stepHours,
    earthShare: earth / n,
    longestEarthGapH: longestRun((t) => s.earth[t] === 0, from, to) * stepHours,
  };
}
