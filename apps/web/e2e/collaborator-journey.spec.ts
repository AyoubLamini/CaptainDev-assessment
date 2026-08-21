import { test, expect } from '@playwright/test';

test.describe('Collaborator Journey', () => {
  test('accept invitation page handles tokens', async ({ page }) => {
    // Visit accept invitation with a fake token
    await page.goto('/accept-invitation?token=fake_token');
    
    // Should see password fields
    await page.waitForSelector('input[name="password"]');
    
    // Test the form inputs
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
    
    expect(await page.inputValue('input[name="password"]')).toBe('NewPassword123!');
    
    // Simulate submit
    await page.click('button[type="submit"]');
    
    // It should hit the API and fail since token is fake, showing an error
    await expect(page.locator('.text-red-700')).toBeVisible();
  });

  test('accept invitation rejects missing token', async ({ page }) => {
    // Visit without token
    await page.goto('/accept-invitation');
    
    // Should show invalid link message
    await expect(page.getByText('Invalid link')).toBeVisible();
    await expect(page.getByText('This invitation link is invalid or missing a token.')).toBeVisible();
  });
});
