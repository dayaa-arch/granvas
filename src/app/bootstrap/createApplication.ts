import type { GraphLayoutPort } from '@/modules/graph'
import { DagreGraphLayoutWorkerAdapter } from '@/modules/graph/infrastructure/worker/DagreGraphLayoutWorkerAdapter'
import { createTransferApplication, type TransferApplication } from '@/modules/transfer'
import { BrowserFileDownloadAdapter } from '@/modules/transfer/infrastructure/browser/BrowserFileDownloadAdapter'
import { BrowserProjectFilePickerAdapter } from '@/modules/transfer/infrastructure/browser/BrowserProjectFilePickerAdapter'
import { CanvasPngGraphExportAdapter } from '@/modules/transfer/infrastructure/canvas/CanvasPngGraphExportAdapter'
import { CompositeGraphExportAdapter } from '@/modules/transfer/infrastructure/CompositeGraphExportAdapter'
import { PdfGraphExportAdapter } from '@/modules/transfer/infrastructure/pdf/PdfGraphExportAdapter'
import { SvgGraphExportAdapter } from '@/modules/transfer/infrastructure/svg/SvgGraphExportAdapter'
import { createWorkspaceApplication, type WorkspaceApplication } from '@/modules/workspace'
import { DEFAULT_PROJECT_SOURCE } from '@/app/defaultProject'
import {
  createTemporaryProjectRecovery,
  type TemporaryProjectLoadResult,
  type TemporaryProjectStoragePort,
} from '@/modules/document'
import {
  BrowserLocalStorageTemporaryProjectAdapter,
  TEMPORARY_PROJECT_STORAGE_KEY,
} from '@/modules/document/infrastructure/browser/BrowserLocalStorageTemporaryProjectAdapter'
import type { GranvasProjectLaunch } from '@/app/projectLaunch'

export type CreateApplicationInput = Readonly<{
  temporaryProjectStorage?: TemporaryProjectStoragePort
  now?: () => number
  projectLaunch?: Extract<GranvasProjectLaunch, { type: 'isolated-project' }>
}>

export type GranvasApplication = Readonly<{
  productName: 'Granvas'
  version: '0.1.0'
  graphLayout: GraphLayoutPort
  transfer: TransferApplication
  workspace: WorkspaceApplication
  temporaryProjectLoad: TemporaryProjectLoadResult
}>

export function createApplication(
  input: CreateApplicationInput = {},
): GranvasApplication {
  const graphLayout = new DagreGraphLayoutWorkerAdapter()
  const projectFilePicker = new BrowserProjectFilePickerAdapter()
  const fileDownload = new BrowserFileDownloadAdapter()
  const svgGraphExport = new SvgGraphExportAdapter()
  const pngGraphExport = new CanvasPngGraphExportAdapter()
  const pdfGraphExport = new PdfGraphExportAdapter(pngGraphExport)
  const graphExport = new CompositeGraphExportAdapter(
    svgGraphExport,
    pngGraphExport,
    pdfGraphExport,
  )
  const temporaryProjectRecovery = createTemporaryProjectRecovery({
    storage:
      input.temporaryProjectStorage ??
      new BrowserLocalStorageTemporaryProjectAdapter(
        () => window.localStorage,
        input.projectLaunch === undefined
          ? undefined
          : `${TEMPORARY_PROJECT_STORAGE_KEY}:${input.projectLaunch.slotId}`,
      ),
    ...(input.now === undefined ? {} : { now: input.now }),
  })
  const temporaryProjectLoad = temporaryProjectRecovery.loadTemporaryProject()
  const recoveredProject =
    temporaryProjectLoad.type === 'restored'
      ? temporaryProjectLoad.project
      : undefined

  return Object.freeze({
    productName: 'Granvas',
    version: '0.1.0',
    graphLayout,
    temporaryProjectLoad,
    transfer: createTransferApplication({
      projectFilePicker,
      fileDownload,
      graphExport,
    }),
    workspace: createWorkspaceApplication({
      graphLayout,
      name: recoveredProject?.name ?? input.projectLaunch?.initialProject.name,
      source:
        recoveredProject?.source ??
        input.projectLaunch?.initialProject.source ??
        DEFAULT_PROJECT_SOURCE,
      initialDirty: recoveredProject?.dirty,
      temporaryProjectRecovery,
      initialTemporaryStorage:
        temporaryProjectLoad.type === 'restored'
          ? Object.freeze({
              type: 'stored',
              savedAt: temporaryProjectLoad.savedAt,
              expiresAt: temporaryProjectLoad.expiresAt,
            })
          : Object.freeze({
              type:
                temporaryProjectLoad.type === 'empty'
                  ? 'ready'
                  : 'unavailable',
            }),
    }),
  })
}
