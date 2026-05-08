"""Download ALL photos from Google Photos album - v2 with better scrolling and image detection."""
from playwright.sync_api import sync_playwright
import time
import os
import requests
import re

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

    # Navigate to album
    page.goto(ALBUM_URL, wait_until='networkidle', timeout=30000)
    time.sleep(5)

    print(f'Page title: {page.title()}')

    # Take debug screenshot
    page.screenshot(path=os.path.join(SAVE_DIR, 'debug_page.png'), full_page=True)
    print('Saved debug screenshot')

    # Try various image selectors
    all_imgs = page.query_selector_all('img')
    print(f'\nAll <img> tags: {len(all_imgs)}')
    
    for i, img in enumerate(all_imgs[:20]):
        src = img.get_attribute('src') or ''
        alt = img.get_attribute('alt') or ''
        aria = img.get_attribute('aria-label') or ''
        style = img.get_attribute('style') or ''
        print(f'  img[{i}]: src={src[:100]}... alt={alt[:50]} aria={aria[:50]}')

    # Also check for background images and div-based thumbnails
    divs_with_bg = page.evaluate('''() => {
        const results = [];
        document.querySelectorAll('[style*="background"]').forEach(el => {
            const style = el.getAttribute('style') || '';
            const match = style.match(/url\\(["']?([^"')]+)["']?\\)/);
            if (match) results.push(match[1]);
        });
        return results;
    }''')
    print(f'\nDivs with background images: {len(divs_with_bg)}')
    for url in divs_with_bg[:5]:
        print(f'  {url[:100]}...')

    # Check data-src and other lazy-load patterns
    lazy_imgs = page.evaluate('''() => {
        const results = [];
        document.querySelectorAll('[data-src], [data-original]').forEach(el => {
            results.push(el.getAttribute('data-src') || el.getAttribute('data-original'));
        });
        return results;
    }''')
    print(f'\nLazy-loaded images: {len(lazy_imgs)}')

    # Get all links that might be photo links
    links = page.query_selector_all('a[href*="photo"]')
    print(f'\nPhoto links: {len(links)}')
    for link in links[:5]:
        href = link.get_attribute('href') or ''
        print(f'  {href[:100]}')

    # Try scrolling within a specific container
    containers = page.query_selector_all('[role="list"], [role="grid"], [class*="photo"], [class*="gallery"]')
    print(f'\nPotential containers: {len(containers)}')

    browser.close()
