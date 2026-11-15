# Engineering log: Ultimate Laplace

NASA Space Apps Challenge 2026 · Challenge: Lunar Landing Site Navigator · Local event: Eindhoven (virtual)

Team: K. Ü. (team captain) · A. K. G.

All times are Netherlands time (CET). Every idea, decision and finished task is written here with its time and who did it. Work on this project began after the official start (14 Nov 2026, 09:00).

## 14 November 2026

- 09:00: Hackathon starts.
- 09:23–10:22: Idea round (no SI used). The team read the challenge text and wrote its own ideas. Entries below are translated from Turkish; the translation was done with SI.

  K. Ü., "What would a mission planner going to the Moon want to know?"
  1. "I think it is a system that calculates the coordinates where the crew sent to the Moon will land."
  2. "A system that finds a safe place where communication with Earth is not cut off."
  3. "Because it depends on solar-powered systems, a system that finds the time and the place on the Moon that can get the most solar energy."

  A. K. G., the challenge in his own words (after reading the Objectives):
  "A landing mission at the Moon's south pole is difficult because of how long it receives sunlight and because communication with Earth has to stay reliable. Systems made by qualified experts are used for this, but they can seem a bit complex and complicated. What is asked of us here should be to use a clearer and simpler system and interface, and to build a simpler coordinate and date calculation system that makes south pole landing missions more accessible."

  K. Ü. and A. K. G., "Which decision will our tool help the planner make better?"
  1. It should get the most sunlight.
  2. The terrain height should not block sunlight or communication with Earth.
  3. The time spent in darkness should be as short as possible.
  4. If there is a problem with the best date and coordinates found, it should quickly find alternative coordinates in the same or the nearest date range, working in the background without losing time and starting from the best option.
- 09:56: Project repository created (private). License: Apache 2.0.
- By 11:25: Decision round (no SI used for the decisions). Team decisions by K. Ü. and A. K. G., summarized and translated from Turkish with SI:
  1. Users: The main user is a mission planner. So that the judges can see everything, the tool should also work for educators and the public.
  2. Sites: First, the system suggests the best coordinates and dates, starting from the best, with the lunar south pole as the main focus. A checkbox, "I want to enter my own coordinates", opens a coordinate input.
  3. Dates: The tool looks at a whole year. The month around the suggested date is examined in more detail.
  4. Accuracy: Keep the error as small as possible and state clearly how large it is.
  5. Data: Use NASA data.
  6. Screen, from top to bottom:
     - Input card: site list; "with terrain / flat horizon / blocked by terrain" buttons; sunlight lost per year, sunlit hours per year and longest darkness (in hours); Earth visibility data.
     - Location and time card: latitude, longitude, ground elevation, date, local time, UTC, Sun azimuth, Sun elevation and status.
     - Sunlight over the year, with day and time controls. Moving them updates the related values in the cards above and the view below.
     - Horizon view: the terrain horizon with the Sun's path and Earth's position, moving with the controls.
  7. Alternatives: If anything puts the landing at risk (for example, a solar flare or a meteorite impact at the site), the tool looks for alternatives the same way it finds the best option. It starts with the nearest places, at least 50 m away and at most 10 km away, in the same date range. Only if no place is found does it change the date.
  8. Printout: The critical data (date, time, coordinates and elevation) can be printed, together with the last two visual cards if needed.
- 11:40: Project name chosen by the team: Triad. Proposed by K. Ü.; the other options were Zenith, Solstice and Selenelion.
- 11:45: Technical plan; the team made these choices:
  - Years: 2027 and 2028, every 10 minutes.
  - Region: from 84°S to the south pole.
  - Grid: 2 km. For custom coordinates, the tool uses the nearest computed point and shows how far away it is.
  - Times shown: UTC, the user's local time and lunar local solar time.
  - Data: LOLA south pole elevation map (20 m per pixel) for the terrain; NAIF SPICE files for the Sun, Earth and the Moon's orientation; JPL Horizons as an independent check; Quickmap and Moon Trek for coordinate checks and pictures.
