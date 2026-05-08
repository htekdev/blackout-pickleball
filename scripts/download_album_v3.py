"""Download ALL photos from Google Photos album - v3 using background-image URLs."""
from playwright.sync_api import sync_playwright
import time
import os
import requests

SAVE_DIR = r'C:\Repos\htekdev\blackout-pickleball\temp-photos'
ALBUM_URL = 'https://photos.app.goo.gl/6EpkGb6VNfEZgGWN9'

os.makedirs(SAVE_DIR, exist_ok=True)

# Clear old downloads
for f in os.listdir(SAVE_DIR):
    if f.startswith('photo_'):
        os.remove(os.path.join(SAVE_DIR, f))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 4000})

    page.goto(ALBUM_URL, wait_until='networkidle', timeout=30000)
    time.sleep(5)

    print(f'Page title: {page.title()}')

    # Scroll to ensure everything is loaded
    for i in range(20):
        page.evaluate('window.scrollBy(0, 3000)')
        time.sleep(0.5)
    
    # Scroll back up and down again for good measure
    page.evaluate('window.scrollTo(0, 0)')
    time.sleep(1)
    for i in range(30):
        page.evaluate('window.scrollBy(0, 2000)')
        time.sleep(0.5)

    # Extract ALL background image URLs
    bg_urls = page.evaluate('''() => {
        const results = [];
        const seen = new Set();
        document.querySelectorAll('[style*="background"]').forEach(el => {
            const style = el.getAttribute('style') || '';
            const match = style.match(/url\\(["']?([^"')]+)["']?\\)/);
            if (match && match[1].includes('googleusercontent.com/pw/')) {
                // Get base URL without size params
                let url = match[1];
                const base = url.split('=')[0];
                if (!seen.has(base)) {
                    seen.add(base);
                    results.push(base);
                }
            }
        });
        return results;
    }''')

    print(f'Unique photo URLs found: {len(bg_urls)}')

    # Download each at high resolution
    downloaded = 0
    for i, base_url in enumerate(bg_urls, 1):
        # Request high-res version
        dl_url = base_url + '=w2048-h2048'
        try:
            resp = requests.get(dl_url, timeout=20)
            if resp.status_code == 200 and len(resp.content) > 10000:
                ct = resp.headers.get('content-type', '')
                ext = 'png' if 'png' in ct else 'jpg'
                filepath = os.path.join(SAVE_DIR, f'photo_{i:03d}.{ext}')
                with open(filepath, 'wb') as f:
                    f.write(resp.content)
                downloaded += 1
                if i % 20 == 0 or i <= 3:
                    print(f'  [{i}/{len(bg_urls)}] {len(resp.content)//1024}KB')
            else:
                print(f'  Skipped {i}: status={resp.status_code}, size={len(resp.content)}')
        except Exception as e:
            print(f'  Error {i}: {e}')

    print(f'\n=== Downloaded {downloaded} photos total ===')
    browser.close()
