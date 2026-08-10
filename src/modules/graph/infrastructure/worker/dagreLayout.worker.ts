import { layoutGraphWithDagre } from '@/modules/graph/infrastructure/dagre/layoutGraphWithDagre'
import type {
  DagreWorkerRequest,
  DagreWorkerResponse,
} from '@/modules/graph/infrastructure/worker/DagreWorkerProtocol'

type WorkerScope = {
  addEventListener(
    type: 'message',
    listener: (event: Readonly<{ data: DagreWorkerRequest }>) => void,
  ): void
  postMessage(message: DagreWorkerResponse): void
}

const workerScope = self as unknown as WorkerScope

workerScope.addEventListener('message', ({ data }) => {
  try {
    workerScope.postMessage({
      requestId: data.requestId,
      status: 'success',
      output: layoutGraphWithDagre(data.input),
    })
  } catch (error) {
    workerScope.postMessage({
      requestId: data.requestId,
      status: 'failure',
      message: error instanceof Error ? error.message : 'Dagre layout failed.',
    })
  }
})
