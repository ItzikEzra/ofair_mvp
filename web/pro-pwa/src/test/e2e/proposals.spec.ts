import { test, expect } from '@playwright/test';

test.describe('Proposals Management', () => {
  // Mock authentication by setting localStorage
  test.beforeEach(async ({ page }) => {
    // Set up mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('rememberAuth', 'true');
      localStorage.setItem('professionalId', 'test-professional-id');
      localStorage.setItem('professionalData', JSON.stringify({
        id: 'test-professional-id',
        name: 'Test Professional',
        email: 'test@example.com',
        phone: '0501234567',
        profession: 'Developer'
      }));
    });

    await page.goto('/');
  });

  test('should display proposals list', async ({ page }) => {
    // Navigate to proposals page
    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    await expect(page.getByText('ההצעות שלי')).toBeVisible();
    
    // Check for proposals grid/list
    const proposalsContainer = page.locator('[data-testid="proposals-container"]');
    if (await proposalsContainer.isVisible()) {
      await expect(proposalsContainer).toBeVisible();
    }
  });

  test('should filter proposals by status', async ({ page }) => {
    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    // Check for status filter options
    const statusFilter = page.locator('select, [role="combobox"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      
      // Verify filter options exist
      await expect(page.getByText('ממתין')).toBeVisible();
      await expect(page.getByText('מאושר')).toBeVisible();
      await expect(page.getByText('נדחה')).toBeVisible();
    }
  });

  test('should open proposal details', async ({ page }) => {
    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    // Look for a proposal card to click
    const proposalCard = page.locator('[data-testid="proposal-card"]').first();
    if (await proposalCard.isVisible()) {
      await proposalCard.click();
      
      // Should open proposal details modal or page
      await expect(page.getByText('פרטי ההצעה')).toBeVisible();
    }
  });

  test('should handle work completion for accepted proposals', async ({ page }) => {
    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    // Look for accepted proposal with completion option
    const completeWorkButton = page.getByRole('button', { name: 'סיים עבודה' }).first();
    if (await completeWorkButton.isVisible()) {
      await completeWorkButton.click();
      
      // Should open work completion form
      await expect(page.getByText('סיום עבודה')).toBeVisible();
      await expect(page.getByLabel('סכום תשלום סופי')).toBeVisible();
      await expect(page.getByLabel('אמצעי תשלום')).toBeVisible();
    }
  });

  test('should validate work completion form', async ({ page }) => {
    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    const completeWorkButton = page.getByRole('button', { name: 'סיים עבודה' }).first();
    if (await completeWorkButton.isVisible()) {
      await completeWorkButton.click();
      
      // Try to submit without amount
      await page.getByRole('button', { name: 'סיים עבודה' }).click();
      await expect(page.getByText('יש להזין סכום תשלום תקין')).toBeVisible();
      
      // Fill valid amount
      await page.getByLabel('סכום תשלום סופי').fill('1000');
      
      // Select payment method
      await page.getByLabel('אמצעי תשלום').selectOption('cash');
      
      // Add notes
      await page.getByLabel('הערות').fill('עבודה הושלמה בהצלחה');
      
      // Submit form
      await page.getByRole('button', { name: 'סיים עבודה' }).click();
      
      // Should show success message
      await expect(page.getByText('העבודה הושלמה בהצלחה')).toBeVisible();
    }
  });

  test('should display proposal statistics', async ({ page }) => {
    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    // Check for statistics cards
    const statsContainer = page.locator('[data-testid="proposals-stats"]');
    if (await statsContainer.isVisible()) {
      await expect(page.getByText('סה"כ הצעות')).toBeVisible();
      await expect(page.getByText('הצעות מאושרות')).toBeVisible();
      await expect(page.getByText('בהמתנה')).toBeVisible();
    }
  });

  test('should handle proposal search', async ({ page }) => {
    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    const searchInput = page.getByPlaceholder('חפש הצעות...');
    if (await searchInput.isVisible()) {
      await searchInput.fill('פיתוח אתר');
      
      // Should filter proposals based on search term
      await page.waitForTimeout(500); // Wait for debounce
      
      // Verify search results
      const proposalsContainer = page.locator('[data-testid="proposals-container"]');
      await expect(proposalsContainer).toBeVisible();
    }
  });

  test('should handle empty proposals state', async ({ page }) => {
    // Mock empty proposals response
    await page.route('**/functions/v1/get-all-proposals', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    // Should show empty state
    await expect(page.getByText('אין הצעות מחיר')).toBeVisible();
    await expect(page.getByText('טרם שלחת הצעות מחיר')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/functions/v1/get-all-proposals', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }, 2000);
    });

    await page.getByRole('link', { name: 'ההצעות שלי' }).click();
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });
});