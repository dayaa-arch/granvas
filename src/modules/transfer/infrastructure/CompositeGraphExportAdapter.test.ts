import { describe, expect, it, vi } from 'vitest'

import type {
  GraphExportPort,
  TransferGraphExportSceneDto,
} from '@/modules/transfer'

import { CompositeGraphExportAdapter } from './CompositeGraphExportAdapter'

const scene = {
  revision: 1,
  graph: { revision: 1, nodes: [], edges: [], groups: [] },
  bounds: { x: 0, y: 0, width: 1, height: 1 },
  theme: 'light',
} as const satisfies TransferGraphExportSceneDto

function exporter(byte: number): GraphExportPort & { render: ReturnType<typeof vi.fn> } {
  return {
    render: vi.fn(async () => ({
      bytes: Uint8Array.of(byte),
      notices: Object.freeze([]),
    })),
  }
}

describe('CompositeGraphExportAdapter', () => {
  it('delegates only to the selected format exporter', async () => {
    const svg = exporter(1)
    const png = exporter(2)
    const pdf = exporter(3)
    const adapter = new CompositeGraphExportAdapter(svg, png, pdf)

    await expect(adapter.render(scene, 'png')).resolves.toMatchObject({
      bytes: Uint8Array.of(2),
    })
    expect(svg.render).not.toHaveBeenCalled()
    expect(png.render).toHaveBeenCalledWith(scene, 'png')
    expect(pdf.render).not.toHaveBeenCalled()
  })
})
