import { access, readFile, readdir } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'

const outputDirectory = resolve('dist')
await access(resolve(outputDirectory, 'index.html'))

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    }),
  )
  return nested.flat()
}

const files = await listFiles(outputDirectory)
const sourceMaps = files.filter((file) => file.endsWith('.map'))
if (sourceMaps.length > 0) {
  throw new Error(`Release build contains source maps: ${sourceMaps.join(', ')}`)
}

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt'])
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /SUPABASE_(?:URL|ANON_KEY|SERVICE_ROLE_KEY)/iu,
  /VERCEL_(?:TOKEN|ORG_ID|PROJECT_ID)\s*[:=]/iu,
  /AKIA[0-9A-Z]{16}/u,
  /gh[pousr]_[A-Za-z0-9_]{20,}/u,
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/u,
]
const forbiddenRuntimeHosts = [
  'google-analytics.com',
  'googletagmanager.com',
  'plausible.io',
  'segment.com',
  'supabase.co',
]
const allowedUrlPrefixes = [
  'http://www.w3.org/',
  'https://github.com/Hopding/pdf-lib',
  'https://react.dev/errors/',
  'https://reactflow.dev?utm_source=attribution',
  'https://reactflow.dev/',
  'https://${e}flow.dev/error#',
]
const discoveredUrls = new Set()

for (const file of files.filter((candidate) => textExtensions.has(extname(candidate)))) {
  const content = await readFile(file, 'utf8')
  const releasePath = relative(outputDirectory, file)

  if (secretPatterns.some((pattern) => pattern.test(content))) {
    throw new Error(`Release build contains a credential-like value in ${releasePath}`)
  }
  if (forbiddenRuntimeHosts.some((host) => content.includes(host))) {
    throw new Error(`Release build contains a forbidden runtime host in ${releasePath}`)
  }
  if (content.includes('sourceMappingURL=')) {
    throw new Error(`Release build contains a source map reference in ${releasePath}`)
  }

  for (const match of content.matchAll(/https?:\/\/[^\s"'`<>)]+/gu)) {
    const url = match[0].replace(/[},;]+$/gu, '')
    discoveredUrls.add(url)
    if (!allowedUrlPrefixes.some((prefix) => url.startsWith(prefix))) {
      throw new Error(`Release build contains an unexpected remote URL in ${releasePath}: ${url}`)
    }
  }
}

console.log(
  `Verified ${files.length} release files: no source maps, credential patterns, tracking hosts, or unexpected remote URLs. Allowed static URL constants: ${discoveredUrls.size}.`,
)
