"""Write the data files used by the web app (docs/data).

Usage: python -m pipeline.export_web DATA_DIR
"""
import json
import sys
from pathlib import Path

import numpy as np

from . import run_grid
from .horizon import OBSERVER_HEIGHT_M, destination
from .ranking import rank

OUT = Path(__file__).resolve().parent.parent / "docs" / "data"
RING_DISTANCES_M = [50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000,
                    6000, 7000, 8000, 9000, 10000]
RING_AZIMUTHS_DEG = list(range(0, 360, 30))
HORIZON_SCALE = 500  # int16 steps of 0.002 degree, range ±65 degrees


def summary(r, i):
    days = {2027: 365, 2028: 366}
    out = {}
    for y, n in days.items():
        out[str(y)] = dict(
            sun_share=round(float(r[f"sun_hours_{y}"][i]) / (n * 24), 5),
            flat_sun_share=round(float(r[f"flat_sun_hours_{y}"][i]) / (n * 24), 5),
            longest_dark_h=round(float(r[f"longest_dark_h_{y}"][i]), 2),
            earth_share=round(float(r[f"earth_share_{y}"][i]), 5),
            longest_earth_gap_h=round(float(r[f"longest_earth_gap_h_{y}"][i]), 2),
        )
    return out


def main(data_dir):
    OUT.mkdir(parents=True, exist_ok=True)
    r = dict(np.load(Path(data_dir) / "results" / "grid.npz"))
    bodies = run_grid.body_tables(data_dir)

    sun = (r["sun_hours_2027"] + r["sun_hours_2028"]) / (731 * 24)
    dark = np.maximum(r["longest_dark_h_2027"], r["longest_dark_h_2028"])
    earth = (r["earth_share_2027"] * 365 + r["earth_share_2028"] * 366) / 731
    top = rank(r["lat"], r["lon"], dark, sun, earth)

    ring_points, ring_meta = [], []
    for i in top:
        for d in RING_DISTANCES_M:
            for az in RING_AZIMUTHS_DEG:
                lat, lon = destination(float(r["lat"][i]), float(r["lon"][i]), az, d)
                ring_points.append((float(lat), float(lon)))
                ring_meta.append((d, az))
    rings = run_grid.run(data_dir, points=ring_points)

    sites = []
    per_site = len(RING_DISTANCES_M) * len(RING_AZIMUTHS_DEG)
    for k, i in enumerate(top):
        sites.append(dict(
            id=f"top{k + 1}", name=f"Suggested site {k + 1}", source="Best grid point by the team's ranking rule",
            lat=round(float(r["lat"][i]), 5), lon=round(float(r["lon"][i]), 5),
            ground_m=round(float(r["ground_m"][i]), 1), checked_km=round(float(r["checked_km"][i]), 1),
            horizon=[round(float(v), 4) for v in r["horizon_deg"][i]],
            expected=summary(r, i), ring_offset=k * per_site,
        ))

    ring_h = np.round(rings["horizon_deg"] * HORIZON_SCALE).astype("<i2")
    ring_h.tofile(OUT / "rings.bin")
    meta = dict(
        start_unix=float(bodies["unix"][0]), step_s=600, count=int(len(bodies["unix"])),
        observer_height_m=OBSERVER_HEIGHT_M, horizon_scale=HORIZON_SCALE,
        ring_distances_m=RING_DISTANCES_M, ring_azimuths_deg=RING_AZIMUTHS_DEG,
        ring_points=[dict(lat=round(a, 5), lon=round(b, 5), ground_m=round(float(g), 1), distance_m=d, azimuth_deg=az)
                     for (a, b), g, (d, az) in zip(ring_points, rings["ground_m"], ring_meta)],
        grid_count=int(len(r["lat"])),
    )
    np.concatenate([bodies["sun"], bodies["earth"]], axis=1).astype("<f4").tofile(OUT / "bodies.bin")
    np.round(r["horizon_deg"] * HORIZON_SCALE).astype("<i2").tofile(OUT / "grid_horizon.bin")
    np.stack([r["lat"], r["lon"], r["ground_m"], r["checked_km"]], axis=1).astype("<f4").tofile(OUT / "grid_points.bin")
    (OUT / "meta.json").write_text(json.dumps(meta, separators=(",", ":")))
    (OUT / "sites.json").write_text(json.dumps(sites, indent=1))
    for f in sorted(OUT.iterdir()):
        print(f"{f.name}: {f.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main(sys.argv[1])
