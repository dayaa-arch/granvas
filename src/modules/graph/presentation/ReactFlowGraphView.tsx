import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { memo, useEffect, useMemo, type KeyboardEvent } from 'react'

import type {
  GraphCertaintyDto,
  PositionedGraphDto,
} from '@/modules/graph/application/GraphApplication'

import '@xyflow/react/dist/style.css'
import './ReactFlowGraphView.css'

type ThoughtNodeData = {
  label: string
  semanticType: string
  tone: 'problem' | 'cause' | 'idea' | 'todo' | 'default'
  certainty: GraphCertaintyDto
}

type GroupNodeData = {
  name: string
}

type ThoughtFlowNode = Node<ThoughtNodeData, 'thought'>
type GroupFlowNode = Node<GroupNodeData, 'groupOverlay'>
type GranvasFlowNode = ThoughtFlowNode | GroupFlowNode

export type ReactFlowGraphViewProps = Readonly<{
  graph?: PositionedGraphDto
  selectedNodeId?: string
  fitViewKey: number
  status: 'idle' | 'projecting' | 'ready' | 'error'
  onNodeActivate(graphNodeId: string): void
  onClearSelection(): void
}>

function toneForType(type: string): ThoughtNodeData['tone'] {
  const normalized = type.toLocaleLowerCase()

  if (
    normalized === 'problem' ||
    normalized === 'cause' ||
    normalized === 'idea' ||
    normalized === 'todo'
  ) {
    return normalized
  }

  return 'default'
}

const certaintyMarker: Readonly<Record<GraphCertaintyDto, string | undefined>> = {
  neutral: undefined,
  tentative: '?',
  confirmed: '✓',
  rejected: '×',
}

function edgeStyle(certainty: GraphCertaintyDto) {
  switch (certainty) {
    case 'tentative':
      return { stroke: '#66758a', strokeWidth: 1.9, strokeDasharray: '8 6' }
    case 'confirmed':
      return { stroke: '#4c5f73', strokeWidth: 2.8 }
    case 'rejected':
      return {
        stroke: '#7a8089',
        strokeWidth: 1.8,
        strokeDasharray: '3 6',
        opacity: 0.72,
      }
    case 'neutral':
      return { stroke: '#738093', strokeWidth: 1.7 }
  }
}

const ThoughtNodeView = memo(function ThoughtNodeView({
  data,
  selected,
}: NodeProps<ThoughtFlowNode>) {
  return (
    <div
      className={`graph-node graph-node--${data.tone} graph-node--certainty-${data.certainty}${selected ? ' is-selected' : ''}`}
    >
      <Handle
        className="graph-node__handle"
        type="target"
        position={Position.Top}
        isConnectable={false}
      />
      {certaintyMarker[data.certainty] ? (
        <span className="graph-node__certainty" aria-hidden="true">
          {certaintyMarker[data.certainty]}
        </span>
      ) : null}
      <span className="graph-node__type">{data.semanticType}</span>
      <span className="graph-node__label">{data.label}</span>
      <Handle
        className="graph-node__handle"
        type="source"
        position={Position.Bottom}
        isConnectable={false}
      />
    </div>
  )
})

const GroupOverlayView = memo(function GroupOverlayView({
  data,
}: NodeProps<GroupFlowNode>) {
  return (
    <div className="graph-group">
      <span className="graph-group__name">{data.name}</span>
    </div>
  )
})

const nodeTypes = {
  thought: ThoughtNodeView,
  groupOverlay: GroupOverlayView,
}

function FitViewEffect({ fitViewKey }: Readonly<{ fitViewKey: number }>) {
  const { fitView } = useReactFlow<GranvasFlowNode>()

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.16, duration: 260, maxZoom: 1.25 })
    })

    return () => cancelAnimationFrame(frame)
  }, [fitView, fitViewKey])

  return null
}

