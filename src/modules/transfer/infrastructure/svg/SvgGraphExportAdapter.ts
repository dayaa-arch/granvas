import {
  TransferApplicationError,
  type GraphExportPort,
  type RenderedGraphFileDto,
  type TransferGraphExportSceneDto,
  type TransferGraphNodeDto,
} from '@/modules/transfer/application/TransferApplication'

const SVG_NODE_RADIUS = 12
const SVG_FONT_FAMILY =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export function escapeXmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function assertFiniteGeometry(
  values: readonly number[],
  message: string,
): void {
  if (!values.every(Number.isFinite)) {
    throw new TransferApplicationError('graph-render-failed', message)
  }
}

function assertScene(scene: TransferGraphExportSceneDto): void {
  const { bounds, graph } = scene
  assertFiniteGeometry(
    [bounds.x, bounds.y, bounds.width, bounds.height],
    'SVG export bounds must be finite.',
  )

  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new TransferApplicationError(
      'graph-render-failed',
      'SVG export bounds must have a positive size.',
    )
  }

  if (scene.revision !== graph.revision) {
    throw new TransferApplicationError(
      'graph-render-failed',
      'SVG scene and Graph revisions must match.',
    )
  }

  const nodeIds = new Set<string>()
  for (const node of graph.nodes) {
    assertFiniteGeometry(
      [node.x, node.y, node.width, node.height],
      'SVG Node geometry must be finite.',
    )

    if (node.width <= 0 || node.height <= 0 || nodeIds.has(node.id)) {
      throw new TransferApplicationError(
        'graph-render-failed',
        'SVG Nodes must have unique IDs and positive bounds.',
      )
    }
    nodeIds.add(node.id)
  }

  for (const group of graph.groups) {
    assertFiniteGeometry(
      [group.x, group.y, group.width, group.height],
      'SVG Group geometry must be finite.',
    )

    if (group.width < 0 || group.height < 0) {
      throw new TransferApplicationError(
        'graph-render-failed',
        'SVG Group bounds must not be negative.',
      )
    }
  }

  if (
    graph.edges.some(
      (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target),
    )
  ) {
    throw new TransferApplicationError(
      'graph-render-failed',
      'SVG Edges must reference current Graph Nodes.',
    )
  }
}

function nodeCenter(node: TransferGraphNodeDto): Readonly<{ x: number; y: number }> {
  return Object.freeze({
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  })
}

function textLines(value: string, maximumCodePoints = 34): readonly string[] {
  const codePoints = Array.from(value.replace(/\s+/gu, ' ').trim())
  const lines: string[] = []

  for (let index = 0; index < codePoints.length; index += maximumCodePoints) {
    lines.push(codePoints.slice(index, index + maximumCodePoints).join(''))
  }

  return Object.freeze(lines.length === 0 ? [''] : lines)
}

function renderGroups(scene: TransferGraphExportSceneDto): string {
  return scene.graph.groups
    .filter(({ width, height }) => width > 0 && height > 0)
    .map(
      (group) => `<g>
  <rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="16" fill="#f4f1ff" stroke="#9d8ed0" stroke-width="1.5" stroke-dasharray="7 5"/>
  <text x="${group.x + 16}" y="${group.y + 24}" fill="#5b4c8d" font-size="13" font-weight="700">${escapeXmlText(group.name)}</text>
</g>`,
    )
    .join('\n')
}

function renderEdges(scene: TransferGraphExportSceneDto): string {
  const nodesById = new Map(scene.graph.nodes.map((node) => [node.id, node]))

  return scene.graph.edges
    .map((edge) => {
      const source = nodeCenter(nodesById.get(edge.source)!)
      const target = nodeCenter(nodesById.get(edge.target)!)
      const label = edge.label?.trim()
      const labelMarkup = label
        ? `<text x="${(source.x + target.x) / 2}" y="${(source.y + target.y) / 2 - 8}" text-anchor="middle" fill="#4d586a" font-size="12" paint-order="stroke" stroke="#ffffff" stroke-width="4">${escapeXmlText(label)}</text>`
        : ''

      return `<g>
  <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="#64748b" stroke-width="2" marker-end="url(#granvas-arrow)"/>
  ${labelMarkup}
</g>`
    })
    .join('\n')
}

function renderNodes(scene: TransferGraphExportSceneDto): string {
  return scene.graph.nodes
    .map((node) => {
      const lines = textLines(node.label)
      const firstLineY = node.y + 48 - ((lines.length - 1) * 16) / 2
      const label = lines
        .map(
          (line, index) =>
            `<tspan x="${node.x + 16}" y="${firstLineY + index * 16}">${escapeXmlText(line)}</tspan>`,
        )
        .join('')

      return `<g>
  <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${SVG_NODE_RADIUS}" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="${node.x + 16}" y="${node.y + 22}" fill="#64748b" font-size="11" font-weight="700" letter-spacing="0.6">${escapeXmlText(node.type.toLocaleUpperCase())}</text>
  <text fill="#172033" font-size="14" font-weight="600">${label}</text>
</g>`
    })
    .join('\n')
}

export function renderGraphSceneToSvg(scene: TransferGraphExportSceneDto): string {
  assertScene(scene)
  const { bounds } = scene

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="img" aria-label="Granvas graph export">
  <defs>
    <marker id="granvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="#ffffff"/>
  <g font-family="${SVG_FONT_FAMILY}">
    ${renderGroups(scene)}
    ${renderEdges(scene)}
    ${renderNodes(scene)}
  </g>
</svg>`
}

export class SvgGraphExportAdapter implements GraphExportPort {
  async render(
    scene: TransferGraphExportSceneDto,
    format: 'svg' | 'png' | 'pdf',
  ): Promise<RenderedGraphFileDto> {
    if (format !== 'svg') {
      throw new TransferApplicationError(
        'graph-render-failed',
        `The ${format.toUpperCase()} exporter is not configured.`,
      )
    }

    return Object.freeze({
      bytes: new TextEncoder().encode(renderGraphSceneToSvg(scene)),
      notices: Object.freeze([]),
    })
  }
}
