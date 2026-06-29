import { test, expect } from '@playwright/test';

const NAV_PAGES = [
  { path: '/', label: 'Home' },
  { path: '/events', label: 'Events' },
  { path: '/shop', label: 'Shop' },
  { path: '/community', label: 'Community' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
  { path: '/pickleball', label: 'Pickleball' },
];

test.describe('Navigation', () => {
  test('header contains all expected nav links', async ({ page }) => {
    await page.goto('/');

    const desktopNav = page.locator('header nav');
    await expect(desktopNav).toBeVisible();

    // Verify each nav link exists
    for (const { label } of NAV_PAGES.slice(1)) {
      const link = desktopNav.getByRole('link', { name: label });
      await expect(link).toBeVisible({ timeout: 5000 });
    }
  });

  test('clicking Events nav link navigates to events page', async ({ page }) => {
    await page.goto('/');

    await page.locator('header nav').getByRole('link', { name: 'Events' }).click();

    await expect(page).toHaveURL(/\/events/);
  });

  test('clicking Shop nav link navigates to shop page', async ({ page }) => {
    await page.goto('/');

    await page.locator('header nav').getByRole('link', { name: 'Shop' }).click();

    await expect(page).toHaveURL(/\/shop/);
  });

  test('logo links back to homepage', async ({ page }) => {
    await page.goto('/events');

    await page.locator('header a').first().click();

    await expect(page).toHaveURL(/\/$/);
  });

  test('404 page renders for unknown route', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');

    // Astro returns 404 for unknown static routes
    expect(response?.status()).toBe(404);
  });
});

/**
 * Data-driven test: every page in the nav responds without error.
 */
for (const { path, label } of NAV_PAGES) {
  test(`${label} page (${path}) returns HTTP 200`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });
}