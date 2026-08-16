import { expect, test, type Download } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const temporaryProjectKey = 'granvas:temporary-project:v1'

async function downloadBytes(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

test('boots the canonical Text and Graph workspace', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('main', { name: 'Granvas' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Granvas ワークスペース', level: 1 }),
  ).toBeAttached()
  await expect(page.getByRole('region', { name: 'テキストペイン' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'グラフペイン' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Granvas テキストエディタ' })).toContainText(
    '[problem @scattered] 顧客情報が分散している',
  )
  await expect(
    page.getByRole('button', {
      name: '指定なし、problem：顧客情報が分散している',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: '指定なし、idea：AIでメモと構造を統合する',
    }),
  ).toBeVisible()
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Node 5件')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Relation 3件')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('診断 0件')
})

test('opens isolated empty Granvas tabs without changing the current Project', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  const originalSource = '[idea @original] 元のタブを保持する'
  await editor.fill(originalSource)
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const value = localStorage.getItem(key)
        return value === null ? null : JSON.parse(value).source
      }, temporaryProjectKey),
    )
    .toBe(originalSource)

  const openNewGranvas = async (withKeyboard = false) => {
    const newPagePromise = context.waitForEvent('page')
    const button = page.getByRole('button', {
      name: '新しいGranvasを新しいタブで開く',
    })
    if (withKeyboard) {
      await button.focus()
      await page.keyboard.press('Enter')
    } else {
      await button.click()
    }
    const newPage = await newPagePromise
    await newPage.waitForLoadState('domcontentloaded')
    await expect(newPage.getByLabel('ワークスペースの状態')).toContainText(
      '更新済み',
    )
    return newPage
  }

  const first = await openNewGranvas(true)
  const second = await openNewGranvas()
  const firstHash = new URL(first.url()).hash
  const secondHash = new URL(second.url()).hash
  expect(firstHash).toMatch(
    /^#project=[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
  expect(secondHash).toMatch(/^#project=/)
  expect(secondHash).not.toBe(firstHash)
  expect(await first.evaluate(() => window.opener === null)).toBe(true)
  expect(await second.evaluate(() => window.opener === null)).toBe(true)

  for (const newPage of [first, second]) {
    await expect(newPage.getByLabel('ワークスペースの状態')).toContainText(
      'ダウンロード済み',
    )
    await expect(newPage.getByLabel('ワークスペースの状態')).toContainText(
      'Node 0件',
    )
  }

  await first.getByRole('button', { name: 'ダウンロード' }).click()
  await expect(first.getByRole('textbox', { name: 'ファイル名' })).toHaveValue(
    'untitled',
  )
  const emptyDownloadPromise = first.waitForEvent('download')
  await first
    .getByRole('dialog')
    .getByRole('button', { name: 'ダウンロード', exact: true })
    .click()
  const emptyDownload = await emptyDownloadPromise
  expect(emptyDownload.suggestedFilename()).toBe('untitled.granvas')
  expect(await downloadBytes(emptyDownload)).toHaveLength(0)

  const firstSource = '[idea @first] 1つ目の新規タブ'
  const secondSource = '[idea @second] 2つ目の新規タブ'
  await first
    .getByRole('textbox', { name: 'Granvas テキストエディタ' })
    .fill(firstSource)
  await second
    .getByRole('textbox', { name: 'Granvas テキストエディタ' })
    .fill(secondSource)

  const firstKey = `${temporaryProjectKey}:${firstHash.slice('#project='.length)}`
  const secondKey = `${temporaryProjectKey}:${secondHash.slice('#project='.length)}`
  await expect
    .poll(() =>
      first.evaluate((key) => {
        const value = localStorage.getItem(key)
        return value === null ? null : JSON.parse(value).source
      }, firstKey),
    )
    .toBe(firstSource)
  await expect
    .poll(() =>
      second.evaluate((key) => {
        const value = localStorage.getItem(key)
        return value === null ? null : JSON.parse(value).source
      }, secondKey),
    )
    .toBe(secondSource)

  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).source, temporaryProjectKey),
  ).toBe(originalSource)
  await expect(editor).toHaveText(originalSource)

  first.on('dialog', (dialog) => dialog.accept())
  second.on('dialog', (dialog) => dialog.accept())
  await first.reload()
  await second.reload()
  await expect(
    first.getByRole('textbox', { name: 'Granvas テキストエディタ' }),
  ).toHaveText(firstSource)
  await expect(
    second.getByRole('textbox', { name: 'Granvas テキストエディタ' }),
  ).toHaveText(secondSource)
})

