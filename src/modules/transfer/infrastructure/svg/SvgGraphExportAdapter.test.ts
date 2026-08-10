import { describe, expect, it } from 'vitest'

import type { TransferGraphExportSceneDto } from '@/modules/transfer'

import {
  SvgGraphExportAdapter,
  escapeXmlText,
  renderGraphSceneToSvg,
} from './SvgGraphExportAdapter'

const untrusted = '<script>alert("xss")</script>&\'value\''

const scene: TransferGraphExportSceneDto = Object.freeze({
  revision: 7,
  graph: Object.freeze({
    revision: 7,
    nodes: Object.freeze([
      Object.freeze({
        id: 'node-a',
        label: untrusted,
        type: 'idea<&',
        x: 0,
        y: 0,
        width: 240,
        height: 88,
      }),
      Object.freeze({
        id: 'node-b',
        label: 'Target',
        type: 'todo',
        x: 320,
        y: 160,
        width: 240,
        height: 88,
      }),
    ]),
    edges: Object.freeze([
      Object.freeze({
        id: 'edge-a',
        source: 'node-a',
        target: 'node-b',
        label: 'solves <everything>',
      }),
    ]),
    groups: Object.freeze([
      Object.freeze({
        id: 'group-a',
        name: 'Group & <unsafe>',
        memberNodeIds: Object.freeze(['node-a', 'node-b']),
        x: -24,
        y: -24,
        width: 608,
        height: 296,
      }),
    ]),
  }),
  bounds: Object.freeze({ x: -48, y: -48, width: 656, height: 344 }),
  theme: 'light',
})

describe('SvgGraphExportAdapter', () => {
  it('renders full scene bounds, Groups, Edges, Nodes, and labels', () => {
    const svg = renderGraphSceneToSvg(scene)

    expect(svg).toContain('viewBox="-48 -48 656 344"')
    expect(svg).toContain('width="608" height="296"')
    expect(svg).toContain('marker-end="url(#granvas-arrow)"')
    expect(svg).toContain('solves &lt;everything&gt;')
    expect(svg).toContain('Group &amp; &lt;unsafe&gt;')
    expect(svg).toContain('&lt;script&gt;alert(&quot;xss&quot;)')
    expect(svg).not.toContain('<script>')
  })

  it('escapes every XML text metacharacter', () => {
    expect(escapeXmlText('&<>"\'')).toBe(
      '&amp;&lt;&gt;&quot;&apos;',
    )
  })

  it('returns UTF-8 SVG bytes and rejects unconfigured formats', async () => {
    const adapter = new SvgGraphExportAdapter()
    const rendered = await adapter.render(scene, 'svg')

    expect(new TextDecoder().decode(rendered.bytes)).toBe(
      renderGraphSceneToSvg(scene),
    )
    await expect(adapter.render(scene, 'png')).rejects.toMatchObject({
      code: 'graph-render-failed',
    })
  })

  it('rejects revision mismatch, dangling Edges, and invalid bounds', () => {
    expect(() =>
      renderGraphSceneToSvg({ ...scene, revision: scene.revision + 1 }),
    ).toThrowError(expect.objectContaining({ code: 'graph-render-failed' }))
    expect(() =>
      renderGraphSceneToSvg({
        ...scene,
        graph: {
          ...scene.graph,
          edges: [{ id: 'dangling', source: 'missing', target: 'node-a' }],
        },
      }),
    ).toThrowError(expect.objectContaining({ code: 'graph-render-failed' }))
    expect(() =>
      renderGraphSceneToSvg({
        ...scene,
        bounds: { ...scene.bounds, width: Number.NaN },
      }),
    ).toThrowError(expect.objectContaining({ code: 'graph-render-failed' }))
  })
})
