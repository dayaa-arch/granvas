import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

class TestResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
  }

  observe(target: Element): void {
    this.#callback(
      [
        {
          target,
          contentRect: target.getBoundingClientRect(),
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        },
      ],
      this,
    )
  }

  unobserve(): void {}

  disconnect(): void {}
}

globalThis.ResizeObserver ??= TestResizeObserver

if (typeof window !== 'undefined' && !window.DOMMatrixReadOnly) {
  Object.defineProperty(window, 'DOMMatrixReadOnly', {
    configurable: true,
    value: class TestDOMMatrixReadOnly {
      readonly m22 = 1
    },
  })
}

if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [],
  })
}

if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => ({}),
    }),
  })
}
