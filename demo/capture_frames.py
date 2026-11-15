"""Capture app frames for the demo video with headless Chrome (local server on :8765)."""
import os, subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = os.path.expanduser("~/Developer/UltimateLaplace/demo/kare/app")
BASE = "http://localhost:8765/?"
ENV = dict(os.environ, TZ="Europe/Amsterdam", LANG="en_US.UTF-8")

def shot(name, query):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--lang=en-US",
                    "--window-size=1280,800", "--virtual-time-budget=20000",
                    f"--screenshot={OUT}/{name}.png", BASE + query], env=ENV, capture_output=True)

jobs = [("site", "site=top1&only=site"),
        ("alternatives", "site=top1&only=site&alternatives=1")]
d0 = datetime(2027, 9, 10)
for k in range(21):
    d = d0 + timedelta(days=2 * k)
    jobs.append((f"year-{k:02d}", f"site=top1&date={d:%Y-%m-%d}&time=12:00&only=year,time"))
t0 = datetime(2027, 3, 18, 0, 0)
for k in range(25):
    t = t0 + timedelta(hours=2 * k)
    jobs.append((f"horizon-{k:02d}", f"site=top1&date={t:%Y-%m-%d}&time={t:%H:%M}&only=time,horizon"))
with ThreadPoolExecutor(6) as pool:
    list(pool.map(lambda j: shot(*j), jobs))
print(len(jobs), "frames")
