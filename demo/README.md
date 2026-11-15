# Demo

- `capture_frames.py` takes screenshots of the app (served locally on port 8765) with headless Chrome, using the app's address options (`?site=…&date=…&time=…&only=…`).
- `make_video.py` adds the captions and the "SI-assisted project" mark and encodes the 29.5-second video with ffmpeg.
- `slides.html` is the 7-slide deck; it is printed to PDF with headless Chrome.

The scripts were written with SI (see SI_USAGE.md). Paths inside them point to the team's local working folder.
