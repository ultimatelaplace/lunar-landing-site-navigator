"""Team ranking rule for the suggested landing sites."""
import numpy as np

from . import dem

MIN_EARTH_SHARE = 0.30       # Earth's whole disk visible at least 30% of the time
DARKNESS_TIE_HOURS = 24.0    # longest-darkness values this close count as equal
MIN_SEPARATION_M = 10_000.0  # sites in the list are at least 10 km apart


def rank(lat, lon, longest_dark_h, sun_share, earth_share, count=10):
    """Indices of the suggested sites, best first.

    Sites must reach the Earth threshold. They are taken in order of shortest
    longest darkness; a run of sites within DARKNESS_TIE_HOURS of the first one
    in the run is treated as a tie and ordered by sunlight instead.
    """
    ok = np.flatnonzero(np.asarray(earth_share) >= MIN_EARTH_SHARE)
    ok = ok[np.argsort(np.asarray(longest_dark_h)[ok], kind="stable")]
    ordered = []
    start = 0
    while start < len(ok):
        end = start
        limit = longest_dark_h[ok[start]] + DARKNESS_TIE_HOURS
        while end < len(ok) and longest_dark_h[ok[end]] <= limit:
            end += 1
        group = ok[start:end]
        ordered.extend(group[np.argsort(-np.asarray(sun_share)[group], kind="stable")])
        start = end
    x, y = dem.latlon_to_xy(np.asarray(lat), np.asarray(lon))
    chosen = []
    for i in ordered:
        if all(np.hypot(x[i] - x[j], y[i] - y[j]) >= MIN_SEPARATION_M for j in chosen):
            chosen.append(i)
            if len(chosen) == count:
                break
    return chosen
