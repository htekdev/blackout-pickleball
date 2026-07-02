import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verifies the core pages of brandblackout.com load correctly.
 * These are the bare-minimum checks to catch regressions before they ship.
 */
test.describe('Smoke tests', () => {
  test('homepage loads with title and logo', async ({ page }) => {
    await page.goto('/');

    // Title contains brand name
    await expect(page).toHaveTitle(/Blackout/i);

    // Logo is visible
    const logo = page.getByAltText('Blackout');
    await expect(logo).toBeVisible();
  });

  test('homepage shows navigation', async ({ page }) => {
    await page.goto('/');

    // Desktop nav links visible
    const nav = page.locator('header nav');
    await expect(nav).toBeVisible();

    await expect(page.locator('header nav').getByRole('link', { name: 'Shop' })).toBeVisible();
    await expect(page.locator('header nav').getByRole('link', { name: 'Events' })).toBeVisible();
    await expect(page.locator('header nav').getByRole('link', { name: 'About' })).toBeVisible();
  });

  test('events page loads', async ({ page }) => {
    const response = await page.goto('/events');

    // HTTP 200
    expect(response?.status()).toBe(200);

    // At least one heading visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('shop page loads', async ({ page }) => {
    const response = await page.goto('/shop');

    expect(response?.status()).toBe(200);

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    const response = await page.goto('/about');

    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });
});