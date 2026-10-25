import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_og_card():
    width = 1200
    height = 630
    
    # Base dark background with deep navy tones (#0c151c to #13212b)
    card = Image.new("RGB", (width, height), color=(14, 23, 31))
    draw = ImageDraw.Draw(card)
    
    # Try using hero-background.jpg if available as a subtle blurred texture
    if os.path.exists("images/hero-background.jpg"):
        try:
            hero = Image.open("images/hero-background.jpg")
            hero = hero.resize((width, int(hero.height * (width / hero.width))), Image.Resampling.LANCZOS)
            # Crop to height
            top = max(0, (hero.height - height) // 2)
            hero_cropped = hero.crop((0, top, width, top + height))
            hero_cropped = hero_cropped.filter(ImageFilter.GaussianBlur(radius=8))
            
            # Dark overlay
            overlay = Image.new("RGBA", (width, height), (12, 20, 27, 210))
            hero_cropped = hero_cropped.convert("RGBA")
            hero_cropped = Image.alpha_composite(hero_cropped, overlay)
            card = hero_cropped.convert("RGB")
            draw = ImageDraw.Draw(card)
        except Exception as e:
            print("Hero load error:", e)

    # Accent top border (gold / amber #e5b869)
    draw.rectangle([0, 0, width, 6], fill=(229, 184, 105))

    # Load logo if available
    if os.path.exists("images/logo-v1.png"):
        try:
            logo = Image.open("images/logo-v1.png")
            # Scale logo nicely (e.g. 1.5x)
            lw, lh = int(logo.width * 1.6), int(logo.height * 1.6)
            logo_scaled = logo.resize((lw, lh), Image.Resampling.LANCZOS)
            card.paste(logo_scaled, (100, 100))
        except Exception as e:
            print("Logo paste error:", e)

    # Fonts
    font_georgia_bold = "C:/Windows/Fonts/georgiab.ttf" if os.path.exists("C:/Windows/Fonts/georgiab.ttf") else "C:/Windows/Fonts/georgia.ttf"
    font_arial = "C:/Windows/Fonts/arial.ttf"
    font_arial_bold = "C:/Windows/Fonts/arialbd.ttf" if os.path.exists("C:/Windows/Fonts/arialbd.ttf") else "C:/Windows/Fonts/arial.ttf"

    font_pill = ImageFont.truetype(font_arial_bold, 20)
    font_title = ImageFont.truetype(font_georgia_bold, 48)
    font_sub = ImageFont.truetype(font_arial, 24)
    font_footer = ImageFont.truetype(font_arial_bold, 20)

    # Category / Pill badge
    # Draw pill box
    pill_text = "STRATEGIC INSIGHTS & EXECUTIVE ADVISORY"
    pill_bbox = draw.textbbox((0, 0), pill_text, font=font_pill)
    pill_w = pill_bbox[2] - pill_bbox[0] + 32
    pill_h = 36
    draw.rounded_rectangle([100, 290, 100 + pill_w, 290 + pill_h], radius=6, fill=(229, 184, 105, 40), outline=(229, 184, 105), width=1)
    draw.text((116, 297), pill_text, font=font_pill, fill=(229, 184, 105))

    # Headline
    headline = "Driven by Curiosity. Grounded in Strategy."
    draw.text((100, 350), headline, font=font_title, fill=(245, 247, 250))

    # Sub-headline
    subheadline = "High-leverage business strategy, organizational focus, and growth coaching\nfor established owner-led companies."
    draw.text((100, 420), subheadline, font=font_sub, fill=(185, 195, 205), spacing=8)

    # Bottom bar separator
    draw.line([(100, 530), (1100, 530)], fill=(45, 60, 75), width=1)

    # Author / URL footer
    draw.text((100, 555), "Joe Klein — Founder & Strategy Coach", font=font_footer, fill=(229, 184, 105))
    draw.text((900, 555), "kleininsight.com", font=font_footer, fill=(160, 175, 190))

    os.makedirs("images", exist_ok=True)
    out_path = "images/og-share-card.jpg"
    card.save(out_path, format="JPEG", quality=95)
    print(f"Created {out_path} ({width}x{height})")

if __name__ == "__main__":
    create_og_card()
