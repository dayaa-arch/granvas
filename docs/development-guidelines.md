# Granvas 開発ガイドライン

> Status: Draft / Approval Candidate  
> Updated: 2026-08-10

## 1. 開発の基準

1. `docs/ideas/initial-requirements.md`を要求の真の情報源とする。
2. 永続的な設計は`docs/`、作業単位の判断は`.steering/`へ記録する。
3. 仕様変更を実装だけで行わず、対応文書またはADRを先に更新する。
4. Textを正本とし、Graph・座標・visual exportを派生データとして扱う。
5. Domain boundary、SRP、一方向依存、疎結合、DIPをreview blockerとして扱う。

## 2. Development Workflow

機能追加・修正ごとに以下を作成する。

```text
.steering/YYYYMMDD-development-title/
├── requirements.md
├── design.md
└── tasklist.md
```

作業順:

1. 要求と受け入れ条件を確定する。
2. 影響する永続文書とContextを特定する。
3. port / DTO / error / test strategyを設計する。
4. tasklistの順に小さく実装する。
5. test、typecheck、lint、build、必要なE2Eを実行する。
6. 文書と実装の整合性を確認する。

## 3. TypeScript Rules

- strict TypeScriptを維持する。
- `any`を原則禁止し、外部入力は`unknown`からnarrowingする。
- public DTOはimmutableな値として扱い、必要に応じ`readonly`を使用する。
- `enum`よりstring literal unionを優先する。
- parser / mapping / domain logicはpure functionを優先する。
- errorは境界で分類し、parser入力誤りをthrowしない。
- `BaseUseCase`、`BaseRepository`、`AbstractService`、`GenericManager`を必要性なしに作らない。
- `utils.ts` / `helpers.ts`へcontext固有logicを集約しない。

## 4. Naming

Ubiquitous Languageをコード名に使用する。

推奨:

```text
GranvasDocument
DocumentRevision
NodeDeclaration
ThoughtGraph
ProjectionSourceMap
DownloadFormat
ProjectFile
```

避ける:

```text
Data
Item
Manager
Processor
Helper
Common
```

- use caseは動詞から始める: `ParseNotation`, `DownloadProject`。
- portは役割 + `Port`: `GraphLayoutPort`。
- infrastructure具象は技術 + 役割 + `Adapter`。
- DTOはmodule境界でのみ`Dto` suffixを使う。
- ViewModelはpresentation境界でのみ`ViewModel` suffixを使う。

## 5. Module / Layer Rules

### Domain

- own domainと`shared/domain`だけをimportする。
- React、DOM、browser API、CodeMirror、React Flow、Dagre、Supabaseをimportしない。
- Graph Domainへ`SourceRange`を置かない。

### Application

- own domain/applicationをimportする。
- infrastructure具象、React component、browser型をimportしない。
- Workspaceだけが他Contextのpublished application APIをimportできる。
- portは`application/ports/`に定義する。

### Infrastructure

- own application portを実装する。
- SDK / browser型はDTOへ変換してから返す。
- external typeをpublic APIへexportしない。

### Presentation

- own application、shared presentation、UI libraryだけをimportする。
- domain entityを直接描画しない。
- Appがpublic presentation componentsを合成する。

## 6. Parser Development

- `docs/GRANVAS_SPEC_v0.1.md`第4章をexecutable specificationとする。
- line candidate分類をgrammar parsingより先にtestする。
- current revisionのsourceだけからpartial resultを生成する。
- recovery behaviorをdiagnostic codeごとにgolden testへ記録する。
- UTF-16、emoji、CRLF、BOM、IMEを含むfixtureを用意する。
- occurrence keyは同一sourceに対して決定的であることをtestする。
- Parser outputへUI library型を含めない。

## 7. Projection / Concurrency

- ParseResult、Graph、Layout、SourceMap、Diagnosticsへ同じrevisionを伝播する。
- new revisionで古いlayoutをcancelする。
- current revisionと一致しない結果をpresentationへcommitしない。
- async testではold requestを意図的に遅延させ、latest-winsを検証する。
- selectionは古いGraph IDを保持せず、current source rangeから再解決する。

