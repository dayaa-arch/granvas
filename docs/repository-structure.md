# Granvas リポジトリ構造定義書

> Status: Release Candidate
> Target: v0.1  
> Updated: 2026-08-15

## 1. 基本方針

ドメインを最上位の分割単位とし、各Context内部に`domain / application / infrastructure / presentation`を閉じ込める。存在しない責務のために空folderや抽象classを作らない。

## 2. Target Structure

```text
granvas/
├── .github/
│   └── workflows/
│       └── quality.yml
├── .steering/
│   └── YYYYMMDD-development-title/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
├── docs/
│   ├── ideas/
│   │   └── initial-requirements.md
│   ├── adr/
│   ├── GRANVAS_SPEC_v0.1.md
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md
│   ├── development-guidelines.md
│   ├── glossary.md
│   └── development-roadmap.md
├── docs-site/
│   ├── index.html
│   ├── public/
│   │   ├── .nojekyll
│   │   ├── 404.html
│   │   └── images/
│   └── src/
│       ├── docs.ts
│       └── styles.css
├── scripts/
│   └── verify-pages-build.mjs
├── dist-pages/                  # generated / ignored
├── examples/
│   └── canonical-demo.granvas
├── public/
├── src/
│   ├── app/
│   │   ├── bootstrap/
│   │   │   └── createApplication.ts
│   │   ├── providers/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── modules/
│   │   ├── document/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   ├── notation/
│   │   │   ├── domain/
│   │   │   │   ├── GranvasNotationParser.ts
│   │   │   │   ├── NotationEditor.ts
│   │   │   │   └── SourceText.ts
│   │   │   ├── application/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   ├── graph/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   │   └── ports/
│   │   │   ├── infrastructure/
│   │   │   │   ├── dagre/
│   │   │   │   └── worker/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   ├── transfer/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   │   └── ports/
│   │   │   ├── infrastructure/
│   │   │   │   ├── browser/
│   │   │   │   ├── canvas/
│   │   │   │   ├── pdf/
│   │   │   │   ├── svg/
│   │   │   │   └── CompositeGraphExportAdapter.ts
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   └── workspace/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── presentation/
│   │       └── index.ts
│   └── shared/
│       ├── domain/
│       ├── infrastructure/
│       └── presentation/
├── tests/
│   ├── e2e/
│   ├── fixtures/
│   └── performance/
├── AGENTS.md
├── CONTRIBUTING.md
├── .gitignore
├── LICENSE
├── README.md
├── SECURITY.md
├── package.json
├── bun.lock
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

## 3. Directory Responsibilities

### 3.0 Release / CI

- `.github/workflows/quality.yml`はquality gateだけを実行し、deploymentやcredentialを持たない。
- Vercel production deliveryはrepository workflowではなく、Vercel ProjectのGit Integrationが`main` pushから実行する。
- `.vercel/`はlocal Project metadataであり、`.gitignore`でcommit対象外にする。
- `examples/`は公開してよい`.granvas` fixtureだけを置く。
- `LICENSE`、`CONTRIBUTING.md`、`SECURITY.md`はOSS配布contractとしてrootに置く。

### 3.1 `src/app`

- application / infrastructure composition root。
- public presentation componentsのUI composition root。
- route、global provider、top-level Error Boundary。
- business ruleを置かない。

### 3.2 `src/modules/document`

- active document、source、revision、dirty lifecycle。
- Applicationが短期復旧schema、24時間TTL、storage failure contractと`TemporaryProjectStoragePort`を所有する。
- `infrastructure/browser`がversioned localStorage keyへのI/Oだけを実装する。
- File Import / Downloadは引き続きTransferが所有し、Document Infrastructureへ置かない。

### 3.3 `src/modules/notation`

- Granvas Notation parser、diagnostics、SourceRange / token spans、certainty、syntax highlighting。
- **編集規則**。`domain/NotationEditor.ts`が`(source, parseResult, command) → SourceEditPlan`のpure function群を持つ。
- `SourceRange`と`SourceEditPlan`のowner。
- Graph modelやReact Flow型を置かない。domainにCodeMirror型を置かない。

### 3.4 `src/modules/graph`

- Semantic Graph、layout input、Group overlay、export scene。
- Dagre / Worker adapterはinfrastructure。
- React Flow componentsはpresentation。
- SourceRangeをdomainへ置かない。

### 3.5 `src/modules/transfer`

- `.granvas` Import、format選択、file generation、browser download。
- Browser File API、Blob、Canvas、PDF libraryをinfrastructureに隔離する。
- `infrastructure/svg`が安全な共通scene markup、`infrastructure/canvas`がPNG、`infrastructure/pdf`がlazy-loaded PDF、`CompositeGraphExportAdapter`がformat委譲を担当する。
- Document / Graphの内部型を直接importしない。

### 3.6 `src/modules/workspace`

- Document / Notation / Graph / Transferのpublished application APIを協調させる。
- revision、cancellation、source mapping、selectionを扱う。
- syntax、layout、file generationの詳細を実装しない。

### 3.7 `src/shared`

許可例:

- `shared/presentation/Button`
- `shared/presentation/Dialog`
- `shared/presentation/SplitPane`
- `shared/domain/Result`
- `shared/infrastructure/Logger`

禁止例:

- `GraphNode`
- `GranvasDocument`
- `NotationAst`
- `SourceRange`
- `WorkspaceState`
- context固有のDTO

## 4. Layer Placement Rules

### Domain

- entity、value、domain service、pure function。
- external SDK / browser / UI import禁止。
- `BaseEntity`、`BaseRepository`など必要性のない共通基底を禁止。

### Application

- use case、port、published DTO、facade。
- portは`application/ports/`へ置く。
- domain ruleに本質的なportだけ例外的にdomainへ置ける。理由をADRへ記録する。

### Infrastructure

- portの具象adapter。
- 外部型からDTOへの変換境界。
- `index.ts`から具象を公開せず、App bootstrapだけが内部pathからimportすることを許可する。

### Presentation

- React component、hook、event adapter、ViewModel mapping。
- application DTOを受け、domain entityを直接描画しない。
- CodeMirror / React Flow型をpresentation外へ返さない。

## 5. Public API Rules

- Context外からのimportは`@/modules/<context>`に限定する。
- `index.ts`はpublished application contractと必要なpublic presentation APIだけをexportする。
- domain / infrastructure / presentation内部pathへのdeep importを禁止する。
- Workspaceだけが他Contextのapplication contractを利用できる。
- Appはpublic application / presentation APIとinfrastructure具象を結線できる。

許可:

```ts
import { createGraphFacade, ReactFlowGraphView } from '@/modules/graph';
```

禁止:

```ts
import { ThoughtGraph } from '@/modules/graph/domain/ThoughtGraph';
import { DagreGraphLayoutWorkerAdapter } from '@/modules/graph/infrastructure/dagre';
```

App bootstrapから具象をimportする場合だけ、専用aliasまたは明示的なbootstrap exportを用意する。

## 6. Dependency Matrix

| From | Allowed imports |
| --- | --- |
| Domain | own domain、`shared/domain` |
| Application | own domain/application、`shared/domain` |
| Workspace Application | 上記 + other contextsのpublished application contract |
| Infrastructure | own application ports/domain、shared infrastructure、external API |
| Presentation | own application、shared presentation、external UI library |
| App | 各moduleのpublic API、bootstrap-only infrastructure factories |
| Shared | modulesをimportしない |

## 7. Mechanical Enforcement

- TypeScript path aliasを`@/* → src/*`として設定する。
- ESLint `no-restricted-imports`で他Context内部pathを禁止する。
- domain globからReact、CodeMirror、React Flow、Dagre、DOM、File API、Supabaseを禁止する。
- application public contractからEditorView、ReactNode、React Flow型、Dagre型、FileSystemHandle、AbortSignal、Supabase型を禁止する。
- architecture testまたはdependency graph checkをCIへ追加する。

## 8. Test Placement

- domain/application unit testは対象fileに隣接する`*.test.ts`を基本とする。
- React component testは`*.test.tsx`。
- reusable fixtureは`tests/fixtures/`。
- browser flowは`tests/e2e/`。
- performance fixture / benchmarkは`tests/performance/`。
- library-specific contract testは各infrastructure配下に置く。

## 9. Documentation Placement

- 永続的な基本設計は`docs/`。
- 要求の起点は`docs/ideas/initial-requirements.md`。
- 変更単位の要求・設計・taskは`.steering/YYYYMMDD-title/`。
- architecture decisionは`docs/adr/`。
- 図は関連MarkdownへMermaidまたはASCIIで直接記載する。
- `docs-site/`は日本語の公式利用ガイドsource。product / engineeringの正本である`docs/`と混在させない。
- `docs-site/public/`はPages rootへそのままcopyする`.nojekyll`、404、screenshotなどのstatic assetを置く。
- `docs-site/src/`は公式利用ガイドのpresentation-only CSS / TypeScriptを置く。product moduleをimportしない。
- `dist-pages/`は`bun run docs:build`で生成する一時artifactで、mainへcommitしない。
- `gh-pages` branchはreview済みmainから生成したartifactだけを保持し、source of truthにしない。

## 9.1 Official Documentation Boundary

- official Docsはproduct SPAとは別entry / build artifactとする。
- official Docsから`src/modules/`、application state、browser file adapterをimportしない。
- product sourceからcopyを自動抽出せず、capability記述をroadmap / specificationとreviewで照合する。
- screenshotは日本語UIのproduction buildから生成し、`docs-site/public/images/`へ配置する。
- Pages artifactへ`.steering/`やengineering `docs/`をcopyしない。

## 10. Future Identity Context

Supabase Auth実装時に`src/modules/identity/`を追加する。

```text
identity/
├── domain/
├── application/
│   └── ports/AuthProviderPort.ts
├── infrastructure/
│   └── supabase/
├── presentation/
└── index.ts
```

v0.1ではこのfolder、Supabase dependency、環境変数を作成しない。
