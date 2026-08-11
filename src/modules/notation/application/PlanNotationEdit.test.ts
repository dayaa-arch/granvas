import { describe, expect, it } from 'vitest'

import { parseNotation } from './ParseNotation'
import { applySourceEdits, planNotationEdit } from './PlanNotationEdit'

describe('PlanNotationEdit', () => {
  it('publishes the Notation editing use case without framework types', () => {
    const source = '[Idea] Before'
    const parseResult = parseNotation({ source, documentRevision: 2 })
    const plan = planNotationEdit({
      source,
      parseResult,
      command: {
        type: 'set-node-label',
        nodeKey: parseResult.nodes[0]!.key,
        label: 'After',
      },
    })

    expect(plan.type).toBe('applicable')
    if (plan.type !== 'applicable') {
      throw new Error('Expected an applicable plan.')
    }
    expect(applySourceEdits(source, plan.edits)).toBe('[Idea] After')
  })
})
