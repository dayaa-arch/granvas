import { describe, expect, it, vi } from 'vitest'

import {
  GRAPH_NODE_HEIGHT,
  GRAPH_NODE_WIDTH,
  GraphApplicationError,
  createCancellationController,
  createGraphExportScene,
  createGraphLayoutInput,
  createThoughtGraph,
  createThoughtGraphProjection,
  layoutThoughtGraph,
  type GraphLayoutInputDto,
  type GraphLayoutPort,
  type PositionedGraphDto,
} from '@/modules/graph'

const graphInput = {
  revision: 5,
  nodes: [
    { key: 'node:0', type: 'problem', label: 'A', certainty: 'neutral' },
    { key: 'node:10', type: 'idea', label: 'B', certainty: 'tentative' },
  ],
  relations: [
    {
      key: 'edge:20',
      sourceNodeKey: 'node:0',
      targetNodeKey: 'node:10',
      label: 'solves',
      certainty: 'confirmed',
    },
  ],
  groups: [
    { key: 'group:30', name: 'G', memberNodeKeys: ['node:0', 'node:10'] },
  ],
} as const

const graph = createThoughtGraph(graphInput)

function positionedFrom(input: GraphLayoutInputDto): PositionedGraphDto {
  return Object.freeze({
    revision: input.revision,
    nodes: Object.freeze(
      input.nodes.map((node, index) =>
        Object.freeze({
          id: node.id,
          label: node.label,
          type: node.type,
          certainty: node.certainty,
          x: index * 300,
          y: index * 150,
          width: node.width,
          height: node.height,
        }),
      ),
    ),
    edges: input.edges,
    groups: Object.freeze(
      input.groups.map((group) =>
        Object.freeze({
          ...group,
          x: -24,
          y: -24,
          width: 588,
          height: 286,
        }),
      ),
    ),
  })
}

describe('Graph Application', () => {
  it('returns explicit Graph ID to occurrence key mappings without source ranges', () => {
    const projection = createThoughtGraphProjection(graphInput)

    expect(projection.graph).toEqual(graph)
    expect(projection.occurrenceMap.nodeKeys).toEqual({
      'graph-node:node:0': 'node:0',
      'graph-node:node:10': 'node:10',
    })
    expect(projection.occurrenceMap.edgeKeys).toEqual({
      'graph-edge:edge:20': 'edge:20',
    })
    expect(projection.occurrenceMap.groupKeys).toEqual({
      'graph-group:group:30': 'group:30',
    })
  })

  it('maps semantic graph to normalized fixed-size layout input', () => {
    const input = createGraphLayoutInput(graph, 'TB')

    expect(input.revision).toBe(5)
    expect(input.direction).toBe('TB')
    expect(input.nodes).toEqual([
      expect.objectContaining({ width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT }),
      expect.objectContaining({ width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT }),
    ])
    expect(input.edges[0]).toMatchObject({ label: 'solves' })
    expect(input.nodes.map(({ certainty }) => certainty)).toEqual([
      'neutral',
      'tentative',
    ])
    expect(input.edges[0]?.certainty).toBe('confirmed')
    expect(input.groups[0]?.memberNodeIds).toEqual(
      graph.groups[0]?.memberNodeIds,
    )
    expect(Object.isFrozen(input.nodes)).toBe(true)
  })

  it('supports idempotent framework-neutral cancellation', () => {
    const controller = createCancellationController()
    const listener = vi.fn()
    const unsubscribe = controller.signal.onCancel(listener)

    expect(controller.signal.cancelled).toBe(false)
    controller.cancel()
    controller.cancel()
    unsubscribe()

    expect(controller.signal.cancelled).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    const lateListener = vi.fn()
    controller.signal.onCancel(lateListener)
    expect(lateListener).toHaveBeenCalledTimes(1)
  })

  it('lays out through a port and validates its revision and IDs', async () => {
    const port: GraphLayoutPort = {
      layout: vi.fn(async (input) => positionedFrom(input)),
    }

    await expect(layoutThoughtGraph(graph, 'TB', port)).resolves.toEqual(
      positionedFrom(createGraphLayoutInput(graph, 'TB')),
    )

    const stalePort: GraphLayoutPort = {
      layout: async (input) => ({ ...positionedFrom(input), revision: input.revision - 1 }),
    }
    await expect(layoutThoughtGraph(graph, 'TB', stalePort)).rejects.toMatchObject({
      code: 'layout-revision-mismatch',
    })

    const invalidPort: GraphLayoutPort = {
      layout: async (input) => ({ ...positionedFrom(input), nodes: [] }),
    }
    await expect(layoutThoughtGraph(graph, 'TB', invalidPort)).rejects.toMatchObject({
      code: 'invalid-layout-result',
    })
  })

  it('short-circuits an already-cancelled layout', async () => {
    const controller = createCancellationController()
    controller.cancel()
    const port: GraphLayoutPort = {
      layout: vi.fn(async (input) => positionedFrom(input)),
    }

    await expect(
      layoutThoughtGraph(graph, 'TB', port, controller.signal),
    ).rejects.toBeInstanceOf(GraphApplicationError)
    expect(port.layout).not.toHaveBeenCalled()
  })

  it('creates full export bounds around nodes and Group overlays', () => {
    const positioned = positionedFrom(createGraphLayoutInput(graph, 'TB'))
    const scene = createGraphExportScene(positioned)

    expect(scene).toEqual({
      revision: 5,
      graph: positioned,
      bounds: { x: -48, y: -48, width: 636, height: 334 },
      theme: 'light',
    })
    expect(createGraphExportScene({ ...positioned, nodes: [], groups: [] }).bounds).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
  })
})
