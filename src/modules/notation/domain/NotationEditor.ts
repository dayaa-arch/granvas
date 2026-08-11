import type {
  NotationParseResult,
  ParsedNode,
  SourceRange,
} from './GranvasNotationParser'

export type SourceEdit = Readonly<{
  from: number
  to: number
  insert: string
}>

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
    }>
  | Readonly<{
      type: 'rejected'
      reason: NotationEditRejection
    }>

export type NotationEditCommand =
  | Readonly<{ type: 'set-node-label'; nodeKey: string; label: string }>
  | Readonly<{ type: 'set-node-type'; nodeKey: string; nodeType: string }>

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
  if (
    type.from < 0 ||
    type.to < type.from ||
    label.from < 0 ||
    label.to < label.from ||
    type.to > source.length ||
    label.to > source.length ||
    source.slice(type.from, type.to).toLowerCase() !== node.type ||
    source.slice(label.from, label.to) !== node.label
  ) {
    return undefined
  }

  return node
}

function applicable(
  node: ParsedNode,
  edit: SourceEdit | undefined,
): SourceEditPlan {
  return Object.freeze({
    type: 'applicable',
    edits: Object.freeze(edit === undefined ? [] : [Object.freeze(edit)]),
    caretAnchor: node.sourceRange.from,
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

  const normalizedLabel = label.trim()

  if (normalizedLabel.length === 0 || /[\r\n]/u.test(normalizedLabel)) {
    return reject(
      'invalid-value',
      'Node label must contain non-whitespace text on one line.',
      node.spans.label,
    )
  }

  if (normalizedLabel === node.label) {
    return applicable(node, undefined)
  }

  return applicable(node, {
    from: node.spans.label.from,
    to: node.spans.label.to,
    insert: normalizedLabel,
  })
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

  const normalizedType = nodeType.trim().toLowerCase()

  if (!/^[a-z][a-z0-9_-]*$/u.test(normalizedType)) {
    return reject(
      'invalid-value',
      'Node type must start with an ASCII letter and contain only letters, digits, hyphens, or underscores.',
      node.spans.type,
    )
  }

  if (normalizedType === node.type) {
    return applicable(node, undefined)
  }

  return applicable(node, {
    from: node.spans.type.from,
    to: node.spans.type.to,
    insert: normalizedType,
  })
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
): number {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new RangeError('Source offset must be a non-negative safe integer.')
  }

  let mapped = offset

  for (const edit of edits) {
    if (offset < edit.from) {
      break
    }

    if (offset <= edit.to) {
      return edit.from + edit.insert.length
    }

    mapped += edit.insert.length - (edit.to - edit.from)
  }

  return mapped
}
