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
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

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
  editing?: Readonly<{
    field: GraphNodeEditField
    draft: string
    busy: boolean
    composing: boolean
  }>
  beginEdit(field: GraphNodeEditField): void
  changeDraft(value: string): void
  commitEdit(): void
  cancelEdit(): void
  setComposing(composing: boolean): void
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
  onNodeEdit(edit: GraphNodeEditDto): void | Promise<void>
  onClearSelection(): void
}>

export type GraphNodeEditField = 'label' | 'type'

export type GraphNodeEditDto = Readonly<{
  graphNodeId: string
  field: GraphNodeEditField
  value: string
}>

type InlineEditState = Readonly<{
  graphNodeId: string
  field: GraphNodeEditField
  draft: string
  composing: boolean
  busy: boolean
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
      {data.editing ? (
        <label className="graph-node__inline-edit">
          <span className="sr-only">
            Edit {data.editing.field} for {data.label}
          </span>
          <input
            data-graph-inline-editor="true"
            className={`graph-node__inline-input graph-node__inline-input--${data.editing.field}`}
            value={data.editing.draft}
            disabled={data.editing.busy}
            aria-label={`Edit ${data.editing.field} for ${data.label}`}
            onChange={(event) => data.changeDraft(event.currentTarget.value)}
            onCompositionStart={() => data.setComposing(true)}
            onCompositionEnd={() => data.setComposing(false)}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Escape') {
                event.preventDefault()
                data.cancelEdit()
                return
              }

              if (
                event.key === 'Enter' &&
                !data.editing?.composing &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                data.commitEdit()
              }
            }}
          />
        </label>
      ) : (
        <>
          <span
            className="graph-node__type"
            title="Double-click or press Shift+F2 to edit type"
            onDoubleClick={(event) => {
              event.stopPropagation()
              data.beginEdit('type')
            }}
          >
            {data.semanticType}
          </span>
          <span
            className="graph-node__label"
            title="Double-click or press F2 to edit label"
            onDoubleClick={(event) => {
              event.stopPropagation()
              data.beginEdit('label')
            }}
          >
            {data.label}
          </span>
        </>
      )}
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
  onNodeEdit,
  onClearSelection,
}: ReactFlowGraphViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>()
  const [focusReturnNodeId, setFocusReturnNodeId] = useState<string>()
  const editingGraphNodeId = inlineEdit?.graphNodeId
  const editingField = inlineEdit?.field
  const graphNodeIds = useMemo(
    () => new Set(graph?.nodes.map(({ id }) => id) ?? []),
    [graph],
  )

  const beginInlineEdit = (graphNodeId: string, field: GraphNodeEditField) => {
    const node = graph?.nodes.find(({ id }) => id === graphNodeId)

    if (!node) {
      return
    }

    setInlineEdit(
      Object.freeze({
        graphNodeId,
        field,
        draft: field === 'label' ? node.label : node.type,
        composing: false,
        busy: false,
      }),
    )
  }

  const cancelInlineEdit = () => {
    const graphNodeId = inlineEdit?.graphNodeId
    setInlineEdit(undefined)
    if (graphNodeId) {
      setFocusReturnNodeId(graphNodeId)
    }
  }

  const commitInlineEdit = async () => {
    if (!inlineEdit || inlineEdit.busy || inlineEdit.composing) {
      return
    }

    const edit = inlineEdit
    setInlineEdit(Object.freeze({ ...edit, busy: true }))
    try {
      await onNodeEdit(
        Object.freeze({
          graphNodeId: edit.graphNodeId,
          field: edit.field,
          value: edit.draft,
        }),
      )
    } finally {
      setInlineEdit(undefined)
      setFocusReturnNodeId(edit.graphNodeId)
    }
  }

  useEffect(() => {
    if (!editingGraphNodeId) {
      return
    }

    const frame = requestAnimationFrame(() => {
      const input = canvasRef.current?.querySelector<HTMLInputElement>(
        '[data-graph-inline-editor="true"]',
      )
      input?.focus()
      input?.select()
    })

    return () => cancelAnimationFrame(frame)
  }, [editingGraphNodeId, editingField])

  useEffect(() => {
    if (!focusReturnNodeId || inlineEdit) {
      return
    }

    const frame = requestAnimationFrame(() => {
      const node = [...(canvasRef.current?.querySelectorAll<HTMLElement>(
        '.react-flow__node',
      ) ?? [])].find(({ dataset }) => dataset.id === focusReturnNodeId)
      node?.focus()
      setFocusReturnNodeId(undefined)
    })

    return () => cancelAnimationFrame(frame)
  }, [focusReturnNodeId, inlineEdit])

  const nodes: GranvasFlowNode[] = (() => {
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
        ...(inlineEdit?.graphNodeId === node.id
          ? { editing: inlineEdit }
          : {}),
        beginEdit: (field) => beginInlineEdit(node.id, field),
        changeDraft: (draft) =>
          setInlineEdit((current) =>
            current?.graphNodeId === node.id
              ? Object.freeze({ ...current, draft })
              : current,
          ),
        commitEdit: () => void commitInlineEdit(),
        cancelEdit: cancelInlineEdit,
        setComposing: (composing) =>
          setInlineEdit((current) =>
            current?.graphNodeId === node.id
              ? Object.freeze({ ...current, composing })
              : current,
          ),
      },
      selected: node.id === selectedNodeId,
      selectable: true,
      draggable: false,
      connectable: false,
      deletable: false,
      focusable: inlineEdit?.graphNodeId !== node.id,
      zIndex: 1,
      ariaRole: inlineEdit?.graphNodeId === node.id ? 'group' : 'button',
      ariaLabel:
        inlineEdit?.graphNodeId === node.id
          ? `Editing ${inlineEdit.field} for ${node.label}`
          : `${node.certainty} certainty, ${node.type}: ${node.label}`,
      style: { width: node.width, height: node.height },
    }))

    return [...groupNodes, ...thoughtNodes]
  })()
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
    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    const nodeId = target.closest<HTMLElement>('.react-flow__node')?.dataset.id

    if (!nodeId || !graphNodeIds.has(nodeId)) {
      return
    }

    if (event.key === 'F2') {
      event.preventDefault()
      beginInlineEdit(nodeId, event.shiftKey ? 'type' : 'label')
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onNodeActivate(nodeId)
  }

  return (
    <div
      ref={canvasRef}
      className="graph-canvas"
      onKeyDown={handleKeyboardActivation}
      data-graph-status={status}
    >
      <ReactFlow<GranvasFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => {
          if (graphNodeIds.has(node.id) && inlineEdit?.graphNodeId !== node.id) {
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
        aria-label="Editable thought graph"
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
