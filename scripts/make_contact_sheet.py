"""Create a contact sheet from all downloaded photos with numbered labels."""
from PIL import Image, ImageDraw, ImageFont
import os
import math

PHOTO_DIR = r'C:\Repos\htekdev\blackout-pickleball\temp-photos'
OUTPUT = os.path.join(PHOTO_DIR, 'contact_sheet.jpg')

THUMB_WIDTH = 250
THUMB_HEIGHT = 250
COLS = 12
PADDING = 4
LABEL_HEIGHT = 20

# Get all photo files
photos = sorted([f for f in os.listdir(PHOTO_DIR) if f.startswith('photo_') and f.endswith(('.jpg', '.png'))])
print(f'Creating contact sheet from {len(photos)} photos')

ROWS = math.ceil(len(photos) / COLS)
CELL_W = THUMB_WIDTH + PADDING
CELL_H = THUMB_HEIGHT + LABEL_HEIGHT + PADDING

sheet_w = COLS * CELL_W + PADDING
sheet_h = ROWS * CELL_H + PADDING

print(f'Sheet size: {sheet_w}x{sheet_h} ({COLS} cols x {ROWS} rows)')

sheet = Image.new('RGB', (sheet_w, sheet_h), (255, 255, 255))
draw = ImageDraw.Draw(sheet)

try:
    font = ImageFont.truetype("arial.ttf", 14)
except:
    font = ImageFont.load_default()

for idx, fname in enumerate(photos):
    col = idx % COLS
    row = idx // COLS
    x = PADDING + col * CELL_W
    y = PADDING + row * CELL_H

    # Load and resize
    try:
        img = Image.open(os.path.join(PHOTO_DIR, fname))
        img.thumbnail((THUMB_WIDTH, THUMB_HEIGHT), Image.LANCZOS)
        
        # Center in cell
        offset_x = x + (THUMB_WIDTH - img.width) // 2
        offset_y = y + (THUMB_HEIGHT - img.height) // 2
        sheet.paste(img, (offset_x, offset_y))
    except Exception as e:
        print(f'  Error loading {fname}: {e}')
        continue

    # Draw number label
    label = str(idx + 1)
    # Background for label
    draw.rectangle([x, y + THUMB_HEIGHT, x + THUMB_WIDTH, y + THUMB_HEIGHT + LABEL_HEIGHT], fill=(0, 0, 0))
    # Text centered
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((x + (THUMB_WIDTH - tw) // 2, y + THUMB_HEIGHT + 3), label, fill=(255, 255, 255), font=font)

    if (idx + 1) % 50 == 0:
        print(f'  Processed {idx + 1}/{len(photos)}')

# Save
sheet.save(OUTPUT, quality=85)
file_size = os.path.getsize(OUTPUT) // 1024
print(f'\nSaved contact sheet: {OUTPUT} ({file_size}KB)')
