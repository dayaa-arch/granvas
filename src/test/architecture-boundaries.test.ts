// @vitest-environment node

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint()

async function boundaryMessages(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath })

  return result.messages.filter(({ ruleId }) =>
    ruleId === 'granvas/boundaries' || ruleId === 'no-restricted-globals',
  )
}

describe('architecture boundaries', () => {
  it('rejects framework imports and browser globals from Domain', async () => {
    const messages = await boundaryMessages(
      'src/modules/document/domain/example.ts',
      "import type { ReactNode } from 'react'\nexport const example: ReactNode = window.name\n",
    )

    expect(messages.map(({ ruleId }) => ruleId)).toEqual([
      'granvas/boundaries',
      'no-restricted-globals',
    ])
  })

  it('rejects upward layer dependencies', async () => {
    const messages = await boundaryMessages(
      'src/modules/document/domain/example.ts',
      "import type { Adapter } from '@/modules/document/infrastructure/adapter'\nexport type Example = Adapter\n",
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]?.messageId).toBe('invalidLayer')
  })

  it('keeps Presentation and Infrastructure behind Application ports', async () => {
    const messages = await boundaryMessages(
      'src/modules/document/presentation/example.ts',
      "import type { Adapter } from '@/modules/document/infrastructure/adapter'\nexport type Example = Adapter\n",
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]?.messageId).toBe('invalidLayer')
  })

  it('rejects cross-context imports outside Workspace', async () => {
    const messages = await boundaryMessages(
      'src/modules/graph/application/example.ts',
      "import type { DocumentContract } from '@/modules/document'\nexport type Example = DocumentContract\n",
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]?.messageId).toBe('crossContext')
  })

  it('allows Workspace to consume published contracts', async () => {
    const messages = await boundaryMessages(
      'src/modules/workspace/application/example.ts',
      "import type { DocumentContract } from '@/modules/document'\nexport type Example = DocumentContract\n",
    )

    expect(messages).toEqual([])
  })

  it('protects context internals while allowing bootstrap wiring', async () => {
    const source =
      "import type { Adapter } from '@/modules/document/infrastructure/adapter'\nexport type Example = Adapter\n"

    await expect(boundaryMessages('src/app/App.tsx', source)).resolves.toHaveLength(1)
    await expect(
      boundaryMessages('src/app/bootstrap/createApplication.ts', source),
    ).resolves.toEqual([])
  })
})
