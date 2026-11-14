# Super Intelligence (SI) usage

Space Apps asks every team to say clearly where and how SI tools were used. This is our statement.

## What the team did
- The idea, the problem framing and the product decisions came from the team. This includes what the tool shows, the order of the cards, how the "best" site is ranked, how alternatives are found (nearest first, 50 m to 10 km, same dates), the observer height, the years, and the project name.
- The engineering log records each decision with its time and who made it.
- The team members checked the results themselves, for example the site coordinates in NASA Moon Trek and LROC QuickMap.
- The team reviewed the code in VS Code as it was written, found what was missing and asked for changes (for example clearer charts, finer horizon sampling and the ranking rules), and tested it together with Claude Code.

## What SI did
- **Technical options:** SI prepared options for some technical choices, such as the grid size, the region, the data sources and the time formats. The team chose among them; the log marks these steps.
- **Code:** SI wrote the code to the team's decisions: the Python pipeline, the tests and the web app.
- **Checking:** SI checked calculations against independent sources (JPL Horizons, the IAU gazetteer, a second LOLA map), measured the sampling errors and reported them.
- **Language:** SI translated the team's Turkish notes into English for the log and checked spelling and grammar.

## Tool
- Claude (Anthropic), used through Claude Code. Commits made with SI help carry a "Co-Authored-By: Claude" line.

## Images, video and audio
- No SI-generated images, video or audio are used. The pictures in this repository are screenshots of our own app and of NASA tools.
- If an SI-generated image is ever added, it will carry a visible "SI-generated" watermark, as the rules require.
