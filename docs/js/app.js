import { series, metrics } from "./physics.js";

const STEPS_PER_DAY = 144;
const WINDOW_DAYS = 30;
const MIN_EARTH_SHARE = 0.30;
const DARKNESS_TIE_HOURS = 24;
const YEARS = { 2027: [0, 365 * STEPS_PER_DAY], 2028: [365 * STEPS_PER_DAY, 731 * STEPS_PER_DAY] };

const $ = (id) => document.getElementById(id);
const state = { year: 2027, mode: "terrain", day: 0, time: 72, playing: null };
let meta, sites, bodies, stepH, grid = null;

async function load() {
  const [m, s, b] = await Promise.all([
    fetch("data/meta.json").then((r) => r.json()),
    fetch("data/sites.json").then((r) => r.json()),
    fetch("data/bodies.bin").then((r) => r.arrayBuffer()),
  ]);
  meta = m; sites = s; bodies = new Float32Array(b);
  stepH = meta.step_s / 3600;
  const select = $("site");
  for (const site of sites) select.add(new Option(`${site.name} (${fmtLat(site.lat)}, ${fmtLon(site.lon)})`, site.id));
  select.addEventListener("change", () => choose(sites.find((x) => x.id === select.value)));
  wire();
  choose(sites[0]);
}

