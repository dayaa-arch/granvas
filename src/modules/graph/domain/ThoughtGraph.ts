export type GraphDirection = 'TB' | 'LR'

export type GraphCertainty =
  | 'neutral'
  | 'tentative'
  | 'confirmed'
  | 'rejected'

export type GraphNode = Readonly<{
  id: string
  explicitId?: string
  type: string
  label: string
  certainty: GraphCertainty
}>

export type GraphEdge = Readonly<{
  id: string
  sourceNodeId: string
  targetNodeId: string
  label?: string
  certainty: GraphCertainty
}>

export type GraphGroup = Readonly<{
  id: string
  name: string
  memberNodeIds: readonly string[]
}>

export type ThoughtGraph = Readonly<{
  revision: number
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
  groups: readonly GraphGroup[]
}>

export type GraphOccurrenceMap = Readonly<{
  nodeKeys: Readonly<Record<string, string>>
  edgeKeys: Readonly<Record<string, string>>
  groupKeys: Readonly<Record<string, string>>
}>

export type ThoughtGraphProjection = Readonly<{
  graph: ThoughtGraph
  occurrenceMap: GraphOccurrenceMap
}>

export type ThoughtGraphNodeInput = Readonly<{
  key: string
  explicitId?: string
  type: string
  label: string
  certainty: GraphCertainty
}>

export type ThoughtGraphEdgeInput = Readonly<{
  key: string
  sourceNodeKey: string
  targetNodeKey: string
  label?: string
  certainty: GraphCertainty
}>

export type ThoughtGraphGroupInput = Readonly<{
  key: string
  name: string
  memberNodeKeys: readonly string[]
}>

export type CreateThoughtGraphInput = Readonly<{
  revision: number
  nodes: readonly ThoughtGraphNodeInput[]
  edges: readonly ThoughtGraphEdgeInput[]
  groups: readonly ThoughtGraphGroupInput[]
}>

export type ThoughtGraphErrorCode =
  | 'invalid-revision'
  | 'empty-occurrence-key'
  | 'duplicate-node-key'
  | 'duplicate-edge-key'
  | 'duplicate-group-key'
  | 'dangling-edge-node'
  | 'unknown-group-member'

export class ThoughtGraphError extends Error {
  readonly code: ThoughtGraphErrorCode

  constructor(code: ThoughtGraphErrorCode, message: string) {
    super(message)
    this.name = 'ThoughtGraphError'
    this.code = code
  }
}

function assertRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new ThoughtGraphError(
      'invalid-revision',
      'Graph revision must be a non-negative safe integer.',
    )
  }
}

function assertKey(key: string): void {
  if (key.length === 0) {
    throw new ThoughtGraphError('empty-occurrence-key', 'Occurrence key must not be empty.')
  }
}

function graphId(kind: 'node' | 'edge' | 'group', occurrenceKey: string): string {
  return `graph-${kind}:${occurrenceKey}`
}

function assertUniqueKeys<T extends Readonly<{ key: string }>>(
  values: readonly T[],
  code: 'duplicate-node-key' | 'duplicate-edge-key' | 'duplicate-group-key',
): void {
  const seen = new Set<string>()

  for (const value of values) {
    assertKey(value.key)

    if (seen.has(value.key)) {
      throw new ThoughtGraphError(code, `Duplicate occurrence key: ${value.key}`)
    }

    seen.add(value.key)
  }
}

export function createThoughtGraphProjection(
  input: CreateThoughtGraphInput,
): ThoughtGraphProjection {
  assertRevision(input.revision)
  assertUniqueKeys(input.nodes, 'duplicate-node-key')
  assertUniqueKeys(input.edges, 'duplicate-edge-key')
  assertUniqueKeys(input.groups, 'duplicate-group-key')

  const sortedNodeInputs = [...input.nodes].sort((left, right) =>
    left.key.localeCompare(right.key),
  )
  const nodeIdByKey = new Map<string, string>()
  const nodeKeys: Array<readonly [string, string]> = []
  const nodes = sortedNodeInputs.map((node) => {
    const id = graphId('node', node.key)
    nodeIdByKey.set(node.key, id)
    nodeKeys.push([id, node.key])
    return Object.freeze({
      id,
      ...(node.explicitId === undefined ? {} : { explicitId: node.explicitId }),
      type: node.type,
      label: node.label,
      certainty: node.certainty,
    })
  })

  const edgeKeys: Array<readonly [string, string]> = []
  const edges = [...input.edges]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((edge) => {
      const sourceNodeId = nodeIdByKey.get(edge.sourceNodeKey)
      const targetNodeId = nodeIdByKey.get(edge.targetNodeKey)

      if (!sourceNodeId || !targetNodeId) {
        throw new ThoughtGraphError(
          'dangling-edge-node',
          `Edge ${edge.key} references an unknown node occurrence.`,
        )
      }

      const id = graphId('edge', edge.key)
      edgeKeys.push([id, edge.key])
      return Object.freeze({
        id,
        sourceNodeId,
        targetNodeId,
        certainty: edge.certainty,
        ...(edge.label === undefined ? {} : { label: edge.label }),
      })
    })

  const groupKeys: Array<readonly [string, string]> = []
  const groups = [...input.groups]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((group) => {
      const memberNodeIds = new Set<string>()

      for (const memberNodeKey of group.memberNodeKeys) {
        const memberNodeId = nodeIdByKey.get(memberNodeKey)

        if (!memberNodeId) {
          throw new ThoughtGraphError(
            'unknown-group-member',
            `Group ${group.key} references an unknown node occurrence.`,
          )
        }

        memberNodeIds.add(memberNodeId)
      }

      const id = graphId('group', group.key)
      groupKeys.push([id, group.key])
      return Object.freeze({
        id,
        name: group.name,
        memberNodeIds: Object.freeze([...memberNodeIds].sort()),
      })
    })

  return Object.freeze({
    graph: Object.freeze({
      revision: input.revision,
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
      groups: Object.freeze(groups),
    }),
    occurrenceMap: Object.freeze({
      nodeKeys: Object.freeze(Object.fromEntries(nodeKeys)),
      edgeKeys: Object.freeze(Object.fromEntries(edgeKeys)),
      groupKeys: Object.freeze(Object.fromEntries(groupKeys)),
    }),
  })
}

export function createThoughtGraph(input: CreateThoughtGraphInput): ThoughtGraph {
  return createThoughtGraphProjection(input).graph
}
