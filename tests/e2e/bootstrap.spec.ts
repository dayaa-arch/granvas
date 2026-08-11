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
      name: 'neutral certainty, problem: Customer information is scattered',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'neutral certainty, idea: AI unifies notes and structure',
    }),
  ).toBeVisible()
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
  const freshNode = page.getByRole('button', {
    name: 'neutral certainty, idea: Fresh idea',
  })
  await expect(freshNode).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'neutral certainty, problem: Customer information is scattered',
    }),
  ).toHaveCount(0)
  await expect(page.getByLabel('Workspace status')).toContainText('2 nodes')
  await expect(page.getByLabel('Workspace status')).toContainText('1 edge')

  await freshNode.click()
  await expect
    .poll(() => editor.evaluate(() => window.getSelection()?.toString() ?? ''))
    .toBe('[idea @fresh] Fresh idea')

  const todoNode = page.getByRole('button', {
    name: 'neutral certainty, todo: Ship it',
  })
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
  await expect(
    page.getByRole('button', {
      name: 'neutral certainty, idea: Still valid',
    }),
  ).toBeVisible()
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
    page.getByRole('button', {
      name: 'neutral certainty, idea: Imported thought',
    }),
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
  await expect(
    page.getByRole('button', {
      name: 'neutral certainty, idea: Resume editing',
    }),
  ).toBeVisible()
  await expect(page.getByLabel('Workspace status')).toContainText('Unsaved')
})

test('projects certainty markers without color-only distinctions', async ({ page }) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas text editor' })
  const source = `@layout flow TB

# 解約の分析

先週のインタビューから、解約の原因を整理する。

[problem @churn] 解約が増えている
  !-> [cause] オンボーディングが長い
  ?-> [?hypothesis @price] 価格が高い
  ~-> [~cause] UI が古い

[!idea @onboarding] 初回設定を3ステップにする
[~idea @discount] 値下げする

@onboarding -> @churn : solves
@price ?-> @churn : maybe

{Validated}
  @onboarding`

  await editor.fill(source)

  await expect(page.getByLabel('Workspace status')).toContainText('6 nodes')
  await expect(page.getByLabel('Workspace status')).toContainText('5 edges')
  await expect(page.getByLabel('Workspace status')).toContainText('0 diagnostics')
  await expect(
    page.getByRole('button', {
      name: 'tentative certainty, hypothesis: 価格が高い',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'confirmed certainty, idea: 初回設定を3ステップにする',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'rejected certainty, idea: 値下げする',
    }),
  ).toBeVisible()
  await expect(page.locator('.graph-node--certainty-neutral')).toHaveCount(2)
  await expect(page.locator('.graph-node--certainty-tentative')).toHaveCount(1)
  await expect(page.locator('.graph-node--certainty-confirmed')).toHaveCount(1)
  await expect(page.locator('.graph-node--certainty-rejected')).toHaveCount(2)
  await expect(page.locator('.graph-edge--certainty-neutral')).toHaveCount(1)
  await expect(page.locator('.graph-edge--certainty-tentative')).toHaveCount(2)
  await expect(page.locator('.graph-edge--certainty-confirmed')).toHaveCount(1)
  await expect(page.locator('.graph-edge--certainty-rejected')).toHaveCount(1)
  await expect(
    page.locator(
      '[aria-label="rejected certainty relation from 解約が増えている to UI が古い"]',
    ),
  ).toHaveCount(1)
  await expect(
    page.locator('.graph-edge--certainty-tentative .react-flow__edge-path').first(),
  ).toHaveCSS('stroke-dasharray', '8px, 6px')
  await expect(
    page.locator('.graph-edge--certainty-confirmed .react-flow__edge-path'),
  ).toHaveCSS('stroke-width', '2.8px')
})

test('edits Node label and Type as minimal Text patches and undoes in one step', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas text editor' })
  await editor.fill(
    'Intro prose must stay\n[?idea @editable]  Before  \nClosing prose must stay',
  )

  const beforeNode = page.getByRole('button', {
    name: 'tentative certainty, idea: Before',
  })
  await expect(beforeNode).toBeVisible()
  await beforeNode.locator('.graph-node__label').dblclick()
  const labelEditor = page.getByRole('textbox', {
    name: 'Edit label for Before',
  })
  await labelEditor.fill('After 😀')
  await labelEditor.press('Enter')

  const afterNode = page.getByRole('button', {
    name: 'tentative certainty, idea: After 😀',
  })
  await expect(afterNode).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Node label updated')
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toEqual([
      'Intro prose must stay',
      '[?idea @editable]  After 😀  ',
      'Closing prose must stay',
    ])

  await editor.focus()
  await editor.press('ControlOrMeta+z')
  await expect(beforeNode).toBeVisible()
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toEqual([
      'Intro prose must stay',
      '[?idea @editable]  Before  ',
      'Closing prose must stay',
    ])

  await beforeNode.focus()
  await beforeNode.press('Shift+F2')
  const typeEditor = page.getByRole('textbox', {
    name: 'Edit type for Before',
  })
  await typeEditor.fill('Problem_Main')
  await typeEditor.press('Enter')

  await expect(
    page.getByRole('button', {
      name: 'tentative certainty, problem_main: Before',
    }),
  ).toBeVisible()
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toEqual([
      'Intro prose must stay',
      '[?problem_main @editable]  Before  ',
      'Closing prose must stay',
    ])
})

