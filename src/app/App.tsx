import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import type { GranvasApplication } from '@/app/bootstrap/createApplication'
import type {
  EditorCursorDto,
  GranvasEditorHandle,
  SourceRangeDto,
} from '@/modules/notation'
import type { GraphNodeEditDto } from '@/modules/graph'
import {
  type DownloadDialogSubmitDto,
} from '@/modules/transfer'
import {
  WorkspaceSplitPane,
  WorkspaceStatusBar,
  type WorkspaceSnapshotDto,
} from '@/modules/workspace'

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
  const [notice, setNotice] = useState<AppNotice>()
  const editorSourceRef = useRef(editorSource)
  const editorRef = useRef<GranvasEditorHandle>(null)
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

    workspace.selectSourceOffset(nextCursor.offset)
    applySnapshot(workspace.getSnapshot())
  }

  const handleGraphNodeActivate = (graphNodeId: string) => {
    const effect = workspace.selectGraphNode(graphNodeId)
    applySnapshot(workspace.getSnapshot())

    if (effect.sourceRange) {
      setEditorSelection(Object.freeze({ ...effect.sourceRange }))
    }
  }

  const handleGraphNodeEdit = async (edit: GraphNodeEditDto) => {
    setNotice(undefined)
    await flushEditorSource()
    setProjectionPending(true)

    const result = await workspace.applyGraphEdit(
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
    )

    if (result.type === 'rejected') {
      setProjectionPending(false)
      setNotice({ tone: 'error', message: result.reason.message })
      return
    }

    editorRef.current?.applyEdits(result.edits)
    editorSourceRef.current = result.snapshot.document.source
    setEditorSource(result.snapshot.document.source)
    setEditorSelection(undefined)
    applySnapshot(result.snapshot)
    setProjectionPending(false)
    setNotice({
      tone: 'success',
      message: edit.field === 'label' ? 'Node label updated.' : 'Node type updated.',
    })
  }

  const closeDownloadDialog = () => {
    setDownloadOpen(false)
    requestAnimationFrame(() => downloadButtonRef.current?.focus())
  }

  const handleImport = async () => {
    await flushEditorSource()
    const result = await transfer.importProjectFile()

    if (result.type === 'cancelled') {
      return
    }

    if (result.type === 'error') {
      setNotice({ tone: 'error', message: result.message })
      return
    }

    let replacement = await workspace.replaceWorkspaceProject({
      name: result.project.name,
      source: result.project.source,
    })

    if (replacement.type === 'confirmation-required') {
      const confirmed = window.confirm(
        'Importing this project will replace your unsaved changes. Continue?',
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
    setFitViewKey((current) => current + 1)
    setNotice({
      tone: 'success',
      message: `Imported ${result.project.name}.granvas`,
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
            workspace.markProjectDownloadFailed(request.ticket, result.message),
          )
          setNotice({ tone: 'error', message: result.message })
          return
        }

        applySnapshot(workspace.markProjectDownloaded(request.ticket))
        setNotice({ tone: 'success', message: `Downloaded ${result.file.fileName}` })
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
        setNotice({ tone: 'error', message: result.message })
        return
      }

      setNotice({
        tone: 'success',
        message: `Downloaded ${result.file.fileName}`,
      })
      closeDownloadDialog()
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Download failed.',
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
        <h1 className="sr-only">Granvas workspace</h1>
        <div className="topbar__identity">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <span className="brand-name">Granvas</span>
            <span className="brand-tagline">Write thoughts. See structure.</span>
          </div>
        </div>
        <div className="topbar__actions" aria-label="Project actions">
          <button className="button button--quiet" type="button" onClick={() => void handleImport()}>
            <span aria-hidden="true">↥</span>
            Import Project
          </button>
          <button
            ref={downloadButtonRef}
            className="button button--primary"
            type="button"
            onClick={() => void openDownloadDialog()}
          >
            <span aria-hidden="true">↓</span>
            Download
          </button>
        </div>
      </header>

      <WorkspaceSplitPane
        textPane={
          <div className="workspace-panel">
            <div className="workspace-panel__header">
              <div>
                <span className="workspace-panel__eyebrow">Source of truth</span>
                <h2>Text</h2>
              </div>
              <span className="workspace-panel__meta">Granvas Notation</span>
            </div>
            <div className="workspace-panel__body">
              <Suspense fallback={<div className="panel-loading">Loading editor…</div>}>
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
                <span className="workspace-panel__eyebrow">Live projection</span>
                <h2>Graph</h2>
              </div>
              <span className={`projection-state projection-state--${graphStatus}`}>
                <span aria-hidden="true" />
                {graphStatus === 'projecting' ? 'Updating' : graphStatus}
              </span>
            </div>
            <div className="workspace-panel__body">
              <Suspense fallback={<div className="panel-loading">Loading graph…</div>}>
                <ReactFlowGraphView
                  graph={graph}
                  selectedNodeId={snapshot.selectedGraphNodeId}
                  fitViewKey={fitViewKey}
                  status={graphStatus}
                  onNodeActivate={handleGraphNodeActivate}
                  onNodeEdit={(edit) => handleGraphNodeEdit(edit)}
                  onClearSelection={() => {
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
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(undefined)}>
            ×
          </button>
        </div>
      ) : null}
    </main>
  )
}

export default App
