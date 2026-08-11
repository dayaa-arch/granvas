import { describe, expect, it, vi } from 'vitest'

import type { TransferGraphExportSceneDto } from '@/modules/transfer'

import {
  CanvasPngGraphExportAdapter,
  type CanvasPngEnvironment,
} from './CanvasPngGraphExportAdapter'

const scene: TransferGraphExportSceneDto = Object.freeze({
  revision: 3,
  graph: Object.freeze({
    revision: 3,
    nodes: Object.freeze([
      Object.freeze({
        id: 'node-a',
        label: '日本語の未確定Node',
        type: 'idea',
        certainty: 'tentative',
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

type EnvironmentOptions = Readonly<{
  missingContext?: boolean
  imageFailure?: boolean
  blobFailure?: boolean
}>

function createEnvironment(options: EnvironmentOptions = {}) {
  const fillRect = vi.fn()
  const drawImage = vi.fn()
  const revokeObjectUrl = vi.fn()
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() =>
      options.missingContext
        ? null
        : {
            fillStyle: '',
            fillRect,
            drawImage,
          },
    ),
    toBlob: vi.fn((callback: BlobCallback) =>
      callback(
        options.blobFailure
          ? null
          : new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
              type: 'image/png',
            }),
      ),
    ),
  } as unknown as HTMLCanvasElement
  class TestImage {
    onload: null | (() => void) = null
    onerror: null | (() => void) = null

    set src(_value: string) {
      queueMicrotask(() => {
        if (options.imageFailure) {
          this.onerror?.()
        } else {
          this.onload?.()
        }
      })
    }
  }
  const image = new TestImage() as unknown as HTMLImageElement
  const environment: CanvasPngEnvironment = {
    createCanvas: () => canvas,
    createImage: () => image,
    createObjectUrl: vi.fn(() => 'blob:granvas-scene'),
    revokeObjectUrl,
  }

  return { canvas, drawImage, environment, fillRect, revokeObjectUrl }
}

describe('CanvasPngGraphExportAdapter', () => {
  it('rasterizes the complete SVG scene at 2x on a white Canvas', async () => {
    const test = createEnvironment()
    const adapter = new CanvasPngGraphExportAdapter(test.environment)

    const result = await adapter.rasterize(scene)

    expect([...result.bytes]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(result.size).toEqual({
      scale: 2,
      pixelWidth: 576,
      pixelHeight: 272,
      limited: false,
    })
    expect(result.notices).toEqual([])
    expect(test.canvas.width).toBe(576)
    expect(test.canvas.height).toBe(272)
    expect(test.fillRect).toHaveBeenCalledWith(0, 0, 576, 272)
    expect(test.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      576,
      272,
    )
    expect(test.revokeObjectUrl).toHaveBeenCalledWith('blob:granvas-scene')
  })

  it('limits either bitmap dimension to 8192px and returns a Japanese notice', async () => {
    const test = createEnvironment()
    const adapter = new CanvasPngGraphExportAdapter(test.environment)
    const result = await adapter.rasterize({
      ...scene,
      bounds: { x: 0, y: 0, width: 5000, height: 100 },
    })

    expect(result.size).toMatchObject({
      pixelWidth: 8192,
      pixelHeight: 164,
      limited: true,
    })
    expect(result.notices[0]).toContain('画像サイズの上限（8192px）')
  })

  it.each([
    ['image decode', { imageFailure: true }],
    ['Canvas context', { missingContext: true }],
    ['PNG Blob', { blobFailure: true }],
  ] as const)('normalizes %s failures and always revokes the Object URL', async (_, options) => {
    const test = createEnvironment(options)
    const adapter = new CanvasPngGraphExportAdapter(test.environment)

    await expect(adapter.rasterize(scene)).rejects.toMatchObject({
      code: 'graph-render-failed',
    })
    expect(test.revokeObjectUrl).toHaveBeenCalledWith('blob:granvas-scene')
  })

  it('rejects formats outside the PNG adapter', async () => {
    const adapter = new CanvasPngGraphExportAdapter(createEnvironment().environment)
    await expect(adapter.render(scene, 'pdf')).rejects.toMatchObject({
      code: 'graph-render-failed',
    })
  })
})
