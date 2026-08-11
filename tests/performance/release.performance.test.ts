import { describe, expect, it } from 'vitest'

import { parseNotation, planNotationEdit } from '@/modules/notation'

import {
  PERFORMANCE_FIXTURE_COUNTS,
  canonicalPerformanceSource,
  parseCanonicalPerformanceFixture,
} from './canonicalPerformanceFixture'

const SAMPLE_COUNT = 25
const WARM_UP_COUNT = 3

function measureP95(operation: () => void): Readonly<{
  p95: number
  samples: readonly number[]
}> {
  for (let index = 0; index < WARM_UP_COUNT; index += 1) operation()
  const samples = Array.from({ length: SAMPLE_COUNT }, () => {
    const started = performance.now()
    operation()
    return performance.now() - started
  }).sort((left, right) => left - right)
  return Object.freeze({
    p95: samples[Math.ceil(samples.length * 0.95) - 1]!,
    samples: Object.freeze(samples),
  })
}

describe('v0.1 release performance budgets', () => {
  it('keeps the canonical fixture at exactly 500 / 200 / 300 / 10', () => {
    const parsed = parseCanonicalPerformanceFixture()
    expect(canonicalPerformanceSource.split('\n')).toHaveLength(
      PERFORMANCE_FIXTURE_COUNTS.lines,
    )
    expect(parsed.nodes).toHaveLength(PERFORMANCE_FIXTURE_COUNTS.nodes)
    expect(parsed.relations).toHaveLength(PERFORMANCE_FIXTURE_COUNTS.edges)
    expect(parsed.groups).toHaveLength(PERFORMANCE_FIXTURE_COUNTS.groups)
    expect(parsed.diagnostics).toEqual([])
  })

  it('keeps Parser p95 below 50ms', () => {
    const result = measureP95(() => {
      parseNotation({ source: canonicalPerformanceSource, documentRevision: 1 })
    })
    console.info(`PERF parser_p95_ms=${result.p95.toFixed(2)}`)
    expect(result.p95).toBeLessThan(50)
  })

  it('keeps SourceEditPlan p95 below 20ms', () => {
    const parseResult = parseCanonicalPerformanceFixture()
    const nodeKey = parseResult.nodes[100]!.key
    const result = measureP95(() => {
      const plan = planNotationEdit({
        source: canonicalPerformanceSource,
        parseResult,
        command: {
          type: 'set-node-label',
          nodeKey,
          label: 'Updated performance label',
        },
      })
      if (plan.type !== 'applicable') {
        throw new Error('Expected the performance edit plan to be applicable.')
      }
    })
    console.info(`PERF source_edit_plan_p95_ms=${result.p95.toFixed(2)}`)
    expect(result.p95).toBeLessThan(20)
  })
})
