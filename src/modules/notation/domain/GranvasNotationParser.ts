import {
  classifyNotationCandidate,
  scanSourceLines,
  type SourceLine,
} from './SourceText'

export type SourceRange = Readonly<{
  from: number
  to: number
  line: number
  column: number
}>

export type DiagnosticCode =
  | 'GNV001_INCOMPLETE_NODE'
  | 'GNV002_EMPTY_LABEL'
  | 'GNV003_INVALID_ID'
  | 'GNV004_DUPLICATE_ID'
  | 'GNV005_UNRESOLVED_REFERENCE'
  | 'GNV006_INVALID_INDENT'
  | 'GNV007_TAB_INDENT'
  | 'GNV008_ORPHAN_RELATION'
  | 'GNV009_INVALID_LAYOUT'
  | 'GNV010_DUPLICATE_LAYOUT'
  | 'GNV011_NESTED_GROUP_UNSUPPORTED'
  | 'GNV012_EMPTY_RELATION_LABEL'
  | 'GNV013_EMPTY_GROUP_NAME'
  | 'GNV014_INVALID_CERTAINTY_MARKER'

export type DiagnosticLevel = 'info' | 'warning' | 'error'

export type NotationCertainty =
  | 'neutral'
  | 'tentative'
  | 'confirmed'
  | 'rejected'

export type NotationDiagnostic = Readonly<{
  code: DiagnosticCode
  level: DiagnosticLevel
  message: string
  range: SourceRange
  relatedRanges?: readonly SourceRange[]
  documentRevision: number
}>

export type NodeSourceSpans = Readonly<{
  indent: SourceRange
  certainty?: SourceRange
  type: SourceRange
  explicitId?: SourceRange
  idInsertionPoint: number
  label: SourceRange
}>

export type RelationSourceSpans = Readonly<{
  operator: SourceRange
  sourceRef?: SourceRange
  targetRef?: SourceRange
  label?: SourceRange
  labelInsertionPoint: number
}>

export type GroupSourceSpans = Readonly<{
  header: SourceRange
  name: SourceRange
  memberInsertionPoint: number
}>

export type ParsedNode = Readonly<{
  key: string
  explicitId?: string
  type: string
  label: string
  certainty: NotationCertainty
  sourceRange: SourceRange
  spans: NodeSourceSpans
}>

export type ParsedRelation = Readonly<{
  key: string
  kind: 'nested' | 'cross'
  sourceNodeKey: string
  targetNodeKey: string
  label?: string
  certainty: NotationCertainty
  sourceRange: SourceRange
  spans: RelationSourceSpans
}>

export type ParsedGroup = Readonly<{
  key: string
  name: string
  memberNodeKeys: readonly string[]
  sourceRange: SourceRange
  spans: GroupSourceSpans
}>

export type ParsedLayout = Readonly<{
  key?: string
  mode: 'flow'
  direction: 'TB' | 'LR'
  sourceRange?: SourceRange
}>

export type NotationParseResult = Readonly<{
  documentRevision: number
  nodes: readonly ParsedNode[]
  relations: readonly ParsedRelation[]
  groups: readonly ParsedGroup[]
  layout: ParsedLayout
  diagnostics: readonly NotationDiagnostic[]
}>

type MutableGroup = {
  key: string
  name: string
  memberNodeKeys: string[]
  memberNodeKeySet: Set<string>
  sourceRange: SourceRange
  headerRange: SourceRange
  nameRange: SourceRange
  memberInsertionPoint: number
}

type OpenGroup = {
  group?: MutableGroup
  parentStack: Map<number, string>
}

type PendingCrossRelation = {
  key: string
  sourceId: string
  targetId: string
  label?: string
  certainty: NotationCertainty
  sourceRange: SourceRange
  spans: RelationSourceSpans
}

type PendingGroupReference = {
  group?: MutableGroup
  explicitId: string
  sourceRange: SourceRange
}

type NodeParseFailure = {
  code:
    | 'GNV001_INCOMPLETE_NODE'
    | 'GNV002_EMPTY_LABEL'
    | 'GNV003_INVALID_ID'
    | 'GNV014_INVALID_CERTAINTY_MARKER'
  relativeRange?: Readonly<{ from: number; to: number }>
}

