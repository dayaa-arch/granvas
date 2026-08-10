# 開発Phase体系統一 設計

> 作成日: 2026-08-11
> ステータス: 承認済み

## 1. 正本

`docs/development-roadmap.md`をPhase名称、順序、進捗、履歴対応の正本とする。Milestoneは複数Phaseを束ねるrelease-level checkpoint、PhaseはIssue / steering / PRで完結する実装単位として定義する。

## 2. 統一するPhase

| Phase | 名称 | 状態 |
| --- | --- | --- |
| 0 | Documentation Baseline | 完了 |
| 1 | Foundation | 完了 |
| 2 | Document Context | 完了 |
| 3 | Notation Core | 完了 |
| 4 | Graph Core | 完了 |
| 5 | Workspace Core | 完了 |
| 6 | Transfer Core | 完了 |
| 7 | Presentation Shell | 完了 |
| 8 | Visual Export | 未着手 |
| 9 | Release Hardening | 未着手 |

## 3. 変更対象

- `docs/development-roadmap.md`: Phase 0〜9、Milestone対応、steering / Issue / PR / status表へ再編する。
- `docs/GRANVAS_SPEC_v0.1.md`: Initial Implementation Orderを同じPhase 0〜9へ揃える。
- `.steering/20260810-initial-implementation/requirements.md` / `tasklist.md`: PDF ADRの対象Phaseと作業項目をPhase 0〜9へ揃え、状態を実績へ合わせる。
- `README.md`: 古いPhase 1時点の説明を除去し、現在状態とPhase 0〜9を反映する。

## 4. 履歴保全

完了済みの`.steering/20260810-phase-*`、Issue、PRは変更・改名しない。ロードマップ側の対応表から履歴へリンクする。Phase 0はbaseline文書群、Phase 1〜7は既存実績、Phase 8〜9は今後の作業として扱う。

## 5. 影響範囲

文書情報構造と進捗表示だけを変更する。Domain boundary、公開contract、runtime behavior、build outputへの影響はない。

## 6. 検証

- `rg`で旧Phase名称と古い進捗説明が残っていないことを確認する。
- Phase 0〜9の名称が4文書で一致することを確認する。
- 記載したIssue / PR / steering pathが存在することを確認する。
- `git diff --check`、必要な既存quality commandを実行する。
