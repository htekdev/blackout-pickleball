"""Create contact sheets from downloaded photos for visual analysis."""
from PIL import Image, ImageDraw, ImageFont
import os

PHOTO_DIR = r'C:\Repos\htekdev\blackout-pickleball\temp-photos'
OUTPUT_DIR = r'C:\Repos\htekdev\blackout-pickleball\temp-photos\contact-sheets'
os.makedirs(OUTPUT_DIR, exist_ok=True)

COLS = 6
ROWS = 6
THUMB_W = 200
THUMB_H = 250
PADDING = 5
LABEL_H = 20

photos = sorted([f for f in os.listdir(PHOTO_DIR) if f.startswith('photo_') and f.endswith('.jpg')])
print(f'Found {len(photos)} photos')

sheet_num = 0
for batch_start in range(0, len(photos), COLS * ROWS):
    batch = photos[batch_start:batch_start + COLS * ROWS]
    sheet_num += 1
    
    sheet_w = COLS * (THUMB_W + PADDING) + PADDING
    sheet_h = ROWS * (THUMB_H + LABEL_H + PADDING) + PADDING
    sheet = Image.new('RGB', (sheet_w, sheet_h), (30, 30, 30))
    draw = ImageDraw.Draw(sheet)
    
    for idx, fname in enumerate(batch):
        row = idx // COLS
        col = idx % COLS
        x = PADDING + col * (THUMB_W + PADDING)
        y = PADDING + row * (THUMB_H + LABEL_H + PADDING)
        
        try:
            img = Image.open(os.path.join(PHOTO_DIR, fname))
            img.thumbnail((THUMB_W, THUMB_H), Image.LANCZOS)
            
            # Center the thumbnail
            offset_x = x + (THUMB_W - img.width) // 2
            offset_y = y + (THUMB_H - img.height) // 2
            sheet.paste(img, (offset_x, offset_y))
            
            # Add label
            num = fname.replace('photo_', '').replace('.jpg', '')
            draw.text((x + 5, y + THUMB_H + 2), f'#{num}', fill=(255, 255, 255))
        except Exception as e:
            draw.text((x + 5, y + 5), f'ERR: {fname}', fill=(255, 0, 0))
    
    out_path = os.path.join(OUTPUT_DIR, f'contact_sheet_{sheet_num}.png')
    sheet.save(out_path, quality=90)
    print(f'Saved contact sheet {sheet_num}: {len(batch)} photos')

print(f'\nDone! {sheet_num} contact sheets saved to {OUTPUT_DIR}')