type NodeParseSuccess = {
  type: string
  label: string
  explicitId?: string
  certainty: NotationCertainty
  spans: Readonly<{
    certainty?: Readonly<{ from: number; to: number }>
    type: Readonly<{ from: number; to: number }>
    explicitId?: Readonly<{ from: number; to: number }>
    idInsertionPoint: number
    label: Readonly<{ from: number; to: number }>
  }>
}

const diagnosticMetadata: Readonly<
  Record<DiagnosticCode, Readonly<{ level: DiagnosticLevel; message: string }>>
> = {
  GNV001_INCOMPLETE_NODE: {
    level: 'info',
    message: 'Node declaration is incomplete.',
  },
  GNV002_EMPTY_LABEL: {
    level: 'error',
    message: 'Node label must not be empty.',
  },
  GNV003_INVALID_ID: {
    level: 'error',
    message: 'Explicit node ID is invalid.',
  },
  GNV004_DUPLICATE_ID: {
    level: 'error',
    message: 'Explicit node ID is duplicated.',
  },
  GNV005_UNRESOLVED_REFERENCE: {
    level: 'warning',
    message: 'Node reference could not be resolved.',
  },
  GNV006_INVALID_INDENT: {
    level: 'warning',
    message: 'Notation indentation is invalid.',
  },
  GNV007_TAB_INDENT: {
    level: 'warning',
    message: 'Tab indentation is not supported.',
  },
  GNV008_ORPHAN_RELATION: {
    level: 'warning',
    message: 'Nested relation has no parent node.',
  },
  GNV009_INVALID_LAYOUT: {
    level: 'warning',
    message: 'Layout directive is invalid.',
  },
  GNV010_DUPLICATE_LAYOUT: {
    level: 'warning',
    message: 'Multiple layout directives were found; the last valid one is used.',
  },
  GNV011_NESTED_GROUP_UNSUPPORTED: {
    level: 'warning',
    message: 'Nested groups are not supported.',
  },
  GNV012_EMPTY_RELATION_LABEL: {
    level: 'warning',
    message: 'Empty relation label was omitted.',
  },
  GNV013_EMPTY_GROUP_NAME: {
    level: 'error',
    message: 'Group name must not be empty.',
  },
  GNV014_INVALID_CERTAINTY_MARKER: {
    level: 'error',
    message: 'Certainty marker must appear once before a node type.',
  },
}

function rangeForLine(line: SourceLine): SourceRange {
  return Object.freeze({
    from: line.from,
    to: line.to,
    line: line.number,
    column: 0,
  })
}

function rangeForSegment(
  line: SourceLine,
  fromColumn: number,
  toColumn: number,
): SourceRange {
  return Object.freeze({
    from: line.from + fromColumn,
    to: line.from + toColumn,
    line: line.number,
    column: fromColumn,
  })
}

function clearDeeperLevels(stack: Map<number, string>, level: number): void {
  for (const existingLevel of stack.keys()) {
    if (existingLevel > level) {
      stack.delete(existingLevel)
    }
  }
}

function addGroupMember(group: MutableGroup | undefined, nodeKey: string): void {
  if (!group || group.memberNodeKeySet.has(nodeKey)) {
    return
  }

  group.memberNodeKeySet.add(nodeKey)
  group.memberNodeKeys.push(nodeKey)
}

