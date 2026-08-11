import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist-pages')
const requiredFiles = [
  'index.html',
  '404.html',
  '.nojekyll',
  'images/workspace-overview.png',
  'images/graph-authoring.png',
  'images/download-dialog.png',
]

for (const file of requiredFiles) {
  await access(resolve(outputDirectory, file))
}

const html = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
const requiredFragments = [
  '<html lang="ja">',
  'Granvas 1.0 公式ドキュメント',
  '公開プレビュー',
  'Granvas v0.1 開発版（Phase 8完了時点）',
  'href="#main-content"',
  '/granvas/assets/',
]

for (const fragment of requiredFragments) {
  if (!html.includes(fragment)) {
    throw new Error(`Pages build is missing required content: ${fragment}`)
  }
}

const localAssetUrls = [
  ...html.matchAll(/(?:href|src)="(\/granvas\/[^"#?]+)"/gu),
].map((match) => match[1])

for (const assetUrl of new Set(localAssetUrls)) {
  const assetPath = assetUrl.slice('/granvas/'.length)
  await access(resolve(outputDirectory, assetPath))
}

const trackingHosts = [
  'googletagmanager.com',
  'google-analytics.com',
  'plausible.io/js/',
  'cdn.segment.com',
]
if (trackingHosts.some((host) => html.includes(host))) {
  throw new Error('Tracking code must not be included in the official documentation.')
}

const imageTags = [...html.matchAll(/<img\s+[^>]*>/gu)].map((match) => match[0])
if (imageTags.some((tag) => !/\salt="[^"]+"/u.test(tag))) {
  throw new Error('Every documentation image must have non-empty alt text.')
}

console.log(`Verified GitHub Pages artifact with ${new Set(localAssetUrls).size} local assets.`)
