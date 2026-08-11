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
  it('renders accessible Nodes, Edges, Groups, authoring toolbar, and controls', async () => {
    render(
      <ReactFlowGraphView
        graph={graph}
        selectedNodeId="node-problem"
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onNodeEdit={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )

    expect(
      await screen.findByRole('button', {
        name: '指定なし、problem：Customer information is scattered',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: '未確定、idea：Unify notes',
      }),
    ).toBeVisible()
    expect(screen.getByText('Discovery')).toBeVisible()
    expect(screen.getByRole('toolbar', { name: 'グラフを編集' })).toBeVisible()
    expect(screen.getByRole('button', { name: '子Nodeを追加' })).toBeVisible()
    expect(screen.getByRole('button', { name: '全体を表示' })).toBeVisible()
  })

  it('shows all certainty states without relying on color and exposes certainty names', async () => {
    const { container } = render(
      <ReactFlowGraphView
        graph={graph}
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onNodeEdit={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )

    await screen.findByRole('button', {
      name: '確定、todo：Validated action',
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
        onNodeEdit={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )
    const node = await screen.findByRole('button', {
      name: '未確定、idea：Unify notes',
    })

    fireEvent.click(node)
    fireEvent.keyDown(node, { key: 'Enter' })
    fireEvent.keyDown(node, { key: ' ' })
    await waitFor(() => expect(onNodeActivate).toHaveBeenCalled())
    expect(onNodeActivate.mock.calls.every(([id]) => id === 'node-idea')).toBe(true)
  })

  it('edits a label with double-click and ignores Enter during IME composition', async () => {
    const onNodeEdit = vi.fn()
    render(
      <ReactFlowGraphView
        graph={graph}
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onNodeEdit={onNodeEdit}
        onClearSelection={vi.fn()}
      />,
    )

    fireEvent.doubleClick(await screen.findByText('Unify notes'))
    const input = await screen.findByRole('textbox', {
      name: 'Unify notesのラベルを編集',
    })
    fireEvent.change(input, { target: { value: 'Unified knowledge' } })
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onNodeEdit).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(onNodeEdit).toHaveBeenCalledWith({
        graphNodeId: 'node-idea',
        field: 'label',
        value: 'Unified knowledge',
      }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: '未確定、idea：Unify notes',
        }),
      ).toHaveFocus(),
    )
  })

  it('edits Type with Shift+F2 and cancels with Escape', async () => {
    const onNodeEdit = vi.fn()
    render(
      <ReactFlowGraphView
        graph={graph}
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onNodeEdit={onNodeEdit}
        onClearSelection={vi.fn()}
      />,
    )
    const node = await screen.findByRole('button', {
      name: '指定なし、problem：Customer information is scattered',
    })

    fireEvent.keyDown(node, { key: 'F2', shiftKey: true })
    const input = await screen.findByRole('textbox', {
      name: 'Customer information is scatteredのTypeを編集',
    })
    fireEvent.change(input, { target: { value: 'question' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => expect(node).toHaveFocus())
    expect(onNodeEdit).not.toHaveBeenCalled()
  })

  it('creates a Node and changes certainty from keyboard-accessible controls', async () => {
    const onAuthoringCommand = vi.fn().mockResolvedValue(undefined)
    render(
      <ReactFlowGraphView
        graph={graph}
        selectedNodeId="node-problem"
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onNodeEdit={vi.fn()}
        onAuthoringCommand={onAuthoringCommand}
        onClearSelection={vi.fn()}
      />,
    )

    fireEvent.change(
      await screen.findByLabelText(
        '「Customer information is scattered」の確信度',
      ),
      { target: { value: 'confirmed' } },
    )
    expect(onAuthoringCommand).toHaveBeenCalledWith({
      type: 'set-node-certainty',
      graphNodeId: 'node-problem',
      certainty: 'confirmed',
    })

    fireEvent.click(screen.getByRole('button', { name: '＋ Nodeを作成' }))
    expect(await screen.findByRole('dialog', { name: 'Nodeを作成' })).toBeVisible()
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Idea' } })
    fireEvent.change(screen.getByLabelText('ラベル'), {
      target: { value: 'New thought 😀' },
    })
    fireEvent.click(screen.getByRole('button', { name: '反映' }))

    await waitFor(() =>
      expect(onAuthoringCommand).toHaveBeenCalledWith({
        type: 'create-node',
        nodeType: 'Idea',
        label: 'New thought 😀',
      }),
    )
  })

  it('shows delete impact, traps the decision in a dialog, and cancels with Escape', async () => {
    const onDeletePreview = vi.fn().mockResolvedValue({
      type: 'available',
      impact: {
        type: 'node',
        nodeLabels: ['Unify notes', 'Nested child'],
        nodeCount: 2,
        relationCount: 1,
        groupReferenceCount: 1,
      },
    })
    render(
      <ReactFlowGraphView
        graph={graph}
        fitViewKey={1}
        status="ready"
        onNodeActivate={vi.fn()}
        onNodeEdit={vi.fn()}
        onAuthoringCommand={vi.fn()}
        onDeletePreview={onDeletePreview}
        onClearSelection={vi.fn()}
      />,
    )
    const node = await screen.findByRole('button', {
      name: '未確定、idea：Unify notes',
    })
    node.focus()
    fireEvent.keyDown(node, { key: 'Delete' })

    expect(
      await screen.findByRole('dialog', { name: '削除内容を確認' }),
    ).toBeVisible()
    expect(onDeletePreview).toHaveBeenCalledWith({
      type: 'node',
      graphNodeId: 'node-idea',
    })
    expect(await screen.findByText('Node 2件')).toBeVisible()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(node).toHaveFocus())
  })
})
