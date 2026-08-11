import { describe, expect, it } from 'vitest'

import { parseGranvasNotation } from './GranvasNotationParser'
import {
  applySourceEdits,
  mapSourceOffsetThroughEdits,
  planSetNodeLabel,
  planSetNodeCertainty,
  planSetNodeType,
  planCreateNode,
  planConnectNodes,
  planDeleteNode,
  planDeleteRelation,
  planReparentNode,
  planSetGroupMembership,
  previewNotationDelete,
  type SourceEdit,
} from './NotationEditor'

const source =
  'Intro 😀 prose\r\n[?Problem @root]  Old label  \r\n  !-> [Cause] Child\r\nClosing prose'

describe('NotationEditor', () => {
  it('replaces only the label span and round-trips through the Parser', () => {
    const parsed = parseGranvasNotation(source, 4)
    const root = parsed.nodes[0]!
    const plan = planSetNodeLabel(source, parsed, root.key, '  New 😀 label  ')

    expect(plan).toMatchObject({
      type: 'applicable',
      edits: [
        {
          from: root.spans.label.from,
          to: root.spans.label.to,
          insert: 'New 😀 label',
        },
      ],
      caretAnchor: root.sourceRange.from,
    })
    if (plan.type !== 'applicable') {
      throw new Error('Expected an applicable plan.')
    }

    const next = applySourceEdits(source, plan.edits)
    const reparsed = parseGranvasNotation(next, 5)

    expect(next).toBe(
      'Intro 😀 prose\r\n[?Problem @root]  New 😀 label  \r\n  !-> [Cause] Child\r\nClosing prose',
    )
    expect(reparsed.nodes[0]).toMatchObject({
      type: 'problem',
      label: 'New 😀 label',
      certainty: 'tentative',
      explicitId: 'root',
    })
    expect(reparsed.nodes[1]).toMatchObject({ type: 'cause', label: 'Child' })
  })

  it('normalizes a valid type while preserving marker, ID, label, prose, and CRLF', () => {
    const parsed = parseGranvasNotation(source, 4)
    const root = parsed.nodes[0]!
    const plan = planSetNodeType(source, parsed, root.key, '  IDEA_Main  ')

    expect(plan).toMatchObject({
      type: 'applicable',
      edits: [{ insert: 'idea_main' }],
    })
    if (plan.type !== 'applicable') {
      throw new Error('Expected an applicable plan.')
    }

    const next = applySourceEdits(source, plan.edits)
    expect(next).toBe(
      'Intro 😀 prose\r\n[?idea_main @root]  Old label  \r\n  !-> [Cause] Child\r\nClosing prose',
    )
    expect(parseGranvasNotation(next, 5).nodes[0]).toMatchObject({
      type: 'idea_main',
      label: 'Old label',
      certainty: 'tentative',
      explicitId: 'root',
    })
  })

  it('rejects unknown targets and invalid values without returning edits', () => {
    const parsed = parseGranvasNotation(source, 4)
    const root = parsed.nodes[0]!

    expect(planSetNodeLabel(source, parsed, 'node:missing', 'Next')).toEqual({
      type: 'rejected',
      reason: {
        code: 'unknown-target',
        message: 'The Node is not present in the current source.',
      },
    })
    expect(planSetNodeLabel(source, parsed, root.key, ' \n ')).toMatchObject({
      type: 'rejected',
      reason: { code: 'invalid-value', range: root.spans.label },
    })
    expect(planSetNodeType(source, parsed, root.key, '1-invalid')).toMatchObject({
      type: 'rejected',
      reason: { code: 'invalid-value', range: root.spans.type },
    })
  })

  it('returns an empty applicable plan for no-op values', () => {
    const parsed = parseGranvasNotation(source, 4)
    const root = parsed.nodes[0]!

    expect(planSetNodeLabel(source, parsed, root.key, 'Old label')).toMatchObject({
      type: 'applicable',
      edits: [],
    })
    expect(planSetNodeType(source, parsed, root.key, 'PROBLEM')).toMatchObject({
      type: 'applicable',
      edits: [],
    })
  })

  it('applies sorted edits and maps pre-edit offsets deterministically', () => {
    const edits: readonly SourceEdit[] = [
      { from: 1, to: 2, insert: 'BC' },
      { from: 4, to: 5, insert: '' },
    ]

    expect(applySourceEdits('abcdef', edits)).toBe('aBCcdf')
    expect(mapSourceOffsetThroughEdits(0, edits)).toBe(0)
    expect(mapSourceOffsetThroughEdits(3, edits)).toBe(4)
    expect(mapSourceOffsetThroughEdits(6, edits)).toBe(6)
    expect(mapSourceOffsetThroughEdits(1, edits, 'before')).toBe(1)
    expect(() =>
      applySourceEdits('abcdef', [
        { from: 3, to: 5, insert: '' },
        { from: 4, to: 6, insert: '' },
      ]),
    ).toThrow(RangeError)
  })

  it('sets and removes certainty markers without touching the declaration body', () => {
    const parsed = parseGranvasNotation('[Problem] Root\n[?Idea] Maybe', 1)
    const confirmed = planSetNodeCertainty(
      '[Problem] Root\n[?Idea] Maybe',
      parsed,
      parsed.nodes[0]!.key,
      'confirmed',
    )
    expect(confirmed.type).toBe('applicable')
    if (confirmed.type !== 'applicable') throw new Error('Expected a plan.')
    expect(applySourceEdits('[Problem] Root\n[?Idea] Maybe', confirmed.edits)).toBe(
      '[!Problem] Root\n[?Idea] Maybe',
    )

    const neutral = planSetNodeCertainty(
      '[Problem] Root\n[?Idea] Maybe',
      parsed,
      parsed.nodes[1]!.key,
      'neutral',
    )
    expect(neutral.type).toBe('applicable')
    if (neutral.type !== 'applicable') throw new Error('Expected a plan.')
    expect(applySourceEdits('[Problem] Root\n[?Idea] Maybe', neutral.edits)).toBe(
      '[Problem] Root\n[Idea] Maybe',
    )
  })

  it('creates top-level, child, and Group Nodes while preserving CRLF', () => {
    const base = '[Problem] Root\r\n{Ideas}\r\n  [Idea] Existing\r\nTail'
    const parsed = parseGranvasNotation(base, 1)
    const top = planCreateNode(base, parsed, { nodeType: 'Node', label: '新規 😀' })
    expect(top).toMatchObject({ type: 'applicable', caretAffinity: 'before' })
    if (top.type !== 'applicable') throw new Error('Expected a plan.')
    expect(applySourceEdits(base, top.edits)).toBe(`${base}\r\n[node] 新規 😀`)

    const child = planCreateNode(base, parsed, {
      nodeType: 'Cause',
      label: 'Child',
      parentNodeKey: parsed.nodes[0]!.key,
    })
    if (child.type !== 'applicable') throw new Error('Expected a plan.')
    expect(applySourceEdits(base, child.edits)).toContain(
      '[Problem] Root\r\n  -> [cause] Child\r\n{Ideas}',
    )

    const group = planCreateNode(base, parsed, {
      nodeType: 'Idea',
      label: 'Grouped',
      groupKey: parsed.groups[0]!.key,
    })
    if (group.type !== 'applicable') throw new Error('Expected a plan.')
    expect(applySourceEdits(base, group.edits)).toContain(
      '  [Idea] Existing\r\n  [idea] Grouped\r\nTail',
    )
  })

  it('allocates unique explicit IDs and creates Cross Relations in one plan', () => {
    const base = '[Node @node-1] Existing\r\n[Idea] 日本語\r\n[Idea] 123 Beta'
    const parsed = parseGranvasNotation(base, 1)
    const plan = planConnectNodes(base, parsed, {
      sourceNodeKey: parsed.nodes[1]!.key,
      targetNodeKey: parsed.nodes[2]!.key,
      label: 'supports 😀',
      certainty: 'tentative',
    })
    if (plan.type !== 'applicable') throw new Error('Expected a plan.')
    const next = applySourceEdits(base, plan.edits)
    expect(next).toBe(
      '[Node @node-1] Existing\r\n[Idea @node-1-2] 日本語\r\n[Idea @n-123-beta] 123 Beta\r\n@node-1-2 ?-> @n-123-beta : supports 😀',
    )
    expect(parseGranvasNotation(next, 2).relations.at(-1)).toMatchObject({
      kind: 'cross',
      certainty: 'tentative',
      label: 'supports 😀',
    })
  })

  it('inserts one ID for a self-loop and rejects duplicated endpoint IDs', () => {
    const source = '[Idea] Loop'
    const parsed = parseGranvasNotation(source, 1)
    const loop = planConnectNodes(source, parsed, {
      sourceNodeKey: parsed.nodes[0]!.key,
      targetNodeKey: parsed.nodes[0]!.key,
    })
    if (loop.type !== 'applicable') throw new Error('Expected a plan.')
    expect(applySourceEdits(source, loop.edits)).toBe(
      '[Idea @loop] Loop\n@loop -> @loop',
    )

    const duplicated = '[Idea @same] One\n[Idea @same] Two'
    const duplicatedParse = parseGranvasNotation(duplicated, 1)
    expect(
      planConnectNodes(duplicated, duplicatedParse, {
        sourceNodeKey: duplicatedParse.nodes[0]!.key,
        targetNodeKey: duplicatedParse.nodes[1]!.key,
      }),
    ).toMatchObject({ type: 'rejected', reason: { code: 'unresolved-reference' } })
  })

  it('allows parallel Cross Relations without changing existing declarations', () => {
    const source = '[Idea @one] One\n[Idea @two] Two\n@one -> @two : first'
    const parsed = parseGranvasNotation(source, 1)
    const plan = planConnectNodes(source, parsed, {
      sourceNodeKey: parsed.nodes[0]!.key,
      targetNodeKey: parsed.nodes[1]!.key,
      label: 'second',
    })
    if (plan.type !== 'applicable') throw new Error('Expected a plan.')
    const next = applySourceEdits(source, plan.edits)
    expect(next).toBe(`${source}\n@one -> @two : second`)
    expect(parseGranvasNotation(next, 2).relations).toHaveLength(2)
  })

  it('adds Group membership by ID without moving the Node', () => {
    const source = '[Idea] Alpha\n{Group}\n  [Node] Existing\nTail prose'
    const parsed = parseGranvasNotation(source, 1)
    const plan = planSetGroupMembership(
      source,
      parsed,
      parsed.nodes[0]!.key,
      parsed.groups[0]!.key,
    )
    if (plan.type !== 'applicable') throw new Error('Expected a plan.')
    const next = applySourceEdits(source, plan.edits)
    expect(next).toBe(
      '[Idea @alpha] Alpha\n{Group}\n  [Node] Existing\n  @alpha\nTail prose',
    )
    expect(parseGranvasNotation(next, 2).groups[0]!.memberNodeKeys).toHaveLength(2)
  })

  it('moves and detaches a subtree while preserving prose and relation certainty', () => {
    const source =
      'Intro prose\n[Problem] Root\n  ?-> [Cause] Child\n    !-> [Evidence] Grand\nMiddle prose\n[Idea] Other\nClosing prose'
    const parsed = parseGranvasNotation(source, 1)
    const child = parsed.nodes.find(({ label }) => label === 'Child')!
    const other = parsed.nodes.find(({ label }) => label === 'Other')!
    const moved = planReparentNode(source, parsed, child.key, other.key)
    if (moved.type !== 'applicable') throw new Error('Expected a plan.')
    const movedSource = applySourceEdits(source, moved.edits)
    expect(movedSource).toContain(
      '[Idea] Other\n  ?-> [Cause] Child\n    !-> [Evidence] Grand',
    )
    expect(movedSource).toContain('Intro prose\n[Problem] Root\nMiddle prose')

    const movedParse = parseGranvasNotation(movedSource, 2)
    const movedChild = movedParse.nodes.find(({ label }) => label === 'Child')!
    const detached = planReparentNode(movedSource, movedParse, movedChild.key)
    if (detached.type !== 'applicable') throw new Error('Expected a plan.')
    const detachedSource = applySourceEdits(movedSource, detached.edits)
    expect(detachedSource).toContain(
      '[Idea] Other\n[Cause] Child\n  !-> [Evidence] Grand',
    )
  })

  it('rejects cyclic reparenting without edits', () => {
    const source = '[Problem] Root\n  -> [Cause] Child\n    -> [Evidence] Grand'
    const parsed = parseGranvasNotation(source, 1)
    expect(
      planReparentNode(source, parsed, parsed.nodes[0]!.key, parsed.nodes[2]!.key),
    ).toMatchObject({ type: 'rejected', reason: { code: 'cyclic-parent' } })
  })

  it('previews and applies cascade Node deletion including Cross and Group refs', () => {
    const source =
      '[Problem @root] Root\n  -> [Cause @child] Child\n@root -> @other\n[Idea @other] Other\n{Group}\n  @root\nTail prose'
    const parsed = parseGranvasNotation(source, 1)
    expect(
      previewNotationDelete(source, parsed, {
        type: 'node',
        nodeKey: parsed.nodes[0]!.key,
      }),
    ).toMatchObject({
      type: 'available',
      impact: {
        nodeLabels: ['Root', 'Child'],
        relationKeys: [expect.any(String)],
        groupReferenceCount: 1,
      },
    })
    const plan = planDeleteNode(source, parsed, parsed.nodes[0]!.key)
    if (plan.type !== 'applicable') throw new Error('Expected a plan.')
    expect(applySourceEdits(source, plan.edits)).toBe(
      '[Idea @other] Other\n{Group}\nTail prose',
    )
  })

  it('deletes a Nested Relation by promoting its child and descendants', () => {
    const source =
      '[Problem] Root\n  ?-> [Cause] Child\n    !-> [Evidence] Grand\nClosing prose'
    const parsed = parseGranvasNotation(source, 1)
    const nested = parsed.relations[0]!
    const plan = planDeleteRelation(source, parsed, nested.key)
    if (plan.type !== 'applicable') throw new Error('Expected a plan.')
    const next = applySourceEdits(source, plan.edits)
    expect(next).toBe(
      '[Problem] Root\n[Cause] Child\n  !-> [Evidence] Grand\nClosing prose',
    )
    expect(parseGranvasNotation(next, 2).nodes).toHaveLength(3)
  })
})
