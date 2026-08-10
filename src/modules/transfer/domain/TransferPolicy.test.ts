import { describe, expect, it } from 'vitest'

import {
  MAX_PROJECT_FILE_BYTES,
  TransferPolicyError,
  createDownloadFileName,
  createPngRenderSize,
  mimeTypeFor,
  projectNameFromFileName,
  sanitizeDownloadBaseName,
  validateProjectFileMetadata,
} from '@/modules/transfer'

describe('Transfer Domain policy', () => {
  it('sanitizes untrusted file names and applies exactly one extension', () => {
    expect(createDownloadFileName(' report.svg ', 'png')).toBe('report.png')
    expect(createDownloadFileName('my/project?.svg', 'svg')).toBe(
      'my-project-.svg',
    )
    expect(createDownloadFileName('CON', 'pdf')).toBe('_CON.pdf')
    expect(createDownloadFileName('\u0000\n.granvas', 'granvas')).toBe(
      '--.granvas',
    )
    expect(createDownloadFileName('   ', 'granvas')).toBe('untitled.granvas')
    expect(sanitizeDownloadBaseName('caf\u0065\u0301')).toBe('café')
    expect(projectNameFromFileName('ideas.GRANVAS')).toBe('ideas')
  })

  it('owns stable MIME policies for every format', () => {
    expect(mimeTypeFor('granvas')).toBe('text/plain;charset=utf-8')
    expect(mimeTypeFor('svg')).toBe('image/svg+xml')
    expect(mimeTypeFor('png')).toBe('image/png')
    expect(mimeTypeFor('pdf')).toBe('application/pdf')
  })

  it('validates project extension and the 5 MiB hard limit', () => {
    expect(() =>
      validateProjectFileMetadata('project.GRANVAS', MAX_PROJECT_FILE_BYTES),
    ).not.toThrow()
    expect(() =>
      validateProjectFileMetadata('project.txt', 10),
    ).toThrowError(
      expect.objectContaining({ code: 'invalid-project-extension' }),
    )
    expect(() =>
      validateProjectFileMetadata('project.granvas', MAX_PROJECT_FILE_BYTES + 1),
    ).toThrowError(expect.objectContaining({ code: 'project-too-large' }))
    expect(() =>
      validateProjectFileMetadata('project.granvas', Number.NaN),
    ).toThrowError(expect.objectContaining({ code: 'invalid-project-size' }))
  })

  it('uses 2x PNG rendering and uniformly limits either dimension to 8192px', () => {
    expect(createPngRenderSize({ x: -24, y: -24, width: 100, height: 50 })).toEqual(
      {
        scale: 2,
        pixelWidth: 200,
        pixelHeight: 100,
        limited: false,
      },
    )
    expect(
      createPngRenderSize({ x: 0, y: 0, width: 5000, height: 2500 }),
    ).toEqual({
      scale: 8192 / 5000,
      pixelWidth: 8192,
      pixelHeight: 4096,
      limited: true,
    })
    expect(() =>
      createPngRenderSize({ x: 0, y: 0, width: 0, height: 10 }),
    ).toThrowError(TransferPolicyError)
  })
})
