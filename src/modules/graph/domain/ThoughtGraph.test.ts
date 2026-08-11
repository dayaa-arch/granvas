import { describe, expect, it } from 'vitest'

import { createThoughtGraph, ThoughtGraphError } from './ThoughtGraph'

describe('ThoughtGraph', () => {
  const input = {
    revision: 3,
    nodes: [
      {
        key: 'node:20',
        explicitId: 'same',
        type: 'idea',
        label: 'B',
        certainty: 'tentative',
      },
      {
        key: 'node:10',
        explicitId: 'same',
        type: 'problem',
        label: 'A',
        certainty: 'rejected',
      },
    ],
    edges: [
      {
        key: 'edge:30',
        sourceNodeKey: 'node:10',
        targetNodeKey: 'node:20',
        certainty: 'neutral',
      },
      {
        key: 'edge:31',
        sourceNodeKey: 'node:10',
        targetNodeKey: 'node:20',
        certainty: 'tentative',
      },
      {
        key: 'edge:32',
        sourceNodeKey: 'node:10',
        targetNodeKey: 'node:10',
        certainty: 'confirmed',
      },
      {
        key: 'edge:33',
        sourceNodeKey: 'node:20',
        targetNodeKey: 'node:10',
        certainty: 'rejected',
      },
    ],
    groups: [
      { key: 'group:2', name: 'Two', memberNodeKeys: ['node:10'] },
      {
        key: 'group:1',
        name: 'One',
        memberNodeKeys: ['node:10', 'node:20', 'node:10'],
      },
    ],
  } as const

  it('creates a deterministic immutable semantic graph', () => {
    const graph = createThoughtGraph(input)
    const repeated = createThoughtGraph({
      ...input,
      nodes: [...input.nodes].reverse(),
      edges: [...input.edges].reverse(),
      groups: [...input.groups].reverse(),
    })

    expect(repeated).toEqual(graph)
    expect(graph.nodes.map(({ label }) => label)).toEqual(['A', 'B'])
    expect(graph.nodes.map(({ explicitId }) => explicitId)).toEqual(['same', 'same'])
    expect(graph.nodes.map(({ certainty }) => certainty)).toEqual([
      'rejected',
      'tentative',
    ])
    expect(graph.edges.map(({ certainty }) => certainty)).toEqual([
      'neutral',
      'tentative',
      'confirmed',
      'rejected',
    ])
    expect(graph.edges).toHaveLength(4)
    expect(graph.groups.map(({ name }) => name)).toEqual(['One', 'Two'])
    expect(graph.groups[0]?.memberNodeIds).toHaveLength(2)
    expect(graph.groups[1]?.memberNodeIds[0]).toBe(graph.nodes[0]?.id)
    expect(Object.isFrozen(graph)).toBe(true)
    expect(Object.isFrozen(graph.groups[0]?.memberNodeIds)).toBe(true)
  })

  it('retains parallel edges, self-loops, cycles, and overlapping Groups', () => {
    const graph = createThoughtGraph(input)
    const [a, b] = graph.nodes

    expect(
      graph.edges.filter(
        ({ sourceNodeId, targetNodeId }) =>
          sourceNodeId === a?.id && targetNodeId === b?.id,
      ),
    ).toHaveLength(2)
    expect(graph.edges).toContainEqual(
      expect.objectContaining({ sourceNodeId: a?.id, targetNodeId: a?.id }),
    )
    expect(graph.edges).toContainEqual(
      expect.objectContaining({ sourceNodeId: b?.id, targetNodeId: a?.id }),
    )
    expect(graph.groups.every(({ memberNodeIds }) => memberNodeIds.includes(a!.id))).toBe(
      true,
    )
  })

  it('rejects duplicate occurrence keys and dangling references', () => {
    expect(() =>
      createThoughtGraph({
        revision: 0,
        nodes: [
          { key: 'same', type: 'node', label: 'A', certainty: 'neutral' },
          { key: 'same', type: 'node', label: 'B', certainty: 'neutral' },
        ],
        edges: [],
        groups: [],
      }),
    ).toThrowError(
      expect.objectContaining({ code: 'duplicate-node-key' }),
    )

    expect(() =>
      createThoughtGraph({
        revision: 0,
        nodes: [{ key: 'a', type: 'node', label: 'A', certainty: 'neutral' }],
        edges: [
          {
            key: 'e',
            sourceNodeKey: 'a',
            targetNodeKey: 'missing',
            certainty: 'neutral',
          },
        ],
        groups: [],
      }),
    ).toThrowError(expect.objectContaining({ code: 'dangling-edge-node' }))

    expect(() =>
      createThoughtGraph({
        revision: 0,
        nodes: [{ key: 'a', type: 'node', label: 'A', certainty: 'neutral' }],
        edges: [],
        groups: [{ key: 'g', name: 'G', memberNodeKeys: ['missing'] }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'unknown-group-member' }))

    expect(() =>
      createThoughtGraph({ revision: -1, nodes: [], edges: [], groups: [] }),
    ).toThrowError(ThoughtGraphError)
  })
})
