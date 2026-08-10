export type SourceLine = Readonly<{
  number: number
  from: number
  to: number
  text: string
  lineEnding: '' | '\n' | '\r\n'
  indent: number
  leadingWhitespace: string
  content: string
  blank: boolean
}>

export type NotationCandidateKind =
  | 'blank'
  | 'plain-text'
  | 'node'
  | 'nested-relation'
  | 'cross-relation'
  | 'group-header'
  | 'layout'
  | 'group-node'
  | 'group-reference'
  | 'nested-group'
  | 'invalid-indent'
  | 'tab-indent'

export type NotationCandidate = Readonly<{
  kind: NotationCandidateKind
  closesGroup: boolean
}>

function createSourceLine(
  source: string,
  number: number,
  from: number,
  to: number,
  lineEnding: SourceLine['lineEnding'],
): SourceLine {
  const text = source.slice(from, to)
  const leadingWhitespace = text.match(/^[ \t]*/)?.[0] ?? ''

  return Object.freeze({
    number,
    from,
    to,
    text,
    lineEnding,
    indent: leadingWhitespace.length,
    leadingWhitespace,
    content: text.slice(leadingWhitespace.length),
    blank: /^[ \t]*$/.test(text),
  })
}

export function scanSourceLines(source: string): readonly SourceLine[] {
  const lines: SourceLine[] = []
  let from = 0
  let lineNumber = 1

  while (from < source.length) {
    const newline = source.indexOf('\n', from)

    if (newline === -1) {
      lines.push(createSourceLine(source, lineNumber, from, source.length, ''))
      break
    }

    const hasCarriageReturn = newline > from && source[newline - 1] === '\r'
    const to = hasCarriageReturn ? newline - 1 : newline
    const lineEnding = hasCarriageReturn ? '\r\n' : '\n'
    lines.push(createSourceLine(source, lineNumber, from, to, lineEnding))
    from = newline + 1
    lineNumber += 1
  }

  if (source.length === 0 || source.endsWith('\n')) {
    lines.push(createSourceLine(source, lineNumber, source.length, source.length, ''))
  }

  return Object.freeze(lines)
}

function startsReservedContent(content: string): boolean {
  return (
    content.startsWith('[') ||
    content.startsWith('@') ||
    content.startsWith('{') ||
    content.startsWith('->')
  )
}

export function classifyNotationCandidate(
  line: SourceLine,
  groupOpen: boolean,
): NotationCandidate {
  if (line.blank) {
    return Object.freeze({ kind: 'blank', closesGroup: false })
  }

  const closesGroup = groupOpen && line.indent === 0
  const insideGroup = groupOpen && !closesGroup

  if (line.leadingWhitespace.includes('\t') && startsReservedContent(line.content)) {
    return Object.freeze({ kind: 'tab-indent', closesGroup })
  }

  if (insideGroup) {
    if (line.content.startsWith('->')) {
      return Object.freeze({ kind: 'nested-relation', closesGroup: false })
    }

    if (line.content.startsWith('{')) {
      return Object.freeze({ kind: 'nested-group', closesGroup: false })
    }

    if (line.content.startsWith('[')) {
      return Object.freeze({ kind: 'group-node', closesGroup: false })
    }

    if (line.content.startsWith('@')) {
      return Object.freeze({ kind: 'group-reference', closesGroup: false })
    }

    return Object.freeze({ kind: 'plain-text', closesGroup: false })
  }

  if (line.indent === 0) {
    if (line.content.startsWith('[')) {
      return Object.freeze({ kind: 'node', closesGroup })
    }

    if (line.content.startsWith('@layout')) {
      return Object.freeze({ kind: 'layout', closesGroup })
    }

    if (line.content.startsWith('@') && line.content.includes('->')) {
      return Object.freeze({ kind: 'cross-relation', closesGroup })
    }

    if (line.content.startsWith('{')) {
      return Object.freeze({ kind: 'group-header', closesGroup })
    }

    return Object.freeze({ kind: 'plain-text', closesGroup })
  }

  if (line.content.startsWith('->')) {
    return Object.freeze({ kind: 'nested-relation', closesGroup })
  }

  if (
    line.content.startsWith('[') ||
    line.content.startsWith('@') ||
    line.content.startsWith('{')
  ) {
    return Object.freeze({ kind: 'invalid-indent', closesGroup })
  }

  return Object.freeze({ kind: 'plain-text', closesGroup })
}
