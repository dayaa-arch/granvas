import { expect, test } from '@playwright/test'

test('bootstraps the application', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('main', { name: 'Granvas' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible()
})
