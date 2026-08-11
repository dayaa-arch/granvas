import type { NotationEditRejectionCodeDto } from '@/modules/notation'
import type { TransferApplicationErrorCode } from '@/modules/transfer'

const graphEditErrorMessages: Readonly<
  Record<NotationEditRejectionCodeDto, string>
> = Object.freeze({
  'unknown-target': '編集対象が現在のテキストに見つかりません。グラフの更新後にもう一度お試しください。',
  'cyclic-parent': '自分自身または子孫を親にはできません。循環しない構造を選んでください。',
  'unresolved-reference': '参照先のNodeを解決できないため、変更を適用できません。',
  'unsupported-structure': '現在の構造には、この変更を安全に適用できません。',
  'invalid-value': '入力内容がGranvas Notationの規則を満たしていません。',
})

const transferErrorMessages: Readonly<
  Record<TransferApplicationErrorCode, string>
> = Object.freeze({
  'invalid-project-extension': '読み込めるプロジェクトファイルは.granvas形式だけです。',
  'invalid-project-size': 'プロジェクトファイルのサイズ情報が正しくありません。',
  'project-too-large': 'プロジェクトファイルは5 MiB以下にしてください。',
  'invalid-graph-bounds': 'グラフ全体の範囲を取得できないため、書き出せません。',
  'invalid-utf8': 'プロジェクトファイルをUTF-8テキストとして読み込めません。',
  'project-read-failed': 'プロジェクトファイルを読み込めませんでした。ファイルを確認してもう一度お試しください。',
  'graph-render-failed': 'グラフの書き出しに失敗しました。現在のテキストは変更されていません。',
  'download-failed': 'ダウンロードを開始できませんでした。ブラウザーの設定を確認してください。',
})

export function graphEditErrorMessageJa(
  code: string,
): string {
  return (
    graphEditErrorMessages[code as NotationEditRejectionCodeDto] ??
    'グラフの変更を適用できませんでした。グラフの更新後にもう一度お試しください。'
  )
}

export function transferErrorMessageJa(
  code: TransferApplicationErrorCode,
): string {
  return transferErrorMessages[code]
}
