import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import type { GranvasApplication } from '@/app/bootstrap/createApplication'
import type {
  EditorCursorDto,
  GranvasEditorHandle,
  SourceRangeDto,
} from '@/modules/notation'
import type {
  GraphAuthoringCommandDto,
  GraphDeletePreviewDto,
  GraphDeleteTargetDto,
  GraphNodeEditDto,
} from '@/modules/graph'
import {
  type DownloadDialogSubmitDto,
} from '@/modules/transfer'
import {
  WorkspaceSplitPane,
  WorkspaceStatusBar,
  type WorkspaceSnapshotDto,
} from '@/modules/workspace'
import {
  graphEditErrorMessageJa,
  transferErrorMessageJa,
} from '@/app/presentationMessages'
import { createNewGranvasUrl } from '@/app/projectLaunch'

import './App.css'

const GranvasEditor = lazy(async () => ({
  default: (await import('@/modules/notation')).GranvasEditor,
}))
const ReactFlowGraphView = lazy(async () => ({
  default: (await import('@/modules/graph')).ReactFlowGraphView,
}))
const DownloadDialog = lazy(async () => ({
  default: (await import('@/modules/transfer')).DownloadDialog,
}))

type AppProps = Readonly<{
  application: GranvasApplication
}>

type AppNotice = Readonly<{
  tone: 'success' | 'error' | 'info'
  message: string
}>

function isDirty(snapshot: WorkspaceSnapshotDto): boolean {
  const { status } = snapshot.document

  return (
    status.type === 'dirty' ||
    ((status.type === 'exporting' || status.type === 'error') && status.dirty)
  )
}

function authoringSuccessMessage(command: Readonly<{ type: string }>): string {
  switch (command.type) {
    case 'set-node-certainty':
      return 'Nodeの確信度を更新しました。'
    case 'create-node':
      return 'グラフからNodeを作成しました。'
    case 'connect-nodes':
      return 'グラフからRelationを作成しました。'
    case 'reparent-node':
      return 'Nodeの親子構造を更新しました。'
    case 'set-group-membership':
      return 'NodeをGroupへ追加しました。'
    case 'delete-node':
      return 'Nodeと関連する構造を削除しました。'
    case 'delete-relation':
      return 'Relationを削除しました。'
    default:
      return 'グラフの変更をテキストへ反映しました。'
  }
}

function graphStatusLabel(status: 'idle' | 'projecting' | 'ready' | 'error'): string {
  switch (status) {
    case 'idle':
      return '待機中'
    case 'projecting':
      return '更新中'
    case 'ready':
      return '更新済み'
    case 'error':
      return '更新エラー'
  }
}

