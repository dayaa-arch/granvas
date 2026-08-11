import type {
  NotationCertainty,
  NotationParseResult,
  ParsedGroup,
  ParsedNode,
  ParsedRelation,
  SourceRange,
} from './GranvasNotationParser'
import { scanSourceLines, type SourceLine } from './SourceText'

export type SourceEdit = Readonly<{
  from: number
  to: number
  insert: string
}>

export type CaretAffinity = 'before' | 'after'

export type NotationEditRejectionCode =
  | 'unknown-target'
  | 'cyclic-parent'
  | 'unresolved-reference'
  | 'unsupported-structure'
  | 'invalid-value'

export type NotationEditRejection = Readonly<{
  code: NotationEditRejectionCode
  message: string
  range?: SourceRange
}>

export type SourceEditPlan =
  | Readonly<{
      type: 'applicable'
      edits: readonly SourceEdit[]
      caretAnchor?: number
      caretAffinity?: CaretAffinity
    }>
  | Readonly<{
      type: 'rejected'
      reason: NotationEditRejection
    }>

export type NotationEditCommand =
  | Readonly<{ type: 'set-node-label'; nodeKey: string; label: string }>
  | Readonly<{ type: 'set-node-type'; nodeKey: string; nodeType: string }>
  | Readonly<{
      type: 'set-node-certainty'
      nodeKey: string
      certainty: NotationCertainty
    }>
  | Readonly<{
      type: 'create-node'
      nodeType: string
      label: string
      parentNodeKey?: string
      groupKey?: string
    }>
  | Readonly<{
      type: 'connect-nodes'
      sourceNodeKey: string
      targetNodeKey: string
      label?: string
      certainty?: NotationCertainty
    }>
  | Readonly<{
      type: 'reparent-node'
      nodeKey: string
      parentNodeKey?: string
    }>
  | Readonly<{
      type: 'set-group-membership'
      nodeKey: string
      groupKey: string
    }>
  | Readonly<{ type: 'delete-node'; nodeKey: string }>
  | Readonly<{ type: 'delete-relation'; relationKey: string }>

export type NotationDeleteImpact =
  | Readonly<{
      type: 'node'
      nodeKeys: readonly string[]
      nodeLabels: readonly string[]
      relationKeys: readonly string[]
      groupReferenceCount: number
    }>
  | Readonly<{
      type: 'relation'
      relationKey: string
      relationKind: 'cross' | 'nested'
      promotedNodeKey?: string
      promotedNodeLabel?: string
    }>

export type NotationDeletePreview =
  | Readonly<{ type: 'available'; impact: NotationDeleteImpact }>
  | Readonly<{ type: 'rejected'; reason: NotationEditRejection }>

type NodeHierarchy = Readonly<{
  parentByNode: ReadonlyMap<string, string>
  relationByChild: ReadonlyMap<string, ParsedRelation>
  childrenByNode: ReadonlyMap<string, readonly string[]>
}>

type GroupReference = Readonly<{
  nodeKey: string
  groupKey: string
  range: SourceRange
}>

const certaintyMarkers: Readonly<Record<NotationCertainty, string>> = {
  neutral: '',
  tentative: '?',
  confirmed: '!',
  rejected: '~',
}

function reject(
  code: NotationEditRejectionCode,
  message: string,
  range?: SourceRange,
): SourceEditPlan {
  return Object.freeze({
    type: 'rejected',
    reason: Object.freeze({ code, message, ...(range === undefined ? {} : { range }) }),
  })
}

function rejectedPreview(
  code: NotationEditRejectionCode,
  message: string,
  range?: SourceRange,
): NotationDeletePreview {
  return Object.freeze({
    type: 'rejected',
    reason: Object.freeze({ code, message, ...(range === undefined ? {} : { range }) }),
  })
}

function normalizedNodeType(nodeType: string): string | undefined {
  const normalized = nodeType.trim().toLowerCase()
  return /^[a-z][a-z0-9_-]*$/u.test(normalized) ? normalized : undefined
}

function normalizedLabel(label: string): string | undefined {
  const normalized = label.trim()
  return normalized.length > 0 && !/[\r\n]/u.test(normalized)
    ? normalized
    : undefined
}

function sourceLines(source: string): readonly SourceLine[] {
  return scanSourceLines(source)
}

