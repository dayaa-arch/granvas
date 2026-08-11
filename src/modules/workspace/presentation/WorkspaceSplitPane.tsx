import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

import './WorkspaceSplitPane.css'

export type WorkspaceSplitPaneProps = Readonly<{
  textPane: ReactNode
  graphPane: ReactNode
  initialRatio?: number
}>

const MIN_TEXT_RATIO = 30
const MAX_TEXT_RATIO = 72

function clampRatio(value: number): number {
  return Math.min(MAX_TEXT_RATIO, Math.max(MIN_TEXT_RATIO, value))
}

export function WorkspaceSplitPane({
  textPane,
  graphPane,
  initialRatio = 55,
}: WorkspaceSplitPaneProps) {
  const [textRatio, setTextRatio] = useState(() => clampRatio(initialRatio))
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !containerRef.current) {
      return
    }

    const bounds = containerRef.current.getBoundingClientRect()

    if (bounds.width <= 0) {
      return
    }

    setTextRatio(clampRatio(((event.clientX - bounds.left) / bounds.width) * 100))
  }

  return (
    <div
      className="workspace-split"
      ref={containerRef}
      style={{ '--text-pane-ratio': `${textRatio}%` } as React.CSSProperties}
    >
      <section className="workspace-split__pane" aria-label="テキストペイン">
        {textPane}
      </section>
      <div
        className="workspace-split__divider"
        role="separator"
        aria-label="テキストとグラフの表示幅を変更"
        aria-orientation="vertical"
        aria-valuemin={MIN_TEXT_RATIO}
        aria-valuemax={MAX_TEXT_RATIO}
        aria-valuenow={Math.round(textRatio)}
        tabIndex={0}
        onDoubleClick={() => setTextRatio(55)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            setTextRatio((current) =>
              clampRatio(current + (event.key === 'ArrowLeft' ? -2 : 2)),
            )
          }

          if (event.key === 'Home') {
            event.preventDefault()
            setTextRatio(MIN_TEXT_RATIO)
          }

          if (event.key === 'End') {
            event.preventDefault()
            setTextRatio(MAX_TEXT_RATIO)
          }
        }}
        onPointerDown={(event) => {
          draggingRef.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={updateFromPointer}
        onPointerUp={(event) => {
          draggingRef.current = false
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          draggingRef.current = false
        }}
      >
        <span aria-hidden="true" />
      </div>
      <section className="workspace-split__pane" aria-label="グラフペイン">
        {graphPane}
      </section>
    </div>
  )
}
