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
