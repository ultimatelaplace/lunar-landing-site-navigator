import numpy as np

from pipeline.ranking import rank


def sites(rows):
    lat, lon, dark, sun, earth = map(np.array, zip(*rows))
    return rank(lat, lon, dark, sun, earth)


def test_earth_threshold_removes_sites():
    order = sites([(-85.0, 0.0, 100, 0.9, 0.29), (-86.0, 0.0, 200, 0.5, 0.31)])
    assert order == [1]


def test_shorter_darkness_wins_when_far_apart():
    order = sites([(-85.0, 0.0, 400, 0.9, 0.5), (-86.0, 0.0, 300, 0.4, 0.5)])
    assert order == [1, 0]


def test_close_darkness_is_a_tie_decided_by_sunlight():
    # the case found in the grid run: 359 h with 29% sun must not beat 360 h with 54% sun
    order = sites([(-85.0, 0.0, 359, 0.29, 0.52), (-86.0, 0.0, 360, 0.54, 0.53)])
    assert order == [1, 0]


def test_sites_closer_than_10_km_are_skipped():
    # 0.1 degree of latitude is about 3 km
    order = sites([(-85.0, 0.0, 100, 0.6, 0.5), (-85.1, 0.0, 110, 0.6, 0.5), (-86.0, 0.0, 120, 0.6, 0.5)])
    assert order == [0, 2]
