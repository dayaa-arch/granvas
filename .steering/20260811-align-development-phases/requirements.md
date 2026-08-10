# 開発Phase体系統一 要求

> 作成日: 2026-08-11
> ステータス: 承認済み
> 開発タイトル: `align-development-phases`

## 1. 背景

`docs/development-roadmap.md`はPhase 0〜6の粗い工程を定義している一方、実装ではContext単位のステアリングをPhase 1〜7として進めた。その結果、同じPhase番号が異なる作業を指し、未完了のVisual Exportを「Phase 8」と呼ぶ根拠が永続文書に存在しない状態になった。

## 2. 要求

- Granvas v0.1の開発PhaseをPhase 0〜9へ統一する。
- Phase 1〜7は既存ステアリング、Issue、PRの実績と一致させる。
- Phase 8をVisual Export、Phase 9をRelease Hardeningとして明記する。
- Release Milestone M0〜M5と実装Phase 0〜9を別概念として定義する。
- `development-roadmap.md`をPhase名称・進捗・履歴対応の正本とする。
- README、統合仕様書、初回実装タスクリストのPhase表記を正本へ合わせる。
- GitHub ActionsはPhase 9の未完了項目として維持する。

## 3. 受け入れ条件

- 対象文書のPhase 0〜9が同じ名称と順序で記載されている。
- Phase 1〜7から既存ステアリング、Issue、PRを追跡できる。
- Phase 8とPhase 9が未着手であり、未完了項目が適切に分類されている。
- 既存ステアリングディレクトリは履歴保全のため改名されていない。
- 「Phase」と「Milestone」と初回タスクリスト内の作業項目が混同されない。
- 文書参照検査とMarkdown差分検査が成功する。

## 4. 制約

- プロダクト要求、機能仕様、アーキテクチャ契約は変更しない。
- 実装コード、依存関係、GitHub Actions、Vercel設定は変更しない。
- 完了済みPhaseの履歴を遡及的に書き換えない。
