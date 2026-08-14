import type { TemporaryProjectStoragePort } from '@/modules/document/application/ports/TemporaryProjectStoragePort'

export const TEMPORARY_PROJECT_SCHEMA_VERSION = 1 as const
export const TEMPORARY_PROJECT_TTL_MS = 24 * 60 * 60 * 1000

export type TemporaryProjectDto = Readonly<{
  name: string
  source: string
  dirty: boolean
}>

export type TemporaryProjectLoadResult =
  | Readonly<{
      type: 'restored'
      project: TemporaryProjectDto
      savedAt: number
      expiresAt: number
    }>
  | Readonly<{ type: 'empty' }>
  | Readonly<{ type: 'unavailable' }>

export type TemporaryProjectStoreResult =
  | Readonly<{
      type: 'stored'
      savedAt: number
      expiresAt: number
    }>
  | Readonly<{ type: 'unavailable' }>

export type TemporaryProjectClearResult =
  | Readonly<{ type: 'cleared' }>
  | Readonly<{ type: 'unavailable' }>

export interface TemporaryProjectRecovery {
  loadTemporaryProject(): TemporaryProjectLoadResult
  storeTemporaryProject(project: TemporaryProjectDto): TemporaryProjectStoreResult
  clearTemporaryProject(): TemporaryProjectClearResult
}

export type CreateTemporaryProjectRecoveryInput = Readonly<{
  storage: TemporaryProjectStoragePort
  now?: () => number
}>

type TemporaryProjectRecord = Readonly<{
  schemaVersion: typeof TEMPORARY_PROJECT_SCHEMA_VERSION
  name: string
  source: string
  dirty: boolean
  savedAt: number
  expiresAt: number
}>

const emptyResult = Object.freeze({ type: 'empty' } as const)
const unavailableResult = Object.freeze({ type: 'unavailable' } as const)
const clearedResult = Object.freeze({ type: 'cleared' } as const)
const recordKeys = Object.freeze([
  'schemaVersion',
  'name',
  'source',
  'dirty',
  'savedAt',
  'expiresAt',
].sort())

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort()
  return (
    keys.length === recordKeys.length &&
    keys.every((key, index) => key === recordKeys[index])
  )
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function parseRecord(value: string): TemporaryProjectRecord | undefined {
  let parsed: unknown

  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return undefined
  }

  if (!isRecord(parsed) || !hasExactKeys(parsed)) {
    return undefined
  }

  const { schemaVersion, name, source, dirty, savedAt, expiresAt } = parsed
  if (
    schemaVersion !== TEMPORARY_PROJECT_SCHEMA_VERSION ||
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    typeof source !== 'string' ||
    typeof dirty !== 'boolean' ||
    !isSafeTimestamp(savedAt) ||
    !isSafeTimestamp(expiresAt) ||
    expiresAt - savedAt !== TEMPORARY_PROJECT_TTL_MS
  ) {
    return undefined
  }

  return Object.freeze({
    schemaVersion,
    name,
    source,
    dirty,
    savedAt,
    expiresAt,
  })
}

export function createTemporaryProjectRecovery(
  input: CreateTemporaryProjectRecoveryInput,
): TemporaryProjectRecovery {
  const now = input.now ?? Date.now

  const removeInvalidRecord = (): TemporaryProjectLoadResult => {
    try {
      input.storage.remove()
      return emptyResult
    } catch {
      return unavailableResult
    }
  }

  return Object.freeze({
    loadTemporaryProject(): TemporaryProjectLoadResult {
      let value: string | null
      try {
        value = input.storage.read()
      } catch {
        return unavailableResult
      }

      if (value === null) {
        return emptyResult
      }

      const record = parseRecord(value)
      const currentTime = now()
      if (
        !record ||
        !isSafeTimestamp(currentTime) ||
        record.savedAt > currentTime ||
        record.expiresAt <= currentTime
      ) {
        return removeInvalidRecord()
      }

      return Object.freeze({
        type: 'restored',
        project: Object.freeze({
          name: record.name,
          source: record.source,
          dirty: record.dirty,
        }),
        savedAt: record.savedAt,
        expiresAt: record.expiresAt,
      })
    },

    storeTemporaryProject(project: TemporaryProjectDto): TemporaryProjectStoreResult {
      const savedAt = now()
      if (
        !isSafeTimestamp(savedAt) ||
        project.name.trim().length === 0 ||
        savedAt > Number.MAX_SAFE_INTEGER - TEMPORARY_PROJECT_TTL_MS
      ) {
        return unavailableResult
      }

      const expiresAt = savedAt + TEMPORARY_PROJECT_TTL_MS
      const record: TemporaryProjectRecord = Object.freeze({
        schemaVersion: TEMPORARY_PROJECT_SCHEMA_VERSION,
        name: project.name,
        source: project.source,
        dirty: project.dirty,
        savedAt,
        expiresAt,
      })

      try {
        input.storage.write(JSON.stringify(record))
        return Object.freeze({ type: 'stored', savedAt, expiresAt })
      } catch {
        return unavailableResult
      }
    },

    clearTemporaryProject(): TemporaryProjectClearResult {
      try {
        input.storage.remove()
        return clearedResult
      } catch {
        return unavailableResult
      }
    },
  })
}
