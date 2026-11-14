"""LOLA south polar elevation map (PDS product LDEM_80S_20M)."""
from pathlib import Path

import numpy as np

MOON_RADIUS_M = 1737400.0
PIXEL_M = 20.0
SIZE = 30400
CENTER = 15199.5
SCALE = 0.5  # meters per DN


def latlon_to_xy(lat_deg, lon_deg):
    """Polar stereographic coordinates in meters, as defined in the PDS label."""
    lat = np.radians(lat_deg)
    lon = np.radians(lon_deg)
    rho = 2 * MOON_RADIUS_M * np.tan(np.pi / 4 + lat / 2)
    return rho * np.sin(lon), rho * np.cos(lon)


def xy_to_latlon(x, y):
    rho = np.hypot(x, y)
    lat = 2 * np.arctan(rho / (2 * MOON_RADIUS_M)) - np.pi / 2
    lon = np.arctan2(x, y)
    return np.degrees(lat), np.degrees(lon) % 360


def xy_to_pixel(x, y):
    """Zero-based (row, col); the row axis runs opposite to y."""
    return CENTER - y / PIXEL_M, CENTER + x / PIXEL_M


def pixel_to_xy(row, col):
    return (col - CENTER) * PIXEL_M, (CENTER - row) * PIXEL_M


class ElevationMap:
    def __init__(self, path):
        path = Path(path)
        if path.stat().st_size != SIZE * SIZE * 2:
            raise ValueError(f"{path}: expected {SIZE * SIZE} 16-bit samples")
        # memory-mapped so that parallel workers share one copy through the page cache
        self.dn = np.memmap(path, dtype="<i2", mode="r", shape=(SIZE, SIZE))

    def height(self, lat_deg, lon_deg):
        """Height above the 1737.4 km sphere in meters; NaN outside the map."""
        row, col = xy_to_pixel(*latlon_to_xy(lat_deg, lon_deg))
        r0 = np.floor(row).astype(np.int64)
        c0 = np.floor(col).astype(np.int64)
        inside = (r0 >= 0) & (c0 >= 0) & (r0 < SIZE - 1) & (c0 < SIZE - 1)
        r0c = np.where(inside, r0, 0)
        c0c = np.where(inside, c0, 0)
        fr = row - r0
        fc = col - c0
        d = self.dn
        h = ((1 - fr) * (1 - fc) * d[r0c, c0c] + (1 - fr) * fc * d[r0c, c0c + 1]
             + fr * (1 - fc) * d[r0c + 1, c0c] + fr * fc * d[r0c + 1, c0c + 1]) * SCALE
        return np.where(inside, h, np.nan)
