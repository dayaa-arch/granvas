export type GraphDirection = 'TB' | 'LR'

export type GraphNode = Readonly<{
  id: string
  explicitId?: string
  type: string
  label: string
}>

export type GraphEdge = Readonly<{
  id: string
  sourceNodeId: string
  targetNodeId: string
  label?: string
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

export type ThoughtGraphNodeInput = Readonly<{
  key: string
  explicitId?: string
  type: string
  label: string
}>

export type ThoughtGraphEdgeInput = Readonly<{
  key: string
  sourceNodeKey: string
  targetNodeKey: string
  label?: string
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

export function createThoughtGraph(input: CreateThoughtGraphInput): ThoughtGraph {
  assertRevision(input.revision)
  assertUniqueKeys(input.nodes, 'duplicate-node-key')
  assertUniqueKeys(input.edges, 'duplicate-edge-key')
  assertUniqueKeys(input.groups, 'duplicate-group-key')

  const sortedNodeInputs = [...input.nodes].sort((left, right) =>
    left.key.localeCompare(right.key),
  )
  const nodeIdByKey = new Map<string, string>()
  const nodes = sortedNodeInputs.map((node) => {
    const id = graphId('node', node.key)
    nodeIdByKey.set(node.key, id)
    return Object.freeze({
      id,
      ...(node.explicitId === undefined ? {} : { explicitId: node.explicitId }),
      type: node.type,
      label: node.label,
    })
  })

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

      return Object.freeze({
        id: graphId('edge', edge.key),
        sourceNodeId,
        targetNodeId,
        ...(edge.label === undefined ? {} : { label: edge.label }),
      })
    })

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

      return Object.freeze({
        id: graphId('group', group.key),
        name: group.name,
        memberNodeIds: Object.freeze([...memberNodeIds].sort()),
      })
    })

  return Object.freeze({
    revision: input.revision,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    groups: Object.freeze(groups),
  })
}
