import { describe, expect, it } from 'vitest'

import {
  graphEditErrorMessageJa,
  transferErrorMessageJa,
} from '@/app/presentationMessages'

describe('日本語の画面メッセージ', () => {
  it('Graph編集拒否codeを日本語へ変換する', () => {
    expect(graphEditErrorMessageJa('cyclic-parent')).toContain('循環')
    expect(graphEditErrorMessageJa('invalid-value')).toContain('入力内容')
  })

  it('Transfer error codeを日本語へ変換する', () => {
    expect(transferErrorMessageJa('project-too-large')).toContain('5 MiB')
    expect(transferErrorMessageJa('download-failed')).toContain('ダウンロード')
  })
})
