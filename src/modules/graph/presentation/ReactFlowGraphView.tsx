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
  type Connection,
  type FinalConnectionState,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
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
  dropCandidate?: boolean
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
  graphGroupId: string
  name: string
  dropCandidate?: boolean
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
  onAuthoringCommand?(command: GraphAuthoringCommandDto): void | Promise<void>
  onDeletePreview?(
    target: GraphDeleteTargetDto,
  ): GraphDeletePreviewDto | Promise<GraphDeletePreviewDto>
  onClearSelection(): void
}>

export type GraphNodeEditField = 'label' | 'type'

export type GraphNodeEditDto = Readonly<{
  graphNodeId: string
  field: GraphNodeEditField
  value: string
}>

export type GraphAuthoringCommandDto =
  | Readonly<{
      type: 'set-node-certainty'
      graphNodeId: string
      certainty: GraphCertaintyDto
    }>
  | Readonly<{
      type: 'create-node'
      nodeType: string
      label: string
      parentGraphNodeId?: string
      graphGroupId?: string
    }>
  | Readonly<{
      type: 'connect-nodes'
      sourceGraphNodeId: string
      targetGraphNodeId: string
      label?: string
      certainty?: GraphCertaintyDto
    }>
  | Readonly<{
      type: 'reparent-node'
      graphNodeId: string
      parentGraphNodeId?: string
    }>
  | Readonly<{
      type: 'set-group-membership'
      graphNodeId: string
      graphGroupId: string
    }>
  | Readonly<{ type: 'delete-node'; graphNodeId: string }>
  | Readonly<{ type: 'delete-relation'; graphEdgeId: string }>

export type GraphDeleteTargetDto = Readonly<
  | { type: 'node'; graphNodeId: string }
  | { type: 'relation'; graphEdgeId: string }
>

export type GraphDeleteImpactDto =
  | Readonly<{
      type: 'node'
      nodeLabels: readonly string[]
      nodeCount: number
      relationCount: number
      groupReferenceCount: number
    }>
  | Readonly<{
      type: 'relation'
      relationKind: 'cross' | 'nested'
      promotedNodeLabel?: string
    }>

export type GraphDeletePreviewDto =
  | Readonly<{ type: 'available'; impact: GraphDeleteImpactDto }>
  | Readonly<{
      type: 'rejected'
      reason: Readonly<{ code: string; message: string }>
    }>

type AuthorDialogState =
  | Readonly<{
      type: 'create'
      parentGraphNodeId?: string
      graphGroupId?: string
    }>
  | Readonly<{ type: 'connect'; sourceGraphNodeId: string }>
  | Readonly<{ type: 'move'; graphNodeId: string }>
  | Readonly<{ type: 'delete'; target: GraphDeleteTargetDto }>

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

const certaintyLabelsJa: Readonly<Record<GraphCertaintyDto, string>> =
  Object.freeze({
    neutral: '指定なし',
    tentative: '未確定',
    confirmed: '確定',
    rejected: '棄却',
  })

const ariaLabelConfigJa = Object.freeze({
  'node.a11yDescription.default':
    'EnterまたはSpaceキーでNodeを選択します。',
  'node.a11yDescription.keyboardDisabled':
    'このNodeはキーボードで移動できません。',
  'edge.a11yDescription.default':
    'EnterまたはSpaceキーでRelationを選択します。',
  'controls.ariaLabel': 'グラフの表示操作',
  'controls.zoomIn.ariaLabel': '拡大',
  'controls.zoomOut.ariaLabel': '縮小',
  'controls.fitView.ariaLabel': '全体を表示',
  'controls.interactive.ariaLabel': '操作モードを切り替え',
  'minimap.ariaLabel': 'グラフのミニマップ',
  'handle.ariaLabel': 'Relationの接続点',
})

function editFieldLabelJa(field: GraphNodeEditField): string {
  return field === 'label' ? 'ラベル' : 'Type'
}

