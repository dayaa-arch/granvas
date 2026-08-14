import { describe, expect, it } from 'vitest'

import {
  createTemporaryProjectRecovery,
  type TemporaryProjectStoragePort,
} from '@/modules/document'

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

  it('orchestrates certainty, create, and connect commands through Graph IDs', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source: '[Problem] Root\r\n[Idea] 日本語',
    })
    let snapshot = await workspace.openWorkspace()
    const graphIdFor = (label: string): string =>
      snapshot.projection!.graph.nodes.find((node) => node.label === label)!.id

    const certainty = await workspace.applyGraphEdit({
      type: 'set-node-certainty',
      graphNodeId: graphIdFor('Root'),
      certainty: 'confirmed',
    })
    expect(certainty.type).toBe('applied')
    if (certainty.type !== 'applied') throw new Error('Expected an edit.')
    snapshot = certainty.snapshot
    expect(snapshot.document.source).toBe('[!Problem] Root\r\n[Idea] 日本語')

    const connected = await workspace.applyGraphEdit({
      type: 'connect-nodes',
      sourceGraphNodeId: graphIdFor('Root'),
      targetGraphNodeId: graphIdFor('日本語'),
      certainty: 'tentative',
      label: 'supports',
    })
    expect(connected.type).toBe('applied')
    if (connected.type !== 'applied') throw new Error('Expected an edit.')
    snapshot = connected.snapshot
    expect(snapshot.document.source).toContain(
      '[!Problem @root] Root\r\n[Idea @node-1] 日本語\r\n@root ?-> @node-1 : supports',
    )
    expect(snapshot.projection?.graph.edges).toHaveLength(1)

    const created = await workspace.applyGraphEdit({
      type: 'create-node',
      nodeType: 'Cause',
      label: 'Child 😀',
      parentGraphNodeId: graphIdFor('Root'),
    })
    expect(created.type).toBe('applied')
    if (created.type !== 'applied') throw new Error('Expected an edit.')
    expect(created.snapshot.document.source).toContain(
      '[!Problem @root] Root\r\n  -> [cause] Child 😀',
    )
    const selected = created.snapshot.projection?.graph.nodes.find(
      ({ id }) => id === created.snapshot.selectedGraphNodeId,
    )
    expect(selected?.label).toBe('Child 😀')
  })

  it('resolves Group IDs and semantic reparent/detach commands', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source: '[Problem] Root\n[Idea] Other\n{Group}\n  [Node] Member\nTail',
    })
    let snapshot = await workspace.openWorkspace()
    const graphIdFor = (label: string): string =>
      snapshot.projection!.graph.nodes.find((node) => node.label === label)!.id

    const member = await workspace.applyGraphEdit({
      type: 'set-group-membership',
      graphNodeId: graphIdFor('Other'),
      graphGroupId: snapshot.projection!.graph.groups[0]!.id,
    })
    expect(member.type).toBe('applied')
    if (member.type !== 'applied') throw new Error('Expected an edit.')
    snapshot = member.snapshot
    expect(snapshot.document.source).toContain('  @other\nTail')
    expect(snapshot.projection?.graph.groups[0]?.memberNodeIds).toHaveLength(2)

    const reparented = await workspace.applyGraphEdit({
      type: 'reparent-node',
      graphNodeId: graphIdFor('Other'),
      parentGraphNodeId: graphIdFor('Root'),
    })
    expect(reparented.type).toBe('applied')
    if (reparented.type !== 'applied') throw new Error('Expected an edit.')
    snapshot = reparented.snapshot
    expect(snapshot.document.source).toContain(
      '[Problem] Root\n  -> [Idea @other] Other',
    )

    const detached = await workspace.applyGraphEdit({
      type: 'reparent-node',
      graphNodeId: graphIdFor('Other'),
    })
    expect(detached.type).toBe('applied')
    if (detached.type !== 'applied') throw new Error('Expected an edit.')
    expect(detached.snapshot.document.source).toContain(
      '[Problem] Root\n[Idea @other] Other',
    )
  })

  it('previews deletes, promotes Nested children, and applies cascade deletion', async () => {
    const source =
      '[Problem @root] Root\n  -> [Cause @child] Child\n@root -> @other\n[Idea @other] Other\n{Group}\n  @root\nTail'
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source,
    })
    let snapshot = await workspace.openWorkspace()
    const rootId = snapshot.projection!.graph.nodes.find(
      ({ label }) => label === 'Root',
    )!.id
    const nestedEdge = snapshot.projection!.graph.edges.find(
      (edge) => edge.source === rootId,
    )!

    expect(
      workspace.previewGraphDelete({ type: 'relation', graphEdgeId: nestedEdge.id }),
    ).toEqual({
      type: 'available',
      impact: {
        type: 'relation',
        relationKind: 'nested',
        promotedNodeLabel: 'Child',
      },
    })
    const promoted = await workspace.applyGraphEdit({
      type: 'delete-relation',
      graphEdgeId: nestedEdge.id,
    })
    expect(promoted.type).toBe('applied')
    if (promoted.type !== 'applied') throw new Error('Expected an edit.')
    snapshot = promoted.snapshot
    expect(snapshot.document.source).toContain('[Problem @root] Root\n[Cause @child] Child')

    const currentRootId = snapshot.projection!.graph.nodes.find(
      ({ label }) => label === 'Root',
    )!.id
    expect(
      workspace.previewGraphDelete({ type: 'node', graphNodeId: currentRootId }),
    ).toMatchObject({
      type: 'available',
      impact: {
        type: 'node',
        nodeLabels: ['Root'],
        relationCount: 1,
        groupReferenceCount: 1,
      },
    })
    const deleted = await workspace.applyGraphEdit({
      type: 'delete-node',
      graphNodeId: currentRootId,
    })
    expect(deleted.type).toBe('applied')
    if (deleted.type !== 'applied') throw new Error('Expected an edit.')
    expect(deleted.snapshot.document.source).toBe(
      '[Cause @child] Child\n[Idea @other] Other\n{Group}\nTail',
    )
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

  it('keeps a dirty Project unchanged while creating every visual download input', async () => {
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      name: 'visual-lifecycle',
      source: canonicalSource,
    })
    await workspace.openWorkspace()
    await workspace.updateWorkspaceSource(`${canonicalSource}\n[idea] Unsaved`)
    const before = workspace.getSnapshot()

    for (const format of ['svg', 'png', 'pdf'] as const) {
      expect(workspace.createDownloadInput(format)).toMatchObject({ format })
      expect(workspace.getSnapshot()).toEqual(before)
    }

    expect(workspace.getSnapshot().document.status).toMatchObject({
      type: 'dirty',
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

  it('keeps recovered dirty state and caches pending Text before projection', () => {
    let value: string | null = null
    const storage: TemporaryProjectStoragePort = {
      read: () => value,
      write: (next) => {
        value = next
      },
      remove: () => {
        value = null
      },
    }
    const recovery = createTemporaryProjectRecovery({
      storage,
      now: () => 10_000,
    })
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      name: 'recovered',
      source: '[idea] Before',
      initialDirty: true,
      temporaryProjectRecovery: recovery,
      initialTemporaryStorage: { type: 'ready' },
    })

    expect(workspace.getSnapshot().document).toMatchObject({
      name: 'recovered',
      source: '[idea] Before',
      revision: 1,
      cleanBaselineRevision: 0,
      status: { type: 'dirty' },
    })

    expect(workspace.cachePendingSource('[idea] Last keystroke')).toEqual({
      type: 'stored',
      savedAt: 10_000,
      expiresAt: 10_000 + 24 * 60 * 60 * 1000,
    })
    expect(workspace.getSnapshot().document.source).toBe('[idea] Before')
    expect(JSON.parse(value!)).toMatchObject({
      name: 'recovered',
      source: '[idea] Last keystroke',
      dirty: true,
    })
  })

  it('synchronizes replacement and download baseline without rolling back on storage failure', async () => {
    let writes = 0
    const recovery = createTemporaryProjectRecovery({
      storage: {
        read: () => null,
        write: () => {
          writes += 1
          if (writes === 3) throw new Error('quota')
        },
        remove: () => undefined,
      },
      now: () => 20_000,
    })
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source: '[idea] Initial',
      temporaryProjectRecovery: recovery,
    })

    await workspace.updateWorkspaceSource('[idea] Dirty')
    const replaced = await workspace.replaceWorkspaceProject({
      name: 'imported',
      source: '[idea] Imported',
      confirmed: true,
    })
    expect(replaced.type).toBe('replaced')
    expect(replaced.snapshot.document.status).toEqual({ type: 'clean' })

    await workspace.updateWorkspaceSource('[idea] Still editable')
    expect(workspace.getSnapshot()).toMatchObject({
      document: {
        source: '[idea] Still editable',
        status: { type: 'dirty' },
      },
      temporaryStorage: { type: 'unavailable' },
    })

    const started = workspace.beginProjectDownload()
    const downloaded = workspace.markProjectDownloaded(started.ticket)
    expect(downloaded.document.status).toEqual({ type: 'clean' })
    expect(downloaded.temporaryStorage.type).toBe('stored')
  })

  it('expires only the temporary record represented by the current status', () => {
    let removals = 0
    let currentTime = 30_000
    const recovery = createTemporaryProjectRecovery({
      storage: {
        read: () => null,
        write: () => undefined,
        remove: () => {
          removals += 1
        },
      },
      now: () => currentTime,
    })
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      temporaryProjectRecovery: recovery,
    })

    const first = workspace.cachePendingSource('first')
    if (first.type !== 'stored') throw new Error('Expected stored state.')
    currentTime += 1
    const second = workspace.cachePendingSource('second')
    if (second.type !== 'stored') throw new Error('Expected stored state.')

    workspace.expireTemporaryProject(first.expiresAt)
    expect(removals).toBe(0)
    workspace.expireTemporaryProject(second.expiresAt)
    expect(removals).toBe(1)
    expect(workspace.getSnapshot().temporaryStorage).toEqual({ type: 'ready' })
  })

  it('does not overwrite recovery data for rejected edits or failed downloads', async () => {
    const values: string[] = []
    const recovery = createTemporaryProjectRecovery({
      storage: {
        read: () => null,
        write: (value) => values.push(value),
        remove: () => undefined,
      },
      now: () => 40_000 + values.length,
    })
    const workspace = createWorkspaceApplication({
      graphLayout: immediateLayoutPort(),
      source: '[idea] Stable',
      temporaryProjectRecovery: recovery,
    })
    await workspace.openWorkspace()

    const rejected = await workspace.applyGraphEdit({
      type: 'set-node-label',
      graphNodeId: 'missing',
      label: 'No change',
    })
    expect(rejected.type).toBe('rejected')
    expect(values).toHaveLength(0)

    await workspace.updateWorkspaceSource('[idea] Dirty')
    expect(values).toHaveLength(1)
    const started = workspace.beginProjectDownload()
    workspace.markProjectDownloadFailed(started.ticket, 'download blocked')
    expect(values).toHaveLength(1)
    expect(JSON.parse(values[0]!)).toMatchObject({
      source: '[idea] Dirty',
      dirty: true,
    })
  })
})
