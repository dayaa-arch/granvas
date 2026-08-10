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
