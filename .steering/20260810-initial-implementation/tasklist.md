# Granvas v0.1 初回実装タスクリスト

> 作成日: 2026-08-10
> 最終整理日: 2026-08-11
> ステータス: Phase 12完了・次工程Phase 8
> Phase正本: `docs/development-roadmap.md`

この文書はPhaseごとの実装進捗を追跡する。Phase名称と番号は開発ロードマップに合わせ、完了済みのsteering / Issue / PRはロードマップの履歴対応表から参照する。

## Phase 0: Documentation Baseline

- [x] `docs/ideas/initial-requirements.md`を作成する。
- [x] `docs/GRANVAS_SPEC_v0.1.md`をレビューし、改訂する。
- [x] `dev-docs`の永続的ドキュメント7点を作成する。
- [x] ルートの`AGENTS.md`を作成する。
- [x] 初回実装用のステアリングファイルを作成する。
- [x] 統合仕様書、永続的ドキュメント、`AGENTS.md`のユーザー承認を得る。
- [x] 本タスクリストのユーザー承認を得る。

完了条件:

- [x] Product scope、persistence、hosting、future auth方針が文書間で一致する。
- [x] Context、Layer、Port、SourceRange、revision、Group contractが定義済みである。

## Phase 1: Foundation

- [x] `src/modules/{document,notation,graph,transfer,workspace}`の境界を準備する。
- [x] `src/app/bootstrap/createApplication.ts`を追加する。
- [x] `@/*`path aliasを設定する。
- [x] Context間・Layer間の境界を守るESLint ruleとtestを追加する。
- [x] typecheck、lint、test、build、e2e scriptを整備する。
- [x] PlaywrightをChromium、Firefox、WebKit向けに設定する。
- [x] Vercelのstatic SPA、fallback、production CSP contractを追加する。
- [x] typecheck / lint / test / build / 3-browser E2Eを成功させる。

## Phase 2: Document Context

- [x] `GranvasDocument`と`DocumentRevision`を実装する。
- [x] clean / dirty / exporting / errorの状態遷移を実装する。
- [x] Create / Update / Replace Documentを実装する。
- [x] project Download開始・成功・失敗のrevision ticket lifecycleを実装する。
- [x] stale completionを含む全状態遷移へunit / application testを追加する。
- [x] Documentにstorage / browser依存が存在しないことを確認する。

## Phase 3: Notation Core

- [x] LF / CRLFのoffsetを保持するline scannerを実装する。
- [x] candidate classifier、Node、Nested / Cross Relation parserを実装する。
- [x] parent stack、document-wide reference resolver、Group scope / membershipを実装する。
- [x] Layout Directiveと全diagnostic code / recovery ruleを実装する。
- [x] UTF-16 `SourceRangeDto`とdeterministic occurrence keyを実装する。
- [x] canonical、invalid、Group、forward reference、emoji、CRLF、BOM fixtureを追加する。
- [x] 仕様書第4章をexecutable testとして網羅する。
- [x] Parserが前revisionの構造やUI固有型を公開しないことを確認する。

## Phase 4: Graph Core

- [x] `ThoughtGraph` / Node / Edge / Group modelとParsed DTO mappingを実装する。
- [x] duplicate explicit ID、parallel Edge、multiple Group membershipを処理する。
- [x] 240 × 88 Node boundsとoccurrence key順layout inputを実装する。
- [x] `GraphLayoutPort` / `CancellationSignal` / Dagre Web Worker adapterを実装する。
- [x] 24px Group overlay boundsと`GraphExportSceneDto`を実装する。
- [x] Graph、layout、cancellation、determinismのcontract testを追加する。
- [x] 基準fixtureに対するlayout worker p95 200ms以下を確認する。
- [x] Graph Domainに`SourceRange`やframework固有型がないことを確認する。

## Phase 5: Workspace Core

- [x] 全Contextのpublished application APIを統合する。
- [x] Document → Notation → Graph → Layout pipelineを実装する。
- [x] revision propagation、cancellation、latest-wins guardを実装する。
- [x] `ProjectionSourceMapDto`とprojection revision整合性checkを実装する。
- [x] Graph → Text / Text → Graph selection mappingを実装する。
- [x] dirty confirmation付きProject replacementを実装する。
- [x] project / visual Download input assemblyを実装する。
- [x] failure、partial、遅い旧requestと速い新requestのtestを追加する。

## Phase 6: Transfer Core

- [x] `DownloadFormat`、file name、MIME、PNG scale / 8192px policyを実装する。
- [x] `.granvas` pickerとextension / 5 MiB / strict UTF-8 / BOM validationを実装する。
- [x] Application portsとImport / Project Download / Graph Download use caseを実装する。
- [x] Browser picker / Blob download adapterを実装する。
- [x] BOM-free `.granvas` DownloadとImport round-tripを実装する。
- [x] SVG exporter、full bounds、XML escapingを実装する。
- [x] Transfer contract、failure path、XSS fixtureのtestを追加する。

完了条件:

