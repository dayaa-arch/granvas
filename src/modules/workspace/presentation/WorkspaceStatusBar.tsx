import type { EditorCursorDto } from '@/modules/notation'
import type { WorkspaceSnapshotDto } from '@/modules/workspace/application/WorkspaceApplication'

import './WorkspaceStatusBar.css'

export type WorkspaceStatusBarProps = Readonly<{
  snapshot: WorkspaceSnapshotDto
  cursor: EditorCursorDto
}>

function documentIsDirty(snapshot: WorkspaceSnapshotDto): boolean {
  const { status } = snapshot.document

  return (
    status.type === 'dirty' ||
    ((status.type === 'exporting' || status.type === 'error') && status.dirty)
  )
}

export function WorkspaceStatusBar({
  snapshot,
  cursor,
}: WorkspaceStatusBarProps) {
  const dirty = documentIsDirty(snapshot)
  const graph = snapshot.projection?.graph
  const projectionLabel =
    snapshot.status.type === 'projecting'
      ? 'Projecting'
      : snapshot.status.type === 'error'
        ? 'Projection error'
        : snapshot.status.type === 'ready'
          ? `Revision ${snapshot.status.revision}`
          : 'Idle'

  return (
    <footer className="workspace-status" aria-label="Workspace status">
      <div className="workspace-status__group">
        <span
          className={`workspace-status__save-state${dirty ? ' is-dirty' : ''}`}
        >
          <span className="workspace-status__dot" aria-hidden="true" />
          {dirty ? 'Unsaved' : 'Saved'}
        </span>
        <span>{projectionLabel}</span>
      </div>
      <div className="workspace-status__group" aria-live="polite">
        <span>
          Ln {cursor.line}, Col {cursor.column + 1}
        </span>
        <span>
          {graph?.nodes.length ?? 0} {(graph?.nodes.length ?? 0) === 1 ? 'node' : 'nodes'}
        </span>
        <span>
          {graph?.edges.length ?? 0} {(graph?.edges.length ?? 0) === 1 ? 'edge' : 'edges'}
        </span>
        <span>
          {snapshot.diagnostics.length}{' '}
          {snapshot.diagnostics.length === 1 ? 'diagnostic' : 'diagnostics'}
        </span>
      </div>
    </footer>
  )
}
