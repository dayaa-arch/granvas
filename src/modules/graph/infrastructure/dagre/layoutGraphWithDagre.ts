import { Graph, layout, type EdgeLabel, type GraphLabel, type NodeLabel } from '@dagrejs/dagre'

import {
  GRAPH_GROUP_PADDING,
  type GraphLayoutInputDto,
  type PositionedGraphDto,
  type PositionedGroupDto,
  type PositionedNodeDto,
} from '@/modules/graph/application/GraphApplication'

function positionGroups(
  input: GraphLayoutInputDto,
  nodes: readonly PositionedNodeDto[],
): readonly PositionedGroupDto[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return Object.freeze(
    input.groups.map((group) => {
      const members = group.memberNodeIds.flatMap((id) => {
        const node = nodeById.get(id)
        return node ? [node] : []
      })

      if (members.length === 0) {
        return Object.freeze({
          id: group.id,
          name: group.name,
          memberNodeIds: Object.freeze([...group.memberNodeIds]),
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        })
      }

      const minX = Math.min(...members.map(({ x }) => x))
      const minY = Math.min(...members.map(({ y }) => y))
      const maxX = Math.max(...members.map(({ x, width }) => x + width))
      const maxY = Math.max(...members.map(({ y, height }) => y + height))

      return Object.freeze({
        id: group.id,
        name: group.name,
        memberNodeIds: Object.freeze([...group.memberNodeIds]),
        x: minX - GRAPH_GROUP_PADDING,
        y: minY - GRAPH_GROUP_PADDING,
        width: maxX - minX + GRAPH_GROUP_PADDING * 2,
        height: maxY - minY + GRAPH_GROUP_PADDING * 2,
      })
    }),
  )
}

export function layoutGraphWithDagre(
  input: GraphLayoutInputDto,
): PositionedGraphDto {
  const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>({ multigraph: true })
  graph.setGraph({
    rankdir: input.direction,
    nodesep: 48,
    edgesep: 24,
    ranksep: 72,
    ranker: 'longest-path',
    marginx: 0,
    marginy: 0,
  })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const node of input.nodes) {
    graph.setNode(node.id, { width: node.width, height: node.height })
  }

  for (const edge of input.edges) {
    graph.setEdge(edge.source, edge.target, {}, edge.id)
  }

  layout(graph, { disableOptimalOrderHeuristic: true })

  const nodes = Object.freeze(
    input.nodes.map((node) => {
      const positioned = graph.node(node.id)

      if (!Number.isFinite(positioned.x) || !Number.isFinite(positioned.y)) {
        throw new Error(`Dagre did not position node ${node.id}.`)
      }

      return Object.freeze({
        id: node.id,
        label: node.label,
        type: node.type,
        certainty: node.certainty,
        x: positioned.x! - node.width / 2,
        y: positioned.y! - node.height / 2,
        width: node.width,
        height: node.height,
      })
    }),
  )

  return Object.freeze({
    revision: input.revision,
    nodes,
    edges: Object.freeze(input.edges.map((edge) => Object.freeze({ ...edge }))),
    groups: positionGroups(input, nodes),
  })
}