function parseNodeDeclaration(text: string): NodeParseFailure | NodeParseSuccess {
  const closingBracket = text.indexOf(']')

  if (!text.startsWith('[') || closingBracket === -1) {
    return { code: 'GNV001_INCOMPLETE_NODE' }
  }

  const rawHeader = text.slice(1, closingBracket)
  let header = rawHeader.trim()
  const remainder = text.slice(closingBracket + 1)

  if (remainder.length > 0 && !/^[ \t]/.test(remainder)) {
    return { code: 'GNV001_INCOMPLETE_NODE' }
  }

  let certainty: NotationCertainty = 'neutral'
  const marker = rawHeader[0]
  let certaintySpan: Readonly<{ from: number; to: number }> | undefined
  let typeFrom: number

  if (marker === '?' || marker === '!' || marker === '~') {
    const rawMarkedHeader = rawHeader.slice(1)
    header = rawMarkedHeader.trimStart()
    typeFrom = 2 + (rawMarkedHeader.length - header.length)
    certaintySpan = Object.freeze({ from: 1, to: 2 })

    if (
      header.length === 0 ||
      header.startsWith('?') ||
      header.startsWith('!') ||
      header.startsWith('~')
    ) {
      return {
        code: 'GNV014_INVALID_CERTAINTY_MARKER',
        relativeRange: { from: 0, to: closingBracket + 1 },
      }
    }

    if (!/^[A-Za-z]/u.test(header)) {
      return {
        code: 'GNV014_INVALID_CERTAINTY_MARKER',
        relativeRange: { from: 0, to: closingBracket + 1 },
      }
    }

    certainty =
      marker === '?' ? 'tentative' : marker === '!' ? 'confirmed' : 'rejected'
  } else {
    typeFrom = 1 + rawHeader.indexOf(header)
  }

  const headerMatch = /^([A-Za-z][A-Za-z0-9_-]*)(?:[ \t]+@(.+))?$/.exec(header)

  if (!headerMatch) {
    return {
      code: header.includes('@') ? 'GNV003_INVALID_ID' : 'GNV001_INCOMPLETE_NODE',
    }
  }

  const explicitId = headerMatch[2]

  if (explicitId !== undefined && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(explicitId)) {
    return { code: 'GNV003_INVALID_ID' }
  }

  const label = remainder.trim()

  if (label.length === 0) {
    return { code: 'GNV002_EMPTY_LABEL' }
  }

  const typeTo = typeFrom + headerMatch[1]!.length
  const explicitIdToken = explicitId === undefined ? undefined : `@${explicitId}`
  const explicitIdFrom =
    explicitIdToken === undefined ? undefined : typeFrom + header.indexOf(explicitIdToken)
  const labelFrom = closingBracket + 1 + remainder.indexOf(label)

  return {
    type: headerMatch[1]!.toLowerCase(),
    label,
    certainty,
    ...(explicitId === undefined ? {} : { explicitId }),
    spans: Object.freeze({
      ...(certaintySpan === undefined ? {} : { certainty: certaintySpan }),
      type: Object.freeze({ from: typeFrom, to: typeTo }),
      ...(explicitIdFrom === undefined || explicitIdToken === undefined
        ? {}
        : {
            explicitId: Object.freeze({
              from: explicitIdFrom,
              to: explicitIdFrom + explicitIdToken.length,
            }),
          }),
      idInsertionPoint: typeTo,
      label: Object.freeze({ from: labelFrom, to: labelFrom + label.length }),
    }),
  }
}

function certaintyForRelationOperator(operator: string): NotationCertainty {
  switch (operator[0]) {
    case '?':
      return 'tentative'
    case '!':
      return 'confirmed'
    case '~':
      return 'rejected'
    default:
      return 'neutral'
  }
}

function createKeyFactory(): (kind: 'node' | 'edge' | 'group' | 'layout', from: number) => string {
  const counts = new Map<string, number>()

  return (kind, from) => {
    const base = `${kind}:${from}`
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    return count === 0 ? base : `${base}:${count}`
  }
}

