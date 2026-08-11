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

export type GranvasApplication = Readonly<{
  productName: 'Granvas'
  version: '0.1'
  graphLayout: GraphLayoutPort
  transfer: TransferApplication
  workspace: WorkspaceApplication
}>

export function createApplication(): GranvasApplication {
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
  return Object.freeze({
    productName: 'Granvas',
    version: '0.1',
    graphLayout,
    transfer: createTransferApplication({
      projectFilePicker,
      fileDownload,
      graphExport,
    }),
    workspace: createWorkspaceApplication({
      graphLayout,
      source: DEFAULT_PROJECT_SOURCE,
    }),
  })
}
