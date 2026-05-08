"""Re-download ALL photos from Google Photos album for re-curation."""
from playwright.sync_api import sync_playwright
import time, os, requests

SAVE_DIR = r'C:\Repos\htekdev\blackout-pickleball\temp-photos'
ALBUM_URL = 'https://photos.app.goo.gl/6EpkGb6VNfEZgGWN9'
os.makedirs(SAVE_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 4000})
    page.goto(ALBUM_URL, wait_until='networkidle', timeout=30000)
    time.sleep(5)
    print(f'Page title: {page.title()}')
    
    # Scroll thoroughly to load all photos
    for i in range(30):
        page.evaluate('window.scrollBy(0, 3000)')
        time.sleep(0.3)
    page.evaluate('window.scrollTo(0, 0)')
    time.sleep(1)
    for i in range(40):
        page.evaluate('window.scrollBy(0, 2000)')
        time.sleep(0.3)
    
    # Extract ALL background image URLs
    bg_urls = page.evaluate('''() => {
        const results = [];
        const seen = new Set();
        document.querySelectorAll('[style*="background"]').forEach(el => {
            const style = el.getAttribute('style') || '';
            const match = style.match(/url\\(["']?([^"')]+)["']?\\)/);
            if (match && match[1].includes('googleusercontent.com')) {
                let url = match[1];
                const base = url.split('=')[0];
                if (!seen.has(base)) {
                    seen.add(base);
                    results.push(base + '=w1200');
                }
            }
        });
        return results;
    }''')
    
    print(f'Found {len(bg_urls)} unique photo URLs')
    browser.close()

# Download all photos
downloaded = 0
for i, url in enumerate(bg_urls, 1):
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200 and len(resp.content) > 5000:
            path = os.path.join(SAVE_DIR, f'photo_{i:03d}.jpg')
            with open(path, 'wb') as f:
                f.write(resp.content)
            downloaded += 1
            if i % 20 == 0:
                print(f'  Downloaded {downloaded}/{len(bg_urls)}...')
    except Exception as e:
        print(f'  Error on {i}: {e}')

print(f'\nDone! Downloaded {downloaded} photos to {SAVE_DIR}')
