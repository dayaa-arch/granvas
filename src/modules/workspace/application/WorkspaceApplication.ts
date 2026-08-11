import {
  beginProjectDownload,
  createDocument,
  markProjectDownloadFailed,
  markProjectDownloaded,
  replaceDocumentSource,
  updateDocumentSource,
  type GranvasDocumentDto,
  type ProjectDownloadTicketDto,
} from '@/modules/document'
import {
  GraphApplicationError,
  createCancellationController,
  createGraphExportScene,
  createThoughtGraphProjection,
  layoutThoughtGraph,
  type CancellationController,
  type GraphExportSceneDto,
  type GraphLayoutPort,
  type GraphOccurrenceMapDto,
  type PositionedGraphDto,
} from '@/modules/graph'
import {
  applySourceEdits,
  mapSourceOffsetThroughEdits,
  parseNotation,
  planNotationEdit,
  previewNotationDelete,
  type DiagnosticDto,
  type NotationDeleteImpactDto,
  type NotationEditCommandDto,
  type NotationEditRejectionDto,
  type ParseResultDto,
  type SourceEditDto,
  type SourceRangeDto,
} from '@/modules/notation'

export type ProjectionSourceMapDto = Readonly<{
  revision: number
  nodeRanges: Readonly<Record<string, SourceRangeDto>>
  edgeRanges: Readonly<Record<string, SourceRangeDto>>
  groupRanges: Readonly<Record<string, SourceRangeDto>>
  nodeKeys: Readonly<Record<string, string>>
  edgeKeys: Readonly<Record<string, string>>
  groupKeys: Readonly<Record<string, string>>
}>

export type WorkspaceProjectionDto = Readonly<{
  revision: number
  graph: PositionedGraphDto
  sourceMap: ProjectionSourceMapDto
  diagnostics: readonly DiagnosticDto[]
}>

export type WorkspaceStatusDto =
  | Readonly<{ type: 'idle' }>
  | Readonly<{ type: 'projecting'; revision: number }>
  | Readonly<{ type: 'ready'; revision: number }>
  | Readonly<{ type: 'error'; revision: number; message: string }>

export type WorkspaceSnapshotDto = Readonly<{
  document: GranvasDocumentDto
  projection?: WorkspaceProjectionDto
  diagnostics: readonly DiagnosticDto[]
  status: WorkspaceStatusDto
  selectedGraphNodeId?: string
}>

export type SourceSelectionEffectDto = Readonly<{
  graphNodeId?: string
  sourceRange?: SourceRangeDto
}>

