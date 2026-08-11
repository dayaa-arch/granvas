import { describe, expect, it } from 'vitest'

import {
  classifyNotationCandidate,
  scanSourceLines,
  type NotationCandidateKind,
} from './SourceText'

describe('scanSourceLines', () => {
  it('preserves UTF-16 offsets and LF / CRLF line endings', () => {
    const lines = scanSourceLines('😀\r\n  -> [cause] B\n')

    expect(lines).toEqual([
      {
        number: 1,
        from: 0,
        to: 2,
        text: '😀',
        lineEnding: '\r\n',
        indent: 0,
        leadingWhitespace: '',
        content: '😀',
        blank: false,
      },
      {
        number: 2,
        from: 4,
        to: 18,
        text: '  -> [cause] B',
        lineEnding: '\n',
        indent: 2,
        leadingWhitespace: '  ',
        content: '-> [cause] B',
        blank: false,
      },
      {
        number: 3,
        from: 19,
        to: 19,
        text: '',
        lineEnding: '',
        indent: 0,
        leadingWhitespace: '',
        content: '',
        blank: true,
      },
    ])
    expect(Object.isFrozen(lines)).toBe(true)
  })

  it('returns one empty line for an empty source', () => {
    expect(scanSourceLines('')).toHaveLength(1)
    expect(scanSourceLines('')[0]).toMatchObject({ from: 0, to: 0, blank: true })
  })
})

describe('classifyNotationCandidate', () => {
  function classify(source: string, groupOpen = false): NotationCandidateKind {
    return classifyNotationCandidate(scanSourceLines(source)[0]!, groupOpen).kind
  }

  it('classifies top-level notation commit points', () => {
    expect(classify('[problem] A')).toBe('node')
    expect(classify('  -> [cause] B')).toBe('nested-relation')
    expect(classify('  ?-> [cause] B')).toBe('nested-relation')
    expect(classify('  !-> [cause] B')).toBe('nested-relation')
    expect(classify('  ~-> [cause] B')).toBe('nested-relation')
    expect(classify('  ?->')).toBe('nested-relation')
    expect(classify('@a -> @b')).toBe('cross-relation')
    expect(classify('@a ?-> @b')).toBe('cross-relation')
    expect(classify('@layout flow TB')).toBe('layout')
    expect(classify('{Group}')).toBe('group-header')
    expect(classify('# Plain text')).toBe('plain-text')
    expect(classify('[problem')).toBe('node')
  })

  it('classifies Group members without closing on indented plain text', () => {
    expect(classify('  [problem] A', true)).toBe('group-node')
    expect(classify('  @a', true)).toBe('group-reference')
    expect(classify('    -> [cause] B', true)).toBe('nested-relation')
    expect(classify('    ?-> [cause] B', true)).toBe('nested-relation')
    expect(classify('  {Nested}', true)).toBe('nested-group')
    expect(classify('  ordinary text', true)).toBe('plain-text')
    expect(
      classifyNotationCandidate(scanSourceLines('ordinary text')[0]!, true),
    ).toEqual({ kind: 'plain-text', closesGroup: true })
  })

  it('commits invalid indentation and tab candidates', () => {
    expect(classify('   [problem] A')).toBe('invalid-indent')
    expect(classify('\t[problem] A')).toBe('tab-indent')
    expect(classify('\tordinary text')).toBe('plain-text')
  })
})
