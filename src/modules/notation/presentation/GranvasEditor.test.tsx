import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  GranvasEditor,
  type DiagnosticDto,
  type GranvasEditorHandle,
} from '@/modules/notation'

describe('GranvasEditor', () => {
  it('renders source, syntax marks, line numbers, and soft diagnostics', async () => {
    const source = '[?problem @risk] Unsafe\n  !-> [cause] Cause'
    const diagnostics: readonly DiagnosticDto[] = [
      Object.freeze({
        code: 'GNV005_UNRESOLVED_REFERENCE',
        level: 'warning',
        message: 'Reference is unresolved.',
        range: Object.freeze({ from: 0, to: 22, line: 1, column: 0 }),
        documentRevision: 1,
      }),
    ]
    const onCursorChange = vi.fn()
    const { container } = render(
      <GranvasEditor
        source={source}
        diagnostics={diagnostics}
        onSourceChange={vi.fn()}
        onCursorChange={onCursorChange}
      />,
    )

    expect(await screen.findByRole('textbox', { name: 'Granvas text editor' })).toHaveTextContent(
      '[?problem @risk] Unsafe',
    )
    await waitFor(() => {
      expect(container.querySelector('.cm-gnv-type')).toHaveTextContent('problem')
      expect(container.querySelector('.cm-gnv-id')).toHaveTextContent('@risk')
      expect(container.querySelector('.cm-gnv-arrow')).toHaveTextContent('->')
      expect(
        [...container.querySelectorAll('.cm-gnv-certainty')].map(
          (element) => element.textContent,
        ),
      ).toEqual(['?', '!'])
      expect(container.querySelector('.cm-gnv-diagnostic')).toHaveAttribute(
        'title',
        'GNV005_UNRESOLVED_REFERENCE: Reference is unresolved.',
      )
      expect(container.querySelector('.cm-gnv-gutter-marker')).toHaveAttribute(
        'title',
        'GNV005_UNRESOLVED_REFERENCE: Reference is unresolved.',
      )
    })
    expect(onCursorChange).toHaveBeenCalledWith({ offset: 0, line: 1, column: 0 })
  })

  it('commits the current document after IME composition ends', async () => {
    const onSourceChange = vi.fn()
    render(
      <GranvasEditor
        source="日本語の思考"
        diagnostics={[]}
        onSourceChange={onSourceChange}
        onCursorChange={vi.fn()}
      />,
    )
    const editor = await screen.findByRole('textbox', {
      name: 'Granvas text editor',
    })

    fireEvent.compositionEnd(editor)
    await waitFor(() =>
      expect(onSourceChange).toHaveBeenCalledWith('日本語の思考'),
    )
  })

  it('applies multiple patches as one transaction without re-entering source change', async () => {
    const editorRef = createRef<GranvasEditorHandle>()
    const onSourceChange = vi.fn()
    render(
      <GranvasEditor
        ref={editorRef}
        source="[idea] Before"
        diagnostics={[]}
        onSourceChange={onSourceChange}
        onCursorChange={vi.fn()}
      />,
    )
    const editor = await screen.findByRole('textbox', {
      name: 'Granvas text editor',
    })

    act(() => {
      editorRef.current?.applyEdits([
        { from: 1, to: 5, insert: 'problem' },
        { from: 7, to: 13, insert: 'After' },
      ])
    })

    await waitFor(() => expect(editor).toHaveTextContent('[problem] After'))
    expect(onSourceChange).not.toHaveBeenCalled()

    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true })
    await waitFor(() => expect(editor).toHaveTextContent('[idea] Before'))
  })
})
