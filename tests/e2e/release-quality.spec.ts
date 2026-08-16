import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] as const

test.describe.configure({ mode: 'serial' })

async function expectNoWcagViolations(page: Page, context: string): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags([...wcagTags]).analyze()
  expect(
    result.violations,
    `${context}: ${JSON.stringify(
      result.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map(({ target }) => target),
      })),
    )}`,
  ).toEqual([])
}

async function downloadVisual(page: Page, format: 'SVG' | 'PNG' | 'PDF') {
  await page.getByRole('button', { name: 'ダウンロード' }).click()
  const dialog = page.getByRole('dialog', { name: '作業内容をダウンロード' })
  await dialog.getByRole('radio', { name: new RegExp(format) }).check()
  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'ダウンロード', exact: true }).click()
  return downloadPromise
}

test('has no WCAG 2.2 A/AA violations in the workspace and primary dialogs', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('更新済み')
  await expectNoWcagViolations(page, 'workspace')

  await page.getByRole('button', { name: 'ダウンロード' }).click()
  await expect(page.getByRole('dialog', { name: '作業内容をダウンロード' })).toBeVisible()
  await page.waitForTimeout(250)
  await expectNoWcagViolations(page, 'Download dialog')
  await page.getByRole('dialog').press('Escape')

  await page.getByRole('button', { name: '＋ Nodeを作成' }).click()
  await expect(page.getByRole('dialog', { name: 'Nodeを作成' })).toBeVisible()
  await page.waitForTimeout(250)
  await expectNoWcagViolations(page, 'Graph authoring dialog')
})

test('reaches pane, project, Graph editing, and dialog flows without pointer input', async ({
  page,
}) => {
  await page.goto('/')
  const newGranvasButton = page.getByRole('button', {
    name: '新しいGranvasを新しいタブで開く',
  })
  const importButton = page.getByRole('button', { name: 'プロジェクトを読み込む' })
  const downloadButton = page.getByRole('button', { name: 'ダウンロード' })

  await newGranvasButton.focus()
  await expect(newGranvasButton).toBeFocused()
  await importButton.focus()
  await expect(importButton).toBeFocused()
  await downloadButton.focus()
  await expect(downloadButton).toBeFocused()
  await page.keyboard.press('Enter')
  const downloadDialog = page.getByRole('dialog', { name: '作業内容をダウンロード' })
  await expect(downloadDialog.getByRole('textbox', { name: 'ファイル名' })).toBeFocused()
  const granvasFormat = downloadDialog.getByRole('radio', { name: /^\.granvas/ })
  await granvasFormat.focus()
  await expect(granvasFormat).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(downloadDialog.getByRole('radio', { name: /^PNG/ })).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(downloadButton).toBeFocused()

  await importButton.focus()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.keyboard.press('Enter')
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'keyboard.granvas',
    mimeType: 'text/plain',
    buffer: Buffer.from('[idea @keyboard] Keyboard flow'),
  })
  await expect(
    page.getByRole('button', { name: '指定なし、idea：Keyboard flow' }),
  ).toBeVisible()

  const separator = page.getByRole('separator', {
    name: 'テキストとグラフの表示幅を変更',
  })
  await separator.focus()
  await page.keyboard.press('ArrowRight')
  await expect(separator).toHaveAttribute('aria-valuenow', '57')

  const node = page.getByRole('button', {
    name: '指定なし、idea：Keyboard flow',
  })
  await node.focus()
  await page.keyboard.press('Enter')
  await node.press('F2')
  const labelEditor = page.getByRole('textbox', {
    name: 'Keyboard flowのラベルを編集',
  })
  await expect(labelEditor).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(node).toBeFocused()

  const createButton = page.getByRole('button', { name: '＋ Nodeを作成' })
  await createButton.focus()
  await page.keyboard.press('Enter')
  const createDialog = page.getByRole('dialog', { name: 'Nodeを作成' })
  await expect(createDialog.getByLabel('Type')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(createButton).toBeFocused()
})

test('makes no cross-origin requests after load while editing, importing, and exporting', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByLabel('ワークスペースの状態')).toContainText('更新済み')
  const applicationOrigin = new URL(page.url()).origin
  const crossOriginRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== applicationOrigin) {
      crossOriginRequests.push(request.url())
    }
  })

  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await editor.fill('[?idea @offline] Offline edit\n  -> [todo] Download outputs')
  await expect(page.getByRole('button', { name: '未確定、idea：Offline edit' })).toBeVisible()

  await downloadVisual(page, 'SVG')
  await downloadVisual(page, 'PNG')
  await downloadVisual(page, 'PDF')

  const chooserPromise = page.waitForEvent('filechooser')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'プロジェクトを読み込む' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'offline.granvas',
    mimeType: 'text/plain',
    buffer: Buffer.from('[idea] Imported offline'),
  })
  await expect(page.getByRole('button', { name: '指定なし、idea：Imported offline' })).toBeVisible()
  expect(crossOriginRequests).toEqual([])
})

