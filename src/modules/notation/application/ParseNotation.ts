import {
  parseGranvasNotation,
  type DiagnosticCode,
  type DiagnosticLevel,
  type NotationDiagnostic,
  type NotationParseResult,
  type ParsedGroup,
  type ParsedLayout,
  type ParsedNode,
  type ParsedRelation,
  type SourceRange,
} from '@/modules/notation/domain/GranvasNotationParser'

export type SourceRangeDto = SourceRange
export type DiagnosticCodeDto = DiagnosticCode
export type DiagnosticLevelDto = DiagnosticLevel
export type DiagnosticDto = NotationDiagnostic
export type ParsedNodeDto = ParsedNode
export type ParsedRelationDto = ParsedRelation
export type ParsedGroupDto = ParsedGroup
export type ParsedLayoutDto = ParsedLayout
export type ParseResultDto = NotationParseResult

export type ParseNotationInput = Readonly<{
  source: string
  documentRevision: number
}>

export class NotationApplicationError extends Error {
  readonly code = 'invalid-document-revision'

  constructor() {
    super('Document revision must be a non-negative safe integer.')
    this.name = 'NotationApplicationError'
  }
}

export function parseNotation(input: ParseNotationInput): ParseResultDto {
  if (!Number.isSafeInteger(input.documentRevision) || input.documentRevision < 0) {
    throw new NotationApplicationError()
  }

  return parseGranvasNotation(input.source, input.documentRevision)
}
