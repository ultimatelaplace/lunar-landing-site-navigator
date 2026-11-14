"""Apparent directions of the Sun and Earth seen from a point on the Moon (NAIF SPICE)."""
from pathlib import Path

import numpy as np
import spiceypy as spice

from .dem import MOON_RADIUS_M

KERNELS = ("naif0012.tls", "pck00011.tpc", "moon_de440_250416.tf",
           "moon_pa_de440_200625.bpc", "de440s.bsp")
FRAME = "MOON_ME"  # frame of the LOLA maps


def load_kernels(directory):
    for name in KERNELS:
        spice.furnsh(str(Path(directory) / name))


def utc_to_et(utc_strings):
    return np.array([spice.str2et(s) for s in utc_strings])


def body_vectors_m(target, ets):
    """Apparent positions from the Moon's center in MOON_ME, meters, shape (n, 3)."""
    positions, _ = spice.spkpos(target, np.asarray(ets), FRAME, "LT+S", "MOON")
    return np.asarray(positions) * 1000.0


def site_frame(lat_deg, lon_deg, ground_height_m):
    """Position of a surface point and its local east, north and up unit vectors."""
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    up = np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])
    east = np.array([-np.sin(lon), np.cos(lon), 0.0])
    north = np.cross(up, east)
    return (MOON_RADIUS_M + ground_height_m) * up, east, north, up


def azimuth_elevation_deg(body_from_center_m, lat_deg, lon_deg, ground_height_m=0.0):
    """Azimuth (clockwise from north) and elevation above the local horizontal plane."""
    position, east, north, up = site_frame(lat_deg, lon_deg, ground_height_m)
    v = body_from_center_m - position
    v = v / np.linalg.norm(v, axis=-1, keepdims=True)
    azimuth = np.degrees(np.arctan2(v @ east, v @ north)) % 360
    elevation = np.degrees(np.arcsin(np.clip(v @ up, -1, 1)))
    return azimuth, elevation
