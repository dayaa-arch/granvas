// @vitest-environment node

import { describe, expect, it } from 'vitest'

import vercelConfig from '../../vercel.json'

type Header = {
  key: string
  value: string
}

type VercelConfig = {
  $schema?: string
  framework?: string
  buildCommand?: string
  outputDirectory?: string
  rewrites?: Array<{ source: string; destination: string }>
  headers?: Array<{ source: string; headers: Header[] }>
  functions?: unknown
  crons?: unknown
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
    expect(config.crons).toBeUndefined()
  })

  it('sets the required production security headers', () => {
    const headers = config.headers?.find(({ source }) => source === '/(.*)')?.headers ?? []
    const headerMap = new Map(headers.map(({ key, value }) => [key, value]))
    const csp = headerMap.get('Content-Security-Policy') ?? ''

    expect(csp).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    )
    expect(csp).not.toContain('supabase')
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headerMap.get('Referrer-Policy')).toBe('no-referrer')
    expect([...headerMap.keys()].sort()).toEqual([
      'Content-Security-Policy',
      'Referrer-Policy',
      'X-Content-Type-Options',
    ])
  })
})
