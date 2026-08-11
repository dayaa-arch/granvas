import { describe, expect, it } from 'vitest'

import {
  createCancellationController,
  createGraphLayoutInput,
  createThoughtGraph,
} from '@/modules/graph'
import { layoutGraphWithDagre } from '@/modules/graph/infrastructure/dagre/layoutGraphWithDagre'
import {
  DagreGraphLayoutWorkerAdapter,
  type GraphLayoutWorker,
} from './DagreGraphLayoutWorkerAdapter'
import type { DagreWorkerRequest, DagreWorkerResponse } from './DagreWorkerProtocol'

class FakeWorker implements GraphLayoutWorker {
  readonly messageListeners = new Set<(event: { data: DagreWorkerResponse }) => void>()
  readonly errorListeners = new Set<(event: { message?: string }) => void>()
  terminated = false
  request?: DagreWorkerRequest
  onPost?: (request: DagreWorkerRequest) => void

  postMessage(message: DagreWorkerRequest): void {
    this.request = message
    this.onPost?.(message)
  }

  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: { data: DagreWorkerResponse }) => void)
      | ((event: { message?: string }) => void),
  ): void {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: { data: DagreWorkerResponse }) => void)
    } else {
      this.errorListeners.add(listener as (event: { message?: string }) => void)
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: { data: DagreWorkerResponse }) => void)
      | ((event: { message?: string }) => void),
  ): void {
    if (type === 'message') {
      this.messageListeners.delete(listener as (event: { data: DagreWorkerResponse }) => void)
    } else {
      this.errorListeners.delete(listener as (event: { message?: string }) => void)
    }
  }

  terminate(): void {
    this.terminated = true
  }

  respond(response: DagreWorkerResponse): void {
    for (const listener of this.messageListeners) {
      listener({ data: response })
    }
  }
}

const graph = createThoughtGraph({
  revision: 1,
  nodes: [{ key: 'a', type: 'node', label: 'A', certainty: 'neutral' }],
  relations: [],
  groups: [],
})
const input = createGraphLayoutInput(graph, 'TB')

describe('DagreGraphLayoutWorkerAdapter', () => {
  it('maps a successful worker response and terminates the worker', async () => {
    const worker = new FakeWorker()
    worker.onPost = (request) => {
      queueMicrotask(() =>
        worker.respond({
          requestId: request.requestId,
          status: 'success',
          output: layoutGraphWithDagre(request.input),
        }),
      )
    }
    const adapter = new DagreGraphLayoutWorkerAdapter(() => worker)

    await expect(adapter.layout(input)).resolves.toEqual(layoutGraphWithDagre(input))
    expect(worker.terminated).toBe(true)
  })

  it('maps failure responses to a typed error', async () => {
    const worker = new FakeWorker()
    worker.onPost = (request) => {
      queueMicrotask(() =>
        worker.respond({
          requestId: request.requestId,
          status: 'failure',
          message: 'worker failed',
        }),
      )
    }
    const adapter = new DagreGraphLayoutWorkerAdapter(() => worker)

    await expect(adapter.layout(input)).rejects.toMatchObject({
      code: 'layout-failed',
      message: 'worker failed',
    })
    expect(worker.terminated).toBe(true)
  })

  it('terminates the worker when cancellation is requested', async () => {
    const worker = new FakeWorker()
    const controller = createCancellationController()
    const adapter = new DagreGraphLayoutWorkerAdapter(() => worker)
    const pending = adapter.layout(input, controller.signal)

    controller.cancel()

    await expect(pending).rejects.toMatchObject({ code: 'layout-cancelled' })
    expect(worker.terminated).toBe(true)
  })
})
