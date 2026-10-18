"""Build GPU-safe copies of the exhibition images.

The supplied collage is 14487×6776, which is larger than many graphics cards
can use as a single texture. The app loads the copies in public/exhibition/display.

Replace the source files in public/exhibition, then run:

    python scripts/prepare-display-assets.py
"""

from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "exhibition"
TARGET = SOURCE / "display"
MAX_EDGE = 4096

JOBS = ("main-collage.webp", "detail-scene.webp")


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    for name in JOBS:
        image = Image.open(SOURCE / name)
        width, height = image.size
        scale = min(1.0, MAX_EDGE / max(width, height))
        resized = image.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.Resampling.LANCZOS,
        )
        destination = TARGET / name
        resized.save(destination, "WEBP", quality=82, method=4)
        print(f"{name}: {width}x{height} -> {resized.size[0]}x{resized.size[1]}")


if __name__ == "__main__":
    main()
