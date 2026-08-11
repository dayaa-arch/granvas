import {
  createGraphLayoutInput,
  createThoughtGraph,
  type GraphLayoutInputDto,
} from '@/modules/graph'
import { parseNotation, type ParseResultDto } from '@/modules/notation'

export const PERFORMANCE_FIXTURE_COUNTS = Object.freeze({
  lines: 500,
  nodes: 200,
  edges: 300,
  groups: 10,
})

function padded(index: number): string {
  return index.toString().padStart(3, '0')
}

function createSource(): string {
  const lines = ['@layout flow TB', '[node @node000] Performance root']

  for (let index = 1; index < PERFORMANCE_FIXTURE_COUNTS.nodes; index += 1) {
    lines.push(`  -> [node @node${padded(index)}] Performance Node ${index}`)
  }

  const nestedRelations = PERFORMANCE_FIXTURE_COUNTS.nodes - 1
  const crossRelations = PERFORMANCE_FIXTURE_COUNTS.edges - nestedRelations
  for (let index = 0; index < crossRelations; index += 1) {
    const source = index % PERFORMANCE_FIXTURE_COUNTS.nodes
    const target = (index + 73) % PERFORMANCE_FIXTURE_COUNTS.nodes
    lines.push(
      `@node${padded(source)} -> @node${padded(target)} : Relation ${index}`,
    )
  }

  for (let index = 0; index < PERFORMANCE_FIXTURE_COUNTS.groups; index += 1) {
    lines.push(`{Performance Group ${index}}`)
    lines.push(`  @node${padded(index * 20)}`)
  }

  while (lines.length < PERFORMANCE_FIXTURE_COUNTS.lines) {
    lines.push(`Performance prose line ${lines.length + 1}.`)
  }

  if (lines.length !== PERFORMANCE_FIXTURE_COUNTS.lines) {
    throw new Error('The canonical performance fixture line count is invalid.')
  }
  return lines.join('\n')
}

export const canonicalPerformanceSource = createSource()

export function parseCanonicalPerformanceFixture(
  documentRevision = 1,
): ParseResultDto {
  return parseNotation({
    source: canonicalPerformanceSource,
    documentRevision,
  })
}

export function createCanonicalPerformanceLayoutInput(
  parseResult = parseCanonicalPerformanceFixture(),
): GraphLayoutInputDto {
  const graph = createThoughtGraph({
    revision: parseResult.documentRevision,
    nodes: parseResult.nodes.map(({ key, explicitId, type, label, certainty }) => ({
      key,
      ...(explicitId === undefined ? {} : { explicitId }),
      type,
      label,
      certainty,
    })),
    relations: parseResult.relations.map(
      ({ key, sourceNodeKey, targetNodeKey, label, certainty }) => ({
        key,
        sourceNodeKey,
        targetNodeKey,
        certainty,
        ...(label === undefined ? {} : { label }),
      }),
    ),
    groups: parseResult.groups.map(({ key, name, memberNodeKeys }) => ({
      key,
      name,
      memberNodeKeys,
    })),
  })
  return createGraphLayoutInput(graph, parseResult.layout.direction)
}
