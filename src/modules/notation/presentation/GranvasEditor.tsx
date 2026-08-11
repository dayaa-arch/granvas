import {
  EditorState,
  StateEffect,
  StateField,
  type Range,
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutter,
  keymap,
  placeholder,
  type DecorationSet,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import type {
  DiagnosticDto,
  SourceRangeDto,
} from '@/modules/notation/application/ParseNotation'
import type { SourceEditDto } from '@/modules/notation/application/PlanNotationEdit'

import './GranvasEditor.css'

export type EditorCursorDto = Readonly<{
  offset: number
  line: number
  column: number
}>

export type GranvasEditorProps = Readonly<{
  source: string
  diagnostics: readonly DiagnosticDto[]
  selectionRange?: SourceRangeDto
  onSourceChange(source: string): void
  onCursorChange(cursor: EditorCursorDto): void
}>

export type GranvasEditorHandle = Readonly<{
  applyEdits(
    edits: readonly SourceEditDto[],
    selectionRange?: SourceRangeDto,
  ): void
}>

const setDiagnostics = StateEffect.define<readonly DiagnosticDto[]>()

type DiagnosticPresentationState = Readonly<{
  decorations: DecorationSet
  diagnostics: readonly DiagnosticDto[]
}>

function addMatches(
  ranges: Range<Decoration>[],
  lineFrom: number,
  text: string,
  pattern: RegExp,
  className: string,
  capture = 0,
): void {
  for (const match of text.matchAll(pattern)) {
    const value = match[capture]
    const whole = match[0]

    if (value === undefined || match.index === undefined) {
      continue
    }

    const relative = capture === 0 ? 0 : whole.indexOf(value)
    const from = lineFrom + match.index + relative
    ranges.push(Decoration.mark({ class: className }).range(from, from + value.length))
  }
}

function syntaxDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = []

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber)
    const text = line.text
    addMatches(
      ranges,
      line.from,
      text,
      /\[[?!~]?[ \t]*([A-Za-z][A-Za-z0-9_-]*)/gu,
      'cm-gnv-type',
      1,
    )
    addMatches(ranges, line.from, text, /\[([?!~])/gu, 'cm-gnv-certainty', 1)
    addMatches(ranges, line.from, text, /([?!~])(?=->)/gu, 'cm-gnv-certainty', 1)
    addMatches(ranges, line.from, text, /@[A-Za-z][A-Za-z0-9_-]*/gu, 'cm-gnv-id')
    addMatches(ranges, line.from, text, /->/gu, 'cm-gnv-arrow')
    addMatches(ranges, line.from, text, /\{[^}\r\n]+\}/gu, 'cm-gnv-group')
    addMatches(ranges, line.from, text, /@layout\s+flow\s+(?:TB|LR)/gu, 'cm-gnv-layout')
    addMatches(ranges, line.from, text, /:\s*(.+)$/gu, 'cm-gnv-relation-label', 1)

    if (/^\s*(?:\[|@|\{|[?!~]?->)/u.test(text)) {
      ranges.push(Decoration.line({ class: 'cm-gnv-notation-line' }).range(line.from))
    }
  }

  return Decoration.set(ranges, true)
}

const syntaxField = StateField.define<DecorationSet>({
  create: syntaxDecorations,
  update(decorations, transaction) {
    return transaction.docChanged ? syntaxDecorations(transaction.state) : decorations
  },
  provide: (field) => EditorView.decorations.from(field),
})

function diagnosticDecorations(
  state: EditorState,
  diagnostics: readonly DiagnosticDto[],
): DecorationSet {
  const ranges = diagnostics.flatMap((diagnostic) => {
    const from = Math.max(0, Math.min(diagnostic.range.from, state.doc.length))
    const to = Math.max(from, Math.min(diagnostic.range.to, state.doc.length))

    if (from === to) {
      return []
    }

    return [
      Decoration.mark({
        class: `cm-gnv-diagnostic cm-gnv-diagnostic--${diagnostic.level}`,
        attributes: {
          title: `${diagnostic.code}: ${diagnostic.message}`,
          'aria-label': `${diagnostic.level}: ${diagnostic.message}`,
        },
      }).range(from, to),
    ]
  })

  return Decoration.set(ranges, true)
}

const diagnosticField = StateField.define<DiagnosticPresentationState>({
  create: () => Object.freeze({ decorations: Decoration.none, diagnostics: [] }),
  update(current, transaction) {
    let next: DiagnosticPresentationState = Object.freeze({
      decorations: transaction.docChanged
        ? current.decorations.map(transaction.changes)
        : current.decorations,
      diagnostics: current.diagnostics,
    })

    for (const effect of transaction.effects) {
      if (effect.is(setDiagnostics)) {
        next = Object.freeze({
          decorations: diagnosticDecorations(transaction.state, effect.value),
          diagnostics: effect.value,
        })
      }
    }

    return next
  },
  provide: (field) =>
    EditorView.decorations.from(field, ({ decorations }) => decorations),
})

class DiagnosticGutterMarker extends GutterMarker {
  readonly #diagnostic: DiagnosticDto

  constructor(diagnostic: DiagnosticDto) {
    super()
    this.#diagnostic = diagnostic
  }

  eq(other: DiagnosticGutterMarker): boolean {
    return (
      other.#diagnostic.code === this.#diagnostic.code &&
      other.#diagnostic.level === this.#diagnostic.level &&
      other.#diagnostic.message === this.#diagnostic.message
    )
  }

  toDOM(): Node {
    const marker = document.createElement('span')
    marker.className = `cm-gnv-gutter-marker cm-gnv-gutter-marker--${this.#diagnostic.level}`
    marker.title = `${this.#diagnostic.code}: ${this.#diagnostic.message}`
    marker.setAttribute(
      'aria-label',
      `${this.#diagnostic.level}: ${this.#diagnostic.message}`,
    )
    marker.textContent = '•'
    return marker
  }
}

const diagnosticGutter = gutter({
  class: 'cm-gnv-diagnostic-gutter',
  lineMarker(view, line) {
    const diagnostic = view.state
      .field(diagnosticField)
      .diagnostics.find(({ range }) => {
        const offset = Math.min(Math.max(range.from, 0), view.state.doc.length)
        return view.state.doc.lineAt(offset).from === line.from
      })

    return diagnostic ? new DiagnosticGutterMarker(diagnostic) : null
  },
  lineMarkerChange(update) {
    return (
      update.docChanged ||
      update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(setDiagnostics)),
      )
    )
  },
})

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--ink-900)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.72',
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: 'var(--accent-600)',
    padding: '20px 0 36px',
  },
  '.cm-line': {
    padding: '0 24px 0 12px',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--ink-300)',
    paddingLeft: '8px',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--accent-100) 55%, transparent)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--selection)',
  },
  '&.cm-focused': { outline: 'none' },
})

