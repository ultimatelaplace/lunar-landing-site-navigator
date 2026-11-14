"""Compute horizons, sunlight and Earth visibility for every grid point.

Usage: python -m pipeline.run_grid DATA_DIR [--limit N] [--workers N]
DATA_DIR holds kernels/ and lola/; results go to DATA_DIR/results/.
"""
import argparse
import os
import time
from datetime import datetime, timedelta, timezone
from multiprocessing import Pool
from pathlib import Path

import numpy as np

from . import dem, ephemeris, visibility
from .horizon import OBSERVER_HEIGHT_M, horizon_profile

GRID_STEP_M = 2000.0
LOWEST_LAT = -84.0
START = datetime(2027, 1, 1, tzinfo=timezone.utc)
END = datetime(2029, 1, 1, tzinfo=timezone.utc)
STEP = timedelta(minutes=10)
STEP_HOURS = STEP.total_seconds() / 3600
YEARS = (2027, 2028)


def grid_points():
    edge = dem.latlon_to_xy(LOWEST_LAT, 90.0)[0]
    axis = np.arange(-np.floor(edge / GRID_STEP_M), np.floor(edge / GRID_STEP_M) + 1) * GRID_STEP_M
    x, y = np.meshgrid(axis, axis)
    x, y = x.ravel(), y.ravel()
    lat, lon = dem.xy_to_latlon(x, y)
    keep = lat <= LOWEST_LAT
    # nudge the exact pole so that north and east are defined
    at_pole = keep & (x == 0) & (y == 0)
    lat = np.where(at_pole, -89.99999, lat)
    return x[keep], y[keep], lat[keep], lon[keep]


def epochs_utc():
    n = int((END - START) / STEP)
    return [START + i * STEP for i in range(n)]


def body_tables(data_dir):
    """Apparent Sun and Earth positions from the Moon's center for every time step."""
    cache = Path(data_dir) / "results" / "bodies_2027_2028.npz"
    if cache.exists():
        return dict(np.load(cache))
    ephemeris.load_kernels(Path(data_dir) / "kernels")
    times = epochs_utc()
    ets = ephemeris.utc_to_et([t.strftime("%Y-%m-%dT%H:%M:%S") for t in times])
    tables = dict(
        unix=np.array([t.timestamp() for t in times]),
        sun=ephemeris.body_vectors_m("SUN", ets),
        earth=ephemeris.body_vectors_m("EARTH", ets),
    )
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.savez(cache, **tables)
    return tables


def longest_run_hours(mask):
    """Longest unbroken stretch of True values, in hours."""
    padded = np.concatenate([[False], mask, [False]])
    changes = np.flatnonzero(np.diff(padded.astype(np.int8)))
    if changes.size == 0:
        return 0.0
    return float((changes[1::2] - changes[::2]).max() * STEP_HOURS)


_state = {}


def _init(data_dir):
    _state["map"] = dem.ElevationMap(Path(data_dir) / "lola" / "ldem_80s_20m.img")
    _state["bodies"] = body_tables(data_dir)
    years = np.array([datetime.fromtimestamp(t, timezone.utc).year for t in _state["bodies"]["unix"]])
    _state["year_masks"] = {y: years == y for y in YEARS}


def flat_profile():
    return np.full(360, -np.degrees(np.arccos(dem.MOON_RADIUS_M / (dem.MOON_RADIUS_M + OBSERVER_HEIGHT_M))))


def site_metrics(lat, lon):
    m, bodies = _state["map"], _state["bodies"]
    profile, checked, ground = horizon_profile(m.height, lat, lon)
    eye = ground + OBSERVER_HEIGHT_M
    sun_az, sun_el = ephemeris.azimuth_elevation_deg(bodies["sun"], lat, lon, eye)
    earth_az, earth_el = ephemeris.azimuth_elevation_deg(bodies["earth"], lat, lon, eye)
    site = ephemeris.site_frame(lat, lon, eye)[0]
    sun_r = visibility.angular_radius_deg(visibility.SUN_RADIUS_M, np.linalg.norm(bodies["sun"] - site, axis=1))
    earth_r = visibility.angular_radius_deg(visibility.EARTH_RADIUS_M, np.linalg.norm(bodies["earth"] - site, axis=1))
    sun = visibility.visible_fraction(profile, sun_az, sun_el, sun_r)
    sun_flat = visibility.visible_fraction(flat_profile(), sun_az, sun_el, sun_r)
    earth = visibility.whole_disk_visible(profile, earth_az, earth_el, earth_r)
    out = dict(lat=lat, lon=lon, ground_m=ground, horizon_deg=profile.astype(np.float32),
               checked_km=float(checked.min() / 1000))
    for year, sel in _state["year_masks"].items():
        out[f"sun_hours_{year}"] = float(sun[sel].sum() * STEP_HOURS)
        out[f"flat_sun_hours_{year}"] = float(sun_flat[sel].sum() * STEP_HOURS)
        out[f"longest_dark_h_{year}"] = longest_run_hours(sun[sel] == 0)
        out[f"earth_share_{year}"] = float(earth[sel].mean())
        out[f"longest_earth_gap_h_{year}"] = longest_run_hours(~earth[sel])
    return out


def _work(args):
    return site_metrics(*args)


def run(data_dir, limit=None, workers=None, points=None):
    body_tables(data_dir)
    if points is None:
        _, _, lat, lon = grid_points()
        points = list(zip(lat.tolist(), lon.tolist()))
    if limit:
        points = points[:limit]
    with Pool(workers or os.cpu_count(), initializer=_init, initargs=(data_dir,)) as pool:
        rows = pool.map(_work, points, chunksize=8)
    keys = rows[0].keys()
    return {k: np.array([r[k] for r in rows]) for k in keys}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--workers", type=int)
    args = parser.parse_args()
    started = time.time()
    result = run(args.data_dir, args.limit, args.workers)
    out = Path(args.data_dir) / "results" / ("grid.npz" if not args.limit else f"grid_first_{args.limit}.npz")
    np.savez_compressed(out, **result)
    print(f"{len(result['lat'])} points in {time.time() - started:.0f} s -> {out}")


if __name__ == "__main__":
    main()
