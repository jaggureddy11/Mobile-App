import subprocess
import os
from PIL import Image

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT_DIR = "/Users/apple/Desktop/PROJECTS/Later app/assets/showcase"
HTML_PATH = "/Users/apple/Desktop/PROJECTS/Later app/scripts/render-showcase.html"

os.makedirs(OUT_DIR, exist_ok=True)

screens = [
    (1, "01-revisit-with-intention"),
    (2, "02-save-from-any-app"),
    (3, "03-organize-by-time-mood"),
    (4, "04-private-offline-first"),
]

for screen_id, name in screens:
    png_path = os.path.join(OUT_DIR, f"{name}.png")
    jpg_path = os.path.join(OUT_DIR, f"{name}.jpg")
    url = f"file://{HTML_PATH}?screen={screen_id}"
    
    print(f"Rendering Screen {screen_id} -> {name}...")
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        f"--screenshot={png_path}",
        "--window-size=1080,1920",
        "--hide-scrollbars",
        url
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Save optimized JPEG companion
    with Image.open(png_path) as im:
        rgb_im = im.convert("RGB")
        rgb_im.save(jpg_path, quality=95, optimize=True)
    
    png_size = os.path.getsize(png_path) // 1024
    jpg_size = os.path.getsize(jpg_path) // 1024
    print(f"  ✓ Finished {name}: PNG={png_size}KB, JPG={jpg_size}KB")

# Clean up any misplaced files
stray = os.path.join(OUT_DIR, ".png")
if os.path.exists(stray):
    os.remove(stray)

print("All showcase screens rendered successfully!")
