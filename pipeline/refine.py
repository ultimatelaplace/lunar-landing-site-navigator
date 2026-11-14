"""Search 500 m around the best 2 km grid candidates and pick the final suggested sites.

Usage: python -m pipeline.refine DATA_DIR
"""
import sys
from pathlib import Path

import numpy as np

from . import dem, run_grid
from .ranking import rank

CANDIDATES = 30
RADIUS_M = 5000.0
STEP_M = 500.0


def combined(r):
    sun = (r["sun_hours_2027"] + r["sun_hours_2028"]) / (731 * 24)
    dark = np.maximum(r["longest_dark_h_2027"], r["longest_dark_h_2028"])
    earth = (r["earth_share_2027"] * 365 + r["earth_share_2028"] * 366) / 731
    return sun, dark, earth


def main(data_dir):
    g = dict(np.load(Path(data_dir) / "results" / "grid.npz"))
    sun, dark, earth = combined(g)
    seeds = rank(g["lat"], g["lon"], dark, sun, earth, count=CANDIDATES)
    points = []
    for i in seeds:
        cx, cy = dem.latlon_to_xy(g["lat"][i], g["lon"][i])
        off = np.arange(-RADIUS_M, RADIUS_M + STEP_M, STEP_M)
        gx, gy = np.meshgrid(cx + off, cy + off)
        keep = np.hypot(gx - cx, gy - cy) <= RADIUS_M
        lat, lon = dem.xy_to_latlon(gx[keep], gy[keep])
        points += list(zip(lat.tolist(), lon.tolist()))
    print(f"{len(seeds)} candidates, {len(points)} points")
    r = run_grid.run(data_dir, points=points)
    sun, dark, earth = combined(r)
    best = rank(r["lat"], r["lon"], dark, sun, earth, count=10)
    for k, i in enumerate(best):
        print(f"{k + 1:2d}. {r['lat'][i]:.4f},{r['lon'][i]:.3f}  sun {100 * sun[i]:.0f}%  dark {dark[i]:.0f} h  earth {100 * earth[i]:.0f}%  ground {r['ground_m'][i]:.0f} m")
    np.savez_compressed(Path(data_dir) / "results" / "refined.npz", **{k: v[best] for k, v in r.items()})


if __name__ == "__main__":
    main(sys.argv[1])
