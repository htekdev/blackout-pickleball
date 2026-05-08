"""
Product Image Crop v11 — Column-variance bbox + background removal.
Works on ALL products including dark shirts on dark gray backgrounds.

1. Detect product via column/row standard deviation (texture vs smooth bg)
2. Sample background color from corners
3. Replace background pixels with white
4. Crop to product bounding box + padding
"""
from PIL import Image
import numpy as np
import os

PRODUCTS_DIR = 'public/images/products'
PAD = 10
STD_THRESH = 8  # columns/rows with std > 8 contain product detail

for slug in sorted(os.listdir(PRODUCTS_DIR)):
    d = os.path.join(PRODUCTS_DIR, slug)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith('.webp'):
            continue
        path = os.path.join(d, f)
        img = Image.open(path).convert('RGB')
        arr = np.array(img, dtype=np.float64)
        h, w = arr.shape[:2]
        gray = np.mean(arr, axis=2)

        # Step 1: Find product bounds via column/row std deviation
        col_std = np.std(gray, axis=0)
        row_std = np.std(gray, axis=1)
        prod_cols = np.where(col_std > STD_THRESH)[0]
        prod_rows = np.where(row_std > STD_THRESH)[0]

        if len(prod_cols) == 0 or len(prod_rows) == 0:
            continue

        x1, x2 = int(prod_cols[0]), int(prod_cols[-1])
        y1, y2 = int(prod_rows[0]), int(prod_rows[-1])

        # Step 2: Sample background color from corners
        corners = np.concatenate([
            arr[:20, :20].reshape(-1, 3),
            arr[:20, -20:].reshape(-1, 3),
            arr[-20:, :20].reshape(-1, 3),
            arr[-20:, -20:].reshape(-1, 3),
        ])
        bg_color = np.median(corners, axis=0)

        # Step 3: Replace background with white
        dist = np.sqrt(np.sum((arr - bg_color) ** 2, axis=2))
        arr[dist < 25] = [255, 255, 255]

        # Step 4: Crop with padding
        cx1 = max(0, x1 - PAD)
        cy1 = max(0, y1 - PAD)
        cx2 = min(w, x2 + PAD + 1)
        cy2 = min(h, y2 + PAD + 1)

        cropped = Image.fromarray(arr.astype(np.uint8)).crop((cx1, cy1, cx2, cy2))
        cropped.save(path, 'WEBP', quality=92)

    check = Image.open(os.path.join(d, 'angle-1.webp'))
    print(f'✓ {slug:35s} {check.size[0]:4d}x{check.size[1]:4d}')
