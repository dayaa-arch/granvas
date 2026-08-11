import { describe, expect, it } from 'vitest'

import {
  type CancellationSignal,
  type GraphLayoutInputDto,
  type GraphLayoutPort,
  type PositionedGraphDto,
} from '@/modules/graph'
import {
  WorkspaceApplicationError,
  createWorkspaceApplication,
} from '@/modules/workspace'

const canonicalSource = `@layout flow TB

# New product idea

Write thoughts. See structure.

[problem @scattered] Customer information is scattered
  -> [cause] Excel files are fragmented
  -> [cause] Team knowledge is siloed

[idea @unify] AI unifies notes and structure
[todo @interview] User interviews

@unify -> @scattered : solves

{Discovery}
  @scattered
  @interview`

function positionedFrom(input: GraphLayoutInputDto): PositionedGraphDto {
  return Object.freeze({
    revision: input.revision,
    nodes: Object.freeze(
      input.nodes.map((node, index) =>
        Object.freeze({
          id: node.id,
          label: node.label,
          type: node.type,
          certainty: node.certainty,
          x: index * 300,
          y: index * 150,
          width: node.width,
          height: node.height,
        }),
      ),
    ),
    edges: input.edges,
    groups: Object.freeze(
      input.groups.map((group) =>
        Object.freeze({
          ...group,
          x: -24,
          y: -24,
          width: Math.max(input.nodes.length * 300, 0),
          height: Math.max(input.nodes.length * 150, 0),
        }),
      ),
    ),
  })
}

function immediateLayoutPort(
  transform: (input: GraphLayoutInputDto) => PositionedGraphDto = positionedFrom,
): GraphLayoutPort {
  return {
    layout: async (input) => transform(input),
  }
}

type PendingLayout = Readonly<{
  input: GraphLayoutInputDto
  signal?: CancellationSignal
  resolve(output: PositionedGraphDto): void
}>

function createControlledLayoutPort(): Readonly<{
  port: GraphLayoutPort
  pending: PendingLayout[]
  cancelledRevisions: number[]
}> {
  const pending: PendingLayout[] = []
  const cancelledRevisions: number[] = []
  const port: GraphLayoutPort = {
    layout(input, signal) {
      signal?.onCancel(() => cancelledRevisions.push(input.revision))

      return new Promise((resolve) => {
        pending.push(Object.freeze({ input, signal, resolve }))
      })
    },
  }

  return { port, pending, cancelledRevisions }
}

