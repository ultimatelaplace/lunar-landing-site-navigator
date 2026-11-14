"""Checks on the real LOLA maps; skipped when they have not been downloaded."""
import os
from pathlib import Path

import numpy as np
import pytest

from pipeline import dem
from pipeline.horizon import destination

LOLA = Path(os.environ.get("TRIAD_LOLA", "data/lola"))
MAP_20M = LOLA / "ldem_80s_20m.img"
MAP_40M = LOLA / "ldem_80s_40m.img"

# IAU/USGS Gazetteer of Planetary Nomenclature, feature 5450
SHACKLETON = (-89.67, 129.78, 20920.0)


@pytest.fixture(scope="module")
def map20():
    if not MAP_20M.exists():
        pytest.skip("LOLA 20 m map not downloaded")
    return dem.ElevationMap(MAP_20M)


def ring_mean(m, distance_m):
    lat, lon, _ = SHACKLETON
    az = np.arange(0, 360, 15.0)
    la, lo = destination(lat, lon, az, distance_m)
    return float(np.nanmean(m.height(la, lo)))


def test_shackleton_floor_and_rim_are_where_the_gazetteer_says(map20):
    radius = SHACKLETON[2] / 2
    floor = ring_mean(map20, 1.0)
    rims = {d: ring_mean(map20, d) for d in np.arange(radius - 2000, radius + 2001, 500)}
    highest = max(rims, key=rims.get)
    assert floor < -2500.0
    assert abs(highest - radius) <= 500.0
    assert rims[highest] - floor > 3500.0


def test_20m_and_40m_maps_line_up_without_a_pixel_shift(map20):
    if not MAP_40M.exists():
        pytest.skip("LOLA 40 m map not downloaded")
    d40 = np.fromfile(MAP_40M, dtype="<i2").reshape(15200, 15200)

    def h40(x, y, sx, sy):
        row = 7599.5 - (y + sy) / 40.0
        col = 7599.5 + (x + sx) / 40.0
        r0, c0 = np.floor(row).astype(int), np.floor(col).astype(int)
        fr, fc = row - r0, col - c0
        return ((1 - fr) * (1 - fc) * d40[r0, c0] + (1 - fr) * fc * d40[r0, c0 + 1]
                + fr * (1 - fc) * d40[r0 + 1, c0] + fr * fc * d40[r0 + 1, c0 + 1]) * 0.5

    rng = np.random.default_rng(7)
    x = rng.uniform(-90000, 90000, 200000)
    y = rng.uniform(-90000, 90000, 200000)
    slope = np.hypot(
        map20.height(*dem.xy_to_latlon(x + 20, y)) - map20.height(*dem.xy_to_latlon(x - 20, y)),
        map20.height(*dem.xy_to_latlon(x, y + 20)) - map20.height(*dem.xy_to_latlon(x, y - 20))) / 40
    keep = slope > 0.25
    x, y = x[keep], y[keep]
    ref = map20.height(*dem.xy_to_latlon(x, y))
    rms = {(sx, sy): np.sqrt(np.nanmean((h40(x, y, sx, sy) - ref) ** 2))
           for sx in (-10, 0, 10) for sy in (-10, 0, 10)}
    assert min(rms, key=rms.get) == (0, 0)
    assert rms[(0, 0)] < 2.0