test('restores the last Text immediately after reload without treating it as downloaded', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  const source = '[idea @recovery] Reload recovery\n  -> [todo] Last keystroke'

  await editor.fill(source)
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const value = localStorage.getItem(key)
        return value === null ? null : JSON.parse(value).source
      }, temporaryProjectKey),
    )
    .toBe(source)

  page.on('dialog', (dialog) => dialog.accept())
  await page.reload()

  await expect(editor).toContainText('Last keystroke')
  await expect(
    page.getByRole('button', { name: '指定なし、idea：Reload recovery' }),
  ).toBeVisible()
  await expect(page.getByLabel('ワークスペースの状態')).toContainText(
    '未ダウンロード',
  )
  await expect(page.getByLabel('ワークスペースの状態')).toContainText(
    '一時保存済み（24時間）',
  )
  await expect(page.getByRole('status')).toContainText(
    '24時間の一時保存から作業を復元しました',
  )

  const keys = await page.evaluate((key) =>
    Object.keys(JSON.parse(localStorage.getItem(key)!)).sort(), temporaryProjectKey)
  expect(keys).toEqual([
    'dirty',
    'expiresAt',
    'name',
    'savedAt',
    'schemaVersion',
    'source',
  ])
})

test('restores Graph edits from Text and rejects expired or corrupt records', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await editor.fill('[idea @graph-recovery] Before')
  const node = page.getByRole('button', { name: '指定なし、idea：Before' })
  await expect(node).toBeVisible()
  await node.focus()
  await node.press('F2')
  const labelEditor = page.getByRole('textbox', { name: 'Beforeのラベルを編集' })
  await labelEditor.fill('After')
  await labelEditor.press('Enter')
  await expect(page.getByRole('button', { name: '指定なし、idea：After' })).toBeVisible()

  page.on('dialog', (dialog) => dialog.accept())
  await page.reload()
  await expect(editor).toContainText('[idea @graph-recovery] After')
  await expect(page.getByRole('button', { name: '指定なし、idea：After' })).toBeVisible()

  await page.evaluate((key) => {
    const savedAt = Date.now() - 24 * 60 * 60 * 1000
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        name: 'expired',
        source: '[idea] Must not restore',
        dirty: true,
        savedAt,
        expiresAt: savedAt + 24 * 60 * 60 * 1000,
      }),
    )
  }, temporaryProjectKey)
  await page.reload()
  await expect(editor).toContainText('[problem @scattered] 顧客情報が分散している')
  expect(await page.evaluate((key) => localStorage.getItem(key), temporaryProjectKey)).toBeNull()

  await page.evaluate((key) => localStorage.setItem(key, '{corrupt'), temporaryProjectKey)
  await page.reload()
  await expect(editor).toContainText('[problem @scattered] 顧客情報が分散している')
  expect(await page.evaluate((key) => localStorage.getItem(key), temporaryProjectKey)).toBeNull()
})

test('updates the current Graph and synchronizes Text and Node selection', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  const source = '[idea @fresh] Fresh idea\n  -> [todo] Ship it'

  await editor.fill(source)
  const freshNode = page.getByRole('button', {
    name: '指定なし、idea：Fresh idea',
  })
  await expect(freshNode).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: '指定なし、problem：顧客情報が分散している',
    }),
  ).toHaveCount(0)
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Node 2件')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Relation 1件')

  await freshNode.click()
  await expect
    .poll(() => editor.evaluate(() => window.getSelection()?.toString() ?? ''))
    .toBe('[idea @fresh] Fresh idea')

  const todoNode = page.getByRole('button', {
    name: '指定なし、todo：Ship it',
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
      name: '指定なし、idea：Still valid',
    }),
  ).toBeVisible()
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('診断 1件')
})

