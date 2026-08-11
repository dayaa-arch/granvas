import { describe, expect, it } from 'vitest'

import {
  NotationApplicationError,
  parseNotation,
  type ParseResultDto,
} from '@/modules/notation'
import { canonicalDemoSource } from '@/modules/notation/domain/fixtures/notationFixtures'

describe('Notation published application contract', () => {
  it('returns an immutable canonical ParseResultDto', () => {
    const result: ParseResultDto = parseNotation({
      source: canonicalDemoSource,
      documentRevision: 21,
    })

    expect(result).toMatchObject({
      documentRevision: 21,
      layout: { mode: 'flow', direction: 'TB' },
    })
    expect(result.nodes).toHaveLength(5)
    expect(result.relations).toHaveLength(3)
    expect(result.nodes.every(({ certainty }) => certainty === 'neutral')).toBe(true)
    expect(result.relations.every(({ certainty }) => certainty === 'neutral')).toBe(
      true,
    )
    expect(result.groups).toHaveLength(1)
    expect(result.diagnostics).toHaveLength(0)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.nodes)).toBe(true)
  })

  it('rejects invalid document revisions with a typed application error', () => {
    for (const documentRevision of [-1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => parseNotation({ source: '', documentRevision })).toThrowError(
        expect.objectContaining({
          name: 'NotationApplicationError',
          code: 'invalid-document-revision',
        }),
      )
    }

    expect(() => parseNotation({ source: '', documentRevision: -1 })).toThrowError(
      NotationApplicationError,
    )
  })
})