function App({ application }: AppProps) {
  const { workspace, transfer } = application
  const [snapshot, setSnapshot] = useState(() => workspace.getSnapshot())
  const [editorSource, setEditorSource] = useState(snapshot.document.source)
  const [cursor, setCursor] = useState<EditorCursorDto>({
    offset: 0,
    line: 1,
    column: 0,
  })
  const [editorSelection, setEditorSelection] = useState<SourceRangeDto>()
  const [fitViewKey, setFitViewKey] = useState(0)
  const [projectionPending, setProjectionPending] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [notice, setNotice] = useState<AppNotice | undefined>(() =>
    application.temporaryProjectLoad.type === 'restored'
      ? {
          tone: 'info',
          message: '24時間の一時保存から作業を復元しました。',
        }
      : undefined,
  )
  const editorSourceRef = useRef(editorSource)
  const editorRef = useRef<GranvasEditorHandle>(null)
  const graphSelectionRangeRef = useRef<SourceRangeDto | undefined>(undefined)
  const updateTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const updateGenerationRef = useRef(0)
  const mountedRef = useRef(true)
  const downloadButtonRef = useRef<HTMLButtonElement>(null)

  const applySnapshot = (next: WorkspaceSnapshotDto) => {
    if (mountedRef.current) {
      setSnapshot(next)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    const projection = workspace.openWorkspace()
    applySnapshot(workspace.getSnapshot())
    void projection.then((next) => {
      if (mountedRef.current) {
        applySnapshot(next)
        setFitViewKey((current) => current + 1)
      }
    })

    return () => {
      mountedRef.current = false
      workspace.cancelProjection()
      if (updateTimerRef.current !== undefined) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [workspace])

  useEffect(() => {
    if (!isDirty(snapshot)) {
      return
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [snapshot])

  useEffect(() => {
    const temporaryStorage = snapshot.temporaryStorage
    if (temporaryStorage.type !== 'stored') {
      return
    }

    const expire = () => {
      applySnapshot(
        workspace.expireTemporaryProject(temporaryStorage.expiresAt),
      )
    }
    const remaining = temporaryStorage.expiresAt - Date.now()
    if (remaining <= 0) {
      expire()
      return
    }

    const timer = window.setTimeout(expire, remaining)
    return () => window.clearTimeout(timer)
  }, [snapshot.temporaryStorage, workspace])

  const runSourceUpdate = async (source: string, generation: number) => {
    const pending = workspace.updateWorkspaceSource(source)
    applySnapshot(workspace.getSnapshot())
    const next = await pending

    if (generation === updateGenerationRef.current) {
      applySnapshot(next)
      setProjectionPending(false)
    }

    return next
  }

  const scheduleSourceUpdate = (source: string) => {
    editorSourceRef.current = source
    setEditorSource(source)
    setProjectionPending(true)
    setEditorSelection(undefined)
    graphSelectionRangeRef.current = undefined
    workspace.cachePendingSource(source)
    applySnapshot(workspace.getSnapshot())
    const generation = ++updateGenerationRef.current

    if (updateTimerRef.current !== undefined) {
      clearTimeout(updateTimerRef.current)
    }

    updateTimerRef.current = setTimeout(() => {
      updateTimerRef.current = undefined
      void runSourceUpdate(source, generation)
    }, 120)
  }

  const flushEditorSource = async () => {
    if (updateTimerRef.current !== undefined) {
      clearTimeout(updateTimerRef.current)
      updateTimerRef.current = undefined
    }

    if (workspace.getSnapshot().document.source === editorSourceRef.current) {
      return workspace.getSnapshot()
    }

    const generation = ++updateGenerationRef.current
    return runSourceUpdate(editorSourceRef.current, generation)
  }

  const handleCursorChange = (nextCursor: EditorCursorDto) => {
    setCursor(nextCursor)
    const current = workspace.getSnapshot()

    if (editorSourceRef.current !== current.document.source) {
      workspace.selectGraphNode('')
      applySnapshot(workspace.getSnapshot())
      return
    }

    const graphSelectionRange = graphSelectionRangeRef.current
    if (
      graphSelectionRange &&
      graphSelectionRange.from <= nextCursor.offset &&
      nextCursor.offset <= graphSelectionRange.to
    ) {
      return
    }
    graphSelectionRangeRef.current = undefined

    workspace.selectSourceOffset(nextCursor.offset)
    applySnapshot(workspace.getSnapshot())
  }

  const handleGraphNodeActivate = (graphNodeId: string) => {
    const effect = workspace.selectGraphNode(graphNodeId)
    applySnapshot(workspace.getSnapshot())

    if (effect.sourceRange) {
      graphSelectionRangeRef.current = effect.sourceRange
      setEditorSelection(Object.freeze({ ...effect.sourceRange }))
    }
  }

  const handleGraphNodeEdit = async (edit: GraphNodeEditDto) => {
    await handleGraphEdit(
      edit.field === 'label'
        ? {
            type: 'set-node-label',
            graphNodeId: edit.graphNodeId,
            label: edit.value,
          }
        : {
            type: 'set-node-type',
            graphNodeId: edit.graphNodeId,
            nodeType: edit.value,
          },
      edit.field === 'label' ? 'Nodeのラベルを更新しました。' : 'NodeのTypeを更新しました。',
    )
  }

  const handleGraphEdit = async (
    command:
      | GraphAuthoringCommandDto
      | Readonly<{
          type: 'set-node-label'
          graphNodeId: string
          label: string
        }>
      | Readonly<{
          type: 'set-node-type'
          graphNodeId: string
          nodeType: string
        }>,
    successMessage?: string,
  ) => {
    setNotice(undefined)
    await flushEditorSource()
    setProjectionPending(true)

    const result = await workspace.applyGraphEdit(command)

    if (result.type === 'rejected') {
      setProjectionPending(false)
      setNotice({ tone: 'error', message: graphEditErrorMessageJa(result.reason.code) })
      return
    }

    editorRef.current?.applyEdits(result.edits)
    editorSourceRef.current = result.snapshot.document.source
    setEditorSource(result.snapshot.document.source)
    setEditorSelection(undefined)
    graphSelectionRangeRef.current = undefined
    applySnapshot(result.snapshot)
    setProjectionPending(false)
    setNotice({
      tone: 'success',
      message: successMessage ?? authoringSuccessMessage(command),
    })
  }

  const handleDeletePreview = async (
    target: GraphDeleteTargetDto,
  ): Promise<GraphDeletePreviewDto> => {
    setNotice(undefined)
    await flushEditorSource()
    const preview = workspace.previewGraphDelete(target)
    if (preview.type === 'rejected') {
      setNotice({ tone: 'error', message: graphEditErrorMessageJa(preview.reason.code) })
    }
    return preview
  }

  const closeDownloadDialog = () => {
    setDownloadOpen(false)
    requestAnimationFrame(() => downloadButtonRef.current?.focus())
  }

  const handleNewGranvas = () => {
    window.open(
      createNewGranvasUrl(window.location.href),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const handleImport = async () => {
    await flushEditorSource()
    const result = await transfer.importProjectFile()

    if (result.type === 'cancelled') {
      return
    }

    if (result.type === 'error') {
      setNotice({ tone: 'error', message: transferErrorMessageJa(result.code) })
      return
    }

    let replacement = await workspace.replaceWorkspaceProject({
      name: result.project.name,
      source: result.project.source,
    })

    if (replacement.type === 'confirmation-required') {
      const confirmed = window.confirm(
        'このプロジェクトを読み込むと、未ダウンロードの変更が失われます。続けますか？',
      )

      if (!confirmed) {
        return
      }

      replacement = await workspace.replaceWorkspaceProject({
        name: result.project.name,
        source: result.project.source,
        confirmed: true,
      })
    }

    editorSourceRef.current = replacement.snapshot.document.source
    setEditorSource(replacement.snapshot.document.source)
    applySnapshot(replacement.snapshot)
    setProjectionPending(false)
    setEditorSelection(undefined)
    graphSelectionRangeRef.current = undefined
    setFitViewKey((current) => current + 1)
    setNotice({
      tone: 'success',
      message: `${result.project.name}.granvasを読み込みました。`,
    })
  }

  const openDownloadDialog = async () => {
    await flushEditorSource()
    setDownloadOpen(true)
  }

  const handleDownload = async ({
    name,
    format,
  }: DownloadDialogSubmitDto) => {
    setDownloadBusy(true)
    setNotice(undefined)

    try {
      if (format === 'granvas') {
        const request = workspace.beginProjectDownload()
        applySnapshot(request.snapshot)
        const result = await transfer.downloadProject({
          name,
          source: request.input.source,
        })

        if (result.type === 'error') {
          applySnapshot(
            workspace.markProjectDownloadFailed(
              request.ticket,
              transferErrorMessageJa(result.code),
            ),
          )
          setNotice({ tone: 'error', message: transferErrorMessageJa(result.code) })
          return
        }

        applySnapshot(workspace.markProjectDownloaded(request.ticket))
        setNotice({ tone: 'success', message: `${result.file.fileName}をダウンロードしました。` })
        closeDownloadDialog()
        return
      }

      const input = workspace.createDownloadInput(format)

      if (input.format === 'granvas') {
        return
      }

      const result = await transfer.downloadGraph({
        name,
        format,
        scene: input.scene,
      })

      if (result.type === 'error') {
        setNotice({ tone: 'error', message: transferErrorMessageJa(result.code) })
        return
      }

      setNotice({
        tone: 'success',
        message: [
          `${result.file.fileName}をダウンロードしました。`,
          ...result.notices,
        ].join(' '),
      })
      closeDownloadDialog()
    } catch {
      setNotice({
        tone: 'error',
        message: 'ダウンロード中に予期しない問題が発生しました。現在のテキストは変更されていません。',
      })
    } finally {
      setDownloadBusy(false)
    }
  }

  const graph = projectionPending ? undefined : snapshot.projection?.graph
  const graphStatus = projectionPending ? 'projecting' : snapshot.status.type
  const canDownloadVisual =
    snapshot.projection?.revision === snapshot.document.revision &&
    (snapshot.projection?.graph.nodes.length ?? 0) > 0

  return (
    <main
      className="granvas-app"
      aria-label={application.productName}
      data-version={application.version}
    >
      <header className="topbar">
        <h1 className="sr-only">Granvas ワークスペース</h1>
        <div className="topbar__identity">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <span className="brand-name">Granvas</span>
            <span className="brand-tagline">思考を書く。構造が見える。</span>
          </div>
        </div>
        <div className="topbar__actions" aria-label="プロジェクト操作">
          <button
            className="button button--quiet"
            type="button"
            aria-label="新しいGranvasを新しいタブで開く"
            onClick={handleNewGranvas}
          >
            <span aria-hidden="true">＋</span>
            新しいGranvas
          </button>
          <button className="button button--quiet" type="button" onClick={() => void handleImport()}>
            <span aria-hidden="true">↥</span>
            プロジェクトを読み込む
          </button>
          <button
            ref={downloadButtonRef}
            className="button button--primary"
            type="button"
            onClick={() => void openDownloadDialog()}
          >
            <span aria-hidden="true">↓</span>
            ダウンロード
          </button>
        </div>
      </header>

      <WorkspaceSplitPane
        textPane={
          <div className="workspace-panel">
            <div className="workspace-panel__header">
              <div>
                <span className="workspace-panel__eyebrow">唯一の正本</span>
                <h2>テキスト</h2>
              </div>
              <span className="workspace-panel__meta">Granvas Notation</span>
            </div>
            <div className="workspace-panel__body">
              <Suspense fallback={<div className="panel-loading">エディタを読み込んでいます…</div>}>
                <GranvasEditor
                  ref={editorRef}
                  source={editorSource}
                  diagnostics={snapshot.diagnostics}
                  selectionRange={editorSelection}
                  onSourceChange={scheduleSourceUpdate}
                  onCursorChange={handleCursorChange}
                />
              </Suspense>
            </div>
          </div>
        }
        graphPane={
          <div className="workspace-panel">
            <div className="workspace-panel__header">
              <div>
                <span className="workspace-panel__eyebrow">現在の投影</span>
                <h2>グラフ</h2>
              </div>
              <span className={`projection-state projection-state--${graphStatus}`}>
                <span aria-hidden="true" />
                {graphStatusLabel(graphStatus)}
              </span>
            </div>
            <div className="workspace-panel__body">
              <Suspense fallback={<div className="panel-loading">グラフを読み込んでいます…</div>}>
                <ReactFlowGraphView
                  graph={graph}
                  selectedNodeId={snapshot.selectedGraphNodeId}
                  fitViewKey={fitViewKey}
                  status={graphStatus}
                  onNodeActivate={handleGraphNodeActivate}
                  onNodeEdit={(edit) => handleGraphNodeEdit(edit)}
                  onAuthoringCommand={(command) => handleGraphEdit(command)}
                  onDeletePreview={(target) => handleDeletePreview(target)}
                  onClearSelection={() => {
                    graphSelectionRangeRef.current = undefined
                    workspace.selectGraphNode('')
                    applySnapshot(workspace.getSnapshot())
                  }}
                />
              </Suspense>
            </div>
          </div>
        }
      />

      <WorkspaceStatusBar snapshot={snapshot} cursor={cursor} />

      {downloadOpen ? (
        <Suspense fallback={null}>
          <DownloadDialog
            open
            defaultFileName={snapshot.document.name}
            canDownloadVisual={canDownloadVisual}
            diagnosticsCount={snapshot.diagnostics.length}
            busy={downloadBusy}
            onClose={closeDownloadDialog}
            onDownload={(input) => void handleDownload(input)}
          />
        </Suspense>
      ) : null}

      {notice ? (
        <div
          className={`app-notice app-notice--${notice.tone}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          <span>{notice.message}</span>
          <button type="button" aria-label="通知を閉じる" onClick={() => setNotice(undefined)}>
            ×
          </button>
        </div>
      ) : null}
    </main>
  )
}

export default App
