import numpy as np

from pipeline.visibility import (angular_radius_deg, horizon_at, visible_fraction,
                                 whole_disk_visible)

FLAT = np.zeros(360)
R_SUN = 0.2666


def test_horizon_interpolates_and_wraps():
    profile = np.arange(360.0)
    assert horizon_at(profile, 10.25) == 10.25
    assert np.isclose(horizon_at(profile, 359.5), 179.5)  # halfway between 359 and 0


def test_sun_angular_radius_at_one_au():
    assert abs(angular_radius_deg(695_700_000.0, 149_597_870_700.0) - 0.2665) < 0.0005


def test_sun_fraction_on_flat_horizon():
    assert np.isclose(visible_fraction(FLAT, 100.0, 5.0, R_SUN), 1.0)
    assert np.isclose(visible_fraction(FLAT, 100.0, -5.0, R_SUN), 0.0)
    assert abs(visible_fraction(FLAT, 100.0, 0.0, R_SUN) - 0.5) < 0.01


def test_sun_fraction_matches_circle_segment():
    # center above the horizon by half a radius: exact share is 1 - (acos(u) - u sqrt(1 - u^2)) / pi
    u = 0.5
    exact = 1 - (np.arccos(u) - u * np.sqrt(1 - u * u)) / np.pi
    got = visible_fraction(FLAT, 100.0, u * R_SUN, R_SUN)
    assert abs(got - exact) < 0.01


def test_sloped_horizon_cuts_one_side():
    profile = np.zeros(360)
    profile[101:] = 10.0  # a wall rises just east of azimuth 100
    frac = visible_fraction(profile, 100.0, 1.0, R_SUN)
    assert 0.2 < frac < 0.8


def test_earth_whole_disk():
    r = 0.95
    assert whole_disk_visible(FLAT, 50.0, 1.0, r)
    assert not whole_disk_visible(FLAT, 50.0, 0.9, r)
    bump = np.zeros(360)
    bump[50] = 0.5
    assert not whole_disk_visible(bump, 50.0, 1.2, r)