## 8. Import / Download

- Import fileをuntrusted inputとして扱う。
- extension、size、UTF-8をDocument置換前に検証する。
- Import失敗時にcurrent sourceを変更しない。
- `.granvas` round-tripではsource文字列を保持する。
- SVG / PNG / PDFはcurrent revisionのexport sceneだけを使う。
- DOM snapshotをapplication contractへ渡さない。
- source由来文字列をHTMLとして挿入しない。
- visual export成功でdirtyを解除しない。

## 9. React / Styling

- componentは単一の表示責務に限定する。
- domain/application stateをlocal componentへ複製しない。
- presentation-only stateは`useState` / `useReducer`を使う。
- global state libraryを追加する場合はADRを作る。
- colorだけでtype、selection、diagnosticを区別しない。
- focus styleを消さない。
- dialogはfocus trap、Escape、focus returnを実装する。
- layoutは960px幅で破綻させず、1280px以上を推奨体験とする。

## 10. Security

- `eval`、`new Function`、dynamic script injectionを禁止する。
- `dangerouslySetInnerHTML`を原則禁止する。必要な場合はsecurity reviewとADRを必須とする。
- Node label、relation label、Group name、diagnostic、file nameをuntrustedとして扱う。
- SVG/XML attribute、HTML、file nameのsinkごとにescape / allowlistする。
- secretをsource code、Vite public env、client bundleへ置かない。
- v0.1にSupabase dependencyやcredentialを追加しない。
- dependency追加時にlicenseとknown vulnerabilityを確認する。

## 11. Accessibility

- WCAG 2.2 AAを適合目標とする。
- click操作にkeyboard代替を用意する。
- interactive controlへaccessible nameを付ける。
- Graph Nodeをfocus可能にし、Enter / Spaceでactivateする。
- statusとerrorを`aria-live`で通知する。
- keyboard-only E2Eと自動accessibility testをrelease gateにする。

## 12. Testing

### Domain

- pure functionとinvariantをunit testする。
- Parserはinput、exact DTO、diagnosticsをgolden testする。

### Application

- portをfake / stubへ差し替える。
- revision、cancellation、dirty state、failure pathをtestする。

### Infrastructure

- Browser file adapter、Dagre Worker、format exporterのcontractをtestする。
- library-specific behaviorをdomain testへ混ぜない。

### Presentation

- user-visible behaviorをReact Testing Libraryでtestする。
- implementation detailや内部stateを直接assertしない。

### E2E

- Chromium / Firefox / WebKitで主要6scenarioを実行する。
- Download testはfile名、MIME、内容、dirty stateを検証する。
- Import testはdownloadした`.granvas`から編集再開できることを検証する。

## 13. Performance

- benchmarkは`tests/performance/`のcanonical fixtureを使用する。
- input handlerでparse / layoutを同期実行しない。
- projection debounce既定値は120ms。
- p95 budgetを超える変更は原因と計測結果をPRへ記載する。
- 大きなfileを扱う前に5 MiB hard limitを検証する。

## 14. Git / Review

- 1 commitは説明可能な変更単位にする。
- generated output、secret、local environment fileをcommitしない。
- lockfileはdependency変更と同じcommitへ含める。
- PRには要求、設計、test結果、残課題を記載する。
- architecture boundary違反、document/code不整合、data loss riskをblockerとする。
- public release前にOSS licenseを決定する。

## 15. Commands

```bash
bun install
bun run dev
bunx tsc -b
bunx eslint .
bun run test:run
bunx playwright test
bun run build
```

## 16. Completion Checklist

- [ ] Acceptance Criteriaを満たす。
- [ ] relevant unit / component / E2E testが通る。
- [ ] typecheck / lint / buildが通る。
- [ ] module boundaryに違反しない。
- [ ] security / accessibility / performanceへの影響を確認した。
- [ ] 永続文書、ADR、steering tasklistを更新した。
