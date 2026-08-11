import {
  applySourceEdits as applyDomainSourceEdits,
  mapSourceOffsetThroughEdits as mapDomainSourceOffsetThroughEdits,
  planNotationEdit as planDomainNotationEdit,
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

export type PlanNotationEditInput = Readonly<{
  source: string
  parseResult: NotationParseResult
  command: NotationEditCommandDto
}>

export function planNotationEdit(input: PlanNotationEditInput): SourceEditPlanDto {
  return planDomainNotationEdit(input.source, input.parseResult, input.command)
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
): number {
  return mapDomainSourceOffsetThroughEdits(offset, edits)
}