- 12:05: Code step 1, written with SI: terrain horizon from the LOLA map and Sun and Earth directions from NAIF SPICE. Checked against JPL Horizons at 4 south pole sites on 5 dates in 2027–2028 (40 comparisons): the largest difference is 0.00000001° for the Sun and 0.00003° for Earth.
- 12:16: Team decisions:
  - The horizon is computed from 2 m above the ground (the height of a lander's solar panel and antenna).
  - Sunlight is measured as the visible fraction of the Sun's disk, because a solar panel's power depends on it.
  - Communication with Earth counts only when Earth's whole disk is above the horizon.
- 12:16: The Moon's atmosphere is ignored for refraction. Its surface pressure is about 3 × 10⁻¹⁵ bar (NASA Moon Fact Sheet), so its effect on the horizon is far too small to measure.
- 12:22: Code step 2, written with SI: the visible share of the Sun's disk and whether Earth's whole disk is above the horizon, following the team's decisions.
- 13:01: Code step 3, written with SI: the grid run. A trial on 15 points gave the same results twice; the floor of Shackleton crater came out dark all year, as expected for a permanently shadowed region.
- 13:21: Team decisions on sites and dates:
  - The site list has the system's top 10 sites, plus NASA's Artemis III candidate regions and well-known south pole sites.
  - NASA's 2024 announcement names the regions but gives no coordinates. K. Ü. reads the region centers in NASA Moon Trek and A. K. G. checks them in Quickmap. For regions that are not in the Moon Trek layer, the tool uses its best point within 15 km of the IAU feature center.
  - Every site shows where its coordinates come from.
  - When the tool looks for alternatives, it keeps the same start and end dates.
- 13:23: Grid run finished: 26,045 points, 2027–2028, every 10 minutes (22 minutes on 10 cores). The best grid point gets 66% of full sunlight; a 150 m search around the top points raised this to 77%, so the best places are narrow ridges.
- 13:32: Team decision on ranking: a site must see Earth's whole disk at least 30% of the time. Among those, the site with the shortest longest period of darkness comes first, then the one with the most sunlight.
- 14:09: Team decisions on ranking: sites in the list are at least 10 km apart, and longest-darkness values within 24 hours of each other count as equal, so that sunlight decides between them. Code written with SI; the case that prompted the change is now a test.
- 14:24: Web app, written with SI from the team's screen plan (four cards and print). Its formulas give the same results as the Python code for the 10 suggested sites (largest difference 0.000005 in the share of sunlight).
- 14:24: Team approved these definitions: the suggested landing window is the 30-day period in the year with the most sunlight in which Earth is in view at least 30% of the time; an alternative must keep Earth in view at least 30% of the time in the same dates and get some sunlight, nearest first; "Blocked by terrain" shows in red the times when the terrain hides a Sun that flat ground would see; lunar local solar time splits one lunar day into 24 lunar hours, with the Sun highest at 12:00.
- 14:35: Team request: cards 3 and 4 were hard to read. Added month names, times of day, an Earth strip and a color key to card 3; compass letters, labels for the Sun and Earth and a key to card 4. No numbers changed.
- 15:27: Accuracy test (code written with SI): sampling the horizon twice as finely showed that 20 m steps near the site sometimes missed steep slopes. Team decision: use 5 m steps out to 500 m and 10 m steps out to 2 km, and recompute everything. Grid run 2 finished in 29 minutes; the 10 suggested sites did not change.
- 15:27: Added ACCURACY.md, SI_USAGE.md, a full REFERENCES.md and README.md, written with SI and checked by the team.
- 15:38: Checks by the team: K. Ü. and A. K. G. together found all 10 suggested sites in LROC QuickMap at the right coordinates (screenshots in docs/quickmap, named by coordinates); they sit on crater rims and ridges, as the calculation suggests. They also looked at sites 1 and 3 in NASA Moon Trek (docs/moon-trek). QuickMap's status bar does not show heights, so the heights could not be compared. The NASA Artemis III region layer could not be found in Moon Trek.
- 17:05: K. Ü. and A. K. G. downloaded NASA's Artemis III candidate region outlines (13 regions from 2022) from NASA Moon Trek. Team decisions: the tool finds the best point inside each outline on a 500 m grid; Mons Mouton and Slater Plain, 2024 regions without a published outline, use the best point within 15 km of their IAU centers and are marked approximate; Peak near Cabeus B is not listed because it lies at about 82°S, outside the computed area. Code written with SI.
- 17:05: The best points inside NASA's regions did better than our 2 km suggestions (Connecting Ridge: 82% sunlight; de Gerlache Rim: 155 hours longest darkness). Team decision: search every 500 m around the 30 best grid candidates and choose the 10 suggested sites again. Three sites stayed in the list and seven are new; the seven new ones still need QuickMap checks.
- 17:08: Team request: the date next to the day slider can now be typed or picked from a calendar; it moves the slider and all cards, and only dates in the chosen year are accepted.
- 17:11: Team request: the site list marks suggested sites that lie inside a NASA Artemis III region (sites 1, 3, 5 and 8). When users enter their own coordinates, the tool says if the place is inside a NASA region, or already in the list within 1 km, with a button to open that site. A test checks that the browser and the Python code agree on 3,000 points.

## 15 November 2026

- 09:19: K. Ü. and A. K. G. together found the 7 new suggested sites in LROC QuickMap at the right coordinates (screenshots in docs/quickmap, named by coordinates). Like the first ones, they sit on crater rims and ridges. All 10 suggested sites are now checked.
- 09:49: New-user test: K. Ü. wrote 7 small tasks covering every part of the app, and A. K. G. did all of them without help. His note: the suggested landing window figures were too small to read easily.
- 09:49: Changes from the test, team decisions: the suggested landing window is shown in large boxes, and the "Flat horizon" button now changes all numbers, so users can compare the real terrain with a smooth Moon.
- 10:15: Project summary for the submission form written by K. Ü.; A. K. G. and K. Ü. wrote what they hope to achieve. Translated from Turkish with SI.
- 10:15: Demo: the team asked for both a 30-second video and a 7-slide deck, to choose one. The video (29.5 seconds, silent, English captions, marked "SI-assisted") was made with SI from screen captures of the app; its captions are shortened from the team's summary. To capture the frames, the app can now open a given view from its address, and the local time is always shown in English.
- 10:28: The team chose the video as the demo; the slides stay in the repository as extra material. K. Ü. and A. K. G. chose the opening hook (mainly their own "first home on the Moon" idea, combined with the 50-meter finding) and asked for one of their QuickMap screenshots as its background.
- 10:28: Team question about NASA's name and logo: the rules forbid NASA logos and other design elements, not naming NASA as a data source. The Moon Trek logo was blurred out of the two Moon Trek screenshots, and the app, README, video and slides now say: "Triad is a student project. It is not made or endorsed by NASA."
- 10:35: References check: A. K. G. and K. Ü. opened every link in REFERENCES.md one by one; all of them opened.
- 10:35: English check: A. K. G. read the video captions and the slides and found no mistakes. A second check with SI suggested two small wording changes.
