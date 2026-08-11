import {
  applySourceEdits as applyDomainSourceEdits,
  mapSourceOffsetThroughEdits as mapDomainSourceOffsetThroughEdits,
  planNotationEdit as planDomainNotationEdit,
  previewNotationDelete as previewDomainNotationDelete,
  type CaretAffinity,
  type NotationDeleteImpact,
  type NotationDeletePreview,
  type NotationEditCommand,
  type NotationEditRejection,
  type NotationEditRejectionCode,
  type SourceEdit,
  type SourceEditPlan,
} from '@/modules/notation/domain/NotationEditor'
import type { NotationParseResult } from '@/modules/notation/domain/GranvasNotationParser'

export type SourceEditDto = SourceEdit
export type SourceEditPlanDto = SourceEditPlan
export type NotationEditCommandDto = NotationEditCommand
export type NotationEditRejectionDto = NotationEditRejection
export type NotationEditRejectionCodeDto = NotationEditRejectionCode
export type CaretAffinityDto = CaretAffinity
export type NotationDeleteImpactDto = NotationDeleteImpact
export type NotationDeletePreviewDto = NotationDeletePreview

export type PlanNotationEditInput = Readonly<{
  source: string
  parseResult: NotationParseResult
  command: NotationEditCommandDto
}>

export function planNotationEdit(input: PlanNotationEditInput): SourceEditPlanDto {
  return planDomainNotationEdit(input.source, input.parseResult, input.command)
}

export type PreviewNotationDeleteInput = Readonly<{
  source: string
  parseResult: NotationParseResult
  target: Readonly<
    | { type: 'node'; nodeKey: string }
    | { type: 'relation'; relationKey: string }
  >
}>

export function previewNotationDelete(
  input: PreviewNotationDeleteInput,
): NotationDeletePreviewDto {
  return previewDomainNotationDelete(input.source, input.parseResult, input.target)
}

export function applySourceEdits(
  source: string,
  edits: readonly SourceEditDto[],
): string {
  return applyDomainSourceEdits(source, edits)
}

export function mapSourceOffsetThroughEdits(
  offset: number,
  edits: readonly SourceEditDto[],
  affinity?: CaretAffinityDto,
): number {
  return mapDomainSourceOffsetThroughEdits(offset, edits, affinity)
}
