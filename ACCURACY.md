# Accuracy

How much can you trust Triad's numbers? These are the checks we ran and what they found. The raw results are in [tests/data](tests/data).

## Checks against independent sources

| Check | Method | Result |
|---|---|---|
| Sun and Earth directions | Compared with JPL Horizons at 4 south pole sites on 5 dates in 2027–2028 (40 comparisons) | Largest difference 0.00000001° for the Sun and 0.00003° for Earth |
| Terrain map orientation | Shackleton crater at its IAU/USGS gazetteer position (89.67°S, 129.78°E, diameter 20.92 km) | Floor at −2,789 m at the center; the highest rim is 10.5 km from the center, half the gazetteer diameter |
| Pixel shift | 20 m map compared with the 40 m LOLA map on about 100,000 steep points, shifting the 40 m map by 0, 10 and 20 m | Smallest difference at zero shift (1.41 m RMS); a 10 m shift raises it to 2.9 m, so there is no half-pixel error |
| Browser versus Python | The web app's formulas compared with the Python results for the 10 suggested sites, both years | Share of sunlight within 0.000005, share of Earth time within 0.00003, durations within one 10-minute step |

## How finely the horizon is sampled

We recomputed 50 points (the 10 suggested sites and 40 random sunlit points) with twice as many distance steps and, separately, with twice as many directions, and measured how much the results changed.

| Change | Horizon angle | Share of sunlight | Share of Earth time | Longest darkness |
|---|---|---|---|---|
| Twice as many distance steps | median 0.05°, 95% of cases under 0.19°, at most 0.43° | at most 0.17 percentage points | at most 0.19 percentage points | at most 0.7 hours |
| Twice as many directions (720 instead of 360) | median 0.09°, 95% under 0.42°, at most 1.0° | at most 0.03 percentage points | at most 0.09 percentage points | 10 suggested sites: at most 1.5 hours; random points: 95% under 1.2 hours |

The first version used 20 m steps near the site. The test showed that steep slopes close to the site were sometimes missed, so we changed to 5 m steps out to 500 m and 10 m steps out to 2 km and recomputed everything. The list of suggested sites did not change.

One random point with little sunlight (13%) showed an 80.5-hour change in its longest darkness when sampled in 720 directions: a glimpse of the Sun lasting a few minutes either split or joined two long dark periods. The longest darkness can jump like this at dim places; the share of sunlight there changed by less than 0.001 percentage points.

## Things we account for

- **Earth's whole disk** must be above the terrain for communication, and the **visible share of the Sun's disk** sets the sunlight, as the team decided.
- **The Moon's libration, light travel time and Earth's parallax** are included through NAIF SPICE; the Horizons comparison confirms this.
- **No atmospheric refraction:** the Moon's surface pressure is about 3 × 10⁻¹⁵ bar (NASA Moon Fact Sheet), so refraction is far too small to matter.
- **The Moon's curvature** is included when finding the horizon.
- **Observer height** is 2 m above the ground.

## Limits

- **Map resolution:** the terrain map has 20 m pixels. Rocks and slopes smaller than that are not seen.
- **Time steps:** results use 10-minute steps, so sunrise, sunset and Earth rise times can be off by up to 10 minutes.
- **Map edge:** for 3,892 grid points near 84°S, some directions can only be checked out to 121 km instead of 150 km, because the map ends at 80°S. Distant mountains in those directions might be missed.
- **Stored horizons:** the web app stores horizons in steps of 0.002°, which changes them by at most 0.001°.
- **Grid spacing:** the whole area is computed on a 2 km grid, and the suggested sites and NASA regions are then searched every 500 m. The best spots are narrow ridges: a search at 150 m spacing found places with more sunlight than the 500 m points next to them. The alternative search, which starts 50 m from a site, helps to find them.
- **Sun model:** the Sun is treated as a disk of even brightness.