function graphRejectionMessageJa(code: string): string {
  switch (code) {
    case 'cyclic-parent':
      return '自分自身または子孫を親にはできません。'
    case 'invalid-value':
      return '入力内容がGranvas Notationの規則を満たしていません。'
    case 'unresolved-reference':
      return '参照先のNodeを解決できません。'
    case 'unsupported-structure':
      return '現在の構造には、この操作を安全に適用できません。'
    case 'unknown-target':
      return '対象が現在のグラフに見つかりません。'
    default:
      return '削除する範囲を確認できませんでした。'
  }
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
      className={`graph-node graph-node--${data.tone} graph-node--certainty-${data.certainty}${selected ? ' is-selected' : ''}${data.dropCandidate ? ' is-drop-candidate' : ''}`}
    >
      <Handle
        className="graph-node__handle"
        type="target"
        position={Position.Top}
        isConnectable
      />
      {certaintyMarker[data.certainty] ? (
        <span className="graph-node__certainty" aria-hidden="true">
          {certaintyMarker[data.certainty]}
        </span>
      ) : null}
      {data.editing ? (
        <label className="graph-node__inline-edit">
          <span className="sr-only">
            {data.label}の{editFieldLabelJa(data.editing.field)}を編集
          </span>
          <input
            data-graph-inline-editor="true"
            className={`graph-node__inline-input graph-node__inline-input--${data.editing.field}`}
            value={data.editing.draft}
            disabled={data.editing.busy}
            aria-label={`${data.label}の${editFieldLabelJa(data.editing.field)}を編集`}
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
            title="ダブルクリックまたはShift+F2でTypeを編集"
            onDoubleClick={(event) => {
              event.stopPropagation()
              data.beginEdit('type')
            }}
          >
            {data.semanticType}
          </span>
          <span
            className="graph-node__label"
            title="ダブルクリックまたはF2でラベルを編集"
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
        isConnectable
      />
    </div>
  )
})

