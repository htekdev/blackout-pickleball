"""
Product Image Re-Centering v6 — Zero-wobble approach
Each angle's garment is INDEPENDENTLY centered on the canvas.
All angles share the SAME scale factor (from union bbox), so garment
appears the same size but is always perfectly centered — zero shift.

Issues fixed:
1. Garment wobbles 30-60px between angles → independent centering per angle
2. Images too zoomed in → scale to ~60% canvas height
3. Vertical centering off → true center
"""
from PIL import Image
import numpy as np
import os

PRODUCTS_DIR = 'public/images/products'
OUTPUT_W, OUTPUT_H = 800, 1000
TARGET_FILL_H = 0.65  # garment height as fraction of canvas (increased from 0.62)
PADDING_FRAC = 0.08   # breathing room

results = []

for slug in sorted(os.listdir(PRODUCTS_DIR)):
    product_path = os.path.join(PRODUCTS_DIR, slug)
    if not os.path.isdir(product_path):
        continue

    # Step 1: Load all angle images and find garment bounding boxes
    angles = []
    bboxes = []
    for i in range(1, 9):
        img_path = os.path.join(product_path, f'angle-{i}.webp')
        if not os.path.exists(img_path):
            continue
        img = Image.open(img_path).convert('RGB')
        arr = np.array(img)
        non_white = np.any(arr < 235, axis=2)
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

    # Step 2: Compute UNION bounding box SIZE (for consistent scaling)
    # We use the LARGEST garment dimensions to set the scale, so all angles
    # have the same zoom level. But each angle is centered independently.
    max_garment_w = max(b[2] - b[0] for b in bboxes)
    max_garment_h = max(b[3] - b[1] for b in bboxes)

    # Add padding
    padded_w = max_garment_w + int(max_garment_w * PADDING_FRAC * 2)
    padded_h = max_garment_h + int(max_garment_h * PADDING_FRAC * 2)

    # Step 3: Calculate scale factor — one scale for ALL angles
    scale_h = (OUTPUT_H * TARGET_FILL_H) / padded_h
    scale_w = (OUTPUT_W * 0.55) / padded_w  # max 55% width
    scale = min(scale_h, scale_w)

    # Step 4: Process each angle — CENTER each garment INDEPENDENTLY
    for i, (img, bbox) in enumerate(zip(angles, bboxes)):
        x1, y1, x2, y2 = bbox
        gw = x2 - x1
        gh = y2 - y1

        # Add proportional padding around THIS angle's garment
        pad_x = int(gw * PADDING_FRAC)
        pad_y = int(gh * PADDING_FRAC)
        cx1 = max(0, x1 - pad_x)
        cy1 = max(0, y1 - pad_y)
        cx2 = min(img.width, x2 + pad_x)
        cy2 = min(img.height, y2 + pad_y)

        cropped = img.crop((cx1, cy1, cx2, cy2))
        cw, ch = cropped.size

        # Scale using the SHARED scale factor
        new_w = int(cw * scale)
        new_h = int(ch * scale)
        resized = cropped.resize((new_w, new_h), Image.LANCZOS)

        # Center on white canvas
        canvas = Image.new('RGB', (OUTPUT_W, OUTPUT_H), (255, 255, 255))
        paste_x = (OUTPUT_W - new_w) // 2
        paste_y = (OUTPUT_H - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y))

        out_path = os.path.join(product_path, f'angle-{i + 1}.webp')
        canvas.save(out_path, 'WEBP', quality=90)

    # Verify centering of first angle
    verify_img = Image.open(os.path.join(product_path, 'angle-1.webp'))
    varr = np.array(verify_img)
    nw = np.any(varr < 235, axis=2)
    vrows = np.any(nw, axis=1)
    vcols = np.any(nw, axis=0)
    if vcols.any() and vrows.any():
        vl = int(np.where(vcols)[0][0])
        vr = OUTPUT_W - 1 - int(np.where(vcols)[0][-1])
        vt = int(np.where(vrows)[0][0])
        vb = OUTPUT_H - 1 - int(np.where(vrows)[0][-1])
        fill_w = (OUTPUT_W - vl - vr) / OUTPUT_W * 100
        fill_h = (OUTPUT_H - vt - vb) / OUTPUT_H * 100
        h_diff = abs(vl - vr)
        v_diff = abs(vt - vb)
        results.append(
            f'{slug:35s} L={vl:3d} R={vr:3d}(Δ{h_diff}) '
            f'T={vt:3d} B={vb:3d}(Δ{v_diff}) '
            f'fill={fill_w:.0f}%x{fill_h:.0f}%'
        )

    # Also verify NO SHIFT between angles
    centers_h = []
    centers_v = []
    for i in range(len(angles)):
        vimg = Image.open(os.path.join(product_path, f'angle-{i + 1}.webp'))
        va = np.array(vimg)
        vnw = np.any(va < 235, axis=2)
        vr2 = np.any(vnw, axis=1)
        vc2 = np.any(vnw, axis=0)
        if vc2.any() and vr2.any():
            cl = int(np.where(vc2)[0][0])
            cr = int(np.where(vc2)[0][-1])
            ct = int(np.where(vr2)[0][0])
            cb = int(np.where(vr2)[0][-1])
            centers_h.append((cl + cr) / 2)
            centers_v.append((ct + cb) / 2)

    if centers_h:
        h_spread = max(centers_h) - min(centers_h)
        v_spread = max(centers_v) - min(centers_v)
        if h_spread > 2 or v_spread > 2:
            print(f'  ⚠️  {slug}: H-spread={h_spread:.1f}px V-spread={v_spread:.1f}px')

print("=== Re-centered results ===")
for r in results:
    print(r)
print(f"\nProcessed {len(results)} products, 8 angles each = {len(results) * 8} images")
