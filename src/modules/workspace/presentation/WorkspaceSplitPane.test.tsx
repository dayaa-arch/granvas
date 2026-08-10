import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WorkspaceSplitPane } from '@/modules/workspace'

describe('WorkspaceSplitPane', () => {
  it('starts at 55/45 and supports keyboard resizing and reset', () => {
    render(
      <WorkspaceSplitPane
        textPane={<div>Editor</div>}
        graphPane={<div>Graph</div>}
      />,
    )
    const divider = screen.getByRole('separator', {
      name: 'Resize Text and Graph panes',
    })

    expect(divider).toHaveAttribute('aria-valuenow', '55')
    fireEvent.keyDown(divider, { key: 'ArrowRight' })
    expect(divider).toHaveAttribute('aria-valuenow', '57')
    fireEvent.keyDown(divider, { key: 'Home' })
    expect(divider).toHaveAttribute('aria-valuenow', '30')
    fireEvent.keyDown(divider, { key: 'End' })
    expect(divider).toHaveAttribute('aria-valuenow', '72')
    fireEvent.doubleClick(divider)
    expect(divider).toHaveAttribute('aria-valuenow', '55')
  })

  it('publishes labeled Text and Graph regions', () => {
    render(
      <WorkspaceSplitPane
        textPane={<div>Editor body</div>}
        graphPane={<div>Graph body</div>}
      />,
    )

    expect(screen.getByRole('region', { name: 'Text pane' })).toHaveTextContent(
      'Editor body',
    )
    expect(screen.getByRole('region', { name: 'Graph pane' })).toHaveTextContent(
      'Graph body',
    )
  })
})
