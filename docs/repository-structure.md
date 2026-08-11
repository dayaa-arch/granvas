# Granvas リポジトリ構造定義書

> Status: Draft / Approval Candidate  
> Target: v0.1  
> Updated: 2026-08-10

## 1. 基本方針

ドメインを最上位の分割単位とし、各Context内部に`domain / application / infrastructure / presentation`を閉じ込める。存在しない責務のために空folderや抽象classを作らない。

## 2. Target Structure

```text
granvas/
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
│   │   │   │   └── exporters/
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
├── README.md
├── package.json
├── bun.lock
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

## 3. Directory Responsibilities

### 3.1 `src/app`

- application / infrastructure composition root。
- public presentation componentsのUI composition root。
- route、global provider、top-level Error Boundary。
- business ruleを置かない。

### 3.2 `src/modules/document`

- active document、source、revision、dirty lifecycle。
- v0.1ではinfrastructure folderを原則作らない。
- File APIやlocalStorageを置かない。

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
