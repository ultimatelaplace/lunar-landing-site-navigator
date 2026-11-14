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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PAD = { left: 64, top: 26, right: 12 };
const STRIP = 18;

// Draws days x time-of-day cells into the plot area and returns the plot geometry.
function heatmap(canvas, firstStep, days, dayWidth, title) {
  const plotW = days * dayWidth, plotH = 288;
  canvas.width = PAD.left + plotW + PAD.right;
  canvas.height = PAD.top + plotH + 10 + STRIP + 44;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = ctx.createImageData(plotW, plotH);
  for (let d = 0; d < days; d++) {
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      const [r, g, b] = cellColor(firstStep + d * STEPS_PER_DAY + k);
      for (let dx = 0; dx < dayWidth; dx++) for (let dy = 0; dy < 2; dy++) {
        const p = ((k * 2 + dy) * plotW + d * dayWidth + dx) * 4;
        img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, PAD.left, PAD.top);
  ctx.fillStyle = "#16202c"; ctx.font = "13px system-ui"; ctx.textBaseline = "middle"; ctx.textAlign = "right";
  for (const hh of [0, 6, 12, 18, 24]) ctx.fillText(`${String(hh).padStart(2, "0")}:00`, PAD.left - 6, PAD.top + hh * 12);
  ctx.save(); ctx.translate(14, PAD.top + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center";
  ctx.fillText("time of day (UTC)", 0, 0); ctx.restore();
  // Earth strip: blue where Earth's whole disk is in view at any time of that day slot
  const y0 = PAD.top + plotH + 10, s = state.series, steps = days * STEPS_PER_DAY;
  for (let x = 0; x < plotW; x++) {
    const a = firstStep + Math.floor((x / plotW) * steps), b = firstStep + Math.floor(((x + 1) / plotW) * steps);
    let seen = 0; for (let t = a; t < Math.max(b, a + 1); t++) seen += s.earth[t];
    ctx.fillStyle = seen ? "#2f80ed" : "#d8dee6"; ctx.fillRect(PAD.left + x, y0, 1, STRIP);
  }
  ctx.fillStyle = "#16202c"; ctx.textAlign = "right"; ctx.fillText("Earth", PAD.left - 6, y0 + STRIP / 2);
  legend(ctx, PAD.left, y0 + STRIP + 26);
  return { ctx, plotW, plotH, x0: PAD.left, y0: PAD.top };
}

function legend(ctx, x, y) {
  const items = [["#0f1724", "Sun hidden"], ["#82693f", "Sun partly visible"], ["#f2c94c", "Sun fully visible"], ["#2f80ed", "Earth fully in view"]];
  if (state.mode === "blocked") items.splice(3, 0, ["#c8463c", "Sun hidden by terrain only"]);
  ctx.font = "13px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  for (const [c, label] of items) {
    ctx.fillStyle = c; ctx.fillRect(x, y - 7, 14, 14); ctx.strokeStyle = "#999"; ctx.strokeRect(x, y - 7, 14, 14);
    ctx.fillStyle = "#16202c"; ctx.fillText(label, x + 20, y); x += 40 + ctx.measureText(label).width;
  }
}

function drawYear() {
  const [from, to] = yearRange();
  const days = (to - from) / STEPS_PER_DAY;
  const { ctx, plotH, x0, y0 } = heatmap($("year"), from, days, 4);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#16202c"; ctx.font = "13px system-ui";
  for (let m = 0; m < 12; m++) {
    const d = Math.round((Date.UTC(state.year, m, 1) - Date.UTC(state.year, 0, 1)) / 86400000);
    ctx.fillText(MONTHS[m], x0 + d * 4 + 60, y0 - 8);
    ctx.fillStyle = "#16202c"; ctx.fillRect(x0 + d * 4, y0 - 4, 1, 4);
  }
  const w = state.window, wx = x0 + ((w.start - from) / STEPS_PER_DAY) * 4;
  ctx.strokeStyle = "#2f80ed"; ctx.lineWidth = 3; ctx.strokeRect(wx, y0 + 1, WINDOW_DAYS * 4, plotH - 2);
  ctx.fillStyle = "#2f80ed"; ctx.textAlign = "left"; ctx.font = "bold 13px system-ui";
  ctx.fillText("suggested window", Math.min(wx + 4, x0 + days * 4 - 130), y0 + plotH - 8);
  marker(ctx, x0 + state.day * 4 + 2, y0 + state.time * 2 + 1, plotH, y0);
}

function marker(ctx, x, y, plotH, y0) {
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + plotH); ctx.stroke();
  ctx.fillStyle = "#e0393e"; ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
}