test('imports a .granvas project through the browser picker', async ({ page }) => {
  await page.goto('/')
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'プロジェクトを読み込む' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'imported.granvas',
    mimeType: 'text/plain',
    buffer: Buffer.from('[idea @imported] Imported thought\r\n  -> [todo] Continue'),
  })

  await expect(
    page.getByRole('button', {
      name: '指定なし、idea：Imported thought',
    }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Granvas テキストエディタ' })).toContainText(
    '[idea @imported] Imported thought',
  )
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('ダウンロード済み')
  await expect(page.getByRole('status')).toContainText('imported.granvasを読み込みました')
})

test('supports keyboard resizing and an accessible Download dialog', async ({
  page,
}) => {
  await page.goto('/')
  const separator = page.getByRole('separator', {
    name: 'テキストとグラフの表示幅を変更',
  })
  await expect(separator).toHaveAttribute('aria-valuenow', '55')
  await separator.press('ArrowRight')
  await expect(separator).toHaveAttribute('aria-valuenow', '57')

  const downloadButton = page.getByRole('button', { name: 'ダウンロード' })
  await downloadButton.click()
  const dialog = page.getByRole('dialog', { name: '作業内容をダウンロード' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'ファイル名' })).toBeFocused()
  await expect(page.getByRole('radio', { name: /SVG/ })).toBeEnabled()
  await expect(page.getByRole('radio', { name: /PNG/ })).toBeEnabled()
  await expect(page.getByRole('radio', { name: /PDF/ })).toBeEnabled()
  await dialog.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(downloadButton).toBeFocused()
})

test('downloads viewport-independent SVG, PNG, and PDF with Japanese certainty content', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await editor.fill(`@layout flow LR

[?problem @start] 日本語 <script> は文字列
  !-> [!idea @middle] 確定した案
[~todo @end] 棄却した作業

@middle ?-> @end : 次の候補

{検証グループ}
  @start
  @middle`)
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('診断 0件')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('未ダウンロード')

  await page.locator('.react-flow__controls-zoomin').click()
  await page.locator('.react-flow__controls-zoomin').click()

  const downloadFormat = async (format: 'SVG' | 'PNG' | 'PDF') => {
    await page.getByRole('button', { name: 'ダウンロード' }).click()
    const dialog = page.getByRole('dialog', { name: '作業内容をダウンロード' })
    await dialog.getByRole('radio', { name: new RegExp(format) }).check()
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'ダウンロード', exact: true }).click()
    const download = await downloadPromise
    return { bytes: await downloadBytes(download), download }
  }

  const svg = await downloadFormat('SVG')
  expect(svg.download.suggestedFilename()).toBe('untitled.svg')
  const svgText = svg.bytes.toString('utf8')
  expect(svgText).toContain('viewBox=')
  expect(svgText).toContain('日本語 &lt;script&gt; は文字列')
  expect(svgText).toContain('検証グループ')
  expect(svgText).toContain('次の候補')
  expect(svgText).toContain('data-certainty="tentative"')
  expect(svgText).toContain('data-certainty="confirmed"')
  expect(svgText).toContain('data-certainty="rejected"')
  expect(svgText).not.toContain('<script>')

  const png = await downloadFormat('PNG')
  expect(png.download.suggestedFilename()).toBe('untitled.png')
  expect([...png.bytes.subarray(0, 8)]).toEqual([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])
  expect(png.bytes.readUInt32BE(16)).toBeGreaterThan(1)
  expect(png.bytes.readUInt32BE(20)).toBeGreaterThan(1)

  const pdf = await downloadFormat('PDF')
  expect(pdf.download.suggestedFilename()).toBe('untitled.pdf')
  expect(pdf.bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  const pdfDocument = await PDFDocument.load(pdf.bytes)
  expect(pdfDocument.getPageCount()).toBe(1)
  expect(pdfDocument.getPage(0).getWidth()).toBeGreaterThan(1)
  expect(pdfDocument.getPage(0).getHeight()).toBeGreaterThan(1)

  await expect(page.getByLabel('ワークスペースの状態')).toContainText('未ダウンロード')
})

