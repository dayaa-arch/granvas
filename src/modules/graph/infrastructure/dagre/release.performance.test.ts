// @vitest-environment node
/// <reference types="node" />

import { describe, expect, it } from 'vitest'

import { createCanonicalPerformanceLayoutInput } from '../../../../../tests/performance/canonicalPerformanceFixture'

import { layoutGraphWithDagre } from './layoutGraphWithDagre'

const SAMPLE_COUNT = 25

describe('v0.1 Dagre release performance budget', () => {
  it('keeps 200 Nodes / 300 Edges / 10 Groups layout p95 below 200ms', () => {
    const input = createCanonicalPerformanceLayoutInput()
    for (let index = 0; index < 3; index += 1) layoutGraphWithDagre(input)
    const samples = Array.from({ length: SAMPLE_COUNT }, () => {
      const started = performance.now()
      layoutGraphWithDagre(input)
      return performance.now() - started
    }).sort((left, right) => left - right)
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!

    console.info(`PERF layout_p95_ms=${p95.toFixed(2)}`)
    expect(p95).toBeLessThan(200)
  }, 15_000)
})
