"""
Curate the best photos from the album, remove duplicates, convert to WebP,
and place them in the project.

Selection criteria:
- Pick 1-2 best from each "set" of similar shots
- Maximize variety: different models, garments, backgrounds, poses
- Prioritize: clear logo visibility, dynamic poses, community feel
"""
from PIL import Image
import os
import shutil

PHOTO_DIR = r'C:\Repos\htekdev\blackout-pickleball\temp-photos'
OUTPUT_DIR = r'C:\Repos\htekdev\blackout-pickleball\public\images\community'

# Remove old community photos
if os.path.exists(OUTPUT_DIR):
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(('.webp', '.jpg', '.png')):
            os.remove(os.path.join(OUTPUT_DIR, f))
    print(f'Cleared old community photos')

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Curated selections with categories and alt text
# Format: (photo_number, category, alt_text)
SELECTIONS = [
    # === COURT SHOTS - Male in hoodie ===
    (1, 'action', 'Two athletes on pickleball court wearing Blackout gear'),
    (4, 'product', 'Male model wearing I Am Black History hoodie - front view on court'),
    (7, 'product', 'Back of I Am Black History hoodie showing colorful logo design'),
    (10, 'action', 'Athlete in Blackout hoodie on pickleball court - side angle'),
    
    # === COURT SHOTS - Female in tee ===
    (14, 'product', 'Female model in Blackout tee standing on pickleball court'),
    (19, 'product', 'Woman wearing Black History tee - front logo detail on court'),
    (22, 'action', 'Female athlete in Blackout gear - dynamic pose on court'),
    (30, 'action', 'Woman modeling Blackout tee with pickleball court backdrop'),
    
    # === COMMUNITY - Two people on court ===
    (37, 'community', 'Two Blackout athletes sitting together on pickleball court'),
    (39, 'community', 'Community members in Blackout gear relaxing on court'),
    (42, 'community', 'Athletes in matching Blackout merch taking a break courtside'),
    
    # === MALE CLOSE-UPS with chain ===
    (55, 'lifestyle', 'Male model close-up wearing Blackout tee with gold chain'),
    (57, 'product', 'Close-up of Blackout logo on black tee - male model'),
    (62, 'lifestyle', 'Athlete portrait in BLACKOUT text tee'),
    
    # === MALE LONG-SLEEVE against brick ===
    (74, 'product', 'Male model in gray Blackout long-sleeve crewneck - brick wall'),
    (77, 'product', 'BLACKOUT text logo on gray crewneck - chest detail'),
    (80, 'lifestyle', 'Man in Blackout crewneck - casual urban style'),
    
    # === FEMALE LONG-SLEEVE - brick wall ===
    (85, 'product', 'Female model in dark Blackout long-sleeve - front view'),
    (88, 'lifestyle', 'Woman in Blackout crew posing against brick wall'),
    (92, 'action', 'Athletic pose in Blackout long-sleeve top'),
    (96, 'lifestyle', 'Side profile in Blackout crewneck - brick backdrop'),
    
    # === FEMALE ATHLETIC FULL-BODY ===
    (110, 'lifestyle', 'Full-body athletic look in Blackout gear against brick wall'),
    (115, 'action', 'Dynamic athletic pose in full Blackout outfit'),
    (121, 'lifestyle', 'Blackout athletic wear full outfit - relaxed stance'),
    (125, 'action', 'Model stretching in Blackout activewear'),
    
    # === BACK/DETAIL SHOTS ===
    (134, 'product', 'I Am Black History full back design - colorful block letters'),
    (137, 'product', 'Back of long-sleeve showing I Am Black History logo'),
    (140, 'product', 'Detail shot of I Am Black History design on dark fabric'),
    (142, 'product', 'I Am Black History logo closeup - red yellow green letters on black'),
]

print(f'Selected {len(SELECTIONS)} photos for curation')

# Process and save as WebP
processed = 0
metadata = []

for idx, (photo_num, category, alt_text) in enumerate(SELECTIONS, 1):
    src_path = os.path.join(PHOTO_DIR, f'photo_{photo_num:03d}.jpg')
    if not os.path.exists(src_path):
        src_path = os.path.join(PHOTO_DIR, f'photo_{photo_num:03d}.png')
    
    if not os.path.exists(src_path):
        print(f'  WARNING: photo_{photo_num:03d} not found!')
        continue
    
    try:
        img = Image.open(src_path)
        
        # Resize to max 1200px wide for web (keeps quality high but manageable)
        max_width = 1200
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Save as WebP with good quality
        out_name = f'community-{idx:02d}.webp'
        out_path = os.path.join(OUTPUT_DIR, out_name)
        img.save(out_path, 'WEBP', quality=82)
        
        file_size = os.path.getsize(out_path) // 1024
        metadata.append({
            'filename': out_name,
            'category': category,
            'alt': alt_text,
            'original': f'photo_{photo_num:03d}',
            'size_kb': file_size
        })
        processed += 1
        
    except Exception as e:
        print(f'  Error processing photo_{photo_num:03d}: {e}')

print(f'\nProcessed {processed} photos to WebP')
total_size = sum(m['size_kb'] for m in metadata)
print(f'Total size: {total_size}KB ({total_size/1024:.1f}MB)')

# Print metadata for use in code
print('\n=== IMAGE METADATA FOR CODE ===')
for m in metadata:
    print(f"  {{ src: '/images/community/{m['filename']}', alt: \"{m['alt']}\", category: '{m['category']}' }},")

# Category breakdown
from collections import Counter
cats = Counter(m['category'] for m in metadata)
print(f'\n=== CATEGORY BREAKDOWN ===')
for cat, count in cats.most_common():
    print(f'  {cat}: {count} photos')