function drawMonth() {
  const w = state.window;
  const { ctx, plotH, x0, y0 } = heatmap($("month"), w.start, WINDOW_DAYS, 48);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#16202c"; ctx.font = "12px system-ui";
  for (let d = 0; d < WINDOW_DAYS; d += 2) {
    const date = utcOf(w.start + d * STEPS_PER_DAY);
    ctx.fillText(`${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`, x0 + d * 48 + 24, y0 - 8);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  for (let d = 1; d < WINDOW_DAYS; d++) { ctx.beginPath(); ctx.moveTo(x0 + d * 48, y0); ctx.lineTo(x0 + d * 48, y0 + plotH); ctx.stroke(); }
  if (state.t >= w.start && state.t < w.end) {
    const k = state.t - w.start;
    marker(ctx, x0 + Math.floor(k / STEPS_PER_DAY) * 48 + 24, y0 + (k % STEPS_PER_DAY) * 2 + 1, plotH, y0);
  }
  const m = metrics(state.series, w.start, w.end, stepH);
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
  drawMonth();
  drawHorizon();
}

function drawHorizon() {
  const canvas = $("horizon"), ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, s = state.series, site = state.site, t = state.t;
  const [from] = yearRange();
  const dayStart = from + state.day * STEPS_PER_DAY;
  const profile = state.mode === "flat" ? site.horizon.map(() => 0) : site.horizon;
  const L = 52, R = W - 34, T = 34, B = H - 34;
  const lo = Math.floor(Math.min(...profile, s.sunEl[t], s.earthEl[t]) - 2);
  const hi = Math.ceil(Math.max(...profile, s.sunEl[t], s.earthEl[t]) + 3);
  const X = (az) => L + (az / 360) * (R - L), Y = (el) => B - ((el - lo) / (hi - lo)) * (B - T);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, T, 0, B); sky.addColorStop(0, "#0b1220"); sky.addColorStop(1, "#1d2b44");
  ctx.fillStyle = sky; ctx.fillRect(L, T, R - L, B - T);
  ctx.font = "13px system-ui"; ctx.fillStyle = "#16202c"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const names = { 0: "N", 90: "E", 180: "S", 270: "W", 360: "N" };
  for (let az = 0; az <= 360; az += 45) {
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.moveTo(X(az), T); ctx.lineTo(X(az), B); ctx.stroke();
    ctx.fillStyle = "#16202c"; ctx.fillText(names[az] ? `${names[az]} ${az}°` : `${az}°`, X(az), H - 12);
  }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const stepEl = hi - lo > 20 ? 5 : hi - lo > 8 ? 2 : 1;
  for (let el = Math.ceil(lo / stepEl) * stepEl; el <= hi; el += stepEl) {
    ctx.strokeStyle = el === 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.moveTo(L, Y(el)); ctx.lineTo(R, Y(el)); ctx.stroke();
    ctx.fillText(`${el}°`, L - 6, Y(el));
  }
  ctx.save(); ctx.translate(14, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("height above level (°)", 0, 0); ctx.restore();
  ctx.fillStyle = "#6b5a49"; ctx.strokeStyle = "#c9b79c"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L, B);
  for (let az = 0; az <= 360; az++) ctx.lineTo(X(az), Y(profile[az % 360]));
  ctx.lineTo(R, B); ctx.closePath(); ctx.fill();
  ctx.beginPath(); for (let az = 0; az <= 360; az++) ctx[az ? "lineTo" : "moveTo"](X(az), Y(profile[az % 360])); ctx.stroke();
  const path = (azs, els, css) => {
    ctx.fillStyle = css;
    for (let k = 0; k < STEPS_PER_DAY; k += 2) ctx.fillRect(X(azs[dayStart + k]) - 1.5, Y(els[dayStart + k]) - 1.5, 3, 3);
  };
  path(s.sunAz, s.sunEl, "rgba(242,201,76,0.9)");
  path(s.earthAz, s.earthEl, "rgba(120,170,255,0.9)");
  const body = (az, el, color, label) => {
    const x = X(az), y = Y(el);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 9, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "bold 14px system-ui"; ctx.textAlign = x > R - 220 ? "right" : "left"; ctx.textBaseline = "middle";
    const tx = x > R - 220 ? x - 14 : x + 14, ty = Math.max(T + 12, Math.min(B - 12, y - 16));
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(label, tx, ty);
    ctx.fillStyle = "#ffffff"; ctx.fillText(label, tx, ty);
  };
  const sunLabel = s.sun[t] >= 0.999 ? "Sun: fully up" : s.sun[t] > 0 ? `Sun: ${Math.round(100 * s.sun[t])}% visible` : "Sun: hidden";
  body(s.sunAz[t], s.sunEl[t], "#f2c94c", `${sunLabel} (${s.sunEl[t].toFixed(1)}°)`);
  body(s.earthAz[t], s.earthEl[t], "#2f80ed", `Earth: ${s.earth[t] ? "in view" : "hidden"} (${s.earthEl[t].toFixed(1)}°)`);
  ctx.font = "13px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const key = [["#c9b79c", "terrain horizon"], ["#f2c94c", "Sun's path today"], ["#78aaff", "Earth's path today"]];
  let kx = L + 8;
  for (const [c, label] of key) {
    ctx.fillStyle = c; ctx.fillRect(kx, T - 22, 14, 6); ctx.fillStyle = "#16202c"; ctx.fillText(label, kx + 20, T - 19);
    kx += 40 + ctx.measureText(label).width;
  }
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