const GroupOverlayView = memo(function GroupOverlayView({
  data,
}: NodeProps<GroupFlowNode>) {
  return (
    <div
      className={`graph-group${data.dropCandidate ? ' is-drop-candidate' : ''}`}
      data-graph-group-id={data.graphGroupId}
    >
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

function AuthorDialog({
  dialog,
  graph,
  busy,
  preview,
  onSubmit,
  onCancel,
}: Readonly<{
  dialog: AuthorDialogState
  graph?: PositionedGraphDto
  busy: boolean
  preview?: GraphDeletePreviewDto
  onSubmit(command: GraphAuthoringCommandDto): void
  onCancel(): void
}>) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [nodeType, setNodeType] = useState('node')
  const [label, setLabel] = useState('')
  const [targetNodeId, setTargetNodeId] = useState(
    dialog.type === 'connect'
      ? (graph?.nodes.find(({ id }) => id !== dialog.sourceGraphNodeId)?.id ?? '')
      : '',
  )
  const [relationLabel, setRelationLabel] = useState('')
  const [certainty, setCertainty] = useState<GraphCertaintyDto>('neutral')
  const [moveTarget, setMoveTarget] = useState('detach')

  useEffect(() => {
    const first =
      dialogRef.current?.querySelector<HTMLElement>('input, select') ??
      dialogRef.current?.querySelector<HTMLElement>('button:not([disabled])')
    first?.focus()
  }, [])

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])',
      ) ?? []),
    ]
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable.at(-1)!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (dialog.type === 'create') {
      onSubmit({
        type: 'create-node',
        nodeType,
        label,
        ...(dialog.parentGraphNodeId === undefined
          ? {}
          : { parentGraphNodeId: dialog.parentGraphNodeId }),
        ...(dialog.graphGroupId === undefined
          ? {}
          : { graphGroupId: dialog.graphGroupId }),
      })
      return
    }
    if (dialog.type === 'connect') {
      if (!targetNodeId) return
      onSubmit({
        type: 'connect-nodes',
        sourceGraphNodeId: dialog.sourceGraphNodeId,
        targetGraphNodeId: targetNodeId,
        ...(relationLabel.trim() ? { label: relationLabel } : {}),
        certainty,
      })
      return
    }
    if (dialog.type === 'move') {
      if (moveTarget.startsWith('node:')) {
        onSubmit({
          type: 'reparent-node',
          graphNodeId: dialog.graphNodeId,
          parentGraphNodeId: moveTarget.slice(5),
        })
      } else if (moveTarget.startsWith('group:')) {
        onSubmit({
          type: 'set-group-membership',
          graphNodeId: dialog.graphNodeId,
          graphGroupId: moveTarget.slice(6),
        })
      } else {
        onSubmit({ type: 'reparent-node', graphNodeId: dialog.graphNodeId })
      }
      return
    }
    if (dialog.type === 'delete' && preview?.type === 'available') {
      onSubmit(
        dialog.target.type === 'node'
          ? { type: 'delete-node', graphNodeId: dialog.target.graphNodeId }
          : { type: 'delete-relation', graphEdgeId: dialog.target.graphEdgeId },
      )
    }
  }

  const title =
    dialog.type === 'create'
      ? dialog.parentGraphNodeId
        ? '子Nodeを追加'
        : dialog.graphGroupId
          ? 'GroupへNodeを追加'
          : 'Nodeを作成'
      : dialog.type === 'connect'
        ? 'Nodeを接続'
        : dialog.type === 'move'
          ? 'Nodeの構造を変更'
          : '削除内容を確認'

  return (
    <div className="graph-dialog-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="graph-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="graph-author-dialog-title"
        onKeyDown={handleDialogKeyDown}
      >
        <form onSubmit={submit}>
          <div className="graph-dialog__header">
            <h3 id="graph-author-dialog-title">{title}</h3>
            <button
              className="graph-dialog__close"
              type="button"
              aria-label="ダイアログを閉じる"
              disabled={busy}
              onClick={onCancel}
            >
              ×
            </button>
          </div>

          {dialog.type === 'create' ? (
            <div className="graph-dialog__fields">
              <label>
                <span>Type</span>
                <input
                  value={nodeType}
                  required
                  pattern="[A-Za-z](?:[A-Za-z0-9_]|-)*"
                  disabled={busy}
                  onChange={(event) => setNodeType(event.currentTarget.value)}
                />
              </label>
              <label>
                <span>ラベル</span>
                <input
                  value={label}
                  required
                  autoComplete="off"
                  disabled={busy}
                  onChange={(event) => setLabel(event.currentTarget.value)}
                />
              </label>
            </div>
          ) : null}

          {dialog.type === 'connect' ? (
            <div className="graph-dialog__fields">
              <label>
                <span>接続先のNode</span>
                <select
                  value={targetNodeId}
                  required
                  disabled={busy}
                  onChange={(event) => setTargetNodeId(event.currentTarget.value)}
                >
                  <option value="" disabled>
                    Nodeを選択
                  </option>
                  {graph?.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Relationラベル（任意）</span>
                <input
                  value={relationLabel}
                  disabled={busy}
                  onChange={(event) => setRelationLabel(event.currentTarget.value)}
                />
              </label>
              <label>
                <span>確信度</span>
                <select
                  value={certainty}
                  disabled={busy}
                  onChange={(event) =>
                    setCertainty(event.currentTarget.value as GraphCertaintyDto)
                  }
                >
                  <option value="neutral">指定なし</option>
                  <option value="tentative">未確定</option>
                  <option value="confirmed">確定</option>
                  <option value="rejected">棄却</option>
                </select>
              </label>
            </div>
          ) : null}

          {dialog.type === 'move' ? (
            <div className="graph-dialog__fields">
              <label>
                <span>構造の変更先</span>
                <select
                  value={moveTarget}
                  disabled={busy}
                  onChange={(event) => setMoveTarget(event.currentTarget.value)}
                >
                  <option value="detach">親子関係を解除</option>
                  <optgroup label="親にするNode">
                    {graph?.nodes
                      .filter(({ id }) => id !== dialog.graphNodeId)
                      .map((node) => (
                        <option key={node.id} value={`node:${node.id}`}>
                          {node.label}
                        </option>
                      ))}
                  </optgroup>
                  {graph?.groups.length ? (
                    <optgroup label="追加先のGroup">
                      {graph.groups.map((group) => (
                        <option key={group.id} value={`group:${group.id}`}>
                          {group.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
              <p className="graph-dialog__hint">
                親子関係またはGroup所属を変更します。キャンバス上の座標は保存されません。
              </p>
            </div>
          ) : null}

          {dialog.type === 'delete' ? (
            <div className="graph-dialog__impact" aria-live="polite">
              {!preview ? <p>影響する構造を確認しています…</p> : null}
              {preview?.type === 'rejected' ? (
                <p role="alert">{graphRejectionMessageJa(preview.reason.code)}</p>
              ) : null}
              {preview?.type === 'available' && preview.impact.type === 'node' ? (
                <>
                  <p>次の構造を削除します。</p>
                  <ul>
                    <li>Node {preview.impact.nodeCount}件</li>
                    <li>Cross Relation {preview.impact.relationCount}件</li>
                    <li>Group参照 {preview.impact.groupReferenceCount}件</li>
                  </ul>
                  <p className="graph-dialog__labels">
                    {preview.impact.nodeLabels.join(', ')}
                  </p>
                </>
              ) : null}
              {preview?.type === 'available' &&
              preview.impact.type === 'relation' ? (
                preview.impact.relationKind === 'nested' ? (
                  <p>
                    {`Relationを削除し、${preview.impact.promotedNodeLabel ?? '子Node'}を子孫ごとスコープのルートへ昇格します。`}
                  </p>
                ) : (
                  <p>このCross Relation宣言だけを削除します。</p>
                )
              ) : null}
            </div>
          ) : null}

          <div className="graph-dialog__actions">
            <button type="button" disabled={busy} onClick={onCancel}>
              キャンセル
            </button>
            <button
              className={dialog.type === 'delete' ? 'is-danger' : ''}
              type="submit"
              disabled={
                busy ||
                (dialog.type === 'delete' && preview?.type !== 'available')
              }
            >
              {busy ? '反映しています…' : dialog.type === 'delete' ? '削除' : '反映'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GraphCanvas({
  graph,
  selectedNodeId,
  fitViewKey,
  status,
  onNodeActivate,
  onNodeEdit,
  onAuthoringCommand,
  onDeletePreview,
  onClearSelection,
}: ReactFlowGraphViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const focusReturnRef = useRef<HTMLElement | null>(null)
  const connectedRef = useRef(false)
  const { getIntersectingNodes } = useReactFlow<GranvasFlowNode>()
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>()
  const [focusReturnNodeId, setFocusReturnNodeId] = useState<string>()
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>()
  const [dialog, setDialog] = useState<AuthorDialogState>()
  const [dialogBusy, setDialogBusy] = useState(false)
  const [deletePreview, setDeletePreview] = useState<GraphDeletePreviewDto>()
  const [dropCandidateId, setDropCandidateId] = useState<string>()
  const [dragState, setDragState] = useState<
    Readonly<{
      revision?: number
      positions: Readonly<Record<string, Readonly<{ x: number; y: number }>>>
    }>
  >({ positions: {} })
  const [authoringStatus, setAuthoringStatus] = useState('')
  const editingGraphNodeId = inlineEdit?.graphNodeId
  const editingField = inlineEdit?.field
  const graphNodeIds = useMemo(
    () => new Set(graph?.nodes.map(({ id }) => id) ?? []),
    [graph],
  )
  const selectedNode = graph?.nodes.find(({ id }) => id === selectedNodeId)
  const selectedEdge = graph?.edges.find(({ id }) => id === selectedEdgeId)

  const closeAuthorDialog = () => {
    if (dialogBusy) return
    setDialog(undefined)
    setDeletePreview(undefined)
    const returnTarget = focusReturnRef.current
    focusReturnRef.current = null
    requestAnimationFrame(() => returnTarget?.focus())
  }

  const openAuthorDialog = (next: AuthorDialogState) => {
    focusReturnRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setDialog(next)
    setDeletePreview(undefined)

    if (next.type !== 'delete') return
    if (!onDeletePreview) {
      setDeletePreview({
        type: 'rejected',
        reason: {
          code: 'preview-unavailable',
          message: '削除範囲を確認できません。',
        },
      })
      return
    }

    void Promise.resolve(onDeletePreview(next.target)).then((preview) => {
      setDeletePreview(preview)
    })
  }

  const submitAuthoringCommand = async (command: GraphAuthoringCommandDto) => {
    if (!onAuthoringCommand || dialogBusy) return
    setDialogBusy(true)
    try {
      await onAuthoringCommand(command)
      setDialog(undefined)
      setDeletePreview(undefined)
      const returnTarget = focusReturnRef.current
      focusReturnRef.current = null
      requestAnimationFrame(() => returnTarget?.focus())
    } finally {
      setDialogBusy(false)
    }
  }

  const submitPointerCommand = (command: GraphAuthoringCommandDto) => {
    if (!onAuthoringCommand) return
    void Promise.resolve(onAuthoringCommand(command))
  }

  const dropTargetIdFor = (
    draggedNode: GranvasFlowNode,
    event?: MouseEvent | TouchEvent,
  ): string | undefined => {
    const pointer =
      event instanceof MouseEvent
        ? { x: event.clientX, y: event.clientY }
        : event?.touches[0]
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : undefined
    const elementId = pointer
      ? document
          .elementsFromPoint(pointer.x, pointer.y)
          .map(
            (element) =>
              element.closest<HTMLElement>('.react-flow__node')?.dataset.id,
          )
          .find(
            (id) =>
              id !== undefined &&
              id !== draggedNode.id &&
              (graphNodeIds.has(id) || id.startsWith('overlay:')),
          )
      : undefined
    if (elementId) return elementId

    const intersections = getIntersectingNodes(draggedNode)
    return (
      intersections.find(
        (candidate) => candidate.type === 'thought' && candidate.id !== draggedNode.id,
      ) ?? intersections.find((candidate) => candidate.type === 'groupOverlay')
    )?.id
  }

  const updateDropCandidate = (
    event: MouseEvent | TouchEvent,
    draggedNode: GranvasFlowNode,
  ) => {
    const candidateId = dropTargetIdFor(draggedNode, event)
    setDropCandidateId(candidateId)
    const candidateNode = graph?.nodes.find(({ id }) => id === candidateId)
    const candidateGroup = graph?.groups.find(
      ({ id }) => `overlay:${id}` === candidateId,
    )
    if (candidateNode) {
      setAuthoringStatus(
        `「${candidateNode.label}」へドロップすると親Nodeにします。`,
      )
    } else if (candidateGroup) {
      setAuthoringStatus(
        `「${candidateGroup.name}」へドロップするとGroupへ追加します。`,
      )
    } else {
      setAuthoringStatus('空白へドロップすると親子関係を解除します。')
    }
  }

  const completeSemanticDrag = (
    event: MouseEvent | TouchEvent,
    draggedNode: GranvasFlowNode,
  ) => {
    if (draggedNode.type !== 'thought') return
    const candidateId = dropTargetIdFor(draggedNode, event)
    const candidateNode = graph?.nodes.find(({ id }) => id === candidateId)
    const candidateGroup = graph?.groups.find(
      ({ id }) => `overlay:${id}` === candidateId,
    )
    if (candidateNode) {
      submitPointerCommand({
        type: 'reparent-node',
        graphNodeId: draggedNode.id,
        parentGraphNodeId: candidateNode.id,
      })
      setAuthoringStatus(`「${draggedNode.data.label}」の親を変更しました。`)
    } else if (candidateGroup) {
      submitPointerCommand({
        type: 'set-group-membership',
        graphNodeId: draggedNode.id,
        graphGroupId: candidateGroup.id,
      })
      setAuthoringStatus(
        `「${draggedNode.data.label}」をGroupへ追加しました。`,
      )
    } else {
      submitPointerCommand({ type: 'reparent-node', graphNodeId: draggedNode.id })
      setAuthoringStatus(`「${draggedNode.data.label}」の親子関係を解除しました。`)
    }
    setDropCandidateId(undefined)
  }

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return
    connectedRef.current = true
    submitPointerCommand({
      type: 'connect-nodes',
      sourceGraphNodeId: connection.source,
      targetGraphNodeId: connection.target,
    })
    setAuthoringStatus('Relationを作成しました。')
  }

  const handleConnectEnd = (
    _event: MouseEvent | TouchEvent,
    state: FinalConnectionState,
  ) => {
    const connected = connectedRef.current
    connectedRef.current = false
    if (connected || state.isValid || state.fromNode?.type !== 'thought') return
    openAuthorDialog({
      type: 'create',
      parentGraphNodeId: state.fromNode.id,
    })
  }

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
        measured: { width: group.width, height: group.height },
        initialWidth: group.width,
        initialHeight: group.height,
        data: {
          graphGroupId: group.id,
          name: group.name,
          dropCandidate: dropCandidateId === `overlay:${group.id}`,
        },
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
      position:
        dragState.revision === graph.revision
          ? (dragState.positions[node.id] ?? { x: node.x, y: node.y })
          : { x: node.x, y: node.y },
      width: node.width,
      height: node.height,
      measured: { width: node.width, height: node.height },
      initialWidth: node.width,
      initialHeight: node.height,
      data: {
        label: node.label,
        semanticType: node.type,
        tone: toneForType(node.type),
        certainty: node.certainty,
        dropCandidate: dropCandidateId === node.id,
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
      draggable: inlineEdit?.graphNodeId !== node.id,
      connectable: inlineEdit?.graphNodeId !== node.id,
      deletable: false,
      focusable: inlineEdit?.graphNodeId !== node.id,
      zIndex: 1,
      ariaRole: inlineEdit?.graphNodeId === node.id ? 'group' : 'button',
      ariaLabel:
        inlineEdit?.graphNodeId === node.id
          ? `「${node.label}」の${editFieldLabelJa(inlineEdit.field)}を編集中`
          : `${certaintyLabelsJa[node.certainty]}、${node.type}：${node.label}`,
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
          focusable: true,
          selectable: true,
          selected: edge.id === selectedEdgeId,
          className: `graph-edge graph-edge--certainty-${edge.certainty}`,
          ariaLabel: `${certaintyLabelsJa[edge.certainty]}のRelation：${sourceLabel}から${targetLabel}${edge.label ? `、${edge.label}` : ''}`,
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
    [graph, selectedEdgeId],
  )

  const handleKeyboardActivation = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target

    if (!(target instanceof Element)) {
      return
    }

    const nodeId = target.closest<HTMLElement>('.react-flow__node')?.dataset.id
    const edgeId = target.closest<HTMLElement>('.react-flow__edge')?.dataset.id

    if ((event.key === 'Delete' || event.key === 'Backspace') && edgeId) {
      event.preventDefault()
      openAuthorDialog({
        type: 'delete',
        target: { type: 'relation', graphEdgeId: edgeId },
      })
      return
    }

    if (!nodeId || !graphNodeIds.has(nodeId)) {
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      openAuthorDialog({
        type: 'delete',
        target: { type: 'node', graphNodeId: nodeId },
      })
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
      onDoubleClick={(event) => {
        const target = event.target
        if (
          target instanceof Element &&
          target.closest('.react-flow__pane') &&
          !target.closest('.react-flow__node')
        ) {
          openAuthorDialog({ type: 'create' })
        }
      }}
      data-graph-status={status}
    >
      <div className="graph-author-toolbar" role="toolbar" aria-label="グラフを編集">
        <button
          type="button"
          disabled={status !== 'ready'}
          onClick={() => openAuthorDialog({ type: 'create' })}
        >
          ＋ Nodeを作成
        </button>
        {selectedNode ? (
          <>
            <span className="graph-author-toolbar__selection" title={selectedNode.label}>
              {selectedNode.label}
            </span>
            <button
              type="button"
              onClick={() =>
                openAuthorDialog({
                  type: 'create',
                  parentGraphNodeId: selectedNode.id,
                })
              }
            >
              子Nodeを追加
            </button>
            <button
              type="button"
              onClick={() =>
                openAuthorDialog({
                  type: 'connect',
                  sourceGraphNodeId: selectedNode.id,
                })
              }
            >
              接続
            </button>
            <button
              type="button"
              onClick={() =>
                openAuthorDialog({ type: 'move', graphNodeId: selectedNode.id })
              }
            >
              構造を変更
            </button>
            <label className="graph-author-toolbar__certainty">
              <span className="sr-only">
                「{selectedNode.label}」の確信度
              </span>
              <select
                aria-label={`「${selectedNode.label}」の確信度`}
                value={selectedNode.certainty}
                onChange={(event) =>
                  submitPointerCommand({
                    type: 'set-node-certainty',
                    graphNodeId: selectedNode.id,
                    certainty: event.currentTarget.value as GraphCertaintyDto,
                  })
                }
              >
                <option value="neutral">指定なし</option>
                <option value="tentative">未確定</option>
                <option value="confirmed">確定</option>
                <option value="rejected">棄却</option>
              </select>
            </label>
            <button
              className="is-danger"
              type="button"
              onClick={() =>
                openAuthorDialog({
                  type: 'delete',
                  target: { type: 'node', graphNodeId: selectedNode.id },
                })
              }
            >
              削除
            </button>
          </>
        ) : null}
        {selectedEdge ? (
          <>
            <span className="graph-author-toolbar__selection">Relationを選択中</span>
            <button
              className="is-danger"
              type="button"
              onClick={() =>
                openAuthorDialog({
                  type: 'delete',
                  target: { type: 'relation', graphEdgeId: selectedEdge.id },
                })
              }
            >
              削除
            </button>
          </>
        ) : null}
      </div>
      <ReactFlow<GranvasFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => {
          if (graphNodeIds.has(node.id) && inlineEdit?.graphNodeId !== node.id) {
            setSelectedEdgeId(undefined)
            onNodeActivate(node.id)
          }
        }}
        onNodeDoubleClick={(event, node) => {
          if (!graphNodeIds.has(node.id)) return
          const target = event.target
          beginInlineEdit(
            node.id,
            target instanceof Element && target.closest('.graph-node__type')
              ? 'type'
              : 'label',
          )
        }}
        onEdgeClick={(_event, edge) => {
          setSelectedEdgeId(edge.id)
          onClearSelection()
        }}
        onPaneClick={() => {
          setSelectedEdgeId(undefined)
          onClearSelection()
        }}
        onNodeDrag={(event, node) => {
          if (node.type !== 'thought') return
          setDragState((current) => ({
            revision: graph?.revision,
            positions: {
              ...(current.revision === graph?.revision ? current.positions : {}),
              [node.id]: Object.freeze({ ...node.position }),
            },
          }))
          updateDropCandidate(event, node)
        }}
        onNodeDragStop={(event, node) => completeSemanticDrag(event, node)}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        nodesDraggable
        nodesConnectable
        nodesFocusable
        edgesFocusable
        elementsSelectable
        panOnDrag
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        aria-label="編集できる思考グラフ"
        ariaLabelConfig={ariaLabelConfigJa}
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
          aria-label="グラフの表示操作"
        />
      </ReactFlow>
      {nodes.length === 0 ? (
        <div className="graph-empty" role="status">
          <span className="graph-empty__mark" aria-hidden="true">
            G
          </span>
          <strong>
            {status === 'projecting' ? 'グラフを組み立てています…' : 'まだグラフがありません'}
          </strong>
          <span>テキストペインにNode宣言を書いてください。</span>
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {authoringStatus}
      </div>
      {dialog ? (
        <AuthorDialog
          key={`${dialog.type}:${
            dialog.type === 'delete'
              ? dialog.target.type === 'node'
                ? dialog.target.graphNodeId
                : dialog.target.graphEdgeId
              : ''
          }`}
          dialog={dialog}
          graph={graph}
          busy={dialogBusy}
          preview={deletePreview}
          onCancel={closeAuthorDialog}
          onSubmit={(command) => void submitAuthoringCommand(command)}
        />
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