function GraphCanvas({
  graph,
  selectedNodeId,
  fitViewKey,
  status,
  onNodeActivate,
  onClearSelection,
}: ReactFlowGraphViewProps) {
  const graphNodeIds = useMemo(
    () => new Set(graph?.nodes.map(({ id }) => id) ?? []),
    [graph],
  )
  const nodes = useMemo<GranvasFlowNode[]>(() => {
    if (!graph) {
      return []
    }

    const groupNodes: GroupFlowNode[] = graph.groups
      .filter(({ width, height }) => width > 0 && height > 0)
      .map((group) => ({
        id: `overlay:${group.id}`,
        type: 'groupOverlay',
        position: { x: group.x, y: group.y },
        width: group.width,
        height: group.height,
        initialWidth: group.width,
        initialHeight: group.height,
        data: { name: group.name },
        selectable: false,
        draggable: false,
        connectable: false,
        focusable: false,
        deletable: false,
        zIndex: -2,
        ariaRole: 'presentation',
        style: { width: group.width, height: group.height },
      }))
    const thoughtNodes: ThoughtFlowNode[] = graph.nodes.map((node) => ({
      id: node.id,
      type: 'thought',
      position: { x: node.x, y: node.y },
      width: node.width,
      height: node.height,
      initialWidth: node.width,
      initialHeight: node.height,
      data: {
        label: node.label,
        semanticType: node.type,
        tone: toneForType(node.type),
        certainty: node.certainty,
      },
      selected: node.id === selectedNodeId,
      selectable: true,
      draggable: false,
      connectable: false,
      deletable: false,
      focusable: true,
      zIndex: 1,
      ariaRole: 'button',
      ariaLabel: `${node.certainty} certainty, ${node.type}: ${node.label}`,
      style: { width: node.width, height: node.height },
    }))

    return [...groupNodes, ...thoughtNodes]
  }, [graph, selectedNodeId])
  const edges = useMemo<Edge[]>(
    () => {
      const nodeById = new Map(graph?.nodes.map((node) => [node.id, node]) ?? [])

      return graph?.edges.map((edge) => {
        const marker = certaintyMarker[edge.certainty]
        const sourceLabel = nodeById.get(edge.source)?.label ?? edge.source
        const targetLabel = nodeById.get(edge.target)?.label ?? edge.target

        return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: [marker, edge.label].filter(Boolean).join(' ') || undefined,
        type: 'smoothstep',
        focusable: false,
        selectable: false,
        className: `graph-edge graph-edge--certainty-${edge.certainty}`,
        ariaLabel: `${edge.certainty} certainty relation from ${sourceLabel} to ${targetLabel}${edge.label ? `: ${edge.label}` : ''}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#738093' },
        style: edgeStyle(edge.certainty),
        labelStyle: {
          fill: '#4d586a',
          fontSize: 12,
          fontWeight: 650,
          ...(edge.certainty === 'rejected'
            ? { textDecoration: 'line-through' }
            : {}),
        },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
        labelBgPadding: [5, 3],
        labelBgBorderRadius: 5,
        }
      }) ?? []
    },
    [graph],
  )

  const handleKeyboardActivation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    const nodeId = target.closest<HTMLElement>('.react-flow__node')?.dataset.id

    if (!nodeId || !graphNodeIds.has(nodeId)) {
      return
    }

    event.preventDefault()
    onNodeActivate(nodeId)
  }

  return (
    <div
      className="graph-canvas"
      onKeyDown={handleKeyboardActivation}
      data-graph-status={status}
    >
      <ReactFlow<GranvasFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => {
          if (graphNodeIds.has(node.id)) {
            onNodeActivate(node.id)
          }
        }}
        onPaneClick={onClearSelection}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable
        edgesFocusable={false}
        elementsSelectable
        panOnDrag
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        aria-label="Read-only thought graph"
      >
        <FitViewEffect fitViewKey={fitViewKey} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="#cfd5df"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
          aria-label="Graph viewport controls"
        />
      </ReactFlow>
      {nodes.length === 0 ? (
        <div className="graph-empty" role="status">
          <span className="graph-empty__mark" aria-hidden="true">
            G
          </span>
          <strong>{status === 'projecting' ? 'Building graph…' : 'No graph yet'}</strong>
          <span>Write a node declaration in the Text pane.</span>
        </div>
      ) : null}
    </div>
  )
}

export function ReactFlowGraphView(props: ReactFlowGraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}