export type WorkspaceGraphEditCommandDto =
  | Readonly<{
      type: 'set-node-label'
      graphNodeId: string
      label: string
    }>
  | Readonly<{
      type: 'set-node-type'
      graphNodeId: string
      nodeType: string
    }>
  | Readonly<{
      type: 'set-node-certainty'
      graphNodeId: string
      certainty: 'neutral' | 'tentative' | 'confirmed' | 'rejected'
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
      certainty?: 'neutral' | 'tentative' | 'confirmed' | 'rejected'
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

export type WorkspaceDeleteImpactDto =
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

export type WorkspaceDeletePreviewResultDto =
  | Readonly<{ type: 'available'; impact: WorkspaceDeleteImpactDto }>
  | Readonly<{ type: 'rejected'; reason: NotationEditRejectionDto }>

export type WorkspaceGraphEditResultDto =
  | Readonly<{
      type: 'applied'
      snapshot: WorkspaceSnapshotDto
      edits: readonly SourceEditDto[]
    }>
  | Readonly<{
      type: 'rejected'
      reason: NotationEditRejectionDto
    }>

type ResolvedGraphEdit =
  | Readonly<{
      type: 'resolved'
      command: NotationEditCommandDto
      fallbackOffset: number
      selectedGraphNodeId?: string
    }>
  | Readonly<{
      type: 'rejected'
      reason: NotationEditRejectionDto
    }>

export type ReplaceWorkspaceProjectInput = Readonly<{
  name: string
  source: string
  confirmed?: boolean
}>

export type ReplaceWorkspaceProjectResult =
  | Readonly<{
      type: 'confirmation-required'
      snapshot: WorkspaceSnapshotDto
    }>
  | Readonly<{
      type: 'replaced'
      snapshot: WorkspaceSnapshotDto
    }>

export type WorkspaceDownloadFormat = 'granvas' | 'svg' | 'png' | 'pdf'

export type WorkspaceProjectDownloadInputDto = Readonly<{
  format: 'granvas'
  revision: number
  name: string
  source: string
}>

export type WorkspaceVisualDownloadInputDto = Readonly<{
  format: 'svg' | 'png' | 'pdf'
  revision: number
  name: string
  scene: GraphExportSceneDto
  diagnosticsCount: number
}>

export type WorkspaceDownloadInputDto =
  | WorkspaceProjectDownloadInputDto
  | WorkspaceVisualDownloadInputDto

export type WorkspaceProjectDownloadRequestDto = Readonly<{
  input: WorkspaceProjectDownloadInputDto
  ticket: ProjectDownloadTicketDto
  snapshot: WorkspaceSnapshotDto
}>

export type WorkspaceApplicationErrorCode =
  | 'invalid-source-offset'
  | 'projection-revision-mismatch'
  | 'projection-mapping-failed'
  | 'visual-projection-unavailable'

export class WorkspaceApplicationError extends Error {
  readonly code: WorkspaceApplicationErrorCode

  constructor(code: WorkspaceApplicationErrorCode, message: string) {
    super(message)
    this.name = 'WorkspaceApplicationError'
    this.code = code
  }
}

function toWorkspaceDeleteImpact(
  impact: NotationDeleteImpactDto,
): WorkspaceDeleteImpactDto {
  if (impact.type === 'node') {
    return Object.freeze({
      type: 'node',
      nodeLabels: Object.freeze([...impact.nodeLabels]),
      nodeCount: impact.nodeKeys.length,
      relationCount: impact.relationKeys.length,
      groupReferenceCount: impact.groupReferenceCount,
    })
  }

  return Object.freeze({
    type: 'relation',
    relationKind: impact.relationKind,
    ...(impact.promotedNodeLabel === undefined
      ? {}
      : { promotedNodeLabel: impact.promotedNodeLabel }),
  })
}

export type CreateWorkspaceApplicationInput = Readonly<{
  graphLayout: GraphLayoutPort
  name?: string
  source?: string
}>

export interface WorkspaceApplication {
  getSnapshot(): WorkspaceSnapshotDto
  openWorkspace(): Promise<WorkspaceSnapshotDto>
  updateWorkspaceSource(source: string): Promise<WorkspaceSnapshotDto>
  replaceWorkspaceProject(
    input: ReplaceWorkspaceProjectInput,
  ): Promise<ReplaceWorkspaceProjectResult>
  selectGraphNode(graphNodeId: string): SourceSelectionEffectDto
  selectSourceOffset(offset: number): SourceSelectionEffectDto
  applyGraphEdit(
    command: WorkspaceGraphEditCommandDto,
  ): Promise<WorkspaceGraphEditResultDto>
  previewGraphDelete(
    target: Readonly<
      | { type: 'node'; graphNodeId: string }
      | { type: 'relation'; graphEdgeId: string }
    >,
  ): WorkspaceDeletePreviewResultDto
  createDownloadInput(format: WorkspaceDownloadFormat): WorkspaceDownloadInputDto
  beginProjectDownload(): WorkspaceProjectDownloadRequestDto
  markProjectDownloaded(ticket: ProjectDownloadTicketDto): WorkspaceSnapshotDto
  markProjectDownloadFailed(
    ticket: ProjectDownloadTicketDto,
    message: string,
  ): WorkspaceSnapshotDto
  cancelProjection(): void
}

function documentIsDirty(document: GranvasDocumentDto): boolean {
  if (document.status.type === 'dirty') {
    return true
  }

  if (document.status.type === 'exporting' || document.status.type === 'error') {
    return document.status.dirty
  }

  return false
}

function freezeRecord(
  entries: readonly (readonly [string, SourceRangeDto])[],
): Readonly<Record<string, SourceRangeDto>> {
  return Object.freeze(Object.fromEntries(entries))
}

function freezeStringRecord(
  value: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return Object.freeze({ ...value })
}

function pairOccurrenceRanges(
  occurrences: readonly Readonly<{ key: string; sourceRange: SourceRangeDto }>[],
  graphKeys: Readonly<Record<string, string>>,
): Readonly<{
  ranges: Readonly<Record<string, SourceRangeDto>>
  keys: Readonly<Record<string, string>>
}> {
  const rangeByKey = new Map(
    occurrences.map(({ key, sourceRange }) => [key, sourceRange] as const),
  )
  const entries = Object.entries(graphKeys)

  if (
    rangeByKey.size !== occurrences.length ||
    entries.length !== occurrences.length ||
    new Set(entries.map(([, key]) => key)).size !== occurrences.length
  ) {
    throw new WorkspaceApplicationError(
      'projection-mapping-failed',
      'Graph output does not match Notation occurrences.',
    )
  }

  const rangeEntries = entries.map(([graphId, key]) => {
    const sourceRange = rangeByKey.get(key)

    if (!sourceRange) {
      throw new WorkspaceApplicationError(
        'projection-mapping-failed',
        'Graph occurrence mapping references an unknown Notation key.',
      )
    }

    return [graphId, sourceRange] as const
  })

  return Object.freeze({
    ranges: freezeRecord(rangeEntries),
    keys: freezeStringRecord(graphKeys),
  })
}

function createProjectionSourceMap(
  parseResult: ParseResultDto,
  occurrenceMap: GraphOccurrenceMapDto,
): ProjectionSourceMapDto {
  const nodes = pairOccurrenceRanges(parseResult.nodes, occurrenceMap.nodeKeys)
  const edges = pairOccurrenceRanges(parseResult.relations, occurrenceMap.edgeKeys)
  const groups = pairOccurrenceRanges(parseResult.groups, occurrenceMap.groupKeys)

  return Object.freeze({
    revision: parseResult.documentRevision,
    nodeRanges: nodes.ranges,
    edgeRanges: edges.ranges,
    groupRanges: groups.ranges,
    nodeKeys: nodes.keys,
    edgeKeys: edges.keys,
    groupKeys: groups.keys,
  })
}

function createSemanticGraphProjection(parseResult: ParseResultDto) {
  return createThoughtGraphProjection({
    revision: parseResult.documentRevision,
    nodes: parseResult.nodes.map(({ key, explicitId, type, label, certainty }) => ({
      key,
      ...(explicitId === undefined ? {} : { explicitId }),
      type,
      label,
      certainty,
    })),
    relations: parseResult.relations.map(
      ({ key, sourceNodeKey, targetNodeKey, label, certainty }) => ({
        key,
        sourceNodeKey,
        targetNodeKey,
        certainty,
        ...(label === undefined ? {} : { label }),
      }),
    ),
    groups: parseResult.groups.map(({ key, name, memberNodeKeys }) => ({
      key,
      name,
      memberNodeKeys,
    })),
  })
}

function createWorkspaceProjection(
  revision: number,
  graph: PositionedGraphDto,
  sourceMap: ProjectionSourceMapDto,
  diagnostics: readonly DiagnosticDto[],
): WorkspaceProjectionDto {
  if (
    graph.revision !== revision ||
    sourceMap.revision !== revision ||
    diagnostics.some(({ documentRevision }) => documentRevision !== revision)
  ) {
    throw new WorkspaceApplicationError(
      'projection-revision-mismatch',
      'Workspace projection components must share one document revision.',
    )
  }

  return Object.freeze({
    revision,
    graph,
    sourceMap,
    diagnostics,
  })
}

export function createWorkspaceApplication(
  input: CreateWorkspaceApplicationInput,
): WorkspaceApplication {
  let document = createDocument({
    name: input.name,
    source: input.source,
  })
  let projection: WorkspaceProjectionDto | undefined
  let currentParseResult: ParseResultDto | undefined
  let diagnostics: readonly DiagnosticDto[] = Object.freeze([])
  let status: WorkspaceStatusDto = Object.freeze({ type: 'idle' })
  let selectedGraphNodeId: string | undefined
  let currentJob = 0
  let activeCancellation: CancellationController | undefined

  const getSnapshot = (): WorkspaceSnapshotDto =>
    Object.freeze({
      document,
      ...(projection === undefined ? {} : { projection }),
      diagnostics,
      status,
      ...(selectedGraphNodeId === undefined ? {} : { selectedGraphNodeId }),
    })

  const rebuildCurrentProjection = async (
    selectionOffset?: number,
  ): Promise<WorkspaceSnapshotDto> => {
    activeCancellation?.cancel()
    const cancellation = createCancellationController()
    activeCancellation = cancellation
    const job = ++currentJob
    const revision = document.revision
    projection = undefined
    currentParseResult = undefined
    selectedGraphNodeId = undefined
    status = Object.freeze({ type: 'projecting', revision })

    try {
      const parseResult = parseNotation({
        source: document.source,
        documentRevision: revision,
      })
      diagnostics = parseResult.diagnostics
      const semanticProjection = createSemanticGraphProjection(parseResult)
      const semanticGraph = semanticProjection.graph
      const sourceMap = createProjectionSourceMap(
        parseResult,
        semanticProjection.occurrenceMap,
      )
      const positionedGraph = await layoutThoughtGraph(
        semanticGraph,
        parseResult.layout.direction,
        input.graphLayout,
        cancellation.signal,
      )

      if (job !== currentJob || revision !== document.revision) {
        return getSnapshot()
      }

      projection = createWorkspaceProjection(
        revision,
        positionedGraph,
        sourceMap,
        parseResult.diagnostics,
      )
      currentParseResult = parseResult
      if (selectionOffset !== undefined) {
        const ranges = Object.entries(sourceMap.nodeRanges)
        selectedGraphNodeId =
          ranges.find(
            ([, range]) =>
              range.from <= selectionOffset && selectionOffset < range.to,
          )?.[0] ??
          ranges
            .filter(([, range]) => range.from >= selectionOffset)
            .sort((left, right) => left[1].from - right[1].from)[0]?.[0]
      }
      status = Object.freeze({ type: 'ready', revision })
      activeCancellation = undefined
      return getSnapshot()
    } catch (error) {
      if (
        job !== currentJob ||
        revision !== document.revision ||
        (error instanceof GraphApplicationError && error.code === 'layout-cancelled')
      ) {
        return getSnapshot()
      }

      status = Object.freeze({
        type: 'error',
        revision,
        message: error instanceof Error ? error.message : 'Workspace projection failed.',
      })
      activeCancellation = undefined
      return getSnapshot()
    }
  }

  const selectGraphNode = (graphNodeId: string): SourceSelectionEffectDto => {
    const sourceRange = projection?.sourceMap.nodeRanges[graphNodeId]
    selectedGraphNodeId = sourceRange ? graphNodeId : undefined
    return Object.freeze({
      ...(selectedGraphNodeId === undefined ? {} : { graphNodeId: selectedGraphNodeId }),
      ...(sourceRange === undefined ? {} : { sourceRange }),
    })
  }

  const selectSourceOffset = (offset: number): SourceSelectionEffectDto => {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new WorkspaceApplicationError(
        'invalid-source-offset',
        'Source offset must be a non-negative safe integer.',
      )
    }

    const match = Object.entries(projection?.sourceMap.nodeRanges ?? {}).find(
      ([, range]) => range.from <= offset && offset < range.to,
    )
    selectedGraphNodeId = match?.[0]
    return Object.freeze({
      ...(match === undefined ? {} : { graphNodeId: match[0], sourceRange: match[1] }),
    })
  }

  const unknownGraphTarget = (message: string): ResolvedGraphEdit =>
    Object.freeze({
      type: 'rejected',
      reason: Object.freeze({ code: 'unknown-target', message }),
    })

  const projectionIsCurrent = (): boolean =>
    projection !== undefined &&
    currentParseResult !== undefined &&
    projection.revision === document.revision &&
    currentParseResult.documentRevision === document.revision

  const resolveGraphEdit = (
    graphCommand: WorkspaceGraphEditCommandDto,
  ): ResolvedGraphEdit => {
    if (!projectionIsCurrent() || !projection) {
      return unknownGraphTarget('The current Graph projection is unavailable.')
    }

    const nodeKey = (graphNodeId: string): string | undefined =>
      projection?.sourceMap.nodeKeys[graphNodeId]
    const nodeOffset = (graphNodeId: string): number | undefined =>
      projection?.sourceMap.nodeRanges[graphNodeId]?.from

    switch (graphCommand.type) {
      case 'set-node-label':
      case 'set-node-type':
      case 'set-node-certainty': {
        const key = nodeKey(graphCommand.graphNodeId)
        const offset = nodeOffset(graphCommand.graphNodeId)
        if (!key || offset === undefined) {
          return unknownGraphTarget('The Node is not present in the current projection.')
        }
        const notationCommand: NotationEditCommandDto =
          graphCommand.type === 'set-node-label'
            ? {
                type: 'set-node-label',
                nodeKey: key,
                label: graphCommand.label,
              }
            : graphCommand.type === 'set-node-type'
              ? {
                  type: 'set-node-type',
                  nodeKey: key,
                  nodeType: graphCommand.nodeType,
                }
              : {
                  type: 'set-node-certainty',
                  nodeKey: key,
                  certainty: graphCommand.certainty,
                }
        return Object.freeze({
          type: 'resolved',
          command: Object.freeze(notationCommand),
          fallbackOffset: offset,
          selectedGraphNodeId: graphCommand.graphNodeId,
        })
      }

      case 'create-node': {
        const parentNodeKey = graphCommand.parentGraphNodeId
          ? nodeKey(graphCommand.parentGraphNodeId)
          : undefined
        const groupKey = graphCommand.graphGroupId
          ? projection.sourceMap.groupKeys[graphCommand.graphGroupId]
          : undefined
        if (graphCommand.parentGraphNodeId && !parentNodeKey) {
          return unknownGraphTarget('The parent Node is not present in the current projection.')
        }
        if (graphCommand.graphGroupId && !groupKey) {
          return unknownGraphTarget('The Group is not present in the current projection.')
        }
        return Object.freeze({
          type: 'resolved',
          command: Object.freeze({
            type: 'create-node',
            nodeType: graphCommand.nodeType,
            label: graphCommand.label,
            ...(parentNodeKey === undefined ? {} : { parentNodeKey }),
            ...(groupKey === undefined ? {} : { groupKey }),
          }),
          fallbackOffset: document.source.length,
        })
      }

      case 'connect-nodes': {
        const sourceNodeKey = nodeKey(graphCommand.sourceGraphNodeId)
        const targetNodeKey = nodeKey(graphCommand.targetGraphNodeId)
        const offset = nodeOffset(graphCommand.sourceGraphNodeId)
        if (!sourceNodeKey || !targetNodeKey || offset === undefined) {
          return unknownGraphTarget('An endpoint Node is not present in the current projection.')
        }
        return Object.freeze({
          type: 'resolved',
          command: Object.freeze({
            type: 'connect-nodes',
            sourceNodeKey,
            targetNodeKey,
            ...(graphCommand.label === undefined ? {} : { label: graphCommand.label }),
            ...(graphCommand.certainty === undefined
              ? {}
              : { certainty: graphCommand.certainty }),
          }),
          fallbackOffset: offset,
          selectedGraphNodeId: graphCommand.sourceGraphNodeId,
        })
      }

      case 'reparent-node': {
        const key = nodeKey(graphCommand.graphNodeId)
        const parentNodeKey = graphCommand.parentGraphNodeId
          ? nodeKey(graphCommand.parentGraphNodeId)
          : undefined
        const offset = nodeOffset(graphCommand.graphNodeId)
        if (!key || offset === undefined || (graphCommand.parentGraphNodeId && !parentNodeKey)) {
          return unknownGraphTarget('A Node is not present in the current projection.')
        }
        return Object.freeze({
          type: 'resolved',
          command: Object.freeze({
            type: 'reparent-node',
            nodeKey: key,
            ...(parentNodeKey === undefined ? {} : { parentNodeKey }),
          }),
          fallbackOffset: offset,
          selectedGraphNodeId: graphCommand.graphNodeId,
        })
      }

      case 'set-group-membership': {
        const key = nodeKey(graphCommand.graphNodeId)
        const groupKey = projection.sourceMap.groupKeys[graphCommand.graphGroupId]
        const offset = nodeOffset(graphCommand.graphNodeId)
        if (!key || !groupKey || offset === undefined) {
          return unknownGraphTarget('The Node or Group is not present in the current projection.')
        }
        return Object.freeze({
          type: 'resolved',
          command: Object.freeze({
            type: 'set-group-membership',
            nodeKey: key,
            groupKey,
          }),
          fallbackOffset: offset,
          selectedGraphNodeId: graphCommand.graphNodeId,
        })
      }

      case 'delete-node': {
        const key = nodeKey(graphCommand.graphNodeId)
        const offset = nodeOffset(graphCommand.graphNodeId)
        if (!key || offset === undefined) {
          return unknownGraphTarget('The Node is not present in the current projection.')
        }
        return Object.freeze({
          type: 'resolved',
          command: Object.freeze({ type: 'delete-node', nodeKey: key }),
          fallbackOffset: offset,
        })
      }

      case 'delete-relation': {
        const relationKey = projection.sourceMap.edgeKeys[graphCommand.graphEdgeId]
        const offset = projection.sourceMap.edgeRanges[graphCommand.graphEdgeId]?.from
        if (!relationKey || offset === undefined) {
          return unknownGraphTarget('The Relation is not present in the current projection.')
        }
        return Object.freeze({
          type: 'resolved',
          command: Object.freeze({ type: 'delete-relation', relationKey }),
          fallbackOffset: offset,
        })
      }
    }
  }

  const previewGraphDelete: WorkspaceApplication['previewGraphDelete'] = (target) => {
    if (!projectionIsCurrent() || !projection || !currentParseResult) {
      return Object.freeze({
        type: 'rejected',
        reason: Object.freeze({
          code: 'unknown-target',
          message: 'The current Graph projection is unavailable.',
        }),
      })
    }

    const notationTarget =
      target.type === 'node'
        ? projection.sourceMap.nodeKeys[target.graphNodeId]
          ? ({
              type: 'node',
              nodeKey: projection.sourceMap.nodeKeys[target.graphNodeId],
            } as const)
          : undefined
        : projection.sourceMap.edgeKeys[target.graphEdgeId]
          ? ({
              type: 'relation',
              relationKey: projection.sourceMap.edgeKeys[target.graphEdgeId],
            } as const)
          : undefined

    if (!notationTarget) {
      return Object.freeze({
        type: 'rejected',
        reason: Object.freeze({
          code: 'unknown-target',
          message: 'The delete target is not present in the current projection.',
        }),
      })
    }

    const preview = previewNotationDelete({
      source: document.source,
      parseResult: currentParseResult,
      target: notationTarget,
    })
    return preview.type === 'rejected'
      ? preview
      : Object.freeze({
          type: 'available',
          impact: toWorkspaceDeleteImpact(preview.impact),
        })
  }

  return Object.freeze({
    getSnapshot,
    openWorkspace: rebuildCurrentProjection,
    async updateWorkspaceSource(source: string) {
      document = updateDocumentSource(document, source)
      return rebuildCurrentProjection()
    },
    async replaceWorkspaceProject(
      replacement: ReplaceWorkspaceProjectInput,
    ): Promise<ReplaceWorkspaceProjectResult> {
      if (documentIsDirty(document) && replacement.confirmed !== true) {
        return Object.freeze({
          type: 'confirmation-required',
          snapshot: getSnapshot(),
        })
      }

      document = replaceDocumentSource(document, {
        name: replacement.name,
        source: replacement.source,
      })
      const snapshot = await rebuildCurrentProjection()
      return Object.freeze({ type: 'replaced', snapshot })
    },
    selectGraphNode,
    selectSourceOffset,
    previewGraphDelete,
    async applyGraphEdit(
      command: WorkspaceGraphEditCommandDto,
    ): Promise<WorkspaceGraphEditResultDto> {
      const resolved = resolveGraphEdit(command)
      if (resolved.type === 'rejected' || !projection || !currentParseResult) {
        return resolved.type === 'rejected'
          ? resolved
          : Object.freeze({
              type: 'rejected',
              reason: Object.freeze({
                code: 'unknown-target',
                message: 'The current Graph projection is unavailable.',
              }),
            })
      }

      const plan = planNotationEdit({
        source: document.source,
        parseResult: currentParseResult,
        command: resolved.command,
      })

      if (plan.type === 'rejected') {
        return plan
      }

      if (plan.edits.length === 0) {
        selectedGraphNodeId = resolved.selectedGraphNodeId
        return Object.freeze({
          type: 'applied',
          snapshot: getSnapshot(),
          edits: plan.edits,
        })
      }

      const nextSource = applySourceEdits(document.source, plan.edits)
      const selectionOffset = mapSourceOffsetThroughEdits(
        plan.caretAnchor ?? resolved.fallbackOffset,
        plan.edits,
        plan.caretAffinity,
      )
      document = updateDocumentSource(document, nextSource)
      const editRevision = document.revision
      const snapshot = await rebuildCurrentProjection(selectionOffset)

      if (snapshot.document.revision !== editRevision) {
        return Object.freeze({
          type: 'rejected',
          reason: Object.freeze({
            code: 'unsupported-structure',
            message: 'The Graph edit was superseded by a newer source revision.',
          }),
        })
      }

      return Object.freeze({
        type: 'applied',
        snapshot,
        edits: plan.edits,
      })
    },
    createDownloadInput(format: WorkspaceDownloadFormat): WorkspaceDownloadInputDto {
      if (format === 'granvas') {
        return Object.freeze({
          format,
          revision: document.revision,
          name: document.name,
          source: document.source,
        })
      }

      if (
        !projection ||
        projection.revision !== document.revision ||
        projection.graph.nodes.length === 0
      ) {
        throw new WorkspaceApplicationError(
          'visual-projection-unavailable',
          'A current non-empty Graph projection is required for visual download.',
        )
      }

      return Object.freeze({
        format,
        revision: projection.revision,
        name: document.name,
        scene: createGraphExportScene(projection.graph),
        diagnosticsCount: projection.diagnostics.length,
      })
    },
    beginProjectDownload() {
      const started = beginProjectDownload(document)
      document = started.document
      return Object.freeze({
        input: Object.freeze({
          format: 'granvas',
          revision: document.revision,
          name: document.name,
          source: document.source,
        }),
        ticket: started.ticket,
        snapshot: getSnapshot(),
      })
    },
    markProjectDownloaded(ticket: ProjectDownloadTicketDto) {
      document = markProjectDownloaded(document, ticket)
      return getSnapshot()
    },
    markProjectDownloadFailed(ticket: ProjectDownloadTicketDto, message: string) {
      document = markProjectDownloadFailed(document, ticket, message)
      return getSnapshot()
    },
    cancelProjection() {
      activeCancellation?.cancel()
    },
  })
}