function lineContaining(
  lines: readonly SourceLine[],
  offset: number,
): SourceLine | undefined {
  return lines.find(
    (line) =>
      line.from <= offset &&
      (offset <= line.to || line.to + line.lineEnding.length > offset),
  )
}

function lineForRange(
  _source: string,
  lines: readonly SourceLine[],
  range: SourceRange,
): SourceLine | undefined {
  const line = lineContaining(lines, range.from)
  return line && line.from === range.from && line.to === range.to
    ? line
    : undefined
}

function lineEnd(line: SourceLine): number {
  return line.to + line.lineEnding.length
}

function lineDeletion(line: SourceLine): SourceEdit {
  return Object.freeze({ from: line.from, to: lineEnd(line), insert: '' })
}

function preferredLineEnding(lines: readonly SourceLine[]): '\n' | '\r\n' {
  return lines.find(({ lineEnding }) => lineEnding !== '')?.lineEnding || '\n'
}

function blockInsertion(
  source: string,
  offset: number,
  lines: readonly string[],
  lineEnding: '\n' | '\r\n',
): string {
  const block = lines.join(lineEnding)

  if (offset < source.length) {
    return `${block}${lineEnding}`
  }

  const prefix = source.length > 0 && !source.endsWith('\n') ? lineEnding : ''
  return `${prefix}${block}`
}

function bracketOffset(source: string, node: ParsedNode): number | undefined {
  const bracket = source.indexOf('[', node.sourceRange.from)
  return bracket >= node.sourceRange.from && bracket < node.spans.type.from
    ? bracket
    : undefined
}

function nodeForCurrentSource(
  source: string,
  parseResult: NotationParseResult,
  nodeKey: string,
): ParsedNode | undefined {
  const node = parseResult.nodes.find(({ key }) => key === nodeKey)

  if (!node) {
    return undefined
  }

  const { type, label } = node.spans
  const line = lineForRange(source, sourceLines(source), node.sourceRange)
  if (
    !line ||
    type.from < 0 ||
    type.to < type.from ||
    label.from < 0 ||
    label.to < label.from ||
    type.to > source.length ||
    label.to > source.length ||
    source.slice(type.from, type.to).toLowerCase() !== node.type ||
    source.slice(label.from, label.to) !== node.label ||
    bracketOffset(source, node) === undefined
  ) {
    return undefined
  }

  return node
}

function relationForCurrentSource(
  source: string,
  parseResult: NotationParseResult,
  relationKey: string,
): ParsedRelation | undefined {
  const relation = parseResult.relations.find(({ key }) => key === relationKey)
  const line = relation
    ? lineForRange(source, sourceLines(source), relation.sourceRange)
    : undefined

  if (
    !relation ||
    !line ||
    relation.spans.operator.to > source.length ||
    !/^[?!~]?->$/u.test(
      source.slice(relation.spans.operator.from, relation.spans.operator.to),
    )
  ) {
    return undefined
  }

  return relation
}

function groupForCurrentSource(
  source: string,
  parseResult: NotationParseResult,
  groupKey: string,
): ParsedGroup | undefined {
  const group = parseResult.groups.find(({ key }) => key === groupKey)
  const line = group
    ? lineForRange(source, sourceLines(source), group.sourceRange)
    : undefined

  if (
    !group ||
    !line ||
    source.slice(group.spans.name.from, group.spans.name.to) !== group.name
  ) {
    return undefined
  }

  return group
}

function applicable(
  caretAnchor: number,
  edits: readonly SourceEdit[],
  caretAffinity?: CaretAffinity,
): SourceEditPlan {
  const normalized = normalizeSourceEdits(edits)
  return Object.freeze({
    type: 'applicable',
    edits: normalized,
    caretAnchor,
    ...(caretAffinity === undefined ? {} : { caretAffinity }),
  })
}

