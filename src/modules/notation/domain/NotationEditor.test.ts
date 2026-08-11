import { describe, expect, it } from 'vitest'

import { parseGranvasNotation } from './GranvasNotationParser'
import {
  applySourceEdits,
  mapSourceOffsetThroughEdits,
  planSetNodeLabel,
  planSetNodeType,
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
    expect(() =>
      applySourceEdits('abcdef', [
        { from: 3, to: 5, insert: '' },
        { from: 4, to: 6, insert: '' },
      ]),
    ).toThrow(RangeError)
  })
})
