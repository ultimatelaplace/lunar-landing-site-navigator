import json
import os
from pathlib import Path

import numpy as np
import pytest

from pipeline import ephemeris

KERNELS = Path(os.environ.get("TRIAD_KERNELS", "data/kernels"))
CHECK = Path(__file__).parent / "data" / "horizons_check.json"


def test_site_frame_is_orthonormal():
    _, east, north, up = ephemeris.site_frame(-88.2, 137.0, 1500.0)
    basis = np.array([east, north, up])
    assert np.allclose(basis @ basis.T, np.eye(3), atol=1e-12)
    assert np.allclose(np.cross(east, north), up)


@pytest.mark.skipif(not KERNELS.exists(), reason="SPICE kernels not downloaded")
def test_matches_saved_horizons_values():
    ephemeris.load_kernels(KERNELS)
    rows = json.loads(CHECK.read_text())
    assert len(rows) == 40
    for r in rows:
        vec = ephemeris.body_vectors_m(r["body"], ephemeris.utc_to_et([r["utc"]]))[0]
        az, el = ephemeris.azimuth_elevation_deg(vec, r["lat"], r["lon"])
        d_az = (az - r["horizons"][0] + 180) % 360 - 180
        assert abs(d_az) < 1e-4 and abs(el - r["horizons"][1]) < 1e-4
