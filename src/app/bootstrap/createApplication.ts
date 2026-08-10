import type { GraphLayoutPort } from '@/modules/graph'
import { DagreGraphLayoutWorkerAdapter } from '@/modules/graph/infrastructure/worker/DagreGraphLayoutWorkerAdapter'
import { createWorkspaceApplication, type WorkspaceApplication } from '@/modules/workspace'

export type GranvasApplication = Readonly<{
  productName: 'Granvas'
  version: '0.1'
  graphLayout: GraphLayoutPort
  workspace: WorkspaceApplication
}>

export function createApplication(): GranvasApplication {
  const graphLayout = new DagreGraphLayoutWorkerAdapter()
  return Object.freeze({
    productName: 'Granvas',
    version: '0.1',
    graphLayout,
    workspace: createWorkspaceApplication({ graphLayout }),
  })
}
