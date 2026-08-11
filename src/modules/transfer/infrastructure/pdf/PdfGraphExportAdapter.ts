import {
  TransferApplicationError,
  type GraphExportPort,
  type RenderedGraphFileDto,
  type TransferGraphExportSceneDto,
} from '@/modules/transfer/application/TransferApplication'
import type { PngRasterPort } from '@/modules/transfer/infrastructure/canvas/CanvasPngGraphExportAdapter'

export const CSS_PIXEL_TO_PDF_POINT = 0.75

type PdfLibModule = typeof import('pdf-lib')

export type PdfLibraryLoader = () => Promise<PdfLibModule>

const loadPdfLibrary: PdfLibraryLoader = () => import('pdf-lib')

function renderingError(error: unknown): TransferApplicationError {
  if (error instanceof TransferApplicationError) {
    return error
  }

  return new TransferApplicationError(
    'graph-render-failed',
    error instanceof Error ? error.message : 'PDF rendering failed.',
  )
}

export class PdfGraphExportAdapter implements GraphExportPort {
  readonly #pngRaster: PngRasterPort
  readonly #loadLibrary: PdfLibraryLoader

  constructor(
    pngRaster: PngRasterPort,
    loadLibrary: PdfLibraryLoader = loadPdfLibrary,
  ) {
    this.#pngRaster = pngRaster
    this.#loadLibrary = loadLibrary
  }

  async render(
    scene: TransferGraphExportSceneDto,
    format: 'svg' | 'png' | 'pdf',
  ): Promise<RenderedGraphFileDto> {
    if (format !== 'pdf') {
      throw new TransferApplicationError(
        'graph-render-failed',
        `The ${format.toUpperCase()} exporter is not configured.`,
      )
    }

    try {
      const rasterized = await this.#pngRaster.rasterize(scene)
      const { PDFDocument, rgb } = await this.#loadLibrary()
      const document = await PDFDocument.create()
      const pageWidth = scene.bounds.width * CSS_PIXEL_TO_PDF_POINT
      const pageHeight = scene.bounds.height * CSS_PIXEL_TO_PDF_POINT
      const page = document.addPage([pageWidth, pageHeight])
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: rgb(1, 1, 1),
      })

      const png = await document.embedPng(rasterized.bytes)
      page.drawImage(png, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      })
      document.setTitle('Granvas Graph Export')
      document.setProducer('Granvas')
      document.setSubject(`Graph revision ${scene.revision}`)

      return Object.freeze({
        bytes: new Uint8Array(await document.save()),
        notices: rasterized.notices,
      })
    } catch (error) {
      throw renderingError(error)
    }
  }
}