test('downloads BOM-free .granvas source and marks that revision saved', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  const source = '😀 project — saved locally'
  await editor.fill(source)
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('未ダウンロード')
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true })
      return !window.dispatchEvent(event)
    }),
  ).toBe(true)

  await page.getByRole('button', { name: 'ダウンロード' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'ダウンロード', exact: true })
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
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('ダウンロード済み')

  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'プロジェクトを読み込む' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'roundtrip.granvas',
    mimeType: 'text/plain',
    buffer: bytes,
  })
  await expect(editor).toContainText(source)
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('ダウンロード済み')

  await editor.fill(`${source}\n[idea @resumed] Resume editing`)
  await expect(
    page.getByRole('button', {
      name: '指定なし、idea：Resume editing',
    }),
  ).toBeVisible()
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('未ダウンロード')
})

test('projects certainty markers without color-only distinctions', async ({ page }) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await expect(editor).toContainText('@layout flow TB')
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

  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Node 6件')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Relation 5件')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('診断 0件')
  await expect(
    page.getByRole('button', {
      name: '未確定、hypothesis：価格が高い',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: '確定、idea：初回設定を3ステップにする',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: '棄却、idea：値下げする',
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
      '[aria-label="棄却のRelation：解約が増えているからUI が古い"]',
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
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await editor.fill(
    'Intro prose must stay\n[?idea @editable]  Before  \nClosing prose must stay',
  )

  const beforeNode = page.getByRole('button', {
    name: '未確定、idea：Before',
  })
  await expect(beforeNode).toBeVisible()
  // CodeMirror groups adjacent changes for 500 ms. Cross that boundary so the
  // setup fill and the Graph-originated patch remain separate Undo entries.
  await page.waitForTimeout(600)
  await beforeNode.focus()
  await beforeNode.press('F2')
  const labelEditor = page.getByRole('textbox', {
    name: 'Beforeのラベルを編集',
  })
  await labelEditor.fill('After 😀')
  await labelEditor.press('Enter')

  const afterNode = page.getByRole('button', {
    name: '未確定、idea：After 😀',
  })
  await expect(afterNode).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Nodeのラベルを更新しました')
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
    name: 'BeforeのTypeを編集',
  })
  await typeEditor.fill('Problem_Main')
  await typeEditor.press('Enter')

  await expect(
    page.getByRole('button', {
      name: '未確定、problem_main：Before',
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
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await editor.fill('Intro prose\n[Problem] Root\n[Idea] Target\nClosing prose')

  let root = page.getByRole('button', {
    name: '指定なし、problem：Root',
  })
  await root.focus()
  await root.press('Enter')
  await page.getByLabel('「Root」の確信度').selectOption('confirmed')
  root = page.getByRole('button', {
    name: '確定、problem：Root',
  })
  await expect(root).toBeVisible()

  await page.getByRole('button', { name: '子Nodeを追加' }).click()
  const childDialog = page.getByRole('dialog', { name: '子Nodeを追加' })
  await childDialog.getByLabel('Type').fill('Cause')
  await childDialog.getByLabel('ラベル').fill('Child 😀')
  await childDialog.getByRole('button', { name: '反映' }).click()
  await expect(
    page.getByRole('button', {
      name: '指定なし、cause：Child 😀',
    }),
  ).toBeVisible()

  await root.click()
  await page.getByRole('button', { name: '接続' }).click()
  const connectDialog = page.getByRole('dialog', { name: 'Nodeを接続' })
  await connectDialog.getByLabel('接続先のNode').selectOption({ label: 'Target' })
  await connectDialog.getByLabel('Relationラベル（任意）').fill('supports')
  await connectDialog.getByLabel('確信度').selectOption('tentative')
  await connectDialog.getByRole('button', { name: '反映' }).click()

  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Node 3件')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('Relation 2件')
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

  await page.getByRole('button', { name: '＋ Nodeを作成' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Nodeを作成' })
  await expect(createDialog.getByLabel('Type')).toBeFocused()
  await createDialog.getByLabel('ラベル').fill('Top level')
  await createDialog.getByRole('button', { name: '反映' }).click()
  await expect(
    page.getByRole('button', { name: '指定なし、node：Top level' }),
  ).toBeVisible()
})

test('uses semantic drag and keyboard Move to change parentage and Group membership', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await editor.fill(
    '[Problem] Root\n[Idea] Other\n{Discovery}\n  [Node] Member\nClosing prose',
  )

  const root = page.getByRole('button', {
    name: '指定なし、problem：Root',
  })
  let other = page.getByRole('button', {
    name: '指定なし、idea：Other',
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
  await page.getByRole('button', { name: '構造を変更' }).click()
  let moveDialog = page.getByRole('dialog', { name: 'Nodeの構造を変更' })
  await moveDialog.getByLabel('構造の変更先').selectOption({ label: 'Other' })
  await moveDialog.getByRole('button', { name: '反映' }).click()
  await expect(page.getByRole('alert')).toContainText(
    '自分自身または子孫を親にはできません',
  )
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toEqual(beforeCycle)

  other = page.getByRole('button', {
    name: '指定なし、idea：Other',
  })
  await other.click()
  await page.getByRole('button', { name: '構造を変更' }).click()
  moveDialog = page.getByRole('dialog', { name: 'Nodeの構造を変更' })
  await moveDialog.getByLabel('構造の変更先').selectOption({
    label: 'Discovery',
  })
  await moveDialog.getByRole('button', { name: '反映' }).click()
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('  @other')

  await other.click()
  await page.getByRole('button', { name: '構造を変更' }).click()
  moveDialog = page.getByRole('dialog', { name: 'Nodeの構造を変更' })
  await moveDialog.getByLabel('構造の変更先').selectOption('detach')
  await moveDialog.getByRole('button', { name: '反映' }).click()
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
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await editor.fill(
    '[Problem @root] Root\n  ?-> [Cause @child] Child\n    !-> [Evidence] Grand\n@root -> @other\n[Idea @other] Other\n{Group}\n  @root\nClosing prose',
  )

  const nestedEdge = page.locator(
    '[aria-label="未確定のRelation：RootからChild"]',
  )
  await nestedEdge.focus()
  await nestedEdge.press('Delete')
  let dialog = page.getByRole('dialog', { name: '削除内容を確認' })
  await expect(dialog).toContainText('Childを子孫ごとスコープのルートへ昇格します')
  await dialog.getByRole('button', { name: '削除' }).click()
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('[Cause @child] Child')
  await expect
    .poll(() => editor.locator('.cm-line').allTextContents())
    .toContain('  !-> [Evidence] Grand')

  const root = page.getByRole('button', {
    name: '指定なし、problem：Root',
  })
  await root.focus()
  await root.press('Delete')
  dialog = page.getByRole('dialog', { name: '削除内容を確認' })
  await expect(dialog).toContainText('Node 1件')
  await expect(dialog).toContainText('Cross Relation 1件')
  await expect(dialog).toContainText('Group参照 1件')
  await dialog.getByRole('button', { name: '削除' }).click()

  await expect(root).toHaveCount(0)
  await expect(editor).toContainText('[Cause @child] Child')
  await expect(editor).toContainText('[Idea @other] Other')
  await expect(editor).toContainText('Closing prose')
})
