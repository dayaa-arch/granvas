import type { GraphLayoutPort } from '@/modules/graph'
import { DagreGraphLayoutWorkerAdapter } from '@/modules/graph/infrastructure/worker/DagreGraphLayoutWorkerAdapter'

export type GranvasApplication = Readonly<{
  productName: 'Granvas'
  version: '0.1'
  graphLayout: GraphLayoutPort
}>

export function createApplication(): GranvasApplication {
  return Object.freeze({
    productName: 'Granvas',
    version: '0.1',
    graphLayout: new DagreGraphLayoutWorkerAdapter(),
  })
}
