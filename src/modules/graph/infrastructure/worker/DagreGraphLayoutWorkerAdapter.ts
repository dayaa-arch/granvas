import {
  GraphApplicationError,
  type CancellationSignal,
  type GraphLayoutInputDto,
  type GraphLayoutPort,
  type PositionedGraphDto,
} from '@/modules/graph/application/GraphApplication'
import type {
  DagreWorkerRequest,
  DagreWorkerResponse,
} from '@/modules/graph/infrastructure/worker/DagreWorkerProtocol'

type MessageListener = (event: Readonly<{ data: DagreWorkerResponse }>) => void
type ErrorListener = (event: Readonly<{ message?: string }>) => void

export interface GraphLayoutWorker {
  postMessage(message: DagreWorkerRequest): void
  addEventListener(type: 'message', listener: MessageListener): void
  addEventListener(type: 'error', listener: ErrorListener): void
  removeEventListener(type: 'message', listener: MessageListener): void
  removeEventListener(type: 'error', listener: ErrorListener): void
  terminate(): void
}

export type GraphLayoutWorkerFactory = () => GraphLayoutWorker

function createBrowserWorker(): GraphLayoutWorker {
  return new Worker(new URL('./dagreLayout.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as GraphLayoutWorker
}

let nextRequestId = 1

export class DagreGraphLayoutWorkerAdapter implements GraphLayoutPort {
  readonly #createWorker: GraphLayoutWorkerFactory

  constructor(createWorker: GraphLayoutWorkerFactory = createBrowserWorker) {
    this.#createWorker = createWorker
  }

  layout(
    input: GraphLayoutInputDto,
    signal?: CancellationSignal,
  ): Promise<PositionedGraphDto> {
    if (signal?.cancelled) {
      return Promise.reject(
        new GraphApplicationError('layout-cancelled', 'Graph layout was cancelled.'),
      )
    }

    const worker = this.#createWorker()
    const requestId = nextRequestId++

    return new Promise<PositionedGraphDto>((resolve, reject) => {
      let settled = false
      let unsubscribe: () => void = () => undefined

      const cleanup = () => {
        unsubscribe()
        worker.removeEventListener('message', handleMessage)
        worker.removeEventListener('error', handleError)
        worker.terminate()
      }

      const finish = (action: () => void) => {
        if (settled) {
          return
        }

        settled = true
        cleanup()
        action()
      }

      const handleMessage: MessageListener = ({ data }) => {
        if (data.requestId !== requestId) {
          return
        }

        if (data.status === 'failure') {
          finish(() =>
            reject(new GraphApplicationError('layout-failed', data.message)),
          )
          return
        }

        finish(() => resolve(data.output))
      }

      const handleError: ErrorListener = ({ message }) => {
        finish(() =>
          reject(
            new GraphApplicationError(
              'layout-failed',
              message ?? 'Graph layout worker failed.',
            ),
          ),
        )
      }

      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)
      unsubscribe =
        signal?.onCancel(() => {
          finish(() =>
            reject(
              new GraphApplicationError(
                'layout-cancelled',
                'Graph layout was cancelled.',
              ),
            ),
          )
        }) ?? unsubscribe

      try {
        worker.postMessage({ requestId, input })
      } catch (error) {
        finish(() =>
          reject(
            new GraphApplicationError(
              'layout-failed',
              error instanceof Error ? error.message : 'Unable to start graph layout.',
            ),
          ),
        )
      }
    })
  }
}
