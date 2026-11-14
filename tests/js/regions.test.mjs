// The browser's NASA-region test must agree with pipeline/regions.py for the same points.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadRegions, regionsAt } from "../../docs/js/regions.js";

const root = new URL("../../", import.meta.url);
const regions = loadRegions(JSON.parse(readFileSync(new URL("docs/data/nasa_artemis_regions_2022.geojson", root))));
const points = [];
for (let i = 0; i < 3000; i++) points.push([-84 - 6 * ((i * 7919) % 1000) / 1000, (i * 104729) % 36000 / 100]);
const python = JSON.parse(execFileSync(process.env.TRIAD_PYTHON || "../.venv/bin/python", ["-c", `
import json, sys, numpy as np
from pipeline import dem
from pipeline.regions import inside, SPELLING, NASA_FILE
pts = np.array(json.loads(sys.stdin.read()))
x, y = dem.latlon_to_xy(pts[:, 0], pts[:, 1])
out = [[] for _ in pts]
for f in json.loads(NASA_FILE.read_text())["features"]:
    ring = np.array(f["geometry"]["coordinates"][0]); vx, vy = dem.latlon_to_xy(ring[:, 1], ring[:, 0])
    for k in np.flatnonzero(inside(x, y, vx, vy)): out[k].append(SPELLING.get(f["properties"]["label"], f["properties"]["label"]))
print(json.dumps(out))
`], { cwd: new URL(".", root), input: JSON.stringify(points) }));
let differ = 0, hits = 0;
points.forEach(([lat, lon], k) => {
  const js = regionsAt(regions, lat, lon).sort().join("|"), py = python[k].sort().join("|");
  if (js !== py) differ++;
  if (py) hits++;
});
console.log(`points ${points.length}, inside a region ${hits}, disagreements ${differ}`);
console.log(differ === 0 && hits > 0 ? "PASS" : "FAIL");
process.exit(differ === 0 && hits > 0 ? 0 : 1);
