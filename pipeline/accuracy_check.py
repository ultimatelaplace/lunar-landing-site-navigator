"""How much do the results change if the horizon is sampled more finely?

Compares the normal settings with (a) twice as many distance steps and
(b) twice as many azimuths, on the suggested sites and on random grid points.
Usage: python -m pipeline.accuracy_check DATA_DIR
"""
import json
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np

from . import ephemeris, run_grid, visibility
from .horizon import DISTANCES_M, OBSERVER_HEIGHT_M, horizon_profile
from .ranking import rank

FINE_DISTANCES_M = np.unique(np.concatenate([DISTANCES_M, (DISTANCES_M[1:] + DISTANCES_M[:-1]) / 2]))
FINE_AZIMUTHS_DEG = np.arange(0.0, 360.0, 0.5)


def horizon_at_any(profile, azimuth_deg):
    """Linear interpolation for a profile with any number of equal azimuth steps."""
    n = len(profile)
    a = (np.asarray(azimuth_deg) % 360) * n / 360
    i = np.floor(a).astype(int)
    f = a - i
    return (1 - f) * profile[i % n] + f * profile[(i + 1) % n]


def site_metrics(profile, lat, lon, ground):
    bodies, masks = run_grid._state["bodies"], run_grid._state["year_masks"]
    eye = ground + OBSERVER_HEIGHT_M
    original = visibility.horizon_at
    visibility.horizon_at = horizon_at_any
    try:
        sa, se = ephemeris.azimuth_elevation_deg(bodies["sun"], lat, lon, eye)
        ea, ee = ephemeris.azimuth_elevation_deg(bodies["earth"], lat, lon, eye)
        site = ephemeris.site_frame(lat, lon, eye)[0]
        sr = visibility.angular_radius_deg(visibility.SUN_RADIUS_M, np.linalg.norm(bodies["sun"] - site, axis=1))
        er = visibility.angular_radius_deg(visibility.EARTH_RADIUS_M, np.linalg.norm(bodies["earth"] - site, axis=1))
        sun = visibility.visible_fraction(profile, sa, se, sr)
        earth = visibility.whole_disk_visible(profile, ea, ee, er)
    finally:
        visibility.horizon_at = original
    sel = masks[2027]
    return dict(sun_share=float(sun[sel].mean()), earth_share=float(earth[sel].mean()),
                longest_dark_h=run_grid.longest_run_hours(sun[sel] == 0))


def compare(point):
    lat, lon = point
    m = run_grid._state["map"].height
    base, _, ground = horizon_profile(m, lat, lon)
    fine_d, _, _ = horizon_profile(m, lat, lon, distances_m=FINE_DISTANCES_M)
    fine_a, _, _ = horizon_profile(m, lat, lon, azimuths_deg=FINE_AZIMUTHS_DEG)
    out = {"lat": lat, "lon": lon,
           "horizon_diff_distance_deg": float(np.abs(fine_d - base).max()),
           "horizon_diff_azimuth_deg": float(np.abs(fine_a[1::2] - horizon_at_any(base, FINE_AZIMUTHS_DEG[1::2])).max())}
    b = site_metrics(base, lat, lon, ground)
    for name, prof in (("distance", fine_d), ("azimuth", fine_a)):
        f = site_metrics(prof, lat, lon, ground)
        out[f"{name}_sun_share"] = f["sun_share"] - b["sun_share"]
        out[f"{name}_earth_share"] = f["earth_share"] - b["earth_share"]
        out[f"{name}_longest_dark_h"] = f["longest_dark_h"] - b["longest_dark_h"]
    return out


def main(data_dir):
    r = dict(np.load(Path(data_dir) / "results" / "grid.npz"))
    sun = (r["sun_hours_2027"] + r["sun_hours_2028"]) / (731 * 24)
    dark = np.maximum(r["longest_dark_h_2027"], r["longest_dark_h_2028"])
    earth = (r["earth_share_2027"] * 365 + r["earth_share_2028"] * 366) / 731
    picks = list(rank(r["lat"], r["lon"], dark, sun, earth))
    lit = np.flatnonzero(sun > 0)
    picks += list(np.random.default_rng(11).choice(lit, 40, replace=False))
    points = [(float(r["lat"][i]), float(r["lon"][i])) for i in picks]
    run_grid.body_tables(data_dir)
    with Pool(initializer=run_grid._init, initargs=(data_dir,)) as pool:
        rows = pool.map(compare, points)
    out = Path(__file__).resolve().parent.parent / "tests" / "data" / "accuracy_check.json"
    out.write_text(json.dumps(rows, indent=1))
    for key in rows[0]:
        if key in ("lat", "lon"):
            continue
        v = np.abs([row[key] for row in rows])
        print(f"{key:32s} median {np.median(v):.5f}  95% {np.percentile(v, 95):.5f}  max {v.max():.5f}")


if __name__ == "__main__":
    main(sys.argv[1])
