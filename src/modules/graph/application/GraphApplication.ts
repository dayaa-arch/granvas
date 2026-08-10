import {
  ThoughtGraphError,
  createThoughtGraph as createDomainThoughtGraph,
  type GraphDirection,
  type ThoughtGraph,
  type ThoughtGraphEdgeInput,
  type ThoughtGraphErrorCode,
  type ThoughtGraphGroupInput,
  type ThoughtGraphNodeInput,
} from '@/modules/graph/domain/ThoughtGraph'

export const GRAPH_NODE_WIDTH = 240
export const GRAPH_NODE_HEIGHT = 88
export const GRAPH_GROUP_PADDING = 24
export const GRAPH_EXPORT_PADDING = 24

export type CreateThoughtGraphInputDto = Readonly<{
  revision: number
  nodes: readonly ThoughtGraphNodeInput[]
  relations: readonly ThoughtGraphEdgeInput[]
  groups: readonly ThoughtGraphGroupInput[]
}>

export type ThoughtGraphNodeDto = ThoughtGraph['nodes'][number]
export type ThoughtGraphEdgeDto = ThoughtGraph['edges'][number]
export type ThoughtGraphGroupDto = ThoughtGraph['groups'][number]
export type ThoughtGraphDto = ThoughtGraph
export type GraphDirectionDto = GraphDirection

export type GraphLayoutNodeDto = Readonly<{
  id: string
  label: string
  type: string
  width: number
  height: number
}>

export type GraphLayoutEdgeDto = Readonly<{
  id: string
  source: string
  target: string
  label?: string
}>

export type GraphLayoutGroupDto = Readonly<{
  id: string
  name: string
  memberNodeIds: readonly string[]
}>

export type GraphLayoutInputDto = Readonly<{
  revision: number
  direction: GraphDirectionDto
  nodes: readonly GraphLayoutNodeDto[]
  edges: readonly GraphLayoutEdgeDto[]
  groups: readonly GraphLayoutGroupDto[]
}>

export type PositionedNodeDto = Readonly<{
  id: string
  label: string
  type: string
  x: number
  y: number
  width: number
  height: number
}>

export type PositionedEdgeDto = GraphLayoutEdgeDto

export type PositionedGroupDto = Readonly<{
  id: string
  name: string
  memberNodeIds: readonly string[]
  x: number
  y: number
  width: number
  height: number
}>

export type PositionedGraphDto = Readonly<{
  revision: number
  nodes: readonly PositionedNodeDto[]
  edges: readonly PositionedEdgeDto[]
  groups: readonly PositionedGroupDto[]
}>

export type GraphBoundsDto = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type GraphExportSceneDto = Readonly<{
  revision: number
  graph: PositionedGraphDto
  bounds: GraphBoundsDto
  theme: 'light'
}>

export interface CancellationSignal {
  readonly cancelled: boolean
  onCancel(listener: () => void): () => void
}

export type CancellationController = Readonly<{
  signal: CancellationSignal
  cancel(): void
}>

export interface GraphLayoutPort {
  layout(
    input: GraphLayoutInputDto,
    signal?: CancellationSignal,
  ): Promise<PositionedGraphDto>
}

export type GraphApplicationErrorCode =
  | ThoughtGraphErrorCode
  | 'layout-cancelled'
  | 'layout-failed'
  | 'layout-revision-mismatch'
  | 'invalid-layout-result'

export class GraphApplicationError extends Error {
  readonly code: GraphApplicationErrorCode

  constructor(code: GraphApplicationErrorCode, message: string) {
    super(message)
    this.name = 'GraphApplicationError'
    this.code = code
  }
}

function toApplicationError(error: unknown): GraphApplicationError {
  if (error instanceof GraphApplicationError) {
    return error
  }

  if (error instanceof ThoughtGraphError) {
    return new GraphApplicationError(error.code, error.message)
  }

  return new GraphApplicationError(
    'layout-failed',
    error instanceof Error ? error.message : 'Graph layout failed.',
  )
}

export function createThoughtGraph(input: CreateThoughtGraphInputDto): ThoughtGraphDto {
  try {
    return createDomainThoughtGraph({
      revision: input.revision,
      nodes: input.nodes,
      edges: input.relations,
      groups: input.groups,
    })
  } catch (error) {
    throw toApplicationError(error)
  }
}

export function createGraphLayoutInput(
  graph: ThoughtGraphDto,
  direction: GraphDirectionDto,
): GraphLayoutInputDto {
  return Object.freeze({
    revision: graph.revision,
    direction,
    nodes: Object.freeze(
      graph.nodes.map((node) =>
        Object.freeze({
          id: node.id,
          label: node.label,
          type: node.type,
          width: GRAPH_NODE_WIDTH,
          height: GRAPH_NODE_HEIGHT,
        }),
      ),
    ),
    edges: Object.freeze(
      graph.edges.map((edge) =>
        Object.freeze({
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          ...(edge.label === undefined ? {} : { label: edge.label }),
        }),
      ),
    ),
    groups: Object.freeze(
      graph.groups.map((group) =>
        Object.freeze({
          id: group.id,
          name: group.name,
          memberNodeIds: Object.freeze([...group.memberNodeIds]),
        }),
      ),
    ),
  })
}

