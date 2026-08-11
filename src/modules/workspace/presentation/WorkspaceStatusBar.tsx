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
      ? 'グラフを更新中'
      : snapshot.status.type === 'error'
        ? 'グラフ更新エラー'
        : snapshot.status.type === 'ready'
          ? `リビジョン ${snapshot.status.revision} 更新済み`
          : '待機中'

  return (
    <footer className="workspace-status" aria-label="ワークスペースの状態">
      <div className="workspace-status__group">
        <span
          className={`workspace-status__save-state${dirty ? ' is-dirty' : ''}`}
        >
          <span className="workspace-status__dot" aria-hidden="true" />
          {dirty ? '未ダウンロード' : 'ダウンロード済み'}
        </span>
        <span>{projectionLabel}</span>
      </div>
      <div className="workspace-status__group" aria-live="polite">
        <span>
          {cursor.line}行 {cursor.column + 1}列
        </span>
        <span>
          Node {graph?.nodes.length ?? 0}件
        </span>
        <span>
          Relation {graph?.edges.length ?? 0}件
        </span>
        <span>
          診断 {snapshot.diagnostics.length}件
        </span>
      </div>
    </footer>
  )
}
