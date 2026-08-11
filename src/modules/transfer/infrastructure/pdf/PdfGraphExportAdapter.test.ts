import { PDFDocument } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'

import type { TransferGraphExportSceneDto } from '@/modules/transfer'
import type { PngRasterPort } from '@/modules/transfer/infrastructure/canvas/CanvasPngGraphExportAdapter'

import {
  CSS_PIXEL_TO_PDF_POINT,
  PdfGraphExportAdapter,
} from './PdfGraphExportAdapter'

const ONE_PIXEL_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlKdVQAAAAASUVORK5CYII=',
  ),
  (character) => character.charCodeAt(0),
)

const scene: TransferGraphExportSceneDto = Object.freeze({
  revision: 9,
  graph: Object.freeze({
    revision: 9,
    nodes: Object.freeze([
      Object.freeze({
        id: 'node-a',
        label: '日本語',
        type: 'idea',
        certainty: 'confirmed',
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

function rasterPort(): PngRasterPort {
  return {
    rasterize: vi.fn(async () => ({
      bytes: ONE_PIXEL_PNG,
      notices: Object.freeze(['PNG notice']),
      size: Object.freeze({
        scale: 2,
        pixelWidth: 576,
        pixelHeight: 272,
        limited: false,
      }),
    })),
  }
}

describe('PdfGraphExportAdapter', () => {
  it('lazy-loads pdf-lib and embeds the rasterized Graph on one bounds-sized page', async () => {
    const loadLibrary = vi.fn(async () => import('pdf-lib'))
    const adapter = new PdfGraphExportAdapter(rasterPort(), loadLibrary)

    expect(loadLibrary).not.toHaveBeenCalled()
    const rendered = await adapter.render(scene, 'pdf')
    expect(loadLibrary).toHaveBeenCalledOnce()
    expect([...rendered.bytes.slice(0, 5)]).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d])
    expect(rendered.notices).toEqual(['PNG notice'])

    const document = await PDFDocument.load(rendered.bytes)
    expect(document.getPageCount()).toBe(1)
    expect(document.getPage(0).getWidth()).toBeCloseTo(
      scene.bounds.width * CSS_PIXEL_TO_PDF_POINT,
    )
    expect(document.getPage(0).getHeight()).toBeCloseTo(
      scene.bounds.height * CSS_PIXEL_TO_PDF_POINT,
    )
    expect(document.getSubject()).toBe('Graph revision 9')
  })

  it('does not load PDF code for a rejected format', async () => {
    const loadLibrary = vi.fn(async () => import('pdf-lib'))
    const adapter = new PdfGraphExportAdapter(rasterPort(), loadLibrary)

    await expect(adapter.render(scene, 'svg')).rejects.toMatchObject({
      code: 'graph-render-failed',
    })
    expect(loadLibrary).not.toHaveBeenCalled()
  })

  it('normalizes raster and library failures', async () => {
    const failingRaster: PngRasterPort = {
      rasterize: async () => {
        throw new Error('Canvas unavailable')
      },
    }
    await expect(
      new PdfGraphExportAdapter(failingRaster).render(scene, 'pdf'),
    ).rejects.toMatchObject({ code: 'graph-render-failed' })

    const failingLibrary = vi.fn(async () => {
      throw new Error('PDF library unavailable')
    })
    await expect(
      new PdfGraphExportAdapter(rasterPort(), failingLibrary).render(scene, 'pdf'),
    ).rejects.toMatchObject({ code: 'graph-render-failed' })
  })
})
