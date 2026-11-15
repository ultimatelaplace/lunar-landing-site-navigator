# Triad

**Where and when can a lander at the Moon's south pole keep its solar panels in the Sun and its antenna pointed at Earth?**

Triad is a web tool for the NASA Space Apps Challenge 2026 challenge "Lunar Landing Site Navigator". It compares landing sites and dates near the lunar south pole using NASA terrain data and ephemerides, and it suggests the best places, the best landing window and nearby alternatives when plans change.

Team Ultimate Laplace · Eindhoven (virtual)

*Triad is a student project. It is not made or endorsed by NASA. It uses NASA data, which are credited in [REFERENCES.md](REFERENCES.md).*

**Live app:** the link is added when the repository becomes public.

## What it does

- **Suggests sites.** It checks 26,045 points (a 2 km grid) from 84°S to the pole, every 10 minutes through 2027 and 2028, then searches every 500 m around the 30 best and lists the 10 best by the team's rule: Earth's whole disk must be in view at least 30% of the time; then the shortest longest darkness wins (values within 24 hours count as equal), then the most sunlight. Listed sites are at least 10 km apart.
- **Compares with NASA's candidate regions.** For each of NASA's Artemis III candidate regions (outlines from NASA Moon Trek), it shows the best point inside the outline, found on a 500 m grid. Mons Mouton and Slater Plain, which have no published outline, are marked approximate. Peak near Cabeus B is not listed because it lies at about 82°S, outside the computed area.
- **Shows the conditions.** For any site it shows the share of sunlight, full-sun hours, the longest darkness, the time with Earth fully in view and the longest time without Earth, for each year.
- **Suggests a landing window.** The 30-day period with the most sunlight in which Earth is in view at least 30% of the time.
- **Finds alternatives.** If a site cannot be used, it looks at nearby places, nearest first, from 50 m to 10 km away, for the same dates; if none qualifies, it moves the dates.
- **Shows the sky.** A calendar of sunlight and Earth visibility through the year, and the horizon all around the site with the paths of the Sun and Earth.
- **Accepts your own coordinates** anywhere from 84°S to the pole, and prints a one-page report.

## How it works

1. **Terrain:** the NASA LRO LOLA south polar elevation map (20 m per pixel). From every point, the tool looks out in 360 directions up to 150 km and finds the highest terrain angle, taking the Moon's curvature into account. The observer is 2 m above the ground, the height of a lander's solar panel and antenna.
2. **Sun and Earth:** NAIF SPICE ephemerides (DE440, with the Moon's libration) give the direction of the Sun and Earth from each point every 10 minutes.
3. **Visibility:** the share of the Sun's disk above the terrain (a solar panel's power depends on it) and whether Earth's whole disk is above the terrain (needed for direct communication).
4. **Web app:** plain HTML, CSS and JavaScript. The browser repeats the same calculation for the chosen site; a test checks that it gives the same results as the Python code.

## Accuracy

See [ACCURACY.md](ACCURACY.md). In short: the Sun and Earth directions match JPL Horizons within 0.00003°; sampling the horizon twice as finely changes the share of sunlight by at most 0.17 percentage points; the main limits are the 20 m terrain map and the 10-minute time step.

## Team

- **K. Ü.** (team captain): ideas and problem framing, product decisions, ranking rule, project name; with A. K. G., checked all 10 suggested sites in LROC QuickMap and NASA Moon Trek.
- **A. K. G.**: objectives summary, product decisions; with K. Ü., checked all 10 suggested sites in LROC QuickMap and NASA Moon Trek.

Every idea and decision is recorded with its time in the [engineering log](ENGINEERING_LOG.md).

## Run it yourself

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
# put the LOLA map in data/lola/ and the SPICE kernels in data/kernels/ (see REFERENCES.md)
.venv/bin/python -m pipeline.run_grid data        # about 35 minutes on 10 cores
.venv/bin/python -m pipeline.export_web data      # writes docs/data
.venv/bin/python -m pytest tests && node tests/js/physics.test.mjs
python3 -m http.server --directory docs           # then open http://localhost:8000
```

## Sources, SI use and license

- All data, tools and libraries: [REFERENCES.md](REFERENCES.md).
- How Super Intelligence (SI) was used: [SI_USAGE.md](SI_USAGE.md).
- License: Apache 2.0 ([LICENSE](LICENSE)).
- Demo: a 30-second video ([docs/demo/triad-demo-30s.mp4](docs/demo/triad-demo-30s.mp4)); a 7-slide deck is included as extra material ([docs/demo/triad-7-slides.pdf](docs/demo/triad-7-slides.pdf)). Both are made by [demo/](demo/) from screenshots of the app.
