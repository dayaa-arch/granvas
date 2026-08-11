import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const projectRoot = resolve('.')
const rootPackage = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'))
const queue = Object.keys(rootPackage.dependencies ?? {}).map((name) => ({
  name,
  requester: projectRoot,
}))
const visited = new Map()

async function resolvePackage(name, requester) {
  let cursor = requester
  while (cursor.startsWith(projectRoot)) {
    const candidate = resolve(cursor, 'node_modules', name, 'package.json')
    try {
      const packageJson = JSON.parse(await readFile(candidate, 'utf8'))
      return { packageJson, packageRoot: dirname(candidate) }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    const parent = dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  throw new Error(`Could not resolve production dependency ${name} from ${requester}`)
}

while (queue.length > 0) {
  const current = queue.shift()
  const resolved = await resolvePackage(current.name, current.requester)
  const identity = `${resolved.packageJson.name}@${resolved.packageJson.version}`
  if (visited.has(identity)) continue

  const license =
    typeof resolved.packageJson.license === 'string'
      ? resolved.packageJson.license
      : resolved.packageJson.licenses?.map(({ type }) => type).join(' OR ')
  if (!license) {
    throw new Error(`${identity} does not declare a license.`)
  }
  if (/AGPL|SSPL|BUSL|UNLICENSED|SEE LICENSE|Commons Clause/iu.test(license)) {
    throw new Error(`${identity} uses a disallowed or unresolved license: ${license}`)
  }

  visited.set(identity, license)
  for (const dependency of Object.keys(resolved.packageJson.dependencies ?? {})) {
    queue.push({ name: dependency, requester: resolved.packageRoot })
  }
}

const licenseSummary = [...visited.values()].reduce((summary, license) => {
  summary.set(license, (summary.get(license) ?? 0) + 1)
  return summary
}, new Map())

console.log(`Verified ${visited.size} production dependency packages.`)
for (const [license, count] of [...licenseSummary].sort(([left], [right]) => left.localeCompare(right))) {
  console.log(`${license}: ${count}`)
}
