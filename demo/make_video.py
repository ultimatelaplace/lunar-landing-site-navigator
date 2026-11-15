"""Build the 30-second silent demo video from app frames, with English captions."""
import glob, os, subprocess
from PIL import Image, ImageDraw, ImageFont

D = os.path.expanduser("~/Developer/UltimateLaplace/demo")
OUT = f"{D}/kare/video"; os.makedirs(OUT, exist_ok=True)
for f in glob.glob(f"{OUT}/*.png"): os.remove(f)
FPS, W, H = 10, 1280, 800
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"; REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
font = lambda p, s: ImageFont.truetype(p, s)
LINK = "ultimatelaplace.github.io/lunar-landing-site-navigator"

def caption(img, text):
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, H - 96, W, H], fill=(10, 18, 32, 225))
    f = font(BOLD, 28)
    lines, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if d.textlength(trial, font=f) > W - 80: lines.append(line); line = word
        else: line = trial
    lines.append(line)
    y = H - 48 - 18 * len(lines)
    for ln in lines:
        d.text((W / 2, y), ln, font=f, fill="white", anchor="mt"); y += 36
    return img

def mark(img):
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([W - 250, 12, W - 12, 46], 8, fill=(10, 18, 32, 200))
    d.text((W - 131, 29), "SI-assisted project", font=font(BOLD, 18), fill="white", anchor="mm")
    return img

def card(lines, background=None, credit=None):
    if background:
        # team's QuickMap screenshot: keep only the lunar surface, darken it so the text stays readable
        img = Image.open(background).convert("RGB").crop((140, 330, 1420, 1130)).resize((W, H))
        img = Image.blend(img, Image.new("RGB", (W, H), (5, 10, 20)), 0.55)
    else:
        img = Image.new("RGB", (W, H), (11, 18, 32))
    if credit:
        ImageDraw.Draw(img).text((16, H - 16), credit, font=font(REG, 16), fill="#c8d2de", anchor="lb")
    d = ImageDraw.Draw(img); y = 230
    for text, size, bold, color in lines:
        d.text((W / 2, y), text, font=font(BOLD if bold else REG, size), fill=color, anchor="mt"); y += size + 34
    return img

frames = []
def add(img, count): frames.extend([img] * count)  # count is a number of frames at 10 per second

add(mark(card([("Ice in the craters. Sunlight on the ridges.", 40, True, "white"),
               ("The Moon's south pole could be humanity's first home on the Moon.", 34, True, "white"),
               ("But move just 50 meters, and a lander can", 38, True, "#f2c94c"),
               ("lose two-thirds of its sunlight.", 38, True, "#f2c94c"),
               ("Triad finds the right place.", 30, False, "#c8d2de")],
              background=os.path.expanduser("~/Developer/UltimateLaplace/lunar-landing-site-navigator/docs/quickmap/88.5946S-292.051E.webp"),
              credit="Background: suggested site 1, LRO image via LROC QuickMap (NASA/GSFC/Arizona State University), screenshot by the team")), 70)
add(mark(caption(Image.open(f"{D}/kare/app/site.png").convert("RGB"),
     "Triad, by team Ultimate Laplace, checks 26,045 places near the south pole, every 10 minutes for 2 years.")), 36)
year = sorted(glob.glob(f"{D}/kare/app/year-*.png"))[:15]
for f in year:
    add(mark(caption(Image.open(f).convert("RGB"), "It shows when the Sun powers the lander (yellow) and when Earth is in view for radio contact (blue).")), 3)
hor = sorted(glob.glob(f"{D}/kare/app/horizon-*.png"))[:20]
for f in hor:
    add(mark(caption(Image.open(f).convert("RGB"), "Ridges and craters hide the Sun and Earth. Triad shows exactly when, with live numbers.")), 3)
add(mark(caption(Image.open(f"{D}/kare/app/alternatives.png").convert("RGB"),
     "If a site can't be used, Triad finds alternatives from 50 m away, within seconds.")), 40)
add(mark(card([("4 of our 10 suggested sites lie inside", 38, True, "white"),
               ("NASA's Artemis III candidate regions.", 38, True, "white"),
               ("Checked against NASA JPL Horizons within 0.00003°.", 30, False, "#f2c94c"),
               (LINK, 26, False, "#9fb3c8"),
               ("A student project, not made or endorsed by NASA.", 20, False, "#7f93a8")])), 44)
assert len(frames) <= 295, len(frames)
for i, img in enumerate(frames): img.save(f"{OUT}/{i:04d}.png")
mp4 = f"{D}/triad-demo-30s.mp4"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{OUT}/%04d.png",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", mp4], check=True)
print(len(frames), "frames ->", mp4)
