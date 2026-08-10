// @vitest-environment node

import { describe, expect, it } from 'vitest'

import vercelConfig from '../../vercel.json'

type Header = {
  key: string
  value: string
}

type VercelConfig = {
  framework?: string
  buildCommand?: string
  outputDirectory?: string
  rewrites?: Array<{ source: string; destination: string }>
  headers?: Array<{ source: string; headers: Header[] }>
  functions?: unknown
}

const config = vercelConfig as VercelConfig

describe('Vercel deployment contract', () => {
  it('builds and serves the Vite application as a static SPA', () => {
    expect(config).toMatchObject({
      framework: 'vite',
      buildCommand: 'bun run build',
      outputDirectory: 'dist',
      rewrites: [{ source: '/(.*)', destination: '/index.html' }],
    })
    expect(config.functions).toBeUndefined()
  })

  it('sets the required production security headers', () => {
    const headers = config.headers?.find(({ source }) => source === '/(.*)')?.headers ?? []
    const headerMap = new Map(headers.map(({ key, value }) => [key, value]))
    const csp = headerMap.get('Content-Security-Policy') ?? ''

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("connect-src 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('supabase')
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headerMap.get('Referrer-Policy')).toBe('no-referrer')
  })
})
