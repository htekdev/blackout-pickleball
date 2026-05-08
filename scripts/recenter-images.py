"""
Product Image Bounding-Box Crop v9 — Tight crop, no canvas
Hector's idea: "Use bounding box detection since the background is white
to crop out each image." Instead of placing garments on an 800×1000 canvas,
crop tightly to the garment and let CSS object-contain handle scaling.

Approach:
1. For each product, detect garment bbox in each of the 8 angles
2. Compute UNION bbox (position + size) across all angles for consistency
3. Add small padding (8%) to avoid edge clipping
4. Crop ALL angles to the SAME padded union region
5. Output at natural dimensions — no fixed canvas

This makes garments fill the image completely. CSS object-contain then
scales the tight image to fill the container, making products appear much
larger on screen (~60% of container width vs 42% on v8).
"""
from PIL import Image
import numpy as np
import os

PRODUCTS_DIR = 'public/images/products'
PADDING_FRAC = 0.08   # 8% padding around union bbox
THRESHOLD = 250        # catches lighter edge pixels

results = []

for slug in sorted(os.listdir(PRODUCTS_DIR)):
    product_path = os.path.join(PRODUCTS_DIR, slug)
    if not os.path.isdir(product_path):
        continue

    # Step 1: Load all angles and find per-angle bounding boxes
    angles = []
    bboxes = []
    for i in range(1, 9):
        img_path = os.path.join(product_path, f'angle-{i}.webp')
        if not os.path.exists(img_path):
            continue
        img = Image.open(img_path).convert('RGB')
        arr = np.array(img)
        non_white = np.any(arr < THRESHOLD, axis=2)
        rows = np.any(non_white, axis=1)
        cols = np.any(non_white, axis=0)
        if rows.any() and cols.any():
            rmin = int(np.where(rows)[0][0])
            rmax = int(np.where(rows)[0][-1])
            cmin = int(np.where(cols)[0][0])
            cmax = int(np.where(cols)[0][-1])
            bboxes.append((cmin, rmin, cmax, rmax))
        else:
            bboxes.append((0, 0, img.width - 1, img.height - 1))
        angles.append(img)

    if not angles or not bboxes:
        continue

    # Step 2: Compute UNION bounding box (position union, not just size)
    # All angles get cropped to the exact same region for consistent framing
    union_x1 = min(b[0] for b in bboxes)
    union_y1 = min(b[1] for b in bboxes)
    union_x2 = max(b[2] for b in bboxes)
    union_y2 = max(b[3] for b in bboxes)

    union_w = union_x2 - union_x1
    union_h = union_y2 - union_y1

    # Step 3: Add padding
    pad_x = int(union_w * PADDING_FRAC)
    pad_y = int(union_h * PADDING_FRAC)

    crop_x1 = max(0, union_x1 - pad_x)
    crop_y1 = max(0, union_y1 - pad_y)
    crop_x2 = min(angles[0].width, union_x2 + pad_x)
    crop_y2 = min(angles[0].height, union_y2 + pad_y)

    crop_w = crop_x2 - crop_x1
    crop_h = crop_y2 - crop_y1

    # Step 4: Crop ALL angles to the SAME region — consistent framing
    for i, img in enumerate(angles):
        cropped = img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        out_path = os.path.join(product_path, f'angle-{i + 1}.webp')
        cropped.save(out_path, 'WEBP', quality=92)

    results.append(
        f'{slug:35s} crop=[{crop_x1},{crop_y1},{crop_x2},{crop_y2}] '
        f'size={crop_w}x{crop_h} '
        f'ratio={crop_w/crop_h:.3f}'
    )

print("=== Bounding-box crop results (v9) ===")
for r in results:
    print(r)
print(f"\nProcessed {len(results)} products, 8 angles each = {len(results) * 8} images")
