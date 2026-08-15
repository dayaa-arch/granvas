# Granvas 開発ガイドライン

> Status: Release Candidate
> Updated: 2026-08-15

## 1. 開発の基準

1. `docs/ideas/initial-requirements.md`を要求の真の情報源とする。
2. 永続的な設計は`docs/`、作業単位の判断は`.steering/`へ記録する。
3. 仕様変更を実装だけで行わず、対応文書またはADRを先に更新する。ADRは`docs/adr/`へ置く。
4. Textを正本とし、Graph・座標・visual exportを派生データとして扱う。Graph側の編集もTextの書き換えとして実現する。
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
- token spansがprimary rangeの内側に収まることをtestする。
- 記法へsyntaxを追加したら、既存fixtureが無改変で通ることを後方互換の証明として残す。
- Parser outputへUI library型を含めない。

## 6.1 Source Edit Development

編集規則はParserと同格のexecutable specificationとして扱う。詳細は`docs/GRANVAS_SPEC_v0.1.md`§5.4と[ADR-0002](adr/0002-source-edit-plan-as-notation-domain-concern.md)。

- 編集規則は`notation/domain/NotationEditor.ts`のpure functionとして書く。
- `(source, parseResult, command) → SourceEditPlan`のsignatureを守り、副作用を持たせない。
- **Graphからテキスト全文を再生成するコードを書かない。** 通常文が破壊される。
- 編集列は適用前sourceを基準とし、`from`昇順で重複しないことをtestする。
- 実行できない操作はthrowせず`rejected`として理由付きで返す。
- 最優先のtestは**round-trip**。「planを適用したsourceを再parseすると意図した構造になる」を全コマンドについて書く。
- 「通常文が変化しない」「編集対象以外の行が変化しない」を明示的にassertする。
- Graph ID → occurrence keyの逆引きは`ProjectionSourceMapDto`経由とし、ID生成規則を再現しない。
- Graph編集の前に必ずpendingなsource更新をflushする。debounce中の解析結果へpatchを当てるとoffsetがずれる。
- Presentationは編集列を1トランザクションでdispatchし、Undo 1回で戻せることをtestする。

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
- PNGは2x / 8192px policyを通し、Canvas / Image / Object URL failureを`graph-render-failed`へ正規化する。
- PDF libraryはTransfer infrastructureからdynamic importし、browser / library型をApplication contractへ公開しない。
- visual export成功でdirtyを解除しない。

## 8.1 Temporary Browser Recovery

- 一時保存はDocument Applicationのport経由とし、Domain / Applicationから`window` / `localStorage`を参照しない。
- 保存payloadはversioned schemaとして`unknown`から検証し、Text以外のGraph / 座標 / projection / Undo履歴を含めない。
- TTLは最後のwrite成功から24時間とし、期限境界、clock tamper、corrupt JSON、unknown schemaをtestする。
- storageのread / write / remove例外は編集失敗へ昇格させず、利用不可状態へ正規化する。
- Text入力直後のreloadで失わないよう、projection debounce前のpending sourceを保存する。
- 一時保存は`.granvas` clean baselineを変更しない。
- browser performance testで同期serialization / writeがinput paint budgetを超えないことを確認する。

## 9. React / Styling

- componentは単一の表示責務に限定する。
- domain/application stateをlocal componentへ複製しない。
- presentation-only stateは`useState` / `useReducer`を使う。
- global state libraryを追加する場合はADRを作る。
- colorだけでtype、selection、diagnosticを区別しない。
- focus styleを消さない。
- dialogはfocus trap、Escape、focus returnを実装する。
- layoutは960px幅で破綻させず、1280px以上を推奨体験とする。

### 9.1 UI Language

- 製品UIは日本語を標準とする。
- visible text、accessible name、tooltip、dialog、`aria-live`、diagnostic、errorの用語を一致させる。
- `Text / Graph / Import / Download / certainty`などの表示名は`docs/glossary.md`を正本とする。
- Notation token、Node Type、Explicit ID、format名、code上のUbiquitous Languageは翻訳しない。
- Domain / Applicationのmachine-readable error codeを安定contractとして維持し、presentation formatterが日本語表示文へ変換する。
- unknown errorは安全な日本語fallbackを表示し、stack、local path、機密情報を露出しない。
- 単一日本語UIのために汎用i18n frameworkを導入しない。locale切替が要求された時点で別Phase / ADRとして設計する。

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

## 14. Official Documentation

- 日本語公式利用ガイドのsourceは`docs-site/`へ置き、engineering `docs/`と分離する。
- 実装済みcapabilityだけを利用可能として記載し、Docs edition 1.0とproduct v0.1 Release Candidateを区別する。
- screenshotはproduction buildから取得し、個人情報、local path、credentialを含めない。
- semantic HTML、skip link、heading hierarchy、alt、focus indicator、keyboard navigationをtestする。
- 1280px以上と390px相当のviewportでvisual QAする。
- tracking、analytics、remote font、cookie、third-party runtime script、form backendを追加しない。
- `bun run docs:build`で`/granvas/` baseのartifactを生成し、`bun run docs:verify`でentry、asset、`.nojekyll`を検証する。
- mainのreview済みsourceから生成したartifactだけを`gh-pages`へ公開する。
- `.github/workflows/quality.yml`はquality verificationだけを行い、custom Pages / Vercel deployment workflowを追加しない。

## 15. Git / Review

- 1 commitは説明可能な変更単位にする。
- generated output、secret、local environment fileをcommitしない。
- lockfileはdependency変更と同じcommitへ含める。
- PRには要求、設計、test結果、残課題を記載する。
- architecture boundary違反、document/code不整合、data loss riskをblockerとする。
- public releaseはMIT `LICENSE`、`CONTRIBUTING.md`、`SECURITY.md`、canonical exampleを必須とする。
- CIはfrozen Bun installとlocal同等のquality commandを実行し、credential / write permissionを持たない。
- Vercel Git IntegrationのProduction Branchは`main`とし、greenなPRをmergeしたpushからProduction Deploymentを自動作成する。
- GitHub ActionsへVercel deployment job、token、organization ID、project IDを追加しない。
- merge後はdeployment source commit、`READY`、production alias、live direct access / reloadを確認する。
- `.vercel/`をcommitしない。

## 16. Commands

```bash
bun install
bun run dev
bunx tsc -b
bunx eslint .
bun run test:run
bunx playwright test
bun run build
bun run docs:build
bun run docs:verify
```

## 17. Completion Checklist

- [ ] Acceptance Criteriaを満たす。
- [ ] relevant unit / component / E2E testが通る。
- [ ] typecheck / lint / buildが通る。
- [ ] module boundaryに違反しない。
- [ ] security / accessibility / performanceへの影響を確認した。
- [ ] 永続文書、ADR、steering tasklistを更新した。
- [ ] UI copy変更時はvisible textとaccessible nameを日本語で確認した。
- [ ] official Docs変更時はlocal build、responsive、keyboard、公開後live URLを確認した。
- [ ] productionへ影響するmain merge後はVercel deploymentとlive URLを確認した。