function cursorFromView(view: EditorView): EditorCursorDto {
  const offset = view.state.selection.main.head
  const line = view.state.doc.lineAt(offset)
  return Object.freeze({
    offset,
    line: line.number,
    column: offset - line.from,
  })
}

export const GranvasEditor = forwardRef<
  GranvasEditorHandle,
  GranvasEditorProps
>(function GranvasEditor(
  {
    source,
    diagnostics,
    selectionRange,
    onSourceChange,
    onCursorChange,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView>(null)
  const applyingExternalSourceRef = useRef(false)
  const onSourceChangeRef = useRef(onSourceChange)
  const onCursorChangeRef = useRef(onCursorChange)
  const initialSourceRef = useRef(source)

  useImperativeHandle(
    ref,
    () => ({
      applyEdits(edits, nextSelectionRange) {
        const view = viewRef.current

        if (!view || edits.length === 0) {
          return
        }

        applyingExternalSourceRef.current = true
        try {
          view.dispatch({
            changes: edits.map(({ from, to, insert }) => ({ from, to, insert })),
            ...(nextSelectionRange === undefined
              ? {}
              : {
                  selection: {
                    anchor: nextSelectionRange.from,
                    head: nextSelectionRange.to,
                  },
                }),
          })
        } finally {
          applyingExternalSourceRef.current = false
        }
      },
    }),
    [],
  )

  useEffect(() => {
    onSourceChangeRef.current = onSourceChange
    onCursorChangeRef.current = onCursorChange
  }, [onCursorChange, onSourceChange])

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialSourceRef.current,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            'aria-label': 'Granvas text editor',
            spellcheck: 'true',
          }),
          placeholder('Write thoughts. See structure.'),
          syntaxField,
          diagnosticField,
          diagnosticGutter,
          editorTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !applyingExternalSourceRef.current) {
              if (!update.view.composing) {
                onSourceChangeRef.current(update.state.doc.toString())
              }
            }

            if (update.selectionSet || update.docChanged) {
              onCursorChangeRef.current(cursorFromView(update.view))
            }
          }),
          EditorView.domEventHandlers({
            compositionend: (_event, currentView) => {
              queueMicrotask(() =>
                onSourceChangeRef.current(currentView.state.doc.toString()),
              )
            },
          }),
        ],
      }),
    })

    viewRef.current = view
    onCursorChangeRef.current(cursorFromView(view))

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current

    if (!view || view.state.doc.toString() === source) {
      return
    }

    applyingExternalSourceRef.current = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: source },
    })
    applyingExternalSourceRef.current = false
  }, [source])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setDiagnostics.of(diagnostics) })
  }, [diagnostics])

  useEffect(() => {
    const view = viewRef.current

    if (!view || !selectionRange) {
      return
    }

    const from = Math.min(selectionRange.from, view.state.doc.length)
    const to = Math.max(from, Math.min(selectionRange.to, view.state.doc.length))
    view.dispatch({
      selection: { anchor: from, head: to },
      effects: EditorView.scrollIntoView(from, { y: 'center' }),
    })
    view.focus()
  }, [selectionRange])

  return <div className="granvas-editor" ref={hostRef} />
})
