"""Re-process product composite images at higher quality."""
from PIL import Image
import os

src_dir = r'C:\Users\floreshector\Downloads\Telegram Desktop'
out_base = r'C:\Repos\htekdev\blackout-pickleball\public\images\products'

mapping = {
    'photo_2026-05-08_07-34-55.jpg': 'gold-crew-tee',
    'photo_2026-05-08_07-35-01.jpg': 'black-white-crew-tee',
    'photo_2026-05-08_07-35-12.jpg': 'navy-crew-tee',
    'photo_2026-05-08_07-35-15.jpg': 'gray-crew-tee',
    'photo_2026-05-08_07-35-17.jpg': 'red-crew-tee',
    'photo_2026-05-08_07-35-22.jpg': 'olive-crew-tee',
    'photo_2026-05-08_07-35-24.jpg': 'tan-crew-tee',
    'photo_2026-05-08_07-35-27.jpg': 'steel-blue-racerback-tank',
    'photo_2026-05-08_07-35-30.jpg': 'maroon-racerback-tank',
    'photo_2026-05-08_07-35-33.jpg': 'black-holographic-crew-tee',
    'photo_2026-05-08_07-35-35.jpg': 'charcoal-racerback-tank',
    'photo_2026-05-08_07-35-38.jpg': 'black-racerback-tank',
}

COLS = 4
ROWS = 2
TARGET_WIDTH = 600
WEBP_QUALITY = 90

total = 0
for src_file, slug in sorted(mapping.items(), key=lambda x: x[1]):
    src_path = os.path.join(src_dir, src_file)
    img = Image.open(src_path)
    w, h = img.size
    cell_w = w // COLS
    cell_h = h // ROWS
    
    out_dir = os.path.join(out_base, slug)
    os.makedirs(out_dir, exist_ok=True)
    
    for i in range(COLS * ROWS):
        col = i % COLS
        row = i // COLS
        
        cell = img.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        
        scale = TARGET_WIDTH / cell_w
        new_h = int(cell_h * scale)
        cell_resized = cell.resize((TARGET_WIDTH, new_h), Image.LANCZOS)
        
        # Apply subtle sharpening after upscale
        from PIL import ImageFilter
        cell_resized = cell_resized.filter(ImageFilter.SHARPEN)
        
        out_path = os.path.join(out_dir, f'angle-{i + 1}.webp')
        cell_resized.save(out_path, 'WEBP', quality=WEBP_QUALITY, method=6)
        total += 1
    
    print(f'{slug}: {COLS*ROWS} angles at {TARGET_WIDTH}x{int(cell_h * scale)}px')

print(f'\nDone! Re-processed {total} images from {len(mapping)} composites.')
