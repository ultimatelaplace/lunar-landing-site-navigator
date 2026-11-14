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
