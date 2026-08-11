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
  createThoughtGraph,
  layoutThoughtGraph,
  type CancellationController,
  type GraphExportSceneDto,
  type GraphLayoutPort,
  type PositionedGraphDto,
  type ThoughtGraphDto,
} from '@/modules/graph'
import {
  parseNotation,
  type DiagnosticDto,
  type ParseResultDto,
  type SourceRangeDto,
} from '@/modules/notation'

export type ProjectionSourceMapDto = Readonly<{
  revision: number
  nodeRanges: Readonly<Record<string, SourceRangeDto>>
  edgeRanges: Readonly<Record<string, SourceRangeDto>>
  groupRanges: Readonly<Record<string, SourceRangeDto>>
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

function pairRanges(
  occurrences: readonly Readonly<{ key: string; sourceRange: SourceRangeDto }>[],
  graphIds: readonly string[],
): Readonly<Record<string, SourceRangeDto>> {
  const sorted = [...occurrences].sort((left, right) => left.key.localeCompare(right.key))

  if (sorted.length !== graphIds.length) {
    throw new WorkspaceApplicationError(
      'projection-mapping-failed',
      'Graph output does not match Notation occurrences.',
    )
  }

  return freezeRecord(
    sorted.map((occurrence, index) => [graphIds[index]!, occurrence.sourceRange] as const),
  )
}

function createProjectionSourceMap(
  parseResult: ParseResultDto,
  graph: ThoughtGraphDto,
): ProjectionSourceMapDto {
  return Object.freeze({
    revision: parseResult.documentRevision,
    nodeRanges: pairRanges(
      parseResult.nodes,
      graph.nodes.map(({ id }) => id),
    ),
    edgeRanges: pairRanges(
      parseResult.relations,
      graph.edges.map(({ id }) => id),
    ),
    groupRanges: pairRanges(
      parseResult.groups,
      graph.groups.map(({ id }) => id),
    ),
  })
}

function createSemanticGraph(parseResult: ParseResultDto): ThoughtGraphDto {
  return createThoughtGraph({
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

  const rebuildCurrentProjection = async (): Promise<WorkspaceSnapshotDto> => {
    activeCancellation?.cancel()
    const cancellation = createCancellationController()
    activeCancellation = cancellation
    const job = ++currentJob
    const revision = document.revision
    projection = undefined
    selectedGraphNodeId = undefined
    status = Object.freeze({ type: 'projecting', revision })

    try {
      const parseResult = parseNotation({
        source: document.source,
        documentRevision: revision,
      })
      diagnostics = parseResult.diagnostics
      const semanticGraph = createSemanticGraph(parseResult)
      const sourceMap = createProjectionSourceMap(parseResult, semanticGraph)
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