test('meets browser input, projection, Graph edit, and pan/zoom budgets', async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== 'chromium', 'PerformanceObserver release evidence uses Chromium.')
  test.setTimeout(60_000)
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: 'Granvas テキストエディタ' })
  await expect(editor).toContainText('@layout flow TB')

  await editor.focus()
  await page.keyboard.press('ControlOrMeta+End')
  const inputSamples: number[] = []
  for (let index = 0; index < 20; index += 1) {
    await page.evaluate(() => {
      const measuredWindow = window as typeof window & {
        __granvasInputPaint?: number
      }
      measuredWindow.__granvasInputPaint = undefined
      document.addEventListener(
        'beforeinput',
        (event) => {
          requestAnimationFrame(() => {
            measuredWindow.__granvasInputPaint = performance.now() - event.timeStamp
          })
        },
        { once: true, capture: true },
      )
    })
    await page.keyboard.type('x')
    inputSamples.push(
      await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const measuredWindow = window as typeof window & {
              __granvasInputPaint?: number
            }
            const readMeasurement = () => {
              if (measuredWindow.__granvasInputPaint !== undefined) {
                resolve(measuredWindow.__granvasInputPaint)
                return
              }
              requestAnimationFrame(readMeasurement)
            }
            readMeasurement()
          }),
      ),
    )
  }

  const projectionSamples: number[] = []
  for (let index = 0; index < 20; index += 1) {
    const started = await page.evaluate(() => performance.now())
    await editor.fill(`[idea @perf] Projection ${index}`)
    await expect(
      page.getByRole('button', {
        name: `指定なし、idea：Projection ${index}`,
      }),
    ).toBeVisible()
    projectionSamples.push(
      await page.evaluate((start) => performance.now() - start, started),
    )
  }

  const graphEditSamples: number[] = []
  let currentLabel = 'Projection 19'
  for (let index = 0; index < 20; index += 1) {
    const node = page.getByRole('button', {
      name: `指定なし、idea：${currentLabel}`,
    })
    await node.focus()
    await node.press('F2')
    const labelEditor = page.getByRole('textbox', {
      name: `${currentLabel}のラベルを編集`,
    })
    const nextLabel = `Graph edit ${index}`
    await labelEditor.fill(nextLabel)
    const started = await page.evaluate(() => performance.now())
    await labelEditor.press('Enter')
    await expect(
      page.getByRole('button', {
        name: `指定なし、idea：${nextLabel}`,
      }),
    ).toBeVisible()
    graphEditSamples.push(
      await page.evaluate((start) => performance.now() - start, started),
    )
    currentLabel = nextLabel
  }

  await page.evaluate(() => {
    const durations: number[] = []
    ;(window as typeof window & { __granvasLongTasks?: number[] }).__granvasLongTasks =
      durations
    new PerformanceObserver((entries) => {
      durations.push(...entries.getEntries().map(({ duration }) => duration))
    }).observe({ type: 'longtask', buffered: true })
  })
  for (let index = 0; index < 10; index += 1) {
    await page.getByRole('button', { name: index % 2 === 0 ? '拡大' : '縮小' }).click()
  }
  await page.evaluate(() => new Promise(requestAnimationFrame))
  const longTasks = await page.evaluate(
    () =>
      (window as typeof window & { __granvasLongTasks?: number[] })
        .__granvasLongTasks ?? [],
  )

  const p95 = (samples: number[]) =>
    [...samples].sort((left, right) => left - right)[
      Math.ceil(samples.length * 0.95) - 1
    ]!
  const inputP95 = p95(inputSamples)
  const projectionP95 = p95(projectionSamples)
  const graphEditP95 = p95(graphEditSamples)
  console.info(
    `BROWSER_PERF input_p95_ms=${inputP95.toFixed(2)} projection_p95_ms=${projectionP95.toFixed(2)} graph_edit_p95_ms=${graphEditP95.toFixed(2)} long_task_max_ms=${Math.max(0, ...longTasks).toFixed(2)}`,
  )
  expect(inputP95).toBeLessThan(50)
  expect(projectionP95).toBeLessThan(350)
  expect(graphEditP95).toBeLessThan(350)
  expect(longTasks.every((duration) => duration <= 100)).toBe(true)
})
