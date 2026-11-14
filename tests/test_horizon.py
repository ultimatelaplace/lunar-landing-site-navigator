import numpy as np

from pipeline import dem
from pipeline.horizon import destination, elevation_angle_deg, horizon_profile

R = dem.MOON_RADIUS_M
SITE = (-89.0, 45.0)


def flat(height_m=0.0):
    return lambda lat, lon: np.full(np.shape(lat), height_m)


def great_circle_m(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dl = np.radians(lon2 - lon1)
    c = np.sin(p1) * np.sin(p2) + np.cos(p1) * np.cos(p2) * np.cos(dl)
    return R * np.arccos(np.clip(c, -1, 1))


def test_projection_round_trip():
    lat = np.array([-80.0, -84.5, -89.99, -87.3])
    lon = np.array([0.0, 123.4, 271.0, 359.5])
    x, y = dem.latlon_to_xy(lat, lon)
    back_lat, back_lon = dem.xy_to_latlon(*dem.pixel_to_xy(*dem.xy_to_pixel(x, y)))
    assert np.allclose(back_lat, lat, atol=1e-9)
    assert np.allclose(back_lon, lon, atol=1e-9)


def test_map_edge_is_80_south():
    x, y = dem.latlon_to_xy(-80.0, 90.0)
    row, col = dem.xy_to_pixel(x, y)
    assert abs(col - (dem.SIZE - 0.5)) < 1.0


def test_destination_distance():
    lat2, lon2 = destination(*SITE, 30.0, 12345.0)
    assert abs(great_circle_m(*SITE, lat2, lon2) - 12345.0) < 0.01


def test_flat_ground_horizon_is_level():
    profile, checked, _ = horizon_profile(flat(), *SITE, observer_height_m=0.0)
    assert np.all(np.abs(profile) < 0.001)
    assert np.all(checked == 150000.0)


def test_raised_observer_sees_geometric_dip():
    h = 100.0
    profile, _, _ = horizon_profile(flat(), *SITE, observer_height_m=h)
    expected = -np.degrees(np.arccos(R / (R + h)))
    assert np.all(np.abs(profile - expected) < 0.005)


def test_ring_wall_elevation():
    wall_m, inner, outer = 1000.0, 10000.0, 10300.0

    def height_at(lat, lon):
        d = great_circle_m(SITE[0], SITE[1], lat, lon)
        return np.where((d >= inner) & (d <= outer), wall_m, 0.0)

    profile, _, _ = horizon_profile(height_at, *SITE, observer_height_m=0.0)
    lo = elevation_angle_deg(R, R + wall_m, outer)
    hi = elevation_angle_deg(R, R + wall_m, inner)
    assert np.all((profile >= lo - 1e-9) & (profile <= hi + 1e-9))


def test_missing_data_is_reported():
    def height_at(lat, lon):
        return np.where(np.asarray(lat) > -88.9, np.nan, 0.0)

    # 0.1 degree of latitude is about 3.03 km. Walking south crosses the pole
    # and reaches the same latitude again on the far side, about 63.6 km away.
    _, checked, _ = horizon_profile(height_at, *SITE)
    assert 2900.0 < checked[0] < 3100.0
    assert 62000.0 < checked[180] < 64500.0


def test_default_observer_is_two_meters_up():
    profile, _, _ = horizon_profile(flat(), *SITE)
    expected = -np.degrees(np.arccos(R / (R + 2.0)))
    assert np.all(np.abs(profile - expected) < 0.002)