- [x] Transfer Coreのframework-neutral portとpublished contractが利用できる。
- [x] `.granvas`とSVGの生成、validation、browser download contractがgreenである。
- [x] Canvas PNG生成とPDF生成がPhase 8のscopeとして分離されている。

## Phase 7: Presentation Shell

- [x] starter UIをGranvas shellへ置き換える。
- [x] Top Bar、Import / Download action、可変SplitPane、StatusBarを実装する。
- [x] CodeMirror `GranvasEditor`とsyntax / diagnostic gutter / accessible detailを実装する。
- [x] read-only `ReactFlowGraphView`、Node / Edge / Group style、Pan / Zoom / Fit Viewを実装する。
- [x] 初回 / Import後だけFit Viewし、通常update中のviewportを維持する。
- [x] Graph click / keyboard → TextとText cursor → Graph highlightを実装する。
- [x] IME compositionを実装する。
- [x] Download Dialog、error state、Graph空時のvisual format disableを実装する。
- [x] `.granvas`成功時だけcleanへ変更するlifecycleを結線する。
- [x] `beforeunload`とdirty Project置換警告を実装する。
- [x] component / accessibility testとText ↔ Graph / Import round-trip E2Eを追加する。
- [x] 現行E2EをChromium、Firefox、WebKitで成功させる。

## Phase 10: Notation Certainty

- [x] Node確信度マーカー`[?type]` / `[!type]` / `[~type]`を解析する。
- [x] Relation operator `?->` / `!->` / `~->`をNested / Cross Relationで解析する。
- [x] `GNV014_INVALID_CERTAINTY_MARKER`とpartial recoveryを実装する。
- [x] certaintyをGraph Domain / layout DTO / Positioned Graphへ伝播する。
- [x] Node / Edgeの4状態を非color表現とaccessible nameで表示する。
- [x] CodeMirror certainty syntax highlightを実装する。
- [x] Certainty DemoとPhase 3 fixtureの後方互換testを追加する。
- [x] Chromium / Firefox / WebKitでCertainty Demo E2Eを成功させる。

完了条件:

- [x] 既存sourceの意味構造を維持し、既存要素を`neutral`として解析する。
- [x] rejectedなNode / Edgeを消さず棄却として表示する。
- [x] 4状態をTextからGraphへ決定的に投影する。

## Phase 11: Source Edit Core

- [x] token spansと`NotationEditor` / `SourceEditPlan`を実装する。
- [x] Nodeラベル / Type編集をTextの最小差分として適用する。
- [x] Workspace orchestration、1 transaction、Undo、selection再解決を実装する。
- [x] round-tripと散文非破壊を検証する。

## Phase 12: Graph Authoring

- [x] 意味ドラッグ、Node作成、Edge接続、削除を実装する。
- [x] 循環拒否、削除連鎖の事前提示、`@id`自動採番を実装する。
- [x] 座標非永続化、Undo、round-trip、3-browser E2Eを検証する。

## Phase 8: Visual Export

- [ ] Canvas PNG exporterを実装する。
- [ ] 2x scaleと8192 × 8192px上限、縮小通知を実装する。
- [ ] PDF generation libraryを比較しADRを作成する。
- [ ] single-page、white background、graph bounds page sizeのPDF exporterを実装する。
- [ ] SVG / PNG / PDFを選択するexport adapter compositionを実装する。
- [ ] SVG / PNG / PDFにfull GraphのNode / Edge / Group / relation labelが含まれることを検証する。
- [ ] visual Download成功・失敗後もdirty stateとcurrent sourceを維持することを検証する。
- [ ] SVG / PNG / PDF full-graph Download E2Eを追加する。

## Phase 9: Release Hardening

- [ ] 500 lines / 200 nodes / 300 edges / 10 groupsのperformance fixtureを追加する。
- [ ] input paint、Parser、layout worker、Graph paintのp95を計測する。
- [ ] stale layoutがlatest projectionを上書きしないE2Eを追加する。
- [ ] keyboard-only E2EとWCAG 2.2 AA自動検査を追加する。
- [ ] production outbound request監視testを追加する。
- [ ] Vercel preview / productionでCSP、direct access、reloadを検証する。
- [ ] Supabase SDK、credential、telemetry、remote APIがbundleに含まれないことを確認する。
- [ ] canonical `.granvas` exampleを追加する。
- [x] READMEへローカル起動方法とProject file workflowを記載する。
- [x] READMEへ現在の実装状態とPhase 0〜9を反映する。
- [ ] CONTRIBUTINGを追加する。
- [ ] SECURITYを追加する。
- [ ] OSS licenseを決定し、LICENSEを追加する。
- [ ] typecheck / lint / test / build / E2E用GitHub Actionsを追加する（ユーザー指示により後回し）。
- [ ] 全主要6scenarioをChromium、Firefox、WebKitで成功させる。
- [ ] Vercel productionへdeployする。
- [ ] `docs/GRANVAS_SPEC_v0.1.md`のDefinition of Doneを完了する。

## 最終品質確認コマンド

```bash
bun run typecheck
bun run lint
bun run test:run
bun run test:graph-performance
bun run build
bun run e2e
```
