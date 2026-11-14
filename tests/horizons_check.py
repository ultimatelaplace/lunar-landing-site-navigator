"""Compare our Sun and Earth directions with JPL Horizons for a few sites and times.

Needs internet. Writes tests/data/horizons_check.json so the numbers can be re-checked.
"""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np

from pipeline import ephemeris

SITES = [(-89.5, 0.0), (-89.9, 222.7), (-86.0, 300.0), (-84.5, 45.0)]
TIMES = ["2027-01-01 00:00", "2027-04-15 06:30", "2027-08-20 18:10", "2028-02-29 12:00", "2028-11-30 23:50"]
BODIES = {"10": "SUN", "399": "EARTH"}
API = "https://ssd.jpl.nasa.gov/api/horizons.api"


def horizons_az_el(body, lat, lon, utc):
    params = {
        "format": "text", "COMMAND": f"'{body}'", "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'", "SITE_COORD": f"'{lon},{lat},0'", "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'", "TLIST": f"'{utc}'", "QUANTITIES": "'4'",
        "ANG_FORMAT": "'DEG'", "EXTRA_PREC": "'YES'",
    }
    text = urllib.request.urlopen(API + "?" + urllib.parse.urlencode(params), timeout=60).read().decode()
    row = text.split("$$SOE")[1].split("$$EOE")[0].split()
    return float(row[-2]), float(row[-1])


def main(kernel_dir):
    ephemeris.load_kernels(kernel_dir)
    rows = []
    for body, name in BODIES.items():
        for utc in TIMES:
            vec = ephemeris.body_vectors_m(name, ephemeris.utc_to_et([utc]))[0]
            for lat, lon in SITES:
                az, el = ephemeris.azimuth_elevation_deg(vec, lat, lon)
                h_az, h_el = horizons_az_el(body, lat, lon, utc)
                d_az = (az - h_az + 180) % 360 - 180
                rows.append(dict(body=name, utc=utc, lat=lat, lon=lon, ours=[az, el],
                                 horizons=[h_az, h_el], d_az=d_az, d_el=el - h_el))
    out = Path(__file__).parent / "data" / "horizons_check.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(rows, indent=1))
    for name in BODIES.values():
        sel = [r for r in rows if r["body"] == name]
        print(f"{name}: {len(sel)} comparisons, max |d_el| = {max(abs(r['d_el']) for r in sel):.5f} deg, "
              f"max |d_az| = {max(abs(r['d_az']) for r in sel):.5f} deg")


if __name__ == "__main__":
    main(sys.argv[1])
