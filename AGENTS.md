# Granvas Agent Guide

## Steering

- 開発作業ごとに`.steering/YYYYMMDD-development-title/`を作成する。
- 各steering directoryには`requirements.md`、`design.md`、`tasklist.md`を置く。
- 要求の真の情報源は`docs/ideas/initial-requirements.md`、永続的な基本設計は`docs/`を参照する。
- Phaseの名称・順序・進捗は`docs/development-roadmap.md`を正本とする。Phase番号は採番順であり実行順ではない。
- 仕様変更は実装より先に`docs/GRANVAS_SPEC_v0.1.md`または`docs/adr/`のADRへ反映する。
- 開発プロセスの詳細ルール（文書構成・承認手順・図表規約など）は`$dev-docs`に従う。

## Project

- Product: Textを正本とし、Granvas NotationからGraphを投影するWeb editor。Graphは意味の編集が可能だが、状態を持たない。
- Architecture: Domain-Driven Design + Layered Architecture + Modular Monolith。
- Contexts: `document`、`notation`、`graph`、`transfer`、`workspace`。
- Frontend: React 19、TypeScript 6、Vite 8、CodeMirror 6、`@xyflow/react`、Dagre。
- Package manager: Bun。`bun.lock`をcommitする。
- Hosting: Vercel static deployment。Vercel Git Integrationが`main` pushをProductionへ自動deployし、v0.1でserver functionを使用しない。
- Persistence: `.granvas` Importと`.granvas / SVG / PNG / PDF` Download。active Textは同一browserへ最終更新から24時間だけ一時保存し、恒久保存は`.granvas`とする。
- Authentication: v0.1では未実装。将来providerはSupabase Authだが、v0.1にSDKやcredentialを追加しない。

## Architecture Boundaries

- Context外からは`src/modules/<context>/index.ts`のpublished contractだけを利用する。
- 各Context内の依存は`presentation → application → domain`。InfrastructureはApplication Portを実装する。
- Workspace Applicationだけが他Contextのpublished application APIを統合する。
- `SourceRange`と`SourceEditPlan`はNotation ownershipとし、Graph Domainへ入れない。
- React、CodeMirror、React Flow、Dagre、browser API、Supabase固有型をDomain / Application public contractへ漏らさない。
- 具象adapterは`src/app/bootstrap/`で生成・注入する。

## Source Editing

- Graph操作は現在sourceへの最小編集列へ変換する。**Graphからテキスト全文を再生成しない**（通常文が破壊される）。
- 編集規則は`notation/domain/NotationEditor.ts`のpure function（`(source, parseResult, command) → SourceEditPlan`）として書く。
- Workspaceは記法文字列を組み立てない。orchestrationだけを行う。
- Graph ID → occurrence keyの逆引きは`ProjectionSourceMapDto`経由。ID生成規則を再現しない。
- Graph編集の前にpendingなsource更新をflushする。
- 最優先のtestはround-trip（plan適用 → 再parseで意図した構造）と、通常文が変化しないこと。
- 座標はどこにも永続化しない。dragは意味の操作として扱う。

## Commands

```bash
bun install
bun run dev
bunx tsc -b
bunx eslint .
bun run test:run
bunx playwright test
bun run build
```
