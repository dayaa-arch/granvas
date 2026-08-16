export const NEW_GRANVAS_HASH = '#new'

const projectHashPrefix = '#project='
const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export type GranvasProjectLaunch =
  | Readonly<{ type: 'default' }>
  | Readonly<{
      type: 'isolated-project'
      slotId: string
      canonicalHash: string
      initialProject: Readonly<{
        name: 'untitled'
        source: ''
      }>
    }>

const defaultLaunch = Object.freeze({ type: 'default' } as const)

function isolatedProjectLaunch(slotId: string): GranvasProjectLaunch {
  const normalizedSlotId = slotId.toLowerCase()

  if (!uuidV4Pattern.test(normalizedSlotId)) {
    return defaultLaunch
  }

  return Object.freeze({
    type: 'isolated-project',
    slotId: normalizedSlotId,
    canonicalHash: `${projectHashPrefix}${normalizedSlotId}`,
    initialProject: Object.freeze({ name: 'untitled', source: '' }),
  })
}

export function resolveGranvasProjectLaunch(
  hash: string,
  createSlotId: () => string,
): GranvasProjectLaunch {
  if (hash === NEW_GRANVAS_HASH) {
    try {
      return isolatedProjectLaunch(createSlotId())
    } catch {
      return defaultLaunch
    }
  }

  if (hash.startsWith(projectHashPrefix)) {
    return isolatedProjectLaunch(hash.slice(projectHashPrefix.length))
  }

  return defaultLaunch
}

export function createNewGranvasUrl(currentUrl: string): string {
  const url = new URL(currentUrl)
  url.hash = NEW_GRANVAS_HASH
  return url.toString()
}
