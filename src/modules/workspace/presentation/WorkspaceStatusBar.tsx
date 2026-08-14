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

function temporaryStorageLabel(snapshot: WorkspaceSnapshotDto): string | undefined {
  switch (snapshot.temporaryStorage.type) {
    case 'disabled':
      return undefined
    case 'ready':
      return '24時間一時保存'
    case 'stored':
      return '一時保存済み（24時間）'
    case 'unavailable':
      return '一時保存を利用できません'
  }
}

export function WorkspaceStatusBar({
  snapshot,
  cursor,
}: WorkspaceStatusBarProps) {
  const dirty = documentIsDirty(snapshot)
  const graph = snapshot.projection?.graph
  const storageLabel = temporaryStorageLabel(snapshot)
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
        {storageLabel ? (
          <span
            className={
              snapshot.temporaryStorage.type === 'unavailable'
                ? 'workspace-status__temporary-storage is-unavailable'
                : 'workspace-status__temporary-storage'
            }
          >
            {storageLabel}
          </span>
        ) : null}
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
