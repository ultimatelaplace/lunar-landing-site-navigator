// Compares the browser formulas with the Python results stored in docs/data/sites.json.
import { readFileSync } from "node:fs";
import { series, metrics } from "../../docs/js/physics.js";

const dir = new URL("../../docs/data/", import.meta.url);
const meta = JSON.parse(readFileSync(new URL("meta.json", dir)));
const sites = JSON.parse(readFileSync(new URL("sites.json", dir)));
const raw = readFileSync(new URL("bodies.bin", dir));
const bodies = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const stepH = meta.step_s / 3600;
const yearStart = { 2027: 0, 2028: 365 * 144 };
const yearEnd = { 2027: 365 * 144, 2028: meta.count };

let worst = { sun: 0, flatSun: 0, earth: 0, dark: 0, gap: 0 };
for (const s of sites) {
  const ser = series(bodies, meta.count, s.horizon, s.lat, s.lon, s.ground_m, meta.observer_height_m);
  for (const y of ["2027", "2028"]) {
    const m = metrics(ser, yearStart[y], yearEnd[y], stepH);
    const e = s.expected[y];
    worst.sun = Math.max(worst.sun, Math.abs(m.sunShare - e.sun_share));
    worst.flatSun = Math.max(worst.flatSun, Math.abs(m.flatSunShare - e.flat_sun_share));
    worst.earth = Math.max(worst.earth, Math.abs(m.earthShare - e.earth_share));
    worst.dark = Math.max(worst.dark, Math.abs(m.longestDarkH - e.longest_dark_h));
    worst.gap = Math.max(worst.gap, Math.abs(m.longestEarthGapH - e.longest_earth_gap_h));
  }
}
console.log("largest differences:", JSON.stringify(worst));
const ok = worst.sun < 1e-3 && worst.flatSun < 1e-3 && worst.earth < 1e-3 && worst.dark <= stepH + 1e-9 && worst.gap <= stepH + 1e-9;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
