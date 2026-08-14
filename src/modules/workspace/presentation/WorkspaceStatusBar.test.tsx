import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WorkspaceStatusBar, type WorkspaceSnapshotDto } from '@/modules/workspace'

function snapshot(
  temporaryStorage: WorkspaceSnapshotDto['temporaryStorage'],
): WorkspaceSnapshotDto {
  return {
    document: {
      name: 'project',
      source: '[idea] Text',
      revision: 1,
      cleanBaselineRevision: 0,
      status: { type: 'dirty' },
    },
    diagnostics: [],
    status: { type: 'idle' },
    temporaryStorage,
  }
}

describe('WorkspaceStatusBar temporary recovery', () => {
  it.each([
    [{ type: 'ready' } as const, '24時間一時保存'],
    [
      { type: 'stored', savedAt: 1, expiresAt: 2 } as const,
      '一時保存済み（24時間）',
    ],
    [{ type: 'unavailable' } as const, '一時保存を利用できません'],
  ])('shows %s independently from the .granvas dirty state', (status, label) => {
    render(
      <WorkspaceStatusBar
        snapshot={snapshot(status)}
        cursor={{ offset: 0, line: 1, column: 0 }}
      />,
    )

    const bar = screen.getByLabelText('ワークスペースの状態')
    expect(bar).toHaveTextContent('未ダウンロード')
    expect(bar).toHaveTextContent(label)
  })

  it('omits temporary storage copy when the port is disabled', () => {
    render(
      <WorkspaceStatusBar
        snapshot={snapshot({ type: 'disabled' })}
        cursor={{ offset: 0, line: 1, column: 0 }}
      />,
    )

    expect(screen.getByLabelText('ワークスペースの状態')).not.toHaveTextContent(
      '一時保存',
    )
  })
})
