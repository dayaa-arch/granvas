import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DownloadDialog } from '@/modules/transfer'

describe('DownloadDialog', () => {
  it('focuses the name, disables visual formats for an empty Graph, and closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <DownloadDialog
        open
        defaultFileName="untitled"
        canDownloadVisual={false}
        diagnosticsCount={0}
        onClose={onClose}
        onDownload={vi.fn()}
      />,
    )

    const name = screen.getByRole('textbox', { name: 'File name' })
    await waitFor(() => expect(name).toHaveFocus())
    expect(screen.getByRole('radio', { name: /SVG/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /PNG/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /PDF/ })).toBeDisabled()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('submits selected format/name and announces diagnostic projection scope', () => {
    const onDownload = vi.fn()
    render(
      <DownloadDialog
        open
        defaultFileName="project"
        canDownloadVisual
        diagnosticsCount={2}
        onClose={vi.fn()}
        onDownload={onDownload}
      />,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'File name' }), {
      target: { value: 'shared graph' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /SVG/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))

    expect(screen.getByRole('note')).toHaveTextContent(
      'visual formats include the valid projection only',
    )
    expect(onDownload).toHaveBeenCalledWith({
      name: 'shared graph',
      format: 'svg',
    })
  })
})
