// NASA Artemis III candidate region outlines and nearby-site checks.
const R = 1737400;
const SPELLING = { "Peak Near Shakleton": "Peak near Shackleton" }; // typo in the NASA file

// Same polar stereographic projection as pipeline/dem.py.
export function toXY(latDeg, lonDeg) {
  const lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
  const rho = 2 * R * Math.tan(Math.PI / 4 + lat / 2);
  return [rho * Math.sin(lon), rho * Math.cos(lon)];
}

export function loadRegions(geojson) {
  return geojson.features.map((f) => {
    const label = f.properties.label;
    return { name: SPELLING[label] || label, ring: f.geometry.coordinates[0].map(([lon, lat]) => toXY(lat, lon)) };
  });
}

function inside([x, y], ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < xi + ((y - yi) * (xj - xi)) / (yj - yi)) hit = !hit;
  }
  return hit;
}

export function regionsAt(regions, latDeg, lonDeg) {
  const p = toXY(latDeg, lonDeg);
  return regions.filter((r) => inside(p, r.ring)).map((r) => r.name);
}

export function distanceM(lat1, lon1, lat2, lon2) {
  const [x1, y1] = toXY(lat1, lon1), [x2, y2] = toXY(lat2, lon2);
  return Math.hypot(x1 - x2, y1 - y2);
}
