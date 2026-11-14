"""How much of the Sun and Earth is above the terrain horizon."""
import numpy as np

SUN_RADIUS_M = 695_700_000.0     # IAU 2015 nominal solar radius
EARTH_RADIUS_M = 6_378_137.0     # WGS84 equatorial radius
STRIPS = 21                      # vertical strips across a disk


def angular_radius_deg(radius_m, distance_m):
    return np.degrees(np.arcsin(radius_m / distance_m))


def horizon_at(profile_deg, azimuth_deg):
    """Horizon elevation at any azimuth, linear between whole degrees."""
    profile = np.asarray(profile_deg)
    a = np.asarray(azimuth_deg) % 360
    i = np.floor(a).astype(int)
    f = a - i
    return (1 - f) * profile[i % 360] + f * profile[(i + 1) % 360]


def _strips(azimuth_deg, elevation_deg, radius_deg):
    """Strip offsets across the disk and the half height of each strip."""
    u = (np.arange(STRIPS) + 0.5) / STRIPS * 2 - 1
    offset = np.asarray(radius_deg)[..., None] * u
    half = np.sqrt(np.maximum(np.asarray(radius_deg)[..., None] ** 2 - offset ** 2, 0))
    # an offset across the sky corresponds to a larger azimuth step away from the horizon
    az = np.asarray(azimuth_deg)[..., None] + offset / np.cos(np.radians(np.asarray(elevation_deg)[..., None]))
    return az, half


def visible_fraction(profile_deg, azimuth_deg, elevation_deg, radius_deg):
    """Share of the disk's area above the horizon, 0 to 1."""
    az, half = _strips(azimuth_deg, elevation_deg, radius_deg)
    top = np.asarray(elevation_deg)[..., None] + half
    h = horizon_at(profile_deg, az)
    visible = np.clip(top - h, 0, 2 * half)
    return visible.sum(axis=-1) / np.maximum((2 * half).sum(axis=-1), 1e-12)


def whole_disk_visible(profile_deg, azimuth_deg, elevation_deg, radius_deg):
    """True when every part of the disk is above the horizon."""
    az, half = _strips(azimuth_deg, elevation_deg, radius_deg)
    bottom = np.asarray(elevation_deg)[..., None] - half
    edge = np.asarray(elevation_deg) - np.asarray(radius_deg)
    return np.all(bottom >= horizon_at(profile_deg, az), axis=-1) & (edge >= horizon_at(profile_deg, azimuth_deg))
