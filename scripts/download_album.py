"""Download ALL photos from Google Photos album using Playwright."""
from playwright.sync_api import sync_playwright
import time
import os
import requests

SAVE_DIR = r'C:\Repos\htekdev\blackout-pickleball\temp-photos'
ALBUM_URL = 'https://photos.app.goo.gl/6EpkGb6VNfEZgGWN9'

os.makedirs(SAVE_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    # Navigate to album
    page.goto(ALBUM_URL, wait_until='networkidle', timeout=30000)
    time.sleep(4)

    print(f'Page title: {page.title()}')
    print(f'URL: {page.url}')

    # Scroll down aggressively to load ALL images
    prev_count = 0
    scroll_attempts = 0
    stable_rounds = 0

    while scroll_attempts < 80:
        imgs = page.query_selector_all('img[src*="googleusercontent"]')
        current_count = len(imgs)

        if current_count == prev_count:
            stable_rounds += 1
        else:
            stable_rounds = 0

        if stable_rounds >= 8 and scroll_attempts > 10:
            print(f'Stable at {current_count} images after {scroll_attempts} scrolls')
            break

        prev_count = current_count
        page.evaluate('window.scrollBy(0, 2000)')
        time.sleep(1)
        scroll_attempts += 1

        if scroll_attempts % 10 == 0:
            print(f'  Scroll {scroll_attempts}: {current_count} images found so far')

    # Collect all unique image URLs
    imgs = page.query_selector_all('img[src*="googleusercontent"]')
    urls = []
    seen_bases = set()

    for img in imgs:
        src = img.get_attribute('src')
        if src and 'googleusercontent' in src:
            # Strip size params to get base URL
            base_url = src.split('=')[0] if '=' in src else src
            if base_url not in seen_bases:
                seen_bases.add(base_url)
                urls.append(base_url)

    print(f'\nTotal unique image URLs found: {len(urls)}')

    # Download each image at high resolution
    downloaded = 0
    for i, url in enumerate(urls, 1):
        dl_url = url + '=w2048-h2048'
        try:
            resp = requests.get(dl_url, timeout=20)
            if resp.status_code == 200 and len(resp.content) > 10000:
                ct = resp.headers.get('content-type', '')
                ext = 'png' if 'png' in ct else 'jpg'
                filepath = os.path.join(SAVE_DIR, f'photo_{i:03d}.{ext}')
                with open(filepath, 'wb') as f:
                    f.write(resp.content)
                downloaded += 1
                if i % 10 == 0 or i <= 5:
                    print(f'  Downloaded {i}/{len(urls)}: {len(resp.content)//1024}KB')
            else:
                print(f'  Skipped {i}: status={resp.status_code}, size={len(resp.content)}')
        except Exception as e:
            print(f'  Error {i}: {e}')

    print(f'\n=== Downloaded {downloaded} photos total ===')
    browser.close()