export function parseGranvasNotation(
  source: string,
  documentRevision: number,
): NotationParseResult {
  const nodes: ParsedNode[] = []
  const nestedRelations: ParsedRelation[] = []
  const mutableGroups: MutableGroup[] = []
  const diagnostics: NotationDiagnostic[] = []
  const pendingCrossRelations: PendingCrossRelation[] = []
  const pendingGroupReferences: PendingGroupReference[] = []
  const topLevelParentStack = new Map<number, string>()
  const createKey = createKeyFactory()
  let openGroup: OpenGroup | undefined
  let validLayoutCount = 0
  let layout: ParsedLayout = Object.freeze({ mode: 'flow', direction: 'TB' })

  const addDiagnostic = (
    code: DiagnosticCode,
    range: SourceRange,
    relatedRanges?: readonly SourceRange[],
  ): void => {
    const metadata = diagnosticMetadata[code]
    diagnostics.push(
      Object.freeze({
        code,
        level: metadata.level,
        message: metadata.message,
        range,
        ...(relatedRanges === undefined
          ? {}
          : { relatedRanges: Object.freeze([...relatedRanges]) }),
        documentRevision,
      }),
    )
  }

  const addNode = (
    line: SourceLine,
    text: string,
    textColumn = line.indent,
  ): ParsedNode | undefined => {
    const parsed = parseNodeDeclaration(text)
    const sourceRange = rangeForLine(line)

    if ('code' in parsed) {
      const diagnosticRange = parsed.relativeRange
        ? rangeForSegment(
            line,
            textColumn + parsed.relativeRange.from,
            textColumn + parsed.relativeRange.to,
          )
        : sourceRange
      addDiagnostic(parsed.code, diagnosticRange)
      return undefined
    }

    const node = Object.freeze({
      key: createKey('node', sourceRange.from),
      type: parsed.type,
      label: parsed.label,
      certainty: parsed.certainty,
      ...(parsed.explicitId === undefined ? {} : { explicitId: parsed.explicitId }),
      sourceRange,
      spans: Object.freeze({
        indent: rangeForSegment(line, 0, line.indent),
        ...(parsed.spans.certainty === undefined
          ? {}
          : {
              certainty: rangeForSegment(
                line,
                textColumn + parsed.spans.certainty.from,
                textColumn + parsed.spans.certainty.to,
              ),
            }),
        type: rangeForSegment(
          line,
          textColumn + parsed.spans.type.from,
          textColumn + parsed.spans.type.to,
        ),
        ...(parsed.spans.explicitId === undefined
          ? {}
          : {
              explicitId: rangeForSegment(
                line,
                textColumn + parsed.spans.explicitId.from,
                textColumn + parsed.spans.explicitId.to,
              ),
            }),
        idInsertionPoint: line.from + textColumn + parsed.spans.idInsertionPoint,
        label: rangeForSegment(
          line,
          textColumn + parsed.spans.label.from,
          textColumn + parsed.spans.label.to,
        ),
      }),
    })
    nodes.push(node)
    return node
  }

  for (const line of scanSourceLines(source)) {
    const candidate = classifyNotationCandidate(line, openGroup !== undefined)

    if (candidate.closesGroup) {
      if (openGroup?.group) {
        openGroup.group.memberInsertionPoint = line.from
      }
      openGroup = undefined
    }

    const sourceRange = rangeForLine(line)

    switch (candidate.kind) {
      case 'blank':
      case 'plain-text':
        break

      case 'tab-indent':
        addDiagnostic('GNV007_TAB_INDENT', sourceRange)
        break

      case 'invalid-indent':
        addDiagnostic('GNV006_INVALID_INDENT', sourceRange)
        break

      case 'node': {
        const node = addNode(line, line.content)

        if (node) {
          topLevelParentStack.set(0, node.key)
          clearDeeperLevels(topLevelParentStack, 0)
        }
        break
      }

      case 'group-header': {
        const match = /^\{(.*)\}[ \t]*$/.exec(line.content)
        const rawName = match?.[1] ?? ''
        const name = rawName.trim()
        let group: MutableGroup | undefined

        if (name.length === 0) {
          addDiagnostic('GNV013_EMPTY_GROUP_NAME', sourceRange)
        } else {
          group = {
            key: createKey('group', sourceRange.from),
            name,
            memberNodeKeys: [],
            memberNodeKeySet: new Set<string>(),
            sourceRange,
            headerRange: rangeForSegment(
              line,
              0,
              line.content.lastIndexOf('}') + 1,
            ),
            nameRange: rangeForSegment(
              line,
              1 + rawName.indexOf(name),
              1 + rawName.indexOf(name) + name.length,
            ),
            memberInsertionPoint: source.length,
          }
          mutableGroups.push(group)
        }

        openGroup = { group, parentStack: new Map<number, string>() }
        break
      }

      case 'nested-group':
        addDiagnostic('GNV011_NESTED_GROUP_UNSUPPORTED', sourceRange)
        break

      case 'group-node': {
        if (line.indent !== 2) {
          addDiagnostic('GNV006_INVALID_INDENT', sourceRange)
          break
        }

        const node = addNode(line, line.content)

        if (node && openGroup) {
          addGroupMember(openGroup.group, node.key)
          openGroup.parentStack.set(0, node.key)
          clearDeeperLevels(openGroup.parentStack, 0)
        }
        break
      }

      case 'group-reference': {
        if (line.indent !== 2) {
          addDiagnostic('GNV006_INVALID_INDENT', sourceRange)
          break
        }

        const match = /^@([A-Za-z][A-Za-z0-9_-]*)[ \t]*$/.exec(line.content)

        if (!match) {
          addDiagnostic('GNV005_UNRESOLVED_REFERENCE', sourceRange)
          break
        }

        pendingGroupReferences.push({
          group: openGroup?.group,
          explicitId: match[1]!,
          sourceRange,
        })
        break
      }

      case 'nested-relation': {
        const activeGroup = openGroup
        const inGroup = activeGroup !== undefined
        const effectiveIndent = inGroup ? line.indent - 2 : line.indent
        const validIndent = effectiveIndent >= 2 && effectiveIndent % 2 === 0
        const level = validIndent ? effectiveIndent / 2 : undefined
        const operator = /^(?:[?!~]?->)/u.exec(line.content)?.[0] ?? '->'
        const rawChildText = line.content.slice(operator.length)
        const childWhitespace = rawChildText.match(/^[ \t]*/u)?.[0].length ?? 0
        const childText = rawChildText.slice(childWhitespace)
        const child = addNode(
          line,
          childText,
          line.indent + operator.length + childWhitespace,
        )

        if (child && activeGroup) {
          addGroupMember(activeGroup.group, child.key)
        }

        if (!validIndent || level === undefined) {
          addDiagnostic('GNV006_INVALID_INDENT', sourceRange)
          break
        }

        const parentStack = activeGroup?.parentStack ?? topLevelParentStack
        const parentKey = parentStack.get(level - 1)

        if (child) {
          parentStack.set(level, child.key)
          clearDeeperLevels(parentStack, level)
        }

        if (!child) {
          break
        }

        if (!parentKey) {
          addDiagnostic(
            level === 1 ? 'GNV008_ORPHAN_RELATION' : 'GNV006_INVALID_INDENT',
            sourceRange,
          )
          break
        }

        nestedRelations.push(
          Object.freeze({
            key: createKey('edge', sourceRange.from),
            kind: 'nested',
            sourceNodeKey: parentKey,
            targetNodeKey: child.key,
            certainty: certaintyForRelationOperator(operator),
            sourceRange,
            spans: Object.freeze({
              operator: rangeForSegment(
                line,
                line.indent,
                line.indent + operator.length,
              ),
              labelInsertionPoint: line.to,
            }),
          }),
        )
        break
      }

      case 'cross-relation': {
        const match =
          /^@([A-Za-z][A-Za-z0-9_-]*)[ \t]+([?!~]?->)[ \t]+@([A-Za-z][A-Za-z0-9_-]*)(?:[ \t]*:(.*))?[ \t]*$/.exec(
            line.content,
          )

        if (!match) {
          addDiagnostic('GNV005_UNRESOLVED_REFERENCE', sourceRange)
          break
        }

        const rawLabel = match[4]
        const label = rawLabel?.trim()
        const sourceRef = `@${match[1]!}`
        const operator = match[2]!
        const targetRef = `@${match[3]!}`
        const operatorColumn = line.content.indexOf(operator, sourceRef.length)
        const targetRefColumn = line.content.indexOf(
          targetRef,
          operatorColumn + operator.length,
        )
        const colonColumn = line.content.indexOf(
          ':',
          targetRefColumn + targetRef.length,
        )
        const labelColumn =
          label === undefined || rawLabel === undefined || colonColumn < 0
            ? undefined
            : colonColumn + 1 + rawLabel.indexOf(label)

        if (rawLabel !== undefined && label?.length === 0) {
          addDiagnostic('GNV012_EMPTY_RELATION_LABEL', sourceRange)
        }

        pendingCrossRelations.push({
          key: createKey('edge', sourceRange.from),
          sourceId: match[1]!,
          targetId: match[3]!,
          certainty: certaintyForRelationOperator(operator),
          ...(label === undefined || label.length === 0 ? {} : { label }),
          sourceRange,
          spans: Object.freeze({
            operator: rangeForSegment(
              line,
              operatorColumn,
              operatorColumn + operator.length,
            ),
            sourceRef: rangeForSegment(line, 0, sourceRef.length),
            targetRef: rangeForSegment(
              line,
              targetRefColumn,
              targetRefColumn + targetRef.length,
            ),
            ...(label === undefined || label.length === 0 || labelColumn === undefined
              ? {}
              : {
                  label: rangeForSegment(
                    line,
                    labelColumn,
                    labelColumn + label.length,
                  ),
                }),
            labelInsertionPoint: line.to,
          }),
        })
        break
      }

      case 'layout': {
        const match = /^@layout[ \t]+flow[ \t]+(TB|LR)[ \t]*$/.exec(line.content)

        if (!match) {
          addDiagnostic('GNV009_INVALID_LAYOUT', sourceRange)
          break
        }

        if (validLayoutCount > 0) {
          addDiagnostic('GNV010_DUPLICATE_LAYOUT', sourceRange)
        }

        validLayoutCount += 1
        layout = Object.freeze({
          key: createKey('layout', sourceRange.from),
          mode: 'flow',
          direction: match[1] as 'TB' | 'LR',
          sourceRange,
        })
        break
      }
    }
  }

  if (openGroup?.group) {
    openGroup.group.memberInsertionPoint = source.length
  }

  const firstNodeByExplicitId = new Map<string, ParsedNode>()

  for (const node of nodes) {
    if (!node.explicitId) {
      continue
    }

    const first = firstNodeByExplicitId.get(node.explicitId)

    if (first) {
      addDiagnostic('GNV004_DUPLICATE_ID', node.sourceRange, [first.sourceRange])
    } else {
      firstNodeByExplicitId.set(node.explicitId, node)
    }
  }

  const crossRelations: ParsedRelation[] = []

  for (const pending of pendingCrossRelations) {
    const sourceNode = firstNodeByExplicitId.get(pending.sourceId)
    const targetNode = firstNodeByExplicitId.get(pending.targetId)

    if (!sourceNode || !targetNode) {
      addDiagnostic('GNV005_UNRESOLVED_REFERENCE', pending.sourceRange)
      continue
    }

    crossRelations.push(
      Object.freeze({
        key: pending.key,
        kind: 'cross',
        sourceNodeKey: sourceNode.key,
        targetNodeKey: targetNode.key,
        certainty: pending.certainty,
        ...(pending.label === undefined ? {} : { label: pending.label }),
        sourceRange: pending.sourceRange,
        spans: pending.spans,
      }),
    )
  }

  for (const pending of pendingGroupReferences) {
    const node = firstNodeByExplicitId.get(pending.explicitId)

    if (!node) {
      addDiagnostic('GNV005_UNRESOLVED_REFERENCE', pending.sourceRange)
      continue
    }

    addGroupMember(pending.group, node.key)
  }

  const groups: ParsedGroup[] = mutableGroups.map((group) =>
    Object.freeze({
      key: group.key,
      name: group.name,
      memberNodeKeys: Object.freeze([...group.memberNodeKeys]),
      sourceRange: group.sourceRange,
      spans: Object.freeze({
        header: group.headerRange,
        name: group.nameRange,
        memberInsertionPoint: group.memberInsertionPoint,
      }),
    }),
  )

  const relations = [...nestedRelations, ...crossRelations].sort(
    (left, right) => left.sourceRange.from - right.sourceRange.from,
  )
  diagnostics.sort(
    (left, right) =>
      left.range.from - right.range.from || left.code.localeCompare(right.code),
  )

  return Object.freeze({
    documentRevision,
    nodes: Object.freeze(nodes),
    relations: Object.freeze(relations),
    groups: Object.freeze(groups),
    layout,
    diagnostics: Object.freeze(diagnostics),
  })
}
