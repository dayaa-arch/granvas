# Granvas Agent Guide

## Steering

- 開発作業ごとに`.steering/YYYYMMDD-development-title/`を作成する。
- 各steering directoryには`requirements.md`、`design.md`、`tasklist.md`を置く。
- 要求の真の情報源は`docs/ideas/initial-requirements.md`、永続的な基本設計は`docs/`を参照する。
- 開発プロセスの詳細ルール（文書構成・承認手順・図表規約など）は`$dev-docs`に従う。

## Project

- Product: Textを正本とし、Granvas Notationからread-only Graphを投影するWeb editor。
- Architecture: Domain-Driven Design + Layered Architecture + Modular Monolith。
- Contexts: `document`、`notation`、`graph`、`transfer`、`workspace`。
- Frontend: React 19、TypeScript 6、Vite 8、CodeMirror 6、`@xyflow/react`、Dagre。
- Package manager: Bun。`bun.lock`をcommitする。
- Hosting: Vercel static deployment。v0.1でserver functionを使用しない。
- Persistence: `.granvas` Importと`.granvas / SVG / PNG / PDF` Download。browser自動永続化なし。
- Authentication: v0.1では未実装。将来providerはSupabase Authだが、v0.1にSDKやcredentialを追加しない。

## Architecture Boundaries

- Context外からは`src/modules/<context>/index.ts`のpublished contractだけを利用する。
- 各Context内の依存は`presentation → application → domain`。InfrastructureはApplication Portを実装する。
- Workspace Applicationだけが他Contextのpublished application APIを統合する。
- `SourceRange`はNotation ownershipとし、Graph Domainへ入れない。
- React、CodeMirror、React Flow、Dagre、browser API、Supabase固有型をDomain / Application public contractへ漏らさない。
- 具象adapterは`src/app/bootstrap/`で生成・注入する。

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
