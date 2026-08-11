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
      certainty: 'neutral',
      x: 0,
      y: 0,
      width: 240,
      height: 88,
    }),
    Object.freeze({
      id: 'node-idea',
      label: 'Unify notes',
      type: 'idea',
      certainty: 'tentative',
      x: 0,
      y: 180,
      width: 240,
      height: 88,
    }),
    Object.freeze({
      id: 'node-confirmed',
      label: 'Validated action',
      type: 'todo',
      certainty: 'confirmed',
      x: 300,
      y: 0,
      width: 240,
      height: 88,
    }),
    Object.freeze({
      id: 'node-rejected',
      label: 'Discarded cause',
      type: 'cause',
      certainty: 'rejected',
      x: 300,
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
      certainty: 'neutral',
    }),
    Object.freeze({
      id: 'edge-tentative',
      source: 'node-idea',
      target: 'node-confirmed',
      certainty: 'tentative',
    }),
    Object.freeze({
      id: 'edge-confirmed',
      source: 'node-confirmed',
      target: 'node-problem',
      certainty: 'confirmed',
    }),
    Object.freeze({
      id: 'edge-rejected',
      source: 'node-rejected',
      target: 'node-problem',
      certainty: 'rejected',
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
        name: 'neutral certainty, problem: Customer information is scattered',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: 'tentative certainty, idea: Unify notes',
      }),
    ).toBeVisible()
    expect(screen.getByText('Discovery')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fit View' })).toBeVisible()
  })

  it('shows all certainty states without relying on color and exposes certainty names', async () => {
    const { container } = render(
      <ReactFlowGraphView
        graph={graph}
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )

    await screen.findByRole('button', {
      name: 'confirmed certainty, todo: Validated action',
    })
    expect(screen.getByText('?')).toBeVisible()
    expect(screen.getByText('✓')).toBeVisible()
    expect(screen.getByText('×')).toBeVisible()
    expect(container.querySelector('.graph-node--certainty-neutral')).not.toBeNull()
    expect(container.querySelector('.graph-node--certainty-tentative')).not.toBeNull()
    expect(container.querySelector('.graph-node--certainty-confirmed')).not.toBeNull()
    expect(container.querySelector('.graph-node--certainty-rejected')).not.toBeNull()
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
    const node = await screen.findByRole('button', {
      name: 'tentative certainty, idea: Unify notes',
    })

    fireEvent.click(node)
    fireEvent.keyDown(node, { key: 'Enter' })
    fireEvent.keyDown(node, { key: ' ' })
    await waitFor(() => expect(onNodeActivate).toHaveBeenCalled())
    expect(onNodeActivate.mock.calls.every(([id]) => id === 'node-idea')).toBe(true)
  })
})
