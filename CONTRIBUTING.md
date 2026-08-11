# Granvasへのコントリビューション

Granvasに関心を持っていただき、ありがとうございます。変更を提案する前に、このガイドと[Agent Guide](AGENTS.md)、[開発ロードマップ](docs/development-roadmap.md)を確認してください。

## 開発環境

- Bun 1.3系
- Node.js 24系（補助CLI用）
- Chromium / Firefox / WebKit（E2Eを実行する場合）

```bash
git clone https://github.com/dayaa-arch/granvas.git
cd granvas
bun install --frozen-lockfile
bun run dev
```

## 変更の進め方

1. 既存Issueを確認し、重複しないIssueを作成します。
2. `docs/ideas/initial-requirements.md`、`docs/GRANVAS_SPEC_v0.1.md`、`docs/development-roadmap.md`、関連ADRを確認します。
3. `.steering/YYYYMMDD-development-title/`へ`requirements.md`、`design.md`、`tasklist.md`を作成します。
4. 仕様変更は実装より先に統合仕様またはADRへ反映します。
5. `codex/`に限らず、目的が分かる短いbranch名で作業します。
6. testと文書を同じPRに含め、検証結果と残課題をPR本文へ記載します。

## アーキテクチャ境界

- Context外からは`src/modules/<context>/index.ts`のpublished contractだけを利用します。
- Context内の依存方向は`presentation → application → domain`です。InfrastructureはApplication Portを実装します。
- 他Contextを協調させるのはWorkspace Applicationだけです。
- Domain / ApplicationへReact、CodeMirror、React Flow、Dagre、DOM、browser API、provider SDK型を持ち込みません。
- Graph操作はcurrent sourceへの最小編集として実装し、Graphから全文を再生成しません。
- 座標は`.granvas`へ保存しません。

## Quality gate

PR前に、変更範囲に応じて次を実行してください。

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test:coverage
bun run build
bun run release:verify
bun run docs:build
bun run test:performance
bunx playwright test
bun audit --audit-level=high
```

GitHub Actionsは同じ品質検証を行います。Vercel / GitHub PagesへのdeploymentはPR workflowに含めません。

## Pull Request

- 1つのPRを1つの説明可能な目的に限定してください。
- 通常文を壊さないround-trip test、failure path、accessibilityへの影響を優先してください。
- generated artifact、credential、`.vercel/`、個人情報をcommitしないでください。
- UI変更には日本語のvisible text / accessible nameと、必要なcomponent / E2E testを含めてください。

不具合や機能提案は[GitHub Issues](https://github.com/dayaa-arch/granvas/issues)へお願いします。脆弱性は公開Issueへ書かず、[Security Policy](SECURITY.md)に従ってください。
