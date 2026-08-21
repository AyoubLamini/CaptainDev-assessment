import { test, expect } from '@playwright/test';

test.describe('Password Reset Journey', () => {
  test('can request password reset', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Fill email
    await page.fill('input[name="email"]', 'test@nova.test');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // UI should show neutral success message even for fake emails
    await expect(page.locator('text=we sent a reset link')).toBeVisible();
  });

  test('reset password page handles token', async ({ page }) => {
    await page.goto('/reset-password?token=fake_token');
    
    await page.waitForSelector('input[name="password"]');
    await page.fill('input[name="password"]', 'NewPass123!');
    await page.fill('input[name="confirmPassword"]', 'NewPass123!');
    
    await page.click('button[type="submit"]');
    
    // Should fail with fake token
    await expect(page.locator('.text-red-700')).toBeVisible();
  });
});
