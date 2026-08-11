# ADR-0006: Promote official documentation to complete edition

- Status: Accepted
- Date: 2026-08-11
- Phase: 9 Release Hardening
- Issue: [#31](https://github.com/dayaa-arch/granvas/issues/31)

## Context

[ADR-0004](0004-official-documentation-on-github-pages.md)は、日本語の公式利用ガイドを`gh-pages` branch rootから公開し、product SPAのVercel hostingと分離する方針を決定した。Phase 13時点ではPhase 8 / 9が未完了だったため、サイト名を「Granvas 1.0 公式ドキュメント — 公開プレビュー」、対応実装をv0.1開発版として明示した。

Phase 8でSVG / PNG / PDFのfull Graph出力が完成し、Phase 9ではv0.1 Definition of Done、OSS配布文書、CI、Vercel productionを閉じる。ユーザーはPhase 8 / 9完了後に既存Pagesを完全版へ更新することを要求している。

ただし、ドキュメントeditionの`1.0`とproduct versionは異なるversion軸である。Phase 9はproductの正式v1.0 migration、schema version変更、v1.0 tagを含まない。

## Decision

Phase 9の全release gateとproduction確認が完了した時点で、公式ガイドを`Granvas 1.0 公式ドキュメント — 完全版`へ昇格する。対応実装は`Granvas v0.1 Release Candidate`と全pageで明示する。

公式ガイドは次を満たす。

- review済みmainの`docs-site/`だけをsourceとする。
- Vercel production URLをprimary CTAとして掲載する。
- SVG / PNG / PDF、MIT license、SECURITY、CONTRIBUTING、quality gateを実績として説明する。
- 公開プレビュー、Phase 8 / 9予定、未対応という古い表示を残さない。
- analytics、tracking、remote font、cookie、backendを追加しない。
- ADR-0004の`gh-pages` root / legacy branch / HTTPSとVercel分離を維持する。

GitHub Actionsはquality verificationだけを担当する。Pages / Vercel deploy job、deployment credential、write permissionは追加しない。PagesとVercelはreview済みmainから承認済み手動操作で公開する。

## Consequences

- 利用者はproduction appと完全な使い方へ公式ガイドから直接到達できる。
- Docs edition 1.0とproduct v0.1 RCの混同を避けられる。
- product v1.0 releaseを暗黙に宣言せず、v0.1の互換性とscopeを維持できる。
- Docs公開はquality workflowの成功後に実行する運用責任を持つ。
- production URLが確定した後、closeout commit / PRで文書とlive URLを同期する場合がある。

## Alternatives Considered

### Productもv1.0へ変更する

schema、compatibility、release tag、migration policyを伴う別判断であり、Phase 9のscopeを超えるため採用しない。

### 公開プレビュー表記を維持する

Phase 8 / 9完了後の実装状態とユーザーの完全版要求に一致しないため採用しない。

### GitHub ActionsからPages / Vercelを自動deployする

既存のlegacy Pages境界と、credentialをActionsへ置かない方針を変更するため採用しない。
