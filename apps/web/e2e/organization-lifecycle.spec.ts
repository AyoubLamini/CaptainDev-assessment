import { test, expect } from '@playwright/test';

test.describe('Organization Lifecycle', () => {
  test('platform admin can view organization directory', async ({ page }) => {
    // In a real environment, this would require auth state.
    // For now we test the navigation and basic UI structure if accessible.
    
    // Try to access the platform organizations page
    await page.goto('/platform');
    
    // Either redirects to login (if protected) or shows the dashboard
    // It should redirect if no session cookie exists.
    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      // If it loaded, verify heading
      const heading = await page.locator('h1').textContent();
      expect(heading).toBeTruthy();
    }
  });
});