describe('Workspace Application', () => {
  it('projects the canonical source with one consistent revision', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      name: 'canonical',
      source: canonicalSource,
    })

    const snapshot = await workspace.openWorkspace()

    expect(snapshot.status).toEqual({ type: 'ready', revision: 0 })
    expect(snapshot.projection?.graph).toMatchObject({
      revision: 0,
      nodes: { length: 5 },
      edges: { length: 3 },
      groups: { length: 1 },
    })
    expect(snapshot.diagnostics).toHaveLength(0)
    expect(snapshot.projection?.sourceMap.revision).toBe(snapshot.document.revision)
    expect(snapshot.projection?.diagnostics).toBe(snapshot.diagnostics)
    expect(Object.keys(snapshot.projection?.sourceMap.nodeRanges ?? {})).toHaveLength(5)
    expect(snapshot.projection?.sourceMap.nodeKeys).toEqual(
      expect.objectContaining({
        'graph-node:node:69': 'node:69',
      }),
    )
  })

  it('keeps valid occurrences in a diagnostic partial projection', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source: '[node @valid] Valid\n  -> [node] Child\n@missing -> @valid',
    })

    const snapshot = await workspace.openWorkspace()

    expect(snapshot.status.type).toBe('ready')
    expect(snapshot.projection?.graph.nodes).toHaveLength(2)
    expect(snapshot.projection?.graph.edges).toHaveLength(1)
    expect(snapshot.diagnostics).toEqual([
      expect.objectContaining({
        code: 'GNV005_UNRESOLVED_REFERENCE',
        documentRevision: 0,
      }),
    ])
  })

  it('cancels the old job and never commits its stale completion', async () => {
    const controlled = createControlledLayoutPort()
    const workspace = createWorkspaceApplication({ graphLayout: controlled.port })

    const oldResult = workspace.updateWorkspaceSource('[node @old] Old')
    const newResult = workspace.updateWorkspaceSource('[node @new] New')

    expect(controlled.pending).toHaveLength(2)
    expect(controlled.cancelledRevisions).toEqual([1])

    const currentLayout = controlled.pending[1]!
    currentLayout.resolve(positionedFrom(currentLayout.input))
    const currentSnapshot = await newResult

    expect(currentSnapshot.status).toEqual({ type: 'ready', revision: 2 })
    expect(currentSnapshot.document.source).toContain('@new')
    expect(currentSnapshot.projection?.graph.nodes[0]?.label).toBe('New')

    const staleLayout = controlled.pending[0]!
    staleLayout.resolve(positionedFrom(staleLayout.input))
    await oldResult

    const finalSnapshot = workspace.getSnapshot()
    expect(finalSnapshot.document.revision).toBe(2)
    expect(finalSnapshot.projection?.revision).toBe(2)
    expect(finalSnapshot.projection?.graph.nodes[0]?.label).toBe('New')
  })

  it('maps Graph selection and UTF-16 CRLF source offsets in both directions', async () => {
    const source = '😀 intro\r\n[idea @emoji] 🚀 Plan\r\n  -> [todo] Done'
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source,
    })
    const snapshot = await workspace.openWorkspace()
    const [graphNodeId, range] = Object.entries(
      snapshot.projection?.sourceMap.nodeRanges ?? {},
    )[0]!

    expect(range.from).toBe(10)
    expect(workspace.selectGraphNode(graphNodeId)).toEqual({
      graphNodeId,
      sourceRange: range,
    })
    expect(workspace.selectSourceOffset(range.from + 1)).toEqual({
      graphNodeId,
      sourceRange: range,
    })
    expect(workspace.selectSourceOffset(range.to)).toEqual({})
    expect(workspace.getSnapshot()).not.toHaveProperty('selectedGraphNodeId')
    expect(() => workspace.selectSourceOffset(-1)).toThrowError(
      expect.objectContaining({ code: 'invalid-source-offset' }),
    )
  })

  it('applies Node label and Type edits through occurrence keys and reselects the Node', async () => {
    const source = 'Intro prose\r\n[?Idea @editable]  Before  \r\nClosing prose'
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source,
    })
    const opened = await workspace.openWorkspace()
    const graphNodeId = opened.projection?.graph.nodes[0]?.id

    expect(graphNodeId).toBeDefined()
    expect(opened.projection?.sourceMap.nodeKeys[graphNodeId!]).toBe('node:13')

    const labelResult = await workspace.applyGraphEdit({
      type: 'set-node-label',
      graphNodeId: graphNodeId!,
      label: '  After 😀  ',
    })

    expect(labelResult.type).toBe('applied')
    if (labelResult.type !== 'applied') {
      throw new Error('Expected an applied Graph edit.')
    }
    expect(labelResult.edits).toHaveLength(1)
    expect(labelResult.snapshot.document).toMatchObject({
      revision: 1,
      source: 'Intro prose\r\n[?Idea @editable]  After 😀  \r\nClosing prose',
      status: { type: 'dirty' },
    })
    expect(labelResult.snapshot.projection?.graph.nodes[0]).toMatchObject({
      id: graphNodeId,
      label: 'After 😀',
      type: 'idea',
      certainty: 'tentative',
    })
    expect(labelResult.snapshot.selectedGraphNodeId).toBe(graphNodeId)

    const typeResult = await workspace.applyGraphEdit({
      type: 'set-node-type',
      graphNodeId: graphNodeId!,
      nodeType: 'Problem_Main',
    })

    expect(typeResult.type).toBe('applied')
    if (typeResult.type !== 'applied') {
      throw new Error('Expected an applied Graph edit.')
    }
    expect(typeResult.snapshot.document.source).toBe(
      'Intro prose\r\n[?problem_main @editable]  After 😀  \r\nClosing prose',
    )
    expect(typeResult.snapshot.projection?.graph.nodes[0]).toMatchObject({
      type: 'problem_main',
      label: 'After 😀',
    })
  })

  it('keeps Workspace state unchanged when a Graph edit is rejected', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source: '[idea] Before',
    })
    const opened = await workspace.openWorkspace()
    const graphNodeId = opened.projection!.graph.nodes[0]!.id
    const before = workspace.getSnapshot()

    const invalid = await workspace.applyGraphEdit({
      type: 'set-node-label',
      graphNodeId,
      label: '   ',
    })

    expect(invalid).toMatchObject({
      type: 'rejected',
      reason: { code: 'invalid-value' },
    })
    expect(workspace.getSnapshot()).toEqual(before)

    const missing = await workspace.applyGraphEdit({
      type: 'set-node-type',
      graphNodeId: 'graph-node:missing',
      nodeType: 'problem',
    })
    expect(missing).toMatchObject({
      type: 'rejected',
      reason: { code: 'unknown-target' },
    })
    expect(workspace.getSnapshot()).toEqual(before)
  })

  it('requires confirmation before replacing a dirty project', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      name: 'before',
      source: '[node] Initial',
    })
    await workspace.updateWorkspaceSource('[node] Dirty')

    const blocked = await workspace.replaceWorkspaceProject({
      name: 'after',
      source: '[node] Replacement',
    })

    expect(blocked.type).toBe('confirmation-required')
    expect(blocked.snapshot.document).toMatchObject({
      name: 'before',
      source: '[node] Dirty',
      revision: 1,
      status: { type: 'dirty' },
    })

    const replaced = await workspace.replaceWorkspaceProject({
      name: 'after',
      source: '[node] Replacement',
      confirmed: true,
    })

    expect(replaced.type).toBe('replaced')
    expect(replaced.snapshot.document).toMatchObject({
      name: 'after',
      source: '[node] Replacement',
      revision: 2,
      cleanBaselineRevision: 2,
      status: { type: 'clean' },
    })
    expect(replaced.snapshot.projection?.revision).toBe(2)
  })

  it('assembles project and visual download inputs from current state', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      name: 'download',
      source: canonicalSource,
    })

    expect(workspace.createDownloadInput('granvas')).toEqual({
      format: 'granvas',
      revision: 0,
      name: 'download',
      source: canonicalSource,
    })
    expect(() => workspace.createDownloadInput('svg')).toThrowError(
      expect.objectContaining({ code: 'visual-projection-unavailable' }),
    )

    await workspace.openWorkspace()
    const visual = workspace.createDownloadInput('pdf')

    expect(visual).toMatchObject({
      format: 'pdf',
      revision: 0,
      name: 'download',
      diagnosticsCount: 0,
      scene: { revision: 0, theme: 'light' },
    })
  })

  it('tracks project download success and failure without losing later edits', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      name: 'lifecycle',
      source: '[node] Initial',
    })
    await workspace.updateWorkspaceSource('[node] Downloaded revision')

    const started = workspace.beginProjectDownload()
    expect(started.input).toMatchObject({
      format: 'granvas',
      revision: 1,
      source: '[node] Downloaded revision',
    })
    expect(started.snapshot.document.status).toMatchObject({
      type: 'exporting',
      revision: 1,
    })

    await workspace.updateWorkspaceSource('[node] Edited during download')
    const completed = workspace.markProjectDownloaded(started.ticket)
    expect(completed.document).toMatchObject({
      revision: 2,
      cleanBaselineRevision: 1,
      status: { type: 'dirty' },
    })

    const failedStart = workspace.beginProjectDownload()
    const failed = workspace.markProjectDownloadFailed(
      failedStart.ticket,
      'browser rejected',
    )
    expect(failed.document.status).toEqual({
      type: 'error',
      message: 'browser rejected',
      dirty: true,
    })
    expect(failed.document.source).toBe('[node] Edited during download')
  })

  it('preserves current source and diagnostics when layout fails', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: {
        layout: async () => {
          throw new Error('layout unavailable')
        },
      },
      source: '[node] Valid\n@missing -> @also-missing',
    })

    const snapshot = await workspace.openWorkspace()

    expect(snapshot.document.source).toContain('[node] Valid')
    expect(snapshot.document.revision).toBe(0)
    expect(snapshot.diagnostics.length).toBeGreaterThan(0)
    expect(snapshot).not.toHaveProperty('projection')
    expect(snapshot.status).toEqual({
      type: 'error',
      revision: 0,
      message: 'layout unavailable',
    })
  })

  it('rejects mismatched layout revisions without exposing a stale projection', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort((input) => ({
        ...positionedFrom(input),
        revision: input.revision + 1,
      })),
      source: '[node] Revision',
    })

    const snapshot = await workspace.openWorkspace()

    expect(snapshot.status).toMatchObject({ type: 'error', revision: 0 })
    expect(snapshot.status).toHaveProperty(
      'message',
      'Layout output revision does not match its input revision.',
    )
    expect(snapshot).not.toHaveProperty('projection')
  })

  it('exposes typed Workspace errors', () => {
    const error = new WorkspaceApplicationError(
      'projection-mapping-failed',
      'mapping failed',
    )

    expect(error).toMatchObject({
      name: 'WorkspaceApplicationError',
      code: 'projection-mapping-failed',
      message: 'mapping failed',
    })
  })
})
