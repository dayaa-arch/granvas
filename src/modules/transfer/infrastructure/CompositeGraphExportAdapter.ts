import {
  TransferApplicationError,
  type GraphExportPort,
  type RenderedGraphFileDto,
  type TransferGraphExportSceneDto,
} from '@/modules/transfer/application/TransferApplication'
import type { VisualDownloadFormat } from '@/modules/transfer/domain/TransferPolicy'

export class CompositeGraphExportAdapter implements GraphExportPort {
  readonly #exporters: Readonly<Record<VisualDownloadFormat, GraphExportPort>>

  constructor(
    svg: GraphExportPort,
    png: GraphExportPort,
    pdf: GraphExportPort,
  ) {
    this.#exporters = Object.freeze({ svg, png, pdf })
  }

  async render(
    scene: TransferGraphExportSceneDto,
    format: VisualDownloadFormat,
  ): Promise<RenderedGraphFileDto> {
    const exporter = this.#exporters[format]
    if (exporter === undefined) {
      throw new TransferApplicationError(
        'graph-render-failed',
        `Unsupported Graph export format: ${String(format)}`,
      )
    }

    return exporter.render(scene, format)
  }
}
