import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReactFlowGraphView, type PositionedGraphDto } from '@/modules/graph'

const graph: PositionedGraphDto = Object.freeze({
  revision: 2,
  nodes: Object.freeze([
    Object.freeze({
      id: 'node-problem',
      label: 'Customer information is scattered',
      type: 'problem',
      x: 0,
      y: 0,
      width: 240,
      height: 88,
    }),
    Object.freeze({
      id: 'node-idea',
      label: 'Unify notes',
      type: 'idea',
      x: 0,
      y: 180,
      width: 240,
      height: 88,
    }),
  ]),
  edges: Object.freeze([
    Object.freeze({
      id: 'edge-solves',
      source: 'node-idea',
      target: 'node-problem',
      label: 'solves',
    }),
  ]),
  groups: Object.freeze([
    Object.freeze({
      id: 'group-discovery',
      name: 'Discovery',
      memberNodeIds: Object.freeze(['node-problem']),
      x: -24,
      y: -24,
      width: 288,
      height: 136,
    }),
  ]),
})

describe('ReactFlowGraphView', () => {
  it('renders read-only accessible Nodes, Edges, Groups, and controls', async () => {
    render(
      <ReactFlowGraphView
        graph={graph}
        selectedNodeId="node-problem"
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )

    expect(
      await screen.findByRole('button', {
        name: 'problem: Customer information is scattered',
      }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'idea: Unify notes' })).toBeVisible()
    expect(screen.getByText('Discovery')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fit View' })).toBeVisible()
  })

  it('activates a Node with click, Enter, and Space', async () => {
    const onNodeActivate = vi.fn()
    render(
      <ReactFlowGraphView
        graph={graph}
        fitViewKey={1}
        status="ready"
        onNodeActivate={onNodeActivate}
        onClearSelection={vi.fn()}
      />,
    )
    const node = await screen.findByRole('button', { name: 'idea: Unify notes' })

    fireEvent.click(node)
    fireEvent.keyDown(node, { key: 'Enter' })
    fireEvent.keyDown(node, { key: ' ' })
    await waitFor(() => expect(onNodeActivate).toHaveBeenCalled())
    expect(onNodeActivate.mock.calls.every(([id]) => id === 'node-idea')).toBe(true)
  })
})
