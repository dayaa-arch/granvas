import js from '@eslint/js'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const contexts = ['document', 'notation', 'graph', 'transfer', 'workspace']
const layers = ['domain', 'application', 'infrastructure', 'presentation']
const frameworkPackages = [
  'react',
  'react-dom',
  'codemirror',
  '@codemirror',
  '@xyflow/react',
  '@dagrejs/dagre',
]

function toProjectParts(filename) {
  return path.relative(projectRoot, filename).split(path.sep)
}

function moduleLocation(parts) {
  if (parts[0] !== 'src' || parts[1] !== 'modules' || !contexts.includes(parts[2])) {
    return undefined
  }

  return {
    context: parts[2],
    layer: layers.includes(parts[3]) ? parts[3] : undefined,
  }
}

function resolveInternalImport(filename, importPath) {
  if (importPath.startsWith('@/')) {
    return path.join(projectRoot, 'src', importPath.slice(2))
  }

  if (importPath.startsWith('.')) {
    return path.resolve(path.dirname(filename), importPath)
  }

  return undefined
}

function isPublishedContract(parts) {
  return (
    parts[0] === 'src' &&
    parts[1] === 'modules' &&
    contexts.includes(parts[2]) &&
    (parts.length === 3 || (parts.length === 4 && /^index(?:\.[cm]?[jt]sx?)?$/.test(parts[3])))
  )
}

function isFrameworkPackage(importPath) {
  return frameworkPackages.some(
    (packageName) => importPath === packageName || importPath.startsWith(`${packageName}/`),
  )
}

const boundariesRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      crossContext:
        'Only Workspace may consume another context, and it must use that context published contract.',
      externalInternal:
        'Code outside a context must use src/modules/<context>/index.ts; only bootstrap may wire internal adapters.',
      invalidLayer: 'This import violates the presentation -> application -> domain dependency direction.',
      frameworkInCore: 'Domain and Application code must not depend on framework-specific packages.',
    },
  },
  create(context) {
    const filename = context.filename
    const currentParts = toProjectParts(filename)
    const currentModule = moduleLocation(currentParts)
    const isBootstrap = currentParts[0] === 'src' && currentParts[1] === 'app' && currentParts[2] === 'bootstrap'

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value

        if (typeof importPath !== 'string') {
          return
        }

        if (
          (currentModule?.layer === 'domain' || currentModule?.layer === 'application') &&
          isFrameworkPackage(importPath)
        ) {
          context.report({ node: node.source, messageId: 'frameworkInCore' })
          return
        }

        const resolvedImport = resolveInternalImport(filename, importPath)

        if (!resolvedImport) {
          return
        }

        const targetParts = toProjectParts(resolvedImport)
        const targetModule = moduleLocation(targetParts)

        if (!targetModule) {
          return
        }

        if (!currentModule) {
          if (!isBootstrap && !isPublishedContract(targetParts)) {
            context.report({ node: node.source, messageId: 'externalInternal' })
          }
          return
        }

        if (currentModule.context !== targetModule.context) {
          const workspaceUsesContract =
            currentModule.context === 'workspace' && isPublishedContract(targetParts)

          if (!workspaceUsesContract) {
            context.report({ node: node.source, messageId: 'crossContext' })
          }
          return
        }

        const invalidDomainDependency =
          currentModule.layer === 'domain' &&
          targetModule.layer !== undefined &&
          targetModule.layer !== 'domain'
        const invalidApplicationDependency =
          currentModule.layer === 'application' &&
          (targetModule.layer === 'infrastructure' || targetModule.layer === 'presentation')
        const invalidInfrastructureDependency =
          currentModule.layer === 'infrastructure' && targetModule.layer === 'presentation'
        const invalidPresentationDependency =
          currentModule.layer === 'presentation' && targetModule.layer === 'infrastructure'

        if (
          invalidDomainDependency ||
          invalidApplicationDependency ||
          invalidInfrastructureDependency ||
          invalidPresentationDependency
        ) {
          context.report({ node: node.source, messageId: 'invalidLayer' })
        }
      },
    }
  },
}

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      granvas: {
        rules: {
          boundaries: boundariesRule,
        },
      },
    },
    rules: {
      'granvas/boundaries': 'error',
    },
  },
  {
    files: [
      'src/modules/*/domain/**/*.{ts,tsx}',
      'src/modules/*/application/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'localStorage',
        'sessionStorage',
        'fetch',
        'File',
        'Blob',
      ],
    },
  },
])
