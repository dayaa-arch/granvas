import { describe, expect, it, vi } from 'vitest'

import {
  MAX_PROJECT_FILE_BYTES,
  createTransferApplication,
  decodeProjectBytes,
  downloadGraph,
  downloadProject,
  importProjectFile,
  type DownloadFileDto,
  type FileDownloadPort,
  type GraphExportPort,
  type PickedProjectFileDto,
  type ProjectFilePickerPort,
  type TransferGraphExportSceneDto,
} from '@/modules/transfer'

const encoder = new TextEncoder()

const scene: TransferGraphExportSceneDto = Object.freeze({
  revision: 4,
  graph: Object.freeze({
    revision: 4,
    nodes: Object.freeze([
      Object.freeze({
        id: 'node-a',
        label: 'A',
        type: 'idea',
        x: 0,
        y: 0,
        width: 240,
        height: 88,
      }),
    ]),
    edges: Object.freeze([]),
    groups: Object.freeze([]),
  }),
  bounds: Object.freeze({ x: -24, y: -24, width: 288, height: 136 }),
  theme: 'light',
})

function pickerFor(file: PickedProjectFileDto | null): ProjectFilePickerPort {
  return { pickProjectFile: async () => file }
}

describe('Transfer Application', () => {
  it('returns cancelled without reading a file', async () => {
    await expect(importProjectFile(pickerFor(null))).resolves.toEqual({
      type: 'cancelled',
    })
  })

  it.each([
    ['notes.txt', 10, 'invalid-project-extension'],
    ['notes.granvas', MAX_PROJECT_FILE_BYTES + 1, 'project-too-large'],
  ] as const)(
    'rejects %s metadata before reading bytes',
    async (name, size, code) => {
      const readBytes = vi.fn(async () => encoder.encode('must not be read'))

      await expect(
        importProjectFile(pickerFor({ name, size, readBytes })),
      ).resolves.toMatchObject({ type: 'error', code })
      expect(readBytes).not.toHaveBeenCalled()
    },
  )

  it('strictly decodes BOM, emoji, and CRLF without rewriting source', async () => {
    const source = '😀 idea\r\n[node] Keep CRLF'
    const encoded = encoder.encode(source)
    const bytes = new Uint8Array(encoded.length + 3)
    bytes.set([0xef, 0xbb, 0xbf])
    bytes.set(encoded, 3)

    const result = await importProjectFile(
      pickerFor({
        name: 'emoji.granvas',
        size: bytes.byteLength,
        readBytes: async () => bytes,
      }),
    )

    expect(result).toEqual({
      type: 'imported',
      project: { name: 'emoji', source },
    })
    expect((result as { project: { source: string } }).project.source).not.toContain(
      '\uFEFF',
    )
  })

  it.each([
    new Uint8Array([0xc3, 0x28]),
    new Uint8Array([0xe2, 0x82]),
    new Uint8Array([0xc0, 0xaf]),
  ])('rejects malformed UTF-8 sequence %#', async (bytes) => {
    const result = await importProjectFile(
      pickerFor({
        name: 'invalid.granvas',
        size: bytes.byteLength,
        readBytes: async () => bytes,
      }),
    )

    expect(result).toMatchObject({ type: 'error', code: 'invalid-utf8' })
    expect(() => decodeProjectBytes(bytes)).toThrowError(
      expect.objectContaining({ code: 'invalid-utf8' }),
    )
  })

  it('rechecks actual byte length after a metadata-valid pick', async () => {
    const result = await importProjectFile(
      pickerFor({
        name: 'changed.granvas',
        size: 1,
        readBytes: async () => new Uint8Array(MAX_PROJECT_FILE_BYTES + 1),
      }),
    )

    expect(result).toMatchObject({ type: 'error', code: 'project-too-large' })
  })

  it('downloads only BOM-free UTF-8 source for a project', async () => {
    let downloaded: DownloadFileDto | undefined
    const fileDownload: FileDownloadPort = {
      download: async (file) => {
        downloaded = file
      },
    }
    const source = '😀\r\n[node] Round trip'

    const result = await downloadProject(
      { name: 'notes.granvas', source },
      fileDownload,
    )

    expect(result).toMatchObject({
      type: 'downloaded',
      file: {
        fileName: 'notes.granvas',
        mimeType: 'text/plain;charset=utf-8',
      },
    })
    expect(downloaded).toBeDefined()
    expect([...downloaded!.bytes.slice(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf])
    expect(decodeProjectBytes(downloaded!.bytes)).toBe(source)
  })

  it('renders a visual file before starting its browser download', async () => {
    const render = vi.fn(async () => ({
      bytes: encoder.encode('<svg/>'),
      notices: Object.freeze(['valid projection only']),
    }))
    const download = vi.fn(async () => undefined)

    const result = await downloadGraph(
      { name: 'diagram.pdf', format: 'svg', scene },
      { render },
      { download },
    )

    expect(render).toHaveBeenCalledWith(scene, 'svg')
    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'diagram.svg',
        mimeType: 'image/svg+xml',
      }),
    )
    expect(result).toMatchObject({
      type: 'downloaded',
      notices: ['valid projection only'],
    })
  })

  it('returns distinct render and download failures', async () => {
    const rendererFailure: GraphExportPort = {
      render: async () => {
        throw new Error('renderer offline')
      },
    }
    const downloaderFailure: FileDownloadPort = {
      download: async () => {
        throw new Error('browser rejected')
      },
    }

    await expect(
      downloadGraph(
        { name: 'graph', format: 'svg', scene },
        rendererFailure,
        { download: async () => undefined },
      ),
    ).resolves.toMatchObject({ type: 'error', code: 'graph-render-failed' })
    await expect(
      downloadProject({ name: 'project', source: '' }, downloaderFailure),
    ).resolves.toMatchObject({ type: 'error', code: 'download-failed' })
  })

  it('creates a stable facade over injected ports', async () => {
    const application = createTransferApplication({
      projectFilePicker: pickerFor(null),
      fileDownload: { download: async () => undefined },
      graphExport: {
        render: async () => ({ bytes: new Uint8Array(), notices: [] }),
      },
    })

    await expect(application.importProjectFile()).resolves.toEqual({
      type: 'cancelled',
    })
    expect(Object.isFrozen(application)).toBe(true)
  })
})
