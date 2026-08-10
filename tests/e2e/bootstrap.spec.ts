import { expect, test } from '@playwright/test'

test('boots the canonical Text and Graph workspace', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('main', { name: 'Granvas' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Granvas workspace', level: 1 }),
  ).toBeAttached()
  await expect(page.getByRole('region', { name: 'Text pane' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Graph pane' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Granvas text editor' })).toContainText(
    '[problem @scattered] Customer information is scattered',
  )
  await expect(
    page.getByRole('button', {
      name: 'problem: Customer information is scattered',
    }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'idea: AI unifies notes and structure' })).toBeVisible()
  await expect(page.getByLabel('Workspace status')).toContainText('5 nodes')
  await expect(page.getByLabel('Workspace status')).toContainText('3 edges')
  await expect(page.getByLabel('Workspace status')).toContainText('0 diagnostics')
})

test('updates the current Graph and synchronizes Text and Node selection', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas text editor' })
  const source = '[idea @fresh] Fresh idea\n  -> [todo] Ship it'

  await editor.fill(source)
  const freshNode = page.getByRole('button', { name: 'idea: Fresh idea' })
  await expect(freshNode).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'problem: Customer information is scattered',
    }),
  ).toHaveCount(0)
  await expect(page.getByLabel('Workspace status')).toContainText('2 nodes')
  await expect(page.getByLabel('Workspace status')).toContainText('1 edge')

  await freshNode.click()
  await expect
    .poll(() => editor.evaluate(() => window.getSelection()?.toString() ?? ''))
    .toBe('[idea @fresh] Fresh idea')

  const todoNode = page.getByRole('button', { name: 'todo: Ship it' })
  await todoNode.focus()
  await todoNode.press('Enter')
  await expect
    .poll(() => editor.evaluate(() => window.getSelection()?.toString() ?? ''))
    .toBe('  -> [todo] Ship it')

  await editor
    .locator('.cm-line')
    .filter({ hasText: 'Fresh idea' })
    .click({ position: { x: 24, y: 10 } })
  await expect(freshNode).toHaveClass(/selected/)

  await editor.fill('[idea @valid] Still valid\n@missing -> @valid')
  await expect(page.getByRole('button', { name: 'idea: Still valid' })).toBeVisible()
  await expect(page.getByLabel('Workspace status')).toContainText('1 diagnostic')
})

test('imports a .granvas project through the browser picker', async ({ page }) => {
  await page.goto('/')
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import Project' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'imported.granvas',
    mimeType: 'text/plain',
    buffer: Buffer.from('[idea @imported] Imported thought\r\n  -> [todo] Continue'),
  })

  await expect(
    page.getByRole('button', { name: 'idea: Imported thought' }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Granvas text editor' })).toContainText(
    '[idea @imported] Imported thought',
  )
  await expect(page.getByLabel('Workspace status')).toContainText('Saved')
  await expect(page.getByRole('status')).toContainText('Imported imported.granvas')
})

test('supports keyboard resizing and an accessible Download dialog', async ({
  page,
}) => {
  await page.goto('/')
  const separator = page.getByRole('separator', {
    name: 'Resize Text and Graph panes',
  })
  await expect(separator).toHaveAttribute('aria-valuenow', '55')
  await separator.press('ArrowRight')
  await expect(separator).toHaveAttribute('aria-valuenow', '57')

  const downloadButton = page.getByRole('button', { name: 'Download' })
  await downloadButton.click()
  const dialog = page.getByRole('dialog', { name: 'Download your work' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'File name' })).toBeFocused()
  await expect(page.getByRole('radio', { name: /SVG/ })).toBeEnabled()
  await expect(page.getByRole('radio', { name: /PNG/ })).toBeEnabled()
  await expect(page.getByRole('radio', { name: /PDF/ })).toBeEnabled()
  await dialog.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(downloadButton).toBeFocused()
})

test('downloads BOM-free .granvas source and marks that revision saved', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas text editor' })
  const source = '😀 project — saved locally'
  await editor.fill(source)
  await expect(page.getByLabel('Workspace status')).toContainText('Unsaved')
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true })
      return !window.dispatchEvent(event)
    }),
  ).toBe(true)

  await page.getByRole('button', { name: 'Download' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Download', exact: true })
    .click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('untitled.granvas')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const bytes = Buffer.concat(chunks)
  expect([...bytes.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf])
  expect(bytes.toString('utf8')).toBe(source)
  await expect(page.getByLabel('Workspace status')).toContainText('Saved')

  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import Project' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'roundtrip.granvas',
    mimeType: 'text/plain',
    buffer: bytes,
  })
  await expect(editor).toContainText(source)
  await expect(page.getByLabel('Workspace status')).toContainText('Saved')

  await editor.fill(`${source}\n[idea @resumed] Resume editing`)
  await expect(page.getByRole('button', { name: 'idea: Resume editing' })).toBeVisible()
  await expect(page.getByLabel('Workspace status')).toContainText('Unsaved')
})