test('creates Nodes, changes certainty, and connects Nodes from Graph controls', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas text editor' })
  await editor.fill('Intro prose\n[Problem] Root\n[Idea] Target\nClosing prose')

  let root = page.getByRole('button', {
    name: 'neutral certainty, problem: Root',
  })
  await root.focus()
  await root.press('Enter')
  await page.getByLabel('Certainty for Root').selectOption('confirmed')
  root = page.getByRole('button', {
    name: 'confirmed certainty, problem: Root',
  })
  await expect(root).toBeVisible()

  await page.getByRole('button', { name: 'Add child' }).click()
  const childDialog = page.getByRole('dialog', { name: 'Add child Node' })
  await childDialog.getByLabel('Type').fill('Cause')
  await childDialog.getByLabel('Label').fill('Child 😀')
  await childDialog.getByRole('button', { name: 'Apply' }).click()
  await expect(
    page.getByRole('button', {
      name: 'neutral certainty, cause: Child 😀',
    }),
  ).toBeVisible()

  await root.click()
  await page.getByRole('button', { name: 'Connect' }).click()
  const connectDialog = page.getByRole('dialog', { name: 'Connect Nodes' })
  await connectDialog.getByLabel('Target Node').selectOption({ label: 'Target' })
  await connectDialog.getByLabel('Relation label (optional)').fill('supports')
  await connectDialog.getByLabel('Certainty').selectOption('tentative')
  await connectDialog.getByRole('button', { name: 'Apply' }).click()

  await expect(page.getByLabel('Workspace status')).toContainText('3 nodes')
  await expect(page.getByLabel('Workspace status')).toContainText('2 edges')
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toEqual([
      'Intro prose',
      '[!Problem @root] Root',
      '  -> [cause] Child 😀',
      '[Idea @target] Target',
      'Closing prose',
      '@root ?-> @target : supports',
    ])

  await page.getByRole('button', { name: '+ New node' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Create Node' })
  await expect(createDialog.getByLabel('Type')).toBeFocused()
  await createDialog.getByLabel('Label').fill('Top level')
  await createDialog.getByRole('button', { name: 'Apply' }).click()
  await expect(
    page.getByRole('button', { name: 'neutral certainty, node: Top level' }),
  ).toBeVisible()
})

test('uses semantic drag and keyboard Move to change parentage and Group membership', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas text editor' })
  await editor.fill(
    '[Problem] Root\n[Idea] Other\n{Discovery}\n  [Node] Member\nClosing prose',
  )

  const root = page.getByRole('button', {
    name: 'neutral certainty, problem: Root',
  })
  let other = page.getByRole('button', {
    name: 'neutral certainty, idea: Other',
  })
  await other.dragTo(root, {
    sourcePosition: { x: 120, y: 44 },
    targetPosition: { x: 120, y: 44 },
  })
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('  -> [Idea] Other')

  const beforeCycle = await editor.locator('.cm-line').allTextContents()
  await root.click()
  await page.getByRole('button', { name: 'Move' }).click()
  let moveDialog = page.getByRole('dialog', { name: 'Move Node by meaning' })
  await moveDialog.getByLabel('Meaning target').selectOption({ label: 'Other' })
  await moveDialog.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'cannot be reparented to itself or one of its descendants',
  )
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toEqual(beforeCycle)

  other = page.getByRole('button', {
    name: 'neutral certainty, idea: Other',
  })
  await other.click()
  await page.getByRole('button', { name: 'Move' }).click()
  moveDialog = page.getByRole('dialog', { name: 'Move Node by meaning' })
  await moveDialog.getByLabel('Meaning target').selectOption({
    label: 'Discovery',
  })
  await moveDialog.getByRole('button', { name: 'Apply' }).click()
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('  @other')

  await other.click()
  await page.getByRole('button', { name: 'Move' }).click()
  moveDialog = page.getByRole('dialog', { name: 'Move Node by meaning' })
  await moveDialog.getByLabel('Meaning target').selectOption('detach')
  await moveDialog.getByRole('button', { name: 'Apply' }).click()
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('[Idea @other] Other')
  await expect(editor).not.toContainText('x:')
  await expect(editor).not.toContainText('y:')
})

test('previews deletion impact and preserves children when deleting a Nested Relation', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas text editor' })
  await editor.fill(
    '[Problem @root] Root\n  ?-> [Cause @child] Child\n    !-> [Evidence] Grand\n@root -> @other\n[Idea @other] Other\n{Group}\n  @root\nClosing prose',
  )

  const nestedEdge = page.locator(
    '[aria-label="tentative certainty relation from Root to Child"]',
  )
  await nestedEdge.focus()
  await nestedEdge.press('Delete')
  let dialog = page.getByRole('dialog', { name: 'Confirm deletion' })
  await expect(dialog).toContainText('Child is promoted to the scope root')
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('[Cause @child] Child')
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('  !-> [Evidence] Grand')

  const root = page.getByRole('button', {
    name: 'neutral certainty, problem: Root',
  })
  await root.focus()
  await root.press('Delete')
  dialog = page.getByRole('dialog', { name: 'Confirm deletion' })
  await expect(dialog).toContainText('1 Node(s)')
  await expect(dialog).toContainText('1 Cross Relation(s)')
  await expect(dialog).toContainText('1 Group reference(s)')
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(root).toHaveCount(0)
  await expect(editor).toContainText('[Cause @child] Child')
  await expect(editor).toContainText('[Idea @other] Other')
  await expect(editor).toContainText('Closing prose')
})
