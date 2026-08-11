import {
  TransferApplicationError,
  type GraphExportPort,
  type RenderedGraphFileDto,
  type TransferGraphCertaintyDto,
  type TransferGraphExportSceneDto,
  type TransferGraphNodeDto,
} from '@/modules/transfer/application/TransferApplication'

const SVG_NODE_RADIUS = 12
const SVG_FONT_FAMILY =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

type CertaintyStyle = Readonly<{
  label: string
  badge?: string
  strokeWidth: number
  dashArray?: string
  opacity: number
  textDecoration?: 'line-through'
}>

const CERTAINTY_STYLES: Readonly<
  Record<TransferGraphCertaintyDto, CertaintyStyle>
> = Object.freeze({
  neutral: Object.freeze({
    label: '指定なし',
    strokeWidth: 1.8,
    opacity: 1,
  }),
  tentative: Object.freeze({
    label: '未確定',
    badge: '?',
    strokeWidth: 2,
    dashArray: '8 6',
    opacity: 1,
  }),
  confirmed: Object.freeze({
    label: '確定',
    badge: '✓',
    strokeWidth: 3,
    opacity: 1,
  }),
  rejected: Object.freeze({
    label: '棄却',
    badge: '×',
    strokeWidth: 2,
    dashArray: '4 4',
    opacity: 0.62,
    textDecoration: 'line-through',
  }),
})

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

function isCertainty(value: string): value is TransferGraphCertaintyDto {
  return Object.hasOwn(CERTAINTY_STYLES, value)
}

export function assertGraphExportScene(
  scene: TransferGraphExportSceneDto,
): void {
  const { bounds, graph } = scene
  assertFiniteGeometry(
    [bounds.x, bounds.y, bounds.width, bounds.height],
    'Graph export bounds must be finite.',
  )

  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new TransferApplicationError(
      'graph-render-failed',
      'Graph export bounds must have a positive size.',
    )
  }

  if (scene.revision !== graph.revision) {
    throw new TransferApplicationError(
      'graph-render-failed',
      'Graph export scene revision must match its Graph revision.',
    )
  }

  const nodeIds = new Set<string>()
  for (const node of graph.nodes) {
    assertFiniteGeometry(
      [node.x, node.y, node.width, node.height],
      'Graph export Node geometry must be finite.',
    )

    if (
      node.width <= 0 ||
      node.height <= 0 ||
      nodeIds.has(node.id) ||
      !isCertainty(node.certainty)
    ) {
      throw new TransferApplicationError(
        'graph-render-failed',
        'Graph export Nodes must have unique IDs, positive bounds, and valid certainty.',
      )
    }
    nodeIds.add(node.id)
  }

  const edgeIds = new Set<string>()
  for (const edge of graph.edges) {
    if (
      edgeIds.has(edge.id) ||
      !nodeIds.has(edge.source) ||
      !nodeIds.has(edge.target) ||
      !isCertainty(edge.certainty)
    ) {
      throw new TransferApplicationError(
        'graph-render-failed',
        'Graph export Edges must have unique IDs, valid certainty, and reference current Nodes.',
      )
    }
    edgeIds.add(edge.id)
  }

  const groupIds = new Set<string>()
  for (const group of graph.groups) {
    assertFiniteGeometry(
      [group.x, group.y, group.width, group.height],
      'Graph export Group geometry must be finite.',
    )

    if (
      group.width < 0 ||
      group.height < 0 ||
      groupIds.has(group.id) ||
      group.memberNodeIds.some((nodeId) => !nodeIds.has(nodeId))
    ) {
      throw new TransferApplicationError(
        'graph-render-failed',
        'Graph export Groups must have unique IDs, non-negative bounds, and current members.',
      )
    }
    groupIds.add(group.id)
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

  return Object.freeze(lines.length === 0 ? [''] : lines.slice(0, 3))
}

function optionalAttribute(name: string, value: string | undefined): string {
  return value === undefined ? '' : ` ${name}="${value}"`
}

function renderGroups(scene: TransferGraphExportSceneDto): string {
  return scene.graph.groups
    .filter(({ width, height }) => width > 0 && height > 0)
    .map(
      (group) => `<g data-kind="group">
  <rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="16" fill="#f4f1ff" stroke="#7564a8" stroke-width="1.5" stroke-dasharray="7 5"/>
  <text x="${group.x + 16}" y="${group.y + 24}" fill="#493b78" font-size="13" font-weight="700">${escapeXmlText(group.name)}</text>
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
      const midpoint = {
        x: (source.x + target.x) / 2,
        y: (source.y + target.y) / 2,
      }
      const label = edge.label?.trim()
      const style = CERTAINTY_STYLES[edge.certainty]
      const labelMarkup = label
        ? `<text x="${midpoint.x}" y="${midpoint.y - 8}" text-anchor="middle" fill="#354052" font-size="12" paint-order="stroke" stroke="#ffffff" stroke-width="4"${optionalAttribute('text-decoration', style.textDecoration)}>${escapeXmlText(label)}</text>`
        : ''
      const badgeMarkup = style.badge
        ? `<text x="${midpoint.x + 8}" y="${midpoint.y + 14}" fill="#354052" font-size="13" font-weight="800">${style.badge}</text>`
        : ''

      return `<g data-kind="edge" data-certainty="${edge.certainty}" aria-label="${escapeXmlText(`${style.label}のRelation${label ? `：${label}` : ''}`)}" opacity="${style.opacity}">
  <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="#526071" stroke-width="${style.strokeWidth}"${optionalAttribute('stroke-dasharray', style.dashArray)} marker-end="url(#granvas-arrow)"/>
  ${labelMarkup}
  ${badgeMarkup}
</g>`
    })
    .join('\n')
}

function renderNodes(scene: TransferGraphExportSceneDto): string {
  return scene.graph.nodes
    .map((node) => {
      const lines = textLines(node.label)
      const firstLineY = node.y + 48 - ((lines.length - 1) * 16) / 2
      const style = CERTAINTY_STYLES[node.certainty]
      const label = lines
        .map(
          (line, index) =>
            `<tspan x="${node.x + 16}" y="${firstLineY + index * 16}">${escapeXmlText(line)}</tspan>`,
        )
        .join('')
      const badge = style.badge
        ? `<text x="${node.x + node.width - 18}" y="${node.y + 23}" text-anchor="middle" fill="#354052" font-size="14" font-weight="800">${style.badge}</text>`
        : ''

      return `<g data-kind="node" data-certainty="${node.certainty}" aria-label="${escapeXmlText(`${style.label}、${node.type}：${node.label}`)}" opacity="${style.opacity}">
  <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${SVG_NODE_RADIUS}" fill="#ffffff" stroke="#65758a" stroke-width="${style.strokeWidth}"${optionalAttribute('stroke-dasharray', style.dashArray)}/>
  <text x="${node.x + 16}" y="${node.y + 22}" fill="#4c5b6e" font-size="11" font-weight="700" letter-spacing="0.6">${escapeXmlText(node.type.toUpperCase())}</text>
  <text fill="#172033" font-size="14" font-weight="600"${optionalAttribute('text-decoration', style.textDecoration)}>${label}</text>
  ${badge}
</g>`
    })
    .join('\n')
}

export function renderGraphSceneToSvg(scene: TransferGraphExportSceneDto): string {
  assertGraphExportScene(scene)
  const { bounds } = scene

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="img" aria-label="Granvas graph export">
  <defs>
    <marker id="granvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#526071"/>
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
