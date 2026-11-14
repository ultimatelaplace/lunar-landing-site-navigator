"""Best point inside each NASA Artemis III candidate region, and near two IAU features.

Usage: python -m pipeline.regions DATA_DIR
"""
import json
import sys
from pathlib import Path

import numpy as np

from . import dem, run_grid
from .ranking import rank

STEP_M = 500.0
ROOT = Path(__file__).resolve().parent.parent
NASA_FILE = ROOT / "docs" / "data" / "nasa_artemis_regions_2022.geojson"
SPELLING = {"Peak Near Shakleton": "Peak near Shackleton"}  # typo in the NASA file

# 2024 regions without a published outline: search 15 km around the IAU/USGS gazetteer center.
APPROXIMATE = [
    dict(name="Mons Mouton", lat=-84.60, lon=31.00, radius_m=15000.0,
         source="Best point within 15 km of the IAU center of Mons Mouton (approximate: NASA has not published an outline for Mons Mouton or Mons Mouton Plateau)"),
    dict(name="Slater Plain", lat=-88.08, lon=111.29, radius_m=15000.0,
         source="Best point within 15 km of the IAU center of Slater crater (approximate: NASA has not published an outline for Slater Plain)"),
]


def inside(px, py, poly_x, poly_y):
    """Even-odd rule point-in-polygon test, vectorized over the points."""
    result = np.zeros(px.shape, dtype=bool)
    n = len(poly_x)
    for i in range(n):
        x1, y1, x2, y2 = poly_x[i], poly_y[i], poly_x[(i + 1) % n], poly_y[(i + 1) % n]
        crosses = (y1 > py) != (y2 > py)
        x_at = x1 + (py - y1) * (x2 - x1) / np.where(y2 == y1, 1e-12, y2 - y1)
        result ^= crosses & (px < x_at)
    return result


def candidates():
    regions = []
    for f in json.loads(NASA_FILE.read_text())["features"]:
        ring = np.array(f["geometry"]["coordinates"][0])
        vx, vy = dem.latlon_to_xy(ring[:, 1], ring[:, 0])
        gx, gy = np.meshgrid(np.arange(vx.min(), vx.max() + STEP_M, STEP_M), np.arange(vy.min(), vy.max() + STEP_M, STEP_M))
        keep = inside(gx.ravel(), gy.ravel(), vx, vy)
        name = SPELLING.get(f["properties"]["label"], f["properties"]["label"])
        regions.append(dict(name=name, source="Best point inside NASA's outline of this Artemis III candidate region (NASA Moon Trek, 2022 regions)",
                            x=gx.ravel()[keep], y=gy.ravel()[keep]))
    for a in APPROXIMATE:
        cx, cy = dem.latlon_to_xy(a["lat"], a["lon"])
        r = a["radius_m"]
        gx, gy = np.meshgrid(np.arange(cx - r, cx + r + STEP_M, STEP_M), np.arange(cy - r, cy + r + STEP_M, STEP_M))
        keep = np.hypot(gx - cx, gy - cy).ravel() <= r
        regions.append(dict(name=a["name"], source=a["source"], x=gx.ravel()[keep], y=gy.ravel()[keep]))
    return regions


def main(data_dir):
    regions = candidates()
    points, owner = [], []
    for k, reg in enumerate(regions):
        lat, lon = dem.xy_to_latlon(reg["x"], reg["y"])
        points += list(zip(lat.tolist(), lon.tolist()))
        owner += [k] * len(lat)
    print(f"{len(regions)} regions, {len(points)} points")
    r = run_grid.run(data_dir, points=points)
    owner = np.array(owner)
    out = {}
    best = []
    for k, reg in enumerate(regions):
        idx = np.flatnonzero(owner == k)
        sun = (r["sun_hours_2027"][idx] + r["sun_hours_2028"][idx]) / (731 * 24)
        dark = np.maximum(r["longest_dark_h_2027"][idx], r["longest_dark_h_2028"][idx])
        earth = (r["earth_share_2027"][idx] * 365 + r["earth_share_2028"][idx] * 366) / 731
        pick = rank(r["lat"][idx], r["lon"][idx], dark, sun, earth, count=1)
        if not pick:  # no point reaches the Earth threshold: fall back to the most sunlight, and say so
            pick, note = [int(np.argmax(sun))], "No point here keeps Earth in view 30% of the time; shown is the sunniest point."
        else:
            note = ""
        i = idx[pick[0]]
        best.append(i)
        print(f"{reg['name']:28s} {len(idx):5d} points  best {r['lat'][i]:.4f},{r['lon'][i]:.3f}  sun {100*sun[pick[0]]:.0f}%  dark {dark[pick[0]]:.0f} h  earth {100*earth[pick[0]]:.0f}%  {note}")
        reg["note"] = note
    keys = list(r.keys())
    out = {k: r[k][best] for k in keys}
    out["name"] = np.array([reg["name"] for reg in regions])
    out["source"] = np.array([reg["source"] for reg in regions])
    out["note"] = np.array([reg["note"] for reg in regions])
    np.savez_compressed(Path(data_dir) / "results" / "regions.npz", **out)


if __name__ == "__main__":
    main(sys.argv[1])
