# References

Every data set, tool and library used in Triad is listed here, including open-source ones.

## NASA data and tools

- **LRO LOLA south polar elevation maps**, products LDEM_80S_20M (20 m per pixel, used for all results) and LDEM_80S_40M (40 m per pixel, used only to check that the 20 m map is read without a pixel shift). NASA Planetary Data System, Geosciences Node: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/
- **NAIF SPICE toolkit kernels** (NASA/JPL Navigation and Ancillary Information Facility): de440s.bsp, moon_pa_de440_200625.bpc, moon_de440_250416.tf, pck00011.tpc, naif0012.tls. https://naif.jpl.nasa.gov/pub/naif/generic_kernels/
- **JPL Horizons System** (resource listed on the challenge page), used as an independent check of the Sun and Earth directions: https://ssd.jpl.nasa.gov/horizons/
- **NASA Moon Trek** (resource listed on the challenge page), used by the team to look at sites and NASA's Artemis III candidate landing regions: https://trek.nasa.gov/moon/
- **Artemis III Candidate Landing Regions** (13 regions announced in August 2022), outline file A3_Named_regions_SP.geojson downloaded from NASA Moon Trek by the team; stored as docs/data/nasa_artemis_regions_2022.geojson.
- **LROC QuickMap** (resource listed on the challenge page), used by the team to check site coordinates and heights: https://quickmap.lroc.im-ldi.com/
- **NASA Moon Fact Sheet**, NSSDC, for the lunar surface pressure: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
- **NASA news release RELEASE24-136**, "NASA Provides Update on Artemis III Moon Landing Regions" (28 October 2024): https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/

- **Demo video background:** LRO image of suggested site 1 via LROC QuickMap (NASA/GSFC/Arizona State University), screenshot by the team.

## Other references

- **Gazetteer of Planetary Nomenclature**, IAU Working Group for Planetary System Nomenclature and USGS Astrogeology, for feature coordinates (for example, Shackleton crater): https://planetarynames.wr.usgs.gov/
- **IAU 2015 Resolution B3**, nominal solar radius 695,700 km. Published as Prša et al. (2016), "Nominal values for selected solar and planetary quantities: IAU 2015 Resolution B3", The Astronomical Journal 152, 41: https://doi.org/10.3847/0004-6256/152/2/41
- **WGS 84**, Earth equatorial radius 6,378,137 m (NGA/NIMA technical report TR8350.2).
- **NASA Space Apps Challenge 2026**, challenge "Lunar Landing Site Navigator": https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/

## Software

- NumPy (BSD-3-Clause license): https://numpy.org/
- SpiceyPy (MIT license), the Python interface to the NAIF SPICE toolkit: https://github.com/AndrewAnnex/SpiceyPy
- pytest (MIT license), for tests: https://pytest.org/
- Node.js (MIT license), only for running the browser-formula test: https://nodejs.org/
- For the demo video and slides only: FFmpeg (LGPL/GPL) to encode the video, Pillow (MIT-CMU license) to add the captions, and Google Chrome in headless mode to take screenshots of the app and print the slides.
- The web app uses no outside libraries.

## Prior work by the team

- Our own pre-hackathon research and learning exercises on the topic (allowed by the Space Apps rules: "research the topic"). No code, data or files from that work were used in this project.
