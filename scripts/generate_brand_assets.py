from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"
BG = "#0A0A0F"
GREEN = "#39FF14"
GREEN_LIGHT = "#7CFF61"
GREEN_DARK = "#1E7A12"
TEXT = "FIGHT TIMER"


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        ROOT
        / "node_modules"
        / "@expo-google-fonts"
        / "bebas-neue"
        / "400Regular"
        / "BebasNeue_400Regular.ttf",
        ROOT
        / "node_modules"
        / "@expo-google-fonts"
        / "orbitron"
        / "700Bold"
        / "Orbitron_700Bold.ttf",
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def draw_glove(size: int = 420) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    s = size

    knuckle = (int(s * 0.10), int(s * 0.10), int(s * 0.58), int(s * 0.38))
    body = (int(s * 0.18), int(s * 0.12), int(s * 0.70), int(s * 0.50))
    thumb = (int(s * 0.58), int(s * 0.24), int(s * 0.86), int(s * 0.48))
    wrist = [
        (int(s * 0.22), int(s * 0.42)),
        (int(s * 0.63), int(s * 0.42)),
        (int(s * 0.56), int(s * 0.64)),
        (int(s * 0.34), int(s * 0.70)),
        (int(s * 0.18), int(s * 0.58)),
    ]
    cuff = (int(s * 0.28), int(s * 0.58), int(s * 0.60), int(s * 0.90))

    draw.ellipse(knuckle, fill=rgba(GREEN_LIGHT))
    draw.rounded_rectangle(body, radius=int(s * 0.14), fill=rgba(GREEN))
    draw.rounded_rectangle(thumb, radius=int(s * 0.11), fill=rgba(GREEN))
    draw.polygon(wrist, fill=rgba(GREEN_DARK))
    draw.rounded_rectangle(cuff, radius=int(s * 0.07), fill=rgba(GREEN))

    # Thumb seam and contour accents.
    draw.arc(
        (int(s * 0.52), int(s * 0.21), int(s * 0.74), int(s * 0.47)),
        start=214,
        end=318,
        fill=rgba(BG, 185),
        width=max(4, s // 52),
    )
    draw.arc(
        (int(s * 0.17), int(s * 0.14), int(s * 0.63), int(s * 0.46)),
        start=196,
        end=326,
        fill=rgba(GREEN_LIGHT, 170),
        width=max(4, s // 60),
    )

    # Cuff details.
    draw.rounded_rectangle(
        (int(s * 0.34), int(s * 0.65), int(s * 0.54), int(s * 0.83)),
        radius=int(s * 0.04),
        fill=rgba(BG, 235),
    )
    draw.rounded_rectangle(
        (int(s * 0.355), int(s * 0.67), int(s * 0.525), int(s * 0.81)),
        radius=int(s * 0.035),
        outline=rgba(GREEN, 180),
        width=max(3, s // 100),
    )
    draw.line(
        (int(s * 0.315), int(s * 0.73), int(s * 0.57), int(s * 0.73)),
        fill=rgba(GREEN_LIGHT, 200),
        width=max(4, s // 85),
    )

    return image


def draw_crossed_gloves(size: int) -> Image.Image:
    glove = draw_glove(max(420, int(size * 0.46)))
    left = glove.rotate(32, resample=Image.Resampling.BICUBIC, expand=True)
    right = glove.transpose(Image.Transpose.FLIP_LEFT_RIGHT).rotate(
        -32, resample=Image.Resampling.BICUBIC, expand=True
    )

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    left_box = (
        int(size * 0.05),
        int(size * 0.06),
    )
    right_box = (
        int(size * 0.31),
        int(size * 0.06),
    )
    canvas.alpha_composite(left, left_box)
    canvas.alpha_composite(right, right_box)

    alpha = canvas.getchannel("A")
    glow = alpha.filter(ImageFilter.GaussianBlur(radius=max(10, size // 36)))
    glow = ImageChops.multiply(glow, Image.new("L", (size, size), 180))
    glow_layer = Image.new("RGBA", (size, size), rgba(GREEN, 0))
    glow_layer.putalpha(glow)

    shadow = alpha.filter(ImageFilter.GaussianBlur(radius=max(8, size // 44)))
    shadow = ImageChops.multiply(shadow, Image.new("L", (size, size), 120))
    shadow_layer = Image.new("RGBA", (size, size), rgba("#000000", 0))
    shadow_layer.putalpha(shadow)

    return Image.alpha_composite(Image.alpha_composite(shadow_layer, glow_layer), canvas)


def draw_tracked_text(
    base: Image.Image,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    tracking: int,
    top_y: int,
) -> None:
    draw = ImageDraw.Draw(base)
    widths = []
    for char in text:
        bbox = draw.textbbox((0, 0), char, font=font)
        widths.append(bbox[2] - bbox[0])

    total_width = sum(widths) + tracking * max(0, len(text) - 1)
    x = (base.width - total_width) / 2

    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    offset_x = x
    for char, width in zip(text, widths):
        glow_draw.text((offset_x, top_y), char, font=font, fill=rgba(GREEN, 210))
        offset_x += width + tracking
    glow = glow.filter(ImageFilter.GaussianBlur(radius=26))
    base.alpha_composite(glow)

    offset_x = x
    for char, width in zip(text, widths):
        draw.text((offset_x, top_y), char, font=font, fill=fill)
        offset_x += width + tracking


def make_icon(path: Path, size: int = 1024) -> None:
    image = Image.new("RGBA", (size, size), rgba(BG))
    emblem = draw_crossed_gloves(int(size * 0.86))
    offset = ((size - emblem.width) // 2, (size - emblem.height) // 2 - int(size * 0.02))
    image.alpha_composite(emblem, offset)
    image.save(path)


def make_splash(path: Path, width: int = 1284, height: int = 2778) -> None:
    image = Image.new("RGBA", (width, height), rgba(BG))
    emblem_size = 760
    emblem = draw_crossed_gloves(emblem_size)
    emblem_x = (width - emblem.width) // 2
    emblem_y = 760

    font = load_font(230)

    # Subtle grounded glow behind the lockup.
    aura = Image.new("RGBA", image.size, (0, 0, 0, 0))
    aura_draw = ImageDraw.Draw(aura)
    aura_draw.ellipse(
        (width * 0.19, emblem_y + emblem.height - 36, width * 0.81, emblem_y + emblem.height + 160),
        fill=rgba(GREEN, 26),
    )
    aura = aura.filter(ImageFilter.GaussianBlur(radius=56))
    image = Image.alpha_composite(image, aura)

    image.alpha_composite(emblem, (emblem_x, emblem_y))
    draw_tracked_text(
        image,
        TEXT,
        font=font,
        fill=rgba(GREEN),
        tracking=18,
        top_y=emblem_y + emblem.height + 120,
    )
    image.save(path)


def main() -> None:
    ASSETS_DIR.mkdir(exist_ok=True)
    make_icon(ASSETS_DIR / "icon.png")
    make_icon(ASSETS_DIR / "adaptive-icon.png")
    make_splash(ASSETS_DIR / "splash.png")


if __name__ == "__main__":
    main()
