"""
Product Image Crop v10 — Dead simple bounding box crop.
For each image: find non-white pixels, crop to bounding box, done.
"""
from PIL import Image
import numpy as np
import os

PRODUCTS_DIR = 'public/images/products'
PAD = 5  # 5px padding around the product

for slug in sorted(os.listdir(PRODUCTS_DIR)):
    d = os.path.join(PRODUCTS_DIR, slug)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith('.webp'):
            continue
        path = os.path.join(d, f)
        img = Image.open(path).convert('RGB')
        arr = np.array(img)
        mask = np.any(arr < 250, axis=2)
        rows = np.any(mask, axis=1)
        cols = np.any(mask, axis=0)
        if not rows.any() or not cols.any():
            continue
        y1, y2 = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
        x1, x2 = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])
        cropped = img.crop((
            max(0, x1 - PAD),
            max(0, y1 - PAD),
            min(img.width, x2 + PAD + 1),
            min(img.height, y2 + PAD + 1),
        ))
        cropped.save(path, 'WEBP', quality=92)
    print(f'✓ {slug}')
