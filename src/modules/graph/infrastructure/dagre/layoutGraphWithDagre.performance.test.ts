// @vitest-environment node
/// <reference types="node" />

import { describe, expect, it } from 'vitest'

import { createGraphLayoutInput, createThoughtGraph } from '@/modules/graph'
import { layoutGraphWithDagre } from './layoutGraphWithDagre'

describe.skipIf(process.env.GRANVAS_GRAPH_PERFORMANCE !== '1')(
  'Dagre performance fixture',
  () => {
    it('layouts 200 nodes / 300 edges / 10 groups with p95 under 200ms', () => {
      const nodes = Array.from({ length: 200 }, (_, index) => ({
        key: `node:${index.toString().padStart(3, '0')}`,
        type: 'node',
        label: `Node ${index}`,
      }))
      const relations = Array.from({ length: 300 }, (_, index) => {
        const source = index % 180
        const target = source + 20
        return {
          key: `edge:${index.toString().padStart(3, '0')}`,
          sourceNodeKey: nodes[source]!.key,
          targetNodeKey: nodes[target]!.key,
        }
      })
      const groups = Array.from({ length: 10 }, (_, groupIndex) => ({
        key: `group:${groupIndex}`,
        name: `Group ${groupIndex}`,
        memberNodeKeys: nodes
          .slice(groupIndex * 20, groupIndex * 20 + 20)
          .map(({ key }) => key),
      }))
      const input = createGraphLayoutInput(
        createThoughtGraph({ revision: 1, nodes, relations, groups }),
        'TB',
      )

      layoutGraphWithDagre(input)
      const samples = Array.from({ length: 20 }, () => {
        const started = performance.now()
        layoutGraphWithDagre(input)
        return performance.now() - started
      }).sort((left, right) => left - right)
      const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!

      expect(p95).toBeLessThan(200)
    }, 15_000)
  },
)