function normalizeSourceEdits(edits: readonly SourceEdit[]): readonly SourceEdit[] {
  const sorted = edits
    .map((edit, index) => ({ edit, index }))
    .sort(
      (left, right) =>
        left.edit.from - right.edit.from ||
        left.edit.to - right.edit.to ||
        left.index - right.index,
    )
  const normalized: SourceEdit[] = []

  for (const { edit } of sorted) {
    const frozen = Object.freeze({ ...edit })
    const previous = normalized.at(-1)

    if (
      previous &&
      previous.from === frozen.from &&
      previous.to === frozen.to &&
      previous.from === previous.to
    ) {
      normalized[normalized.length - 1] = Object.freeze({
        from: previous.from,
        to: previous.to,
        insert: previous.insert + frozen.insert,
      })
      continue
    }

    if (
      previous &&
      previous.insert === '' &&
      frozen.insert === '' &&
      frozen.from <= previous.to
    ) {
      normalized[normalized.length - 1] = Object.freeze({
        from: previous.from,
        to: Math.max(previous.to, frozen.to),
        insert: '',
      })
      continue
    }

    normalized.push(frozen)
  }

  return Object.freeze(normalized)
}

function hierarchyFor(parseResult: NotationParseResult): NodeHierarchy {
  const parentByNode = new Map<string, string>()
  const relationByChild = new Map<string, ParsedRelation>()
  const mutableChildren = new Map<string, string[]>()

  for (const relation of parseResult.relations) {
    if (relation.kind !== 'nested') {
      continue
    }

    parentByNode.set(relation.targetNodeKey, relation.sourceNodeKey)
    relationByChild.set(relation.targetNodeKey, relation)
    const children = mutableChildren.get(relation.sourceNodeKey) ?? []
    children.push(relation.targetNodeKey)
    mutableChildren.set(relation.sourceNodeKey, children)
  }

  return Object.freeze({
    parentByNode,
    relationByChild,
    childrenByNode: new Map(
      [...mutableChildren].map(([key, children]) => [
        key,
        Object.freeze(children),
      ]),
    ),
  })
}

function descendantKeys(
  rootKey: string,
  hierarchy: NodeHierarchy,
): readonly string[] {
  const descendants: string[] = []
  const visit = (key: string): void => {
    for (const child of hierarchy.childrenByNode.get(key) ?? []) {
      descendants.push(child)
      visit(child)
    }
  }
  visit(rootKey)
  return Object.freeze(descendants)
}

function nodeDepthFrom(
  nodeKey: string,
  rootKey: string,
  hierarchy: NodeHierarchy,
): number | undefined {
  let current = nodeKey
  let depth = 0
  const seen = new Set<string>()

  while (current !== rootKey) {
    if (seen.has(current)) {
      return undefined
    }
    seen.add(current)
    const parent = hierarchy.parentByNode.get(current)
    if (!parent) {
      return undefined
    }
    current = parent
    depth += 1
  }

  return depth
}

function nodeDeclaration(source: string, node: ParsedNode): string {
  const bracket = bracketOffset(source, node)
  return bracket === undefined ? '' : source.slice(bracket, node.sourceRange.to)
}

function relationPrefix(source: string, relation: ParsedRelation | undefined): string {
  return relation
    ? `${source.slice(relation.spans.operator.from, relation.spans.operator.to)} `
    : '-> '
}

function groupScopeBaseIndent(
  parseResult: NotationParseResult,
  offset: number,
): 0 | 2 {
  return parseResult.groups.some(
    (group) =>
      group.sourceRange.from < offset && offset < group.spans.memberInsertionPoint,
  )
    ? 2
    : 0
}

function groupReferences(
  source: string,
  parseResult: NotationParseResult,
): readonly GroupReference[] {
  const firstNodeKeyById = new Map<string, string>()
  for (const node of parseResult.nodes) {
    if (node.explicitId && !firstNodeKeyById.has(node.explicitId)) {
      firstNodeKeyById.set(node.explicitId, node.key)
    }
  }

  const references: GroupReference[] = []
  const lines = sourceLines(source)
  for (const group of parseResult.groups) {
    for (const line of lines) {
      if (
        line.from <= group.sourceRange.from ||
        line.from >= group.spans.memberInsertionPoint ||
        line.indent !== 2
      ) {
        continue
      }

      const match = /^@([A-Za-z][A-Za-z0-9_-]*)[ \t]*$/u.exec(line.content)
      const nodeKey = match ? firstNodeKeyById.get(match[1]!) : undefined
      if (nodeKey) {
        references.push(
          Object.freeze({
            nodeKey,
            groupKey: group.key,
            range: Object.freeze({
              from: line.from,
              to: line.to,
              line: line.number,
              column: 0,
            }),
          }),
        )
      }
    }
  }
  return Object.freeze(references)
}

