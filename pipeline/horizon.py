"""Terrain horizon of a point on a spherical Moon."""
import numpy as np

from .dem import MOON_RADIUS_M

OBSERVER_HEIGHT_M = 2.0  # team decision: height of the lander's solar panel and antenna
AZIMUTHS_DEG = np.arange(360.0)
DISTANCES_M = np.unique(np.concatenate([
    np.arange(20.0, 2000.0, 20.0),
    np.geomspace(2000.0, 150000.0, 300),
]))


def destination(lat_deg, lon_deg, azimuth_deg, distance_m):
    """Point reached by walking along a great circle; azimuth is clockwise from north."""
    lat1 = np.radians(lat_deg)
    lon1 = np.radians(lon_deg)
    az = np.radians(azimuth_deg)
    delta = distance_m / MOON_RADIUS_M
    lat2 = np.arcsin(np.sin(lat1) * np.cos(delta) + np.cos(lat1) * np.sin(delta) * np.cos(az))
    lon2 = lon1 + np.arctan2(np.sin(az) * np.sin(delta) * np.cos(lat1),
                             np.cos(delta) - np.sin(lat1) * np.sin(lat2))
    return np.degrees(lat2), np.degrees(lon2) % 360


def elevation_angle_deg(observer_radius_m, target_radius_m, distance_m):
    """Angle of a target above the observer's local horizontal plane."""
    theta = distance_m / MOON_RADIUS_M
    return np.degrees(np.arctan2(target_radius_m * np.cos(theta) - observer_radius_m,
                                 target_radius_m * np.sin(theta)))


def horizon_profile(height_at, lat_deg, lon_deg, observer_height_m=OBSERVER_HEIGHT_M,
                    azimuths_deg=AZIMUTHS_DEG, distances_m=DISTANCES_M):
    """Highest terrain elevation angle in each azimuth.

    height_at(lat, lon) returns heights above the reference sphere (NaN where
    there is no data). Terrain without data is ignored, so near the edge of the
    map the horizon may be underestimated; the second return value says how far
    each azimuth could be checked.
    """
    az = np.asarray(azimuths_deg)[:, None]
    dist = np.asarray(distances_m)[None, :]
    ground = float(height_at(np.array([lat_deg]), np.array([lon_deg]))[0])
    observer_r = MOON_RADIUS_M + ground + observer_height_m
    tlat, tlon = destination(lat_deg, lon_deg, az, dist)
    target_r = MOON_RADIUS_M + height_at(tlat, tlon)
    elev = elevation_angle_deg(observer_r, target_r, dist)
    checked = np.where(np.isnan(elev), 0.0, dist).max(axis=1)
    return np.nanmax(np.where(np.isnan(elev), -90.0, elev), axis=1), checked, ground
