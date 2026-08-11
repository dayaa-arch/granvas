// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  GRAPH_NODE_HEIGHT,
  GRAPH_NODE_WIDTH,
  createGraphLayoutInput,
  createThoughtGraph,
} from '@/modules/graph'
import { layoutGraphWithDagre } from './layoutGraphWithDagre'

const semanticGraph = createThoughtGraph({
  revision: 7,
  nodes: [
    { key: 'a', type: 'problem', label: 'A', certainty: 'confirmed' },
    { key: 'b', type: 'cause', label: 'B', certainty: 'tentative' },
    { key: 'c', type: 'cause', label: 'C', certainty: 'rejected' },
  ],
  relations: [
    {
      key: 'ab',
      sourceNodeKey: 'a',
      targetNodeKey: 'b',
      certainty: 'tentative',
    },
    {
      key: 'ac',
      sourceNodeKey: 'a',
      targetNodeKey: 'c',
      certainty: 'rejected',
    },
  ],
  groups: [{ key: 'g', name: 'All', memberNodeKeys: ['a', 'b', 'c'] }],
})

describe('layoutGraphWithDagre', () => {
  it('produces deterministic top-left coordinates for TB and LR', () => {
    const tb = layoutGraphWithDagre(createGraphLayoutInput(semanticGraph, 'TB'))
    const repeated = layoutGraphWithDagre(createGraphLayoutInput(semanticGraph, 'TB'))
    const lr = layoutGraphWithDagre(createGraphLayoutInput(semanticGraph, 'LR'))

    expect(repeated).toEqual(tb)
    expect(tb.nodes.every(({ width, height }) =>
      width === GRAPH_NODE_WIDTH && height === GRAPH_NODE_HEIGHT,
    )).toBe(true)
    expect(tb.nodes.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(
      true,
    )
    expect(tb.nodes[0]!.y).toBeLessThan(tb.nodes[1]!.y)
    expect(lr.nodes[0]!.x).toBeLessThan(lr.nodes[1]!.x)
    expect(tb.nodes.map(({ certainty }) => certainty)).toEqual([
      'confirmed',
      'tentative',
      'rejected',
    ])
    expect(tb.edges.map(({ certainty }) => certainty)).toEqual([
      'tentative',
      'rejected',
    ])
  })

  it('wraps all members in a 24px Group overlay', () => {
    const result = layoutGraphWithDagre(createGraphLayoutInput(semanticGraph, 'TB'))
    const group = result.groups[0]!
    const minX = Math.min(...result.nodes.map(({ x }) => x))
    const minY = Math.min(...result.nodes.map(({ y }) => y))
    const maxX = Math.max(...result.nodes.map(({ x, width }) => x + width))
    const maxY = Math.max(...result.nodes.map(({ y, height }) => y + height))

    expect(group).toMatchObject({
      x: minX - 24,
      y: minY - 24,
      width: maxX - minX + 48,
      height: maxY - minY + 48,
    })
  })

  it('keeps empty Groups with zero bounds', () => {
    const emptyGroupGraph = createThoughtGraph({
      revision: 0,
      nodes: [],
      relations: [],
      groups: [{ key: 'empty', name: 'Empty', memberNodeKeys: [] }],
    })
    const result = layoutGraphWithDagre(createGraphLayoutInput(emptyGroupGraph, 'TB'))

    expect(result.groups[0]).toMatchObject({ x: 0, y: 0, width: 0, height: 0 })
  })
})