function explicitIdCounts(parseResult: NotationParseResult): Map<string, number> {
  const counts = new Map<string, number>()
  for (const { explicitId } of parseResult.nodes) {
    if (explicitId) {
      counts.set(explicitId, (counts.get(explicitId) ?? 0) + 1)
    }
  }
  return counts
}

function allocateExplicitId(
  label: string,
  reservedIds: Set<string>,
): string {
  let base = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')

  if (base.length === 0) {
    base = 'node-1'
  } else if (!/^[a-z]/u.test(base)) {
    base = `n-${base}`
  }

  let candidate = base
  let suffix = 2
  while (reservedIds.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  reservedIds.add(candidate)
  return candidate
}

function explicitIdForReference(
  node: ParsedNode,
  counts: ReadonlyMap<string, number>,
  reservedIds: Set<string>,
): Readonly<{ id?: string; edit?: SourceEdit; rejection?: SourceEditPlan }> {
  if (node.explicitId) {
    if ((counts.get(node.explicitId) ?? 0) > 1) {
      return Object.freeze({
        rejection: reject(
          'unresolved-reference',
          'The selected Node has a duplicated explicit ID.',
          node.spans.explicitId,
        ),
      })
    }
    return Object.freeze({ id: node.explicitId })
  }

  const id = allocateExplicitId(node.label, reservedIds)
  return Object.freeze({
    id,
    edit: Object.freeze({
      from: node.spans.idInsertionPoint,
      to: node.spans.idInsertionPoint,
      insert: ` @${id}`,
    }),
  })
}

export function planSetNodeLabel(
  source: string,
  parseResult: NotationParseResult,
  nodeKey: string,
  label: string,
): SourceEditPlan {
  const node = nodeForCurrentSource(source, parseResult, nodeKey)
  if (!node) {
    return reject('unknown-target', 'The Node is not present in the current source.')
  }

  const normalized = normalizedLabel(label)
  if (!normalized) {
    return reject(
      'invalid-value',
      'Node label must contain non-whitespace text on one line.',
      node.spans.label,
    )
  }

  return applicable(
    node.sourceRange.from,
    normalized === node.label
      ? []
      : [{ from: node.spans.label.from, to: node.spans.label.to, insert: normalized }],
  )
}

export function planSetNodeType(
  source: string,
  parseResult: NotationParseResult,
  nodeKey: string,
  nodeType: string,
): SourceEditPlan {
  const node = nodeForCurrentSource(source, parseResult, nodeKey)
  if (!node) {
    return reject('unknown-target', 'The Node is not present in the current source.')
  }

  const normalized = normalizedNodeType(nodeType)
  if (!normalized) {
    return reject(
      'invalid-value',
      'Node type must start with an ASCII letter and contain only letters, digits, hyphens, or underscores.',
      node.spans.type,
    )
  }

  return applicable(
    node.sourceRange.from,
    normalized === node.type
      ? []
      : [{ from: node.spans.type.from, to: node.spans.type.to, insert: normalized }],
  )
}

export function planSetNodeCertainty(
  source: string,
  parseResult: NotationParseResult,
  nodeKey: string,
  certainty: NotationCertainty,
): SourceEditPlan {
  const node = nodeForCurrentSource(source, parseResult, nodeKey)
  if (!node) {
    return reject('unknown-target', 'The Node is not present in the current source.')
  }
  if (!(certainty in certaintyMarkers)) {
    return reject('invalid-value', 'Node certainty is invalid.', node.sourceRange)
  }
  if (node.certainty === certainty) {
    return applicable(node.sourceRange.from, [])
  }

  const marker = certaintyMarkers[certainty]
  if (node.spans.certainty) {
    return applicable(node.sourceRange.from, [
      {
        from: node.spans.certainty.from,
        to: node.spans.certainty.to,
        insert: marker,
      },
    ])
  }

  const bracket = bracketOffset(source, node)
  if (bracket === undefined) {
    return reject('unsupported-structure', 'The Node declaration cannot be edited.')
  }
  return applicable(node.sourceRange.from, [
    { from: bracket + 1, to: bracket + 1, insert: marker },
  ])
}

export function planCreateNode(
  source: string,
  parseResult: NotationParseResult,
  input: Readonly<{
    nodeType: string
    label: string
    parentNodeKey?: string
    groupKey?: string
  }>,
): SourceEditPlan {
  const nodeType = normalizedNodeType(input.nodeType)
  const label = normalizedLabel(input.label)
  if (!nodeType || !label) {
    return reject(
      'invalid-value',
      !nodeType
        ? 'Node type must start with an ASCII letter and contain only letters, digits, hyphens, or underscores.'
        : 'Node label must contain non-whitespace text on one line.',
    )
  }
  if (input.parentNodeKey && input.groupKey) {
    return reject(
      'invalid-value',
      'A new Node can target either a parent Node or a Group, not both.',
    )
  }

  const lines = sourceLines(source)
  const eol = preferredLineEnding(lines)
  let offset = source.length
  let indent = ''
  let prefix = ''

  if (input.parentNodeKey) {
    const parent = nodeForCurrentSource(source, parseResult, input.parentNodeKey)
    const parentLine = parent
      ? lineForRange(source, lines, parent.sourceRange)
      : undefined
    if (!parent || !parentLine) {
      return reject('unknown-target', 'The parent Node is not present in the current source.')
    }
    offset = lineEnd(parentLine)
    indent = ' '.repeat(parentLine.indent + 2)
    prefix = '-> '
  } else if (input.groupKey) {
    const group = groupForCurrentSource(source, parseResult, input.groupKey)
    if (!group) {
      return reject('unknown-target', 'The Group is not present in the current source.')
    }
    offset = group.spans.memberInsertionPoint
    indent = '  '
  }

  const insert = blockInsertion(
    source,
    offset,
    [`${indent}${prefix}[${nodeType}] ${label}`],
    eol,
  )
  return applicable(offset, [{ from: offset, to: offset, insert }], 'before')
}

export function planConnectNodes(
  source: string,
  parseResult: NotationParseResult,
  input: Readonly<{
    sourceNodeKey: string
    targetNodeKey: string
    label?: string
    certainty?: NotationCertainty
  }>,
): SourceEditPlan {
  const sourceNode = nodeForCurrentSource(source, parseResult, input.sourceNodeKey)
  const targetNode = nodeForCurrentSource(source, parseResult, input.targetNodeKey)
  if (!sourceNode || !targetNode) {
    return reject('unknown-target', 'An endpoint Node is not present in the current source.')
  }
  const certainty = input.certainty ?? 'neutral'
  if (!(certainty in certaintyMarkers)) {
    return reject('invalid-value', 'Relation certainty is invalid.')
  }
  const label = input.label === undefined ? undefined : normalizedLabel(input.label)
  if (input.label !== undefined && !label) {
    return reject('invalid-value', 'Relation label must be non-empty and on one line.')
  }

  const counts = explicitIdCounts(parseResult)
  const reservedIds = new Set(counts.keys())
  const sourceReference = explicitIdForReference(sourceNode, counts, reservedIds)
  if (sourceReference.rejection) {
    return sourceReference.rejection
  }
  const targetReference =
    sourceNode.key === targetNode.key
      ? sourceReference
      : explicitIdForReference(targetNode, counts, reservedIds)
  if (targetReference.rejection) {
    return targetReference.rejection
  }

  const edits: SourceEdit[] = []
  if (sourceReference.edit) edits.push(sourceReference.edit)
  if (targetReference.edit && targetReference.edit !== sourceReference.edit) {
    edits.push(targetReference.edit)
  }
  const eol = preferredLineEnding(sourceLines(source))
  const operator = `${certaintyMarkers[certainty]}->`
  const relation = `@${sourceReference.id!} ${operator} @${targetReference.id!}${
    label ? ` : ${label}` : ''
  }`
  edits.push({
    from: source.length,
    to: source.length,
    insert: blockInsertion(source, source.length, [relation], eol),
  })
  return applicable(sourceNode.sourceRange.from, edits)
}

export function planReparentNode(
  source: string,
  parseResult: NotationParseResult,
  nodeKey: string,
  parentNodeKey?: string,
): SourceEditPlan {
  const root = nodeForCurrentSource(source, parseResult, nodeKey)
  const parent = parentNodeKey
    ? nodeForCurrentSource(source, parseResult, parentNodeKey)
    : undefined
  if (!root || (parentNodeKey && !parent)) {
    return reject('unknown-target', 'A Node is not present in the current source.')
  }

  const hierarchy = hierarchyFor(parseResult)
  const currentParentKey = hierarchy.parentByNode.get(root.key)
  if (parentNodeKey === currentParentKey || (!parentNodeKey && !currentParentKey)) {
    return applicable(root.sourceRange.from, [])
  }
  const subtreeKeys = new Set([root.key, ...descendantKeys(root.key, hierarchy)])
  if (parent && subtreeKeys.has(parent.key)) {
    return reject(
      'cyclic-parent',
      'A Node cannot be reparented to itself or one of its descendants.',
      parent.sourceRange,
    )
  }

  const lines = sourceLines(source)
  const nodes = parseResult.nodes
    .filter((node) => subtreeKeys.has(node.key))
    .sort((left, right) => left.sourceRange.from - right.sourceRange.from)
  if (nodes.some((node) => !nodeForCurrentSource(source, parseResult, node.key))) {
    return reject('unsupported-structure', 'The Node subtree cannot be edited safely.')
  }

  if (!parent) {
    const baseIndent = groupScopeBaseIndent(parseResult, root.sourceRange.from)
    const edits: SourceEdit[] = []
    for (const node of nodes) {
      const depth = nodeDepthFrom(node.key, root.key, hierarchy)
      const bracket = bracketOffset(source, node)
      if (depth === undefined || bracket === undefined) {
        return reject('unsupported-structure', 'The Node subtree cannot be detached safely.')
      }
      const prefix =
        depth === 0
          ? ' '.repeat(baseIndent)
          : `${' '.repeat(baseIndent + depth * 2)}${relationPrefix(
              source,
              hierarchy.relationByChild.get(node.key),
            )}`
      edits.push({ from: node.sourceRange.from, to: bracket, insert: prefix })
    }
    return applicable(root.sourceRange.from, edits, 'before')
  }

  const parentLine = lineForRange(source, lines, parent.sourceRange)
  if (!parentLine) {
    return reject('unsupported-structure', 'The parent Node cannot receive a child.')
  }
  const movedLines: string[] = []
  for (const node of nodes) {
    const depth = nodeDepthFrom(node.key, root.key, hierarchy)
    const declaration = nodeDeclaration(source, node)
    if (depth === undefined || declaration.length === 0) {
      return reject('unsupported-structure', 'The Node subtree cannot be moved safely.')
    }
    const prefix = `${' '.repeat(parentLine.indent + (depth + 1) * 2)}${
      depth === 0
        ? relationPrefix(source, hierarchy.relationByChild.get(root.key))
        : relationPrefix(source, hierarchy.relationByChild.get(node.key))
    }`
    movedLines.push(`${prefix}${declaration}`)
  }

  const insertionPoint = lineEnd(parentLine)
  const eol = preferredLineEnding(lines)
  const edits: SourceEdit[] = nodes.map((node) => {
    const line = lineForRange(source, lines, node.sourceRange)
    return line ? lineDeletion(line) : { from: node.sourceRange.from, to: node.sourceRange.to, insert: '' }
  })
  edits.push({
    from: insertionPoint,
    to: insertionPoint,
    insert: blockInsertion(source, insertionPoint, movedLines, eol),
  })
  return applicable(insertionPoint, edits, 'before')
}

export function planSetGroupMembership(
  source: string,
  parseResult: NotationParseResult,
  nodeKey: string,
  groupKey: string,
): SourceEditPlan {
  const node = nodeForCurrentSource(source, parseResult, nodeKey)
  const group = groupForCurrentSource(source, parseResult, groupKey)
  if (!node || !group) {
    return reject('unknown-target', 'The Node or Group is not present in the current source.')
  }
  if (group.memberNodeKeys.includes(node.key)) {
    return applicable(node.sourceRange.from, [])
  }

  const counts = explicitIdCounts(parseResult)
  const reference = explicitIdForReference(node, counts, new Set(counts.keys()))
  if (reference.rejection) return reference.rejection
  const edits: SourceEdit[] = reference.edit ? [reference.edit] : []
  const eol = preferredLineEnding(sourceLines(source))
  edits.push({
    from: group.spans.memberInsertionPoint,
    to: group.spans.memberInsertionPoint,
    insert: blockInsertion(
      source,
      group.spans.memberInsertionPoint,
      [`  @${reference.id!}`],
      eol,
    ),
  })
  return applicable(node.sourceRange.from, edits)
}

function nodeDeleteImpact(
  source: string,
  parseResult: NotationParseResult,
  node: ParsedNode,
): Readonly<{
  impact: Extract<NotationDeleteImpact, { type: 'node' }>
  nodeKeys: ReadonlySet<string>
  relations: readonly ParsedRelation[]
  references: readonly GroupReference[]
}> {
  const hierarchy = hierarchyFor(parseResult)
  const nodeKeys = new Set([node.key, ...descendantKeys(node.key, hierarchy)])
  const deletedNodes = parseResult.nodes.filter(({ key }) => nodeKeys.has(key))
  const relations = parseResult.relations.filter(
    (relation) =>
      relation.kind === 'cross' &&
      (nodeKeys.has(relation.sourceNodeKey) || nodeKeys.has(relation.targetNodeKey)),
  )
  const references = groupReferences(source, parseResult).filter(({ nodeKey }) =>
    nodeKeys.has(nodeKey),
  )
  return Object.freeze({
    impact: Object.freeze({
      type: 'node',
      nodeKeys: Object.freeze(deletedNodes.map(({ key }) => key)),
      nodeLabels: Object.freeze(deletedNodes.map(({ label }) => label)),
      relationKeys: Object.freeze(relations.map(({ key }) => key)),
      groupReferenceCount: references.length,
    }),
    nodeKeys,
    relations: Object.freeze(relations),
    references: Object.freeze(references),
  })
}

export function previewNotationDelete(
  source: string,
  parseResult: NotationParseResult,
  target: Readonly<
    | { type: 'node'; nodeKey: string }
    | { type: 'relation'; relationKey: string }
  >,
): NotationDeletePreview {
  if (target.type === 'node') {
    const node = nodeForCurrentSource(source, parseResult, target.nodeKey)
    if (!node) {
      return rejectedPreview('unknown-target', 'The Node is not present in the current source.')
    }
    return Object.freeze({
      type: 'available',
      impact: nodeDeleteImpact(source, parseResult, node).impact,
    })
  }

  const relation = relationForCurrentSource(source, parseResult, target.relationKey)
  if (!relation) {
    return rejectedPreview('unknown-target', 'The Relation is not present in the current source.')
  }
  const child = parseResult.nodes.find(({ key }) => key === relation.targetNodeKey)
  return Object.freeze({
    type: 'available',
    impact: Object.freeze({
      type: 'relation',
      relationKey: relation.key,
      relationKind: relation.kind,
      ...(relation.kind === 'nested' && child
        ? { promotedNodeKey: child.key, promotedNodeLabel: child.label }
        : {}),
    }),
  })
}

export function planDeleteNode(
  source: string,
  parseResult: NotationParseResult,
  nodeKey: string,
): SourceEditPlan {
  const node = nodeForCurrentSource(source, parseResult, nodeKey)
  if (!node) {
    return reject('unknown-target', 'The Node is not present in the current source.')
  }
  const lines = sourceLines(source)
  const collected = nodeDeleteImpact(source, parseResult, node)
  const edits: SourceEdit[] = []
  for (const deletedNode of parseResult.nodes.filter(({ key }) => collected.nodeKeys.has(key))) {
    const line = lineForRange(source, lines, deletedNode.sourceRange)
    if (line) edits.push(lineDeletion(line))
  }
  for (const relation of collected.relations) {
    const line = lineForRange(source, lines, relation.sourceRange)
    if (line) edits.push(lineDeletion(line))
  }
  for (const reference of collected.references) {
    const line = lineForRange(source, lines, reference.range)
    if (line) edits.push(lineDeletion(line))
  }
  return applicable(node.sourceRange.from, edits, 'before')
}

export function planDeleteRelation(
  source: string,
  parseResult: NotationParseResult,
  relationKey: string,
): SourceEditPlan {
  const relation = relationForCurrentSource(source, parseResult, relationKey)
  if (!relation) {
    return reject('unknown-target', 'The Relation is not present in the current source.')
  }
  const lines = sourceLines(source)
  const relationLine = lineForRange(source, lines, relation.sourceRange)
  if (!relationLine) {
    return reject('unsupported-structure', 'The Relation cannot be edited safely.')
  }
  if (relation.kind === 'cross') {
    return applicable(relation.sourceRange.from, [lineDeletion(relationLine)])
  }

  const child = nodeForCurrentSource(source, parseResult, relation.targetNodeKey)
  if (!child) {
    return reject('unknown-target', 'The child Node is not present in the current source.')
  }
  const hierarchy = hierarchyFor(parseResult)
  const subtreeKeys = new Set([child.key, ...descendantKeys(child.key, hierarchy)])
  const nodes = parseResult.nodes
    .filter(({ key }) => subtreeKeys.has(key))
    .sort((left, right) => left.sourceRange.from - right.sourceRange.from)
  const baseIndent = groupScopeBaseIndent(parseResult, child.sourceRange.from)
  const edits: SourceEdit[] = []
  for (const node of nodes) {
    const depth = nodeDepthFrom(node.key, child.key, hierarchy)
    const bracket = bracketOffset(source, node)
    if (depth === undefined || bracket === undefined) {
      return reject('unsupported-structure', 'The child subtree cannot be promoted safely.')
    }
    const prefix =
      depth === 0
        ? ' '.repeat(baseIndent)
        : `${' '.repeat(baseIndent + depth * 2)}${relationPrefix(
            source,
            hierarchy.relationByChild.get(node.key),
          )}`
    edits.push({ from: node.sourceRange.from, to: bracket, insert: prefix })
  }
  return applicable(child.sourceRange.from, edits, 'before')
}

export function planNotationEdit(
  source: string,
  parseResult: NotationParseResult,
  command: NotationEditCommand,
): SourceEditPlan {
  switch (command.type) {
    case 'set-node-label':
      return planSetNodeLabel(source, parseResult, command.nodeKey, command.label)
    case 'set-node-type':
      return planSetNodeType(source, parseResult, command.nodeKey, command.nodeType)
    case 'set-node-certainty':
      return planSetNodeCertainty(
        source,
        parseResult,
        command.nodeKey,
        command.certainty,
      )
    case 'create-node':
      return planCreateNode(source, parseResult, command)
    case 'connect-nodes':
      return planConnectNodes(source, parseResult, command)
    case 'reparent-node':
      return planReparentNode(
        source,
        parseResult,
        command.nodeKey,
        command.parentNodeKey,
      )
    case 'set-group-membership':
      return planSetGroupMembership(
        source,
        parseResult,
        command.nodeKey,
        command.groupKey,
      )
    case 'delete-node':
      return planDeleteNode(source, parseResult, command.nodeKey)
    case 'delete-relation':
      return planDeleteRelation(source, parseResult, command.relationKey)
  }
}

function assertSourceEdits(source: string, edits: readonly SourceEdit[]): void {
  let previousTo = 0
  for (const [index, edit] of edits.entries()) {
    if (
      !Number.isSafeInteger(edit.from) ||
      !Number.isSafeInteger(edit.to) ||
      edit.from < 0 ||
      edit.to < edit.from ||
      edit.to > source.length ||
      (index > 0 && edit.from < previousTo)
    ) {
      throw new RangeError('Source edits must be sorted, non-overlapping, valid ranges.')
    }
    previousTo = edit.to
  }
}

export function applySourceEdits(
  source: string,
  edits: readonly SourceEdit[],
): string {
  assertSourceEdits(source, edits)
  let nextSource = ''
  let cursor = 0
  for (const edit of edits) {
    nextSource += source.slice(cursor, edit.from)
    nextSource += edit.insert
    cursor = edit.to
  }
  return nextSource + source.slice(cursor)
}

export function mapSourceOffsetThroughEdits(
  offset: number,
  edits: readonly SourceEdit[],
  affinity: CaretAffinity = 'after',
): number {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new RangeError('Source offset must be a non-negative safe integer.')
  }

  let delta = 0
  for (const edit of edits) {
    if (offset < edit.from) break
    if (offset === edit.from && affinity === 'before') {
      return edit.from + delta
    }
    if (offset <= edit.to) {
      return edit.from + delta + edit.insert.length
    }
    delta += edit.insert.length - (edit.to - edit.from)
  }
  return offset + delta
}