const fmtLat = (v) => `${Math.abs(v).toFixed(3)}°S`;
const fmtLon = (v) => `${(((v % 360) + 360) % 360).toFixed(2)}°E`;
const fmtH = (h) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h.toFixed(1)} h`);
const pct = (x) => `${(100 * x).toFixed(1)}%`;

function choose(site) {
  state.site = site;
  state.series = series(bodies, meta.count, site.horizon, site.lat, site.lon, site.ground_m, meta.observer_height_m);
  $("site-source").textContent = `Source: ${site.source}.` + (site.note ? ` ${site.note}` : "");
  $("alt-out").innerHTML = "";
  refreshYear();
}

function yearRange() { return YEARS[state.year]; }

function refreshYear() {
  const [from, to] = yearRange();
  const days = (to - from) / STEPS_PER_DAY;
  $("day").max = days - 1;
  state.day = Math.min(state.day, days - 1);
  const m = metrics(state.series, from, to, stepH);
  const lost = m.flatSunShare > 0 ? 1 - m.sunShare / m.flatSunShare : 0;
  $("m-lost").textContent = lost >= 0 ? pct(lost) : `+${pct(-lost)}`;
  $("m-lost-label").textContent = lost >= 0 ? "sunlight lost to terrain per year" : "more sunlight than on flat ground: this high place sees past the flat horizon";
  $("m-sunh").textContent = `${Math.round(m.sunShare * days * 24)} h (${pct(m.sunShare)})`;
  $("m-dark").textContent = fmtH(m.longestDarkH);
  $("m-earth").textContent = pct(m.earthShare);
  $("m-gap").textContent = fmtH(m.longestEarthGapH);
  state.window = suggestWindow(from, to);
  drawYear();
  drawMonth();
  refreshMoment();
}

// The 30-day window with the most sunlight in which Earth is in view at least 30% of the time.
function suggestWindow(from, to) {
  const s = state.series, len = WINDOW_DAYS * STEPS_PER_DAY;
  const sunSum = new Float64Array(to - from + 1), earthSum = new Float64Array(to - from + 1);
  for (let t = from; t < to; t++) {
    sunSum[t - from + 1] = sunSum[t - from] + s.sun[t];
    earthSum[t - from + 1] = earthSum[t - from] + s.earth[t];
  }
  let best = null;
  for (let start = 0; start + len <= to - from; start += STEPS_PER_DAY) {
    const sun = (sunSum[start + len] - sunSum[start]) / len;
    const earth = (earthSum[start + len] - earthSum[start]) / len;
    const ok = earth >= MIN_EARTH_SHARE;
    if (!best || (ok && !best.ok) || (ok === best.ok && sun > best.sun)) best = { start: from + start, sun, earth, ok };
  }
  return { start: best.start, end: best.start + len, ok: best.ok };
}

function utcOf(step) { return new Date((meta.start_unix + step * meta.step_s) * 1000); }

function color(f, blockedPart) {
  if (blockedPart > 0) return [200, 70, 60];
  const k = Math.max(0, Math.min(1, f));
  return [15 + k * (242 - 15), 23 + k * (201 - 23), 36 + k * (76 - 36)];
}

function cellColor(t) {
  const s = state.series;
  if (state.mode === "flat") return color(s.sunFlat[t], 0);
  if (state.mode === "blocked") return color(s.sun[t], s.sunFlat[t] - s.sun[t] > 0.001 ? 1 : 0);
  return color(s.sun[t], 0);
}

function paintDays(canvas, firstStep, days) {
  const w = days * 4, h = 288;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let d = 0; d < days; d++) {
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      const [r, g, b] = cellColor(firstStep + d * STEPS_PER_DAY + k);
      for (let dx = 0; dx < 4; dx++) for (let dy = 0; dy < 2; dy++) {
        const p = ((k * 2 + dy) * w + d * 4 + dx) * 4;
        img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return ctx;
}

function drawYear() {
  const [from, to] = yearRange();
  const ctx = paintDays($("year"), from, (to - from) / STEPS_PER_DAY);
  const w = state.window;
  ctx.strokeStyle = "#2f80ed"; ctx.lineWidth = 2;
  ctx.strokeRect(((w.start - from) / STEPS_PER_DAY) * 4, 1, WINDOW_DAYS * 4, 286);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(state.day * 4 + 2, 0); ctx.lineTo(state.day * 4 + 2, 288); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, state.time * 2 + 1); ctx.lineTo(ctx.canvas.width, state.time * 2 + 1); ctx.stroke();
}

function drawMonth() {
  const w = state.window;
  const canvas = $("month");
  const ctx = paintDays(canvas, w.start, WINDOW_DAYS);
  // scale the 120 px wide month to the canvas: redraw wider by stretching
  const copy = document.createElement("canvas");
  copy.width = canvas.width; copy.height = canvas.height;
  copy.getContext("2d").drawImage(canvas, 0, 0);
  canvas.width = 1440; canvas.height = 312;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(copy, 0, 0, 1440, 288);
  // Earth strip: blue where Earth's whole disk is in view
  const s = state.series, len = WINDOW_DAYS * STEPS_PER_DAY;
  for (let x = 0; x < 1440; x++) {
    const t = w.start + Math.floor((x / 1440) * len);
    c.fillStyle = s.earth[t] ? "#2f80ed" : "#1d2735";
    c.fillRect(x, 292, 1, 20);
  }
  c.fillStyle = "#fff"; c.font = "13px system-ui";
  for (let d = 0; d < WINDOW_DAYS; d += 5) c.fillText(utcOf(w.start + d * STEPS_PER_DAY).toISOString().slice(5, 10), d * 48 + 3, 14);
  const m = metrics(s, w.start, w.end, stepH);
  $("window-out").textContent = `${utcOf(w.start).toISOString().slice(0, 10)} to ${utcOf(w.end).toISOString().slice(0, 10)} · sunlight ${pct(m.sunShare)} · longest darkness ${fmtH(m.longestDarkH)} · Earth in view ${pct(m.earthShare)}` + (w.ok ? "" : " · no 30-day window here keeps Earth in view 30% of the time");
}

function refreshMoment() {
  const [from] = yearRange();
  const t = from + state.day * STEPS_PER_DAY + state.time;
  state.t = t;
  const date = utcOf(t);
  $("day-out").textContent = date.toISOString().slice(0, 10);
  $("time-out").textContent = `${date.toISOString().slice(11, 16)} UTC`;
  const s = state.series, site = state.site;
  const b = t * 6;
  const subSolarLon = Math.atan2(bodies[b + 1], bodies[b]) * 180 / Math.PI;
  const lunarHours = ((12 + (site.lon - subSolarLon) / 15) % 24 + 24) % 24;
  const local = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(date);
  const sunText = s.sun[t] >= 0.999 ? "Sun fully up" : s.sun[t] > 0 ? `Sun ${Math.round(100 * s.sun[t])}% visible` : "Dark";
  const facts = [
    ["Latitude", fmtLat(site.lat)], ["Longitude", fmtLon(site.lon)], ["Ground elevation", `${Math.round(site.ground_m)} m`],
    ["Date (UTC)", date.toISOString().slice(0, 10)], ["UTC", date.toISOString().slice(11, 16)], ["Your local time", local],
    ["Lunar local solar time", `${String(Math.floor(lunarHours)).padStart(2, "0")}:${String(Math.floor((lunarHours % 1) * 60)).padStart(2, "0")} (lunar hours)`],
    ["Sun azimuth", `${s.sunAz[t].toFixed(1)}°`], ["Sun elevation", `${s.sunEl[t].toFixed(2)}°`],
    ["Earth azimuth", `${s.earthAz[t].toFixed(1)}°`], ["Earth elevation", `${s.earthEl[t].toFixed(2)}°`],
  ];
  $("facts").innerHTML = facts.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("") +
    `<div class="status"><small>Status</small><b>${sunText} · ${s.earth[t] ? "Earth in view" : "Earth hidden"}</b></div>`;
  drawYear();
  drawHorizon();
}

function drawHorizon() {
  const canvas = $("horizon"), ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, s = state.series, site = state.site;
  const [from] = yearRange();
  const dayStart = from + state.day * STEPS_PER_DAY;
  const top = Math.max(12, Math.ceil(Math.max(...site.horizon, s.earthEl[state.t] + 2, s.sunEl[state.t] + 2)) + 2);
  const bottom = -6;
  const X = (az) => (az / 360) * W, Y = (el) => H - ((el - bottom) / (top - bottom)) * H;
  ctx.fillStyle = "#0f1724"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#2a3646"; ctx.fillStyle = "#8a96a6"; ctx.font = "13px system-ui";
  for (let az = 0; az <= 360; az += 45) { ctx.beginPath(); ctx.moveTo(X(az), 0); ctx.lineTo(X(az), H); ctx.stroke(); ctx.fillText(`${az}°`, X(az) + 3, H - 6); }
  for (let el = Math.ceil(bottom / 5) * 5; el <= top; el += 5) { ctx.beginPath(); ctx.moveTo(0, Y(el)); ctx.lineTo(W, Y(el)); ctx.stroke(); ctx.fillText(`${el}°`, 3, Y(el) - 3); }
  const profile = state.mode === "flat" ? site.horizon.map(() => 0) : site.horizon;
  ctx.fillStyle = "#5b4636"; ctx.beginPath(); ctx.moveTo(0, H);
  for (let az = 0; az <= 360; az++) ctx.lineTo(X(az), Y(profile[az % 360]));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  const path = (azs, els, colorCss) => {
    ctx.fillStyle = colorCss;
    for (let k = 0; k < STEPS_PER_DAY; k++) ctx.fillRect(X(azs[dayStart + k]) - 1, Y(els[dayStart + k]) - 1, 2, 2);
  };
  path(s.sunAz, s.sunEl, "rgba(242,201,76,0.8)");
  path(s.earthAz, s.earthEl, "rgba(47,128,237,0.7)");
  const disk = (az, el, radiusDeg, fill) => {
    const rx = (radiusDeg / 360) * W, ry = (radiusDeg / (top - bottom)) * H;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(X(az), Y(el), Math.max(rx, 3), Math.max(ry, 3), 0, 0, 2 * Math.PI); ctx.fill();
  };
  disk(s.sunAz[state.t], s.sunEl[state.t], 0.267, "#f2c94c");
  disk(s.earthAz[state.t], s.earthEl[state.t], 0.95, "#2f80ed");
}

async function useOwnCoordinates() {
  const lat = parseFloat($("own-lat").value), lon = ((parseFloat($("own-lon").value) % 360) + 360) % 360;
  if (!(lat <= -84 && lat >= -90)) { $("own-note").textContent = "Please enter a latitude between -84 and -90."; return; }
  $("own-note").textContent = "Loading the grid (about 19 MB, only once)…";
  if (!grid) {
    const [p, h] = await Promise.all([
      fetch("data/grid_points.bin").then((r) => r.arrayBuffer()),
      fetch("data/grid_horizon.bin").then((r) => r.arrayBuffer()),
    ]);
    grid = { points: new Float32Array(p), horizon: new Int16Array(h) };
  }
  const n = grid.points.length / 4;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const d = surfaceDistance(lat, lon, grid.points[i * 4], grid.points[i * 4 + 1]);
    if (d < bestD) { bestD = d; best = i; }
  }
  const site = gridSite(best, "Your coordinates", `Nearest computed point, ${(bestD / 1000).toFixed(2)} km from ${fmtLat(lat)}, ${fmtLon(lon)}`);
  $("own-note").textContent = `Using the nearest computed point, ${(bestD / 1000).toFixed(2)} km away.`;
  choose(site);
}

function gridSite(i, name, source) {
  const scale = meta.horizon_scale, horizon = new Array(360);
  for (let a = 0; a < 360; a++) horizon[a] = grid.horizon[i * 360 + a] / scale;
  return { id: `grid${i}`, name, source, lat: grid.points[i * 4], lon: grid.points[i * 4 + 1], ground_m: grid.points[i * 4 + 2], horizon };
}

function surfaceDistance(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, R = 1737400;
  const c = Math.sin(lat1 * r) * Math.sin(lat2 * r) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return R * Math.acos(Math.min(1, Math.max(-1, c)));
}

// Team rule: nearest places first (50 m to 10 km), same start and end dates; if none qualifies, move the dates.
async function findAlternatives() {
  const out = $("alt-out");
  const site = state.site;
  if (site.ring_offset === undefined) { out.innerHTML = "<p class='small'>Alternatives are prepared for the suggested sites.</p>"; return; }
  out.innerHTML = "<p class='small'>Checking nearby places…</p>";
  await new Promise((r) => setTimeout(r, 20));
  if (!state.rings) state.rings = new Int16Array(await fetch("data/rings.bin").then((r) => r.arrayBuffer()));
  const perSite = meta.ring_distances_m.length * meta.ring_azimuths_deg.length;
  const [yFrom, yTo] = yearRange();
  const len = state.window.end - state.window.start;
  for (let shift = 0; shift < 12; shift++) {
    const from = state.window.start + shift * len, to = from + len;
    if (to > yTo) break;
    const found = [];
    for (let k = 0; k < perSite; k++) {
      const p = meta.ring_points[site.ring_offset + k];
      const horizon = new Array(360);
      for (let a = 0; a < 360; a++) horizon[a] = state.rings[(site.ring_offset + k) * 360 + a] / meta.horizon_scale;
      const s = series(bodies, meta.count, horizon, p.lat, p.lon, p.ground_m, meta.observer_height_m, from, to);
      const m = metrics(s, from, to, stepH);
      if (m.earthShare >= MIN_EARTH_SHARE && m.sunShare > 0) found.push({ p, m });
    }
    if (found.length) {
      found.sort((a, b) => a.p.distance_m - b.p.distance_m
        || (Math.abs(a.m.longestDarkH - b.m.longestDarkH) > DARKNESS_TIE_HOURS ? a.m.longestDarkH - b.m.longestDarkH : b.m.sunShare - a.m.sunShare));
      const rows = found.slice(0, 8).map(({ p, m }) =>
        `<tr><td>${p.distance_m >= 1000 ? (p.distance_m / 1000) + " km" : p.distance_m + " m"} toward ${p.azimuth_deg}°</td><td>${fmtLat(p.lat)}, ${fmtLon(p.lon)}</td><td>${pct(m.sunShare)}</td><td>${fmtH(m.longestDarkH)}</td><td>${pct(m.earthShare)}</td></tr>`).join("");
      const dates = `${utcOf(from).toISOString().slice(0, 10)} to ${utcOf(to).toISOString().slice(0, 10)}`;
      out.innerHTML = `<h3>Alternatives, nearest first (${dates}${shift ? ", dates moved because no nearby place qualified in the original window" : ", same dates"})</h3>
        <table><tr><th>Distance</th><th>Place</th><th>Sunlight</th><th>Longest darkness</th><th>Earth in view</th></tr>${rows}</table>`;
      return;
    }
  }
  out.innerHTML = "<p class='small'>No nearby place within 10 km keeps Earth in view 30% of the time in this year.</p>";
}

function wire() {
  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    state.mode = b.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
    drawYear(); drawMonth(); drawHorizon();
  }));
  document.querySelectorAll("[data-year]").forEach((b) => b.addEventListener("click", () => {
    state.year = Number(b.dataset.year);
    document.querySelectorAll("[data-year]").forEach((x) => x.classList.toggle("on", x === b));
    refreshYear();
  }));
  $("day").addEventListener("input", (e) => { state.day = Number(e.target.value); refreshMoment(); });
  $("time").addEventListener("input", (e) => { state.time = Number(e.target.value); refreshMoment(); });
  $("play").addEventListener("click", () => {
    if (state.playing) { clearInterval(state.playing); state.playing = null; $("play").textContent = "▶ Play"; return; }
    $("play").textContent = "⏸ Pause";
    state.playing = setInterval(() => {
      state.time = (state.time + 3) % STEPS_PER_DAY;
      if (state.time < 3) state.day = (state.day + 1) % (Number($("day").max) + 1);
      $("day").value = state.day; $("time").value = state.time;
      refreshMoment();
    }, 60);
  });
  $("own").addEventListener("change", (e) => { $("own-box").hidden = !e.target.checked; });
  $("own-go").addEventListener("click", useOwnCoordinates);
  $("alt-go").addEventListener("click", findAlternatives);
  $("print").addEventListener("click", () => window.print());
}

load();
