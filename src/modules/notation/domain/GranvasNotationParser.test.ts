import { describe, expect, it } from 'vitest'

import { parseGranvasNotation, type DiagnosticCode } from './GranvasNotationParser'
import {
  allDiagnosticsSource,
  canonicalDemoSource,
  sourceWithBom,
  unicodeCrLfSource,
} from './fixtures/notationFixtures'

function diagnosticCodes(source: string): DiagnosticCode[] {
  return parseGranvasNotation(source, 7).diagnostics.map(({ code }) => code)
}

describe('GranvasNotationParser', () => {
  it('parses the canonical demo exactly', () => {
    const result = parseGranvasNotation(canonicalDemoSource, 12)

    expect(result.documentRevision).toBe(12)
    expect(result.nodes.map(({ label }) => label)).toEqual([
      'Customer information is scattered',
      'Excel files are fragmented',
      'Team knowledge is siloed',
      'AI unifies notes and structure',
      'User interviews',
    ])
    expect(result.relations).toHaveLength(3)
    expect(result.relations.map(({ kind }) => kind)).toEqual([
      'nested',
      'nested',
      'cross',
    ])
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]).toMatchObject({ name: 'Discovery' })
    expect(new Set(result.groups[0]?.memberNodeKeys)).toEqual(
      new Set([result.nodes[0]?.key, result.nodes[4]?.key]),
    )
    expect(result.layout).toMatchObject({ mode: 'flow', direction: 'TB' })
    expect(result.diagnostics).toEqual([])
  })

  it('accepts custom types, normalizes type names, and ignores plain text', () => {
    const result = parseGranvasNotation(
      '# heading\nordinary prose\n[Hypothesis] Price is not the issue',
      1,
    )

    expect(result.nodes).toEqual([
      expect.objectContaining({
        type: 'hypothesis',
        label: 'Price is not the issue',
      }),
    ])
    expect(result.diagnostics).toEqual([])
  })

  it('keeps duplicate-ID nodes and resolves references to the first declaration', () => {
    const result = parseGranvasNotation(
      '[node @same] First\n[node @same] Second\n@same -> @same',
      2,
    )

    expect(result.nodes).toHaveLength(2)
    expect(result.relations).toHaveLength(1)
    expect(result.relations[0]).toMatchObject({
      sourceNodeKey: result.nodes[0]?.key,
      targetNodeKey: result.nodes[0]?.key,
    })
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'GNV004_DUPLICATE_ID',
        range: result.nodes[1]?.sourceRange,
        relatedRanges: [result.nodes[0]?.sourceRange],
      }),
    ])
  })

  it('recovers valid structures around incomplete, empty, and invalid-ID nodes', () => {
    const result = parseGranvasNotation(
      '[problem] Valid before\n[problem\n[node]\n[node @1bad] Invalid\n[idea] Valid after',
      3,
    )

    expect(result.nodes.map(({ label }) => label)).toEqual([
      'Valid before',
      'Valid after',
    ])
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'GNV001_INCOMPLETE_NODE',
      'GNV002_EMPTY_LABEL',
      'GNV003_INVALID_ID',
    ])
  })

  it('builds nested parent stacks for siblings and multiple levels', () => {
    const result = parseGranvasNotation(
      '[problem] A\n  -> [cause] B\n    -> [cause] C\n  -> [cause] D',
      4,
    )
    const [a, b, c, d] = result.nodes

    expect(result.relations).toEqual([
      expect.objectContaining({ sourceNodeKey: a?.key, targetNodeKey: b?.key }),
      expect.objectContaining({ sourceNodeKey: b?.key, targetNodeKey: c?.key }),
      expect.objectContaining({ sourceNodeKey: a?.key, targetNodeKey: d?.key }),
    ])
    expect(result.diagnostics).toEqual([])
  })

  it('keeps valid child nodes for orphan, level-skip, and odd-indent relations', () => {
    const result = parseGranvasNotation(
      '  -> [node] Orphan\n[problem] Root\n    -> [node] Skipped\n   -> [node] Odd',
      5,
    )

    expect(result.nodes.map(({ label }) => label)).toEqual([
      'Orphan',
      'Root',
      'Skipped',
      'Odd',
    ])
    expect(result.relations).toEqual([])
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'GNV008_ORPHAN_RELATION',
      'GNV006_INVALID_INDENT',
      'GNV006_INVALID_INDENT',
    ])
  })

  it('omits tab-indented candidates', () => {
    const result = parseGranvasNotation('\t[node] Hidden\n[node] Visible', 6)

    expect(result.nodes.map(({ label }) => label)).toEqual(['Visible'])
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'GNV007_TAB_INDENT',
    ])
  })

  it('resolves forward relations and preserves self-loop, cycle, and parallel edges', () => {
    const result = parseGranvasNotation(
      '@a -> @b\n[node @a] A\n[node @b] B\n@a -> @a\n@a -> @b\n@b -> @a\n@a -> @b :',
      7,
    )

    expect(result.relations).toHaveLength(5)
    expect(result.relations.filter(({ sourceNodeKey, targetNodeKey }) =>
      sourceNodeKey === result.nodes[0]?.key && targetNodeKey === result.nodes[1]?.key,
    )).toHaveLength(3)
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'GNV012_EMPTY_RELATION_LABEL',
    ])
    expect(result.relations.at(-1)?.label).toBeUndefined()
  })

  it('omits unresolved cross relations without removing valid nodes', () => {
    const result = parseGranvasNotation(
      '[node @known] Known\n@known -> @missing\n@1bad -> @known',
      8,
    )

    expect(result.nodes).toHaveLength(1)
    expect(result.relations).toEqual([])
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'GNV005_UNRESOLVED_REFERENCE',
      'GNV005_UNRESOLVED_REFERENCE',
    ])
  })

  it('resolves Group forward references, nested children, deduplication, and overlap', () => {
    const result = parseGranvasNotation(
      '[node @shared] Shared\n{One}\n  @future\n  @shared\n  @shared\n  [idea @local] Local\n    -> [todo] Child\n  ordinary text\n  @future\n{Two}\n  @shared\n[node @future] Future',
      9,
    )
    const shared = result.nodes.find(({ explicitId }) => explicitId === 'shared')!
    const local = result.nodes.find(({ explicitId }) => explicitId === 'local')!
    const future = result.nodes.find(({ explicitId }) => explicitId === 'future')!
    const child = result.nodes.find(({ label }) => label === 'Child')!

    expect(result.groups).toHaveLength(2)
    expect(new Set(result.groups[0]?.memberNodeKeys)).toEqual(
      new Set([future.key, shared.key, local.key, child.key]),
    )
    expect(result.groups[0]?.memberNodeKeys).toHaveLength(4)
    expect(result.groups[1]?.memberNodeKeys).toEqual([shared.key])
    expect(result.relations).toEqual([
      expect.objectContaining({
        kind: 'nested',
        sourceNodeKey: local.key,
        targetNodeKey: child.key,
      }),
    ])
    expect(result.diagnostics).toEqual([])
  })

  it('keeps Group scope across blank/plain lines and closes it at indent zero', () => {
    const result = parseGranvasNotation(
      '{Scope}\n  [node] In group\n\n  notes stay in scope\n[node] Outside',
      10,
    )

    expect(result.groups[0]?.memberNodeKeys).toEqual([result.nodes[0]?.key])
    expect(result.groups[0]?.memberNodeKeys).not.toContain(result.nodes[1]?.key)
  })

  it('diagnoses nested / empty Groups, invalid member indentation, and missing references', () => {
    const result = parseGranvasNotation(
      '{}\n  [node] Not attached\n{Outer}\n  {Inner}\n    [node] Too deep\n  @missing',
      11,
    )

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.name).toBe('Outer')
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.label).toBe('Not attached')
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'GNV013_EMPTY_GROUP_NAME',
      'GNV011_NESTED_GROUP_UNSUPPORTED',
      'GNV006_INVALID_INDENT',
      'GNV005_UNRESOLVED_REFERENCE',
    ])
  })

  it('uses default layout and applies the last valid duplicate directive', () => {
    expect(parseGranvasNotation('[node] A', 1).layout).toEqual({
      mode: 'flow',
      direction: 'TB',
    })

    const result = parseGranvasNotation(
      '@layout flow LR\n@layout grid TB\n@layout flow TB',
      1,
    )

    expect(result.layout).toMatchObject({ mode: 'flow', direction: 'TB' })
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'GNV009_INVALID_LAYOUT',
      'GNV010_DUPLICATE_LAYOUT',
    ])
  })

  it('uses UTF-16 offsets and preserves CRLF in SourceRange calculations', () => {
    const result = parseGranvasNotation(unicodeCrLfSource, 13)

    expect(result.nodes[0]?.sourceRange).toEqual({
      from: 10,
      to: 31,
      line: 2,
      column: 0,
    })
    expect(result.nodes[1]?.sourceRange).toEqual({
      from: 33,
      to: unicodeCrLfSource.length,
      line: 3,
      column: 0,
    })
    expect(result.relations[0]?.sourceRange).toEqual(result.nodes[1]?.sourceRange)
  })

  it('treats BOM removal as an upstream boundary without offset drift', () => {
    const direct = parseGranvasNotation(sourceWithBom, 14)
    const decoded = parseGranvasNotation(sourceWithBom.slice(1), 14)

    expect(direct.nodes).toEqual([])
    expect(decoded.nodes[0]?.sourceRange).toEqual({
      from: 0,
      to: sourceWithBom.length - 1,
      line: 1,
      column: 0,
    })
  })

  it('is deterministic and never mixes a previous revision into current output', () => {
    const source = '[node @a] A\n  -> [node] B'
    const first = parseGranvasNotation(source, 15)
    const repeated = parseGranvasNotation(source, 15)
    const current = parseGranvasNotation('[node] Current only', 16)

    expect(repeated).toEqual(first)
    expect(current.documentRevision).toBe(16)
    expect(current.nodes.map(({ label }) => label)).toEqual(['Current only'])
    expect(current.nodes.map(({ key }) => key)).not.toEqual(
      first.nodes.map(({ key }) => key),
    )
    expect(current.diagnostics.every(({ documentRevision }) => documentRevision === 16)).toBe(
      true,
    )
  })

  it('implements every initial diagnostic code', () => {
    expect(new Set(diagnosticCodes(allDiagnosticsSource))).toEqual(
      new Set<DiagnosticCode>([
        'GNV001_INCOMPLETE_NODE',
        'GNV002_EMPTY_LABEL',
        'GNV003_INVALID_ID',
        'GNV004_DUPLICATE_ID',
        'GNV005_UNRESOLVED_REFERENCE',
        'GNV006_INVALID_INDENT',
        'GNV007_TAB_INDENT',
        'GNV008_ORPHAN_RELATION',
        'GNV009_INVALID_LAYOUT',
        'GNV010_DUPLICATE_LAYOUT',
        'GNV011_NESTED_GROUP_UNSUPPORTED',
        'GNV012_EMPTY_RELATION_LABEL',
        'GNV013_EMPTY_GROUP_NAME',
      ]),
    )
  })
})