export function createCancellationController(): CancellationController {
  let cancelled = false
  const listeners = new Set<() => void>()
  const signal: CancellationSignal = Object.freeze({
    get cancelled() {
      return cancelled
    },
    onCancel(listener: () => void) {
      if (cancelled) {
        listener()
        return () => undefined
      }

      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  })

  return Object.freeze({
    signal,
    cancel() {
      if (cancelled) {
        return
      }

      cancelled = true
      const pendingListeners = [...listeners]
      listeners.clear()
      for (const listener of pendingListeners) {
        listener()
      }
    },
  })
}

function assertSameIds(
  expected: readonly string[],
  actual: readonly string[],
): boolean {
  return (
    expected.length === actual.length &&
    expected.every((id, index) => id === actual[index])
  )
}

function validatePositionedGraph(
  input: GraphLayoutInputDto,
  output: PositionedGraphDto,
): void {
  if (output.revision !== input.revision) {
    throw new GraphApplicationError(
      'layout-revision-mismatch',
      'Layout output revision does not match its input revision.',
    )
  }

  if (
    !assertSameIds(
      input.nodes.map(({ id }) => id),
      output.nodes.map(({ id }) => id),
    ) ||
    !assertSameIds(
      input.edges.map(({ id }) => id),
      output.edges.map(({ id }) => id),
    ) ||
    !assertSameIds(
      input.groups.map(({ id }) => id),
      output.groups.map(({ id }) => id),
    ) ||
    output.nodes.some(
      ({ id, label, type, x, y, width, height }, index) =>
        id !== input.nodes[index]?.id ||
        label !== input.nodes[index]?.label ||
        type !== input.nodes[index]?.type ||
        ![x, y, width, height].every(Number.isFinite) ||
        width !== GRAPH_NODE_WIDTH ||
        height !== GRAPH_NODE_HEIGHT,
    ) ||
    output.edges.some(
      ({ id, source, target, label }, index) =>
        id !== input.edges[index]?.id ||
        source !== input.edges[index]?.source ||
        target !== input.edges[index]?.target ||
        label !== input.edges[index]?.label,
    ) ||
    output.groups.some(
      ({ id, name, memberNodeIds, x, y, width, height }, index) =>
        id !== input.groups[index]?.id ||
        name !== input.groups[index]?.name ||
        !assertSameIds(input.groups[index]?.memberNodeIds ?? [], memberNodeIds) ||
        ![x, y, width, height].every(Number.isFinite) ||
        width < 0 ||
        height < 0,
    )
  ) {
    throw new GraphApplicationError(
      'invalid-layout-result',
      'Layout output does not match the normalized graph input.',
    )
  }
}

export async function layoutThoughtGraph(
  graph: ThoughtGraphDto,
  direction: GraphDirectionDto,
  layoutPort: GraphLayoutPort,
  signal?: CancellationSignal,
): Promise<PositionedGraphDto> {
  if (signal?.cancelled) {
    throw new GraphApplicationError('layout-cancelled', 'Graph layout was cancelled.')
  }

  const input = createGraphLayoutInput(graph, direction)

  try {
    const output = await layoutPort.layout(input, signal)
    validatePositionedGraph(input, output)
    return output
  } catch (error) {
    throw toApplicationError(error)
  }
}

function boundsForPositionedGraph(graph: PositionedGraphDto): GraphBoundsDto {
  const rectangles = [
    ...graph.nodes.map(({ x, y, width, height }) => ({ x, y, width, height })),
    ...graph.groups
      .filter(({ width, height }) => width > 0 && height > 0)
      .map(({ x, y, width, height }) => ({ x, y, width, height })),
  ]

  if (rectangles.length === 0) {
    return Object.freeze({ x: 0, y: 0, width: 0, height: 0 })
  }

  const minX = Math.min(...rectangles.map(({ x }) => x))
  const minY = Math.min(...rectangles.map(({ y }) => y))
  const maxX = Math.max(...rectangles.map(({ x, width }) => x + width))
  const maxY = Math.max(...rectangles.map(({ y, height }) => y + height))

  return Object.freeze({
    x: minX - GRAPH_EXPORT_PADDING,
    y: minY - GRAPH_EXPORT_PADDING,
    width: maxX - minX + GRAPH_EXPORT_PADDING * 2,
    height: maxY - minY + GRAPH_EXPORT_PADDING * 2,
  })
}

export function createGraphExportScene(
  graph: PositionedGraphDto,
): GraphExportSceneDto {
  return Object.freeze({
    revision: graph.revision,
    graph,
    bounds: boundsForPositionedGraph(graph),
    theme: 'light',
  })
}
