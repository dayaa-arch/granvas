# 初回実装タスクリスト

> 作成日: 2026-08-10  
> ステータス: 承認済み

## 0. ドキュメント基準の整備

- [x] `docs/ideas/initial-requirements.md`を作成する。
- [x] `docs/GRANVAS_SPEC_v0.1.md`をレビューし、改訂する。
- [x] `dev-docs`の永続的ドキュメント7点を作成する。
- [x] ルートの`AGENTS.md`を作成する。
- [x] 初回実装用のステアリングファイルを作成する。
- [x] 統合仕様書、永続的ドキュメント、`AGENTS.md`のユーザー承認を得る。
- [x] 本タスクリストのユーザー承認を得る。
- [ ] リリース工程までにOSSライセンスを決定する。

## 1. プロジェクト基盤とアーキテクチャ制約

- [x] 必要に応じて`src/modules/{document,notation,graph,transfer,workspace}`構造を追加する。
- [x] 必要に応じて`src/shared/{domain,infrastructure,presentation}`構造を追加する（Phase 1では空のshared構造は不要と判断）。
- [x] `src/app/bootstrap/createApplication.ts`を追加する。
- [x] `@/*`パスエイリアスを設定する。
- [x] Context間・Layer間の境界を守るESLintルールを追加する。
- [x] `typecheck`、`lint`、`e2e`のpackage scriptを追加する。
- [x] PlaywrightをChromium、Firefox、WebKit向けに設定する。
- [x] Vercelの静的SPA設定を追加する。
- [x] production CSP headerと検証testを追加する。

完了条件:

- [x] `bunx tsc -b`が成功する。
- [x] `bunx eslint .`が成功する。
- [x] `bun run test:run`が成功する。
- [x] `bun run build`が成功する。

## 2. Documentコンテキスト

- [x] `GranvasDocument`と`DocumentRevision`を実装する。
- [x] `clean / dirty / exporting / error`の状態遷移を実装する。
- [x] `CreateDocument`を実装する。
- [x] `UpdateDocumentSource`を実装する。
- [x] `ReplaceDocumentSource`を実装する。
- [x] `MarkProjectDownloaded`を実装する。
- [x] すべての状態遷移にunit testを追加する。
- [x] Documentにstorage / browser依存が存在しないことを確認する。

## 3. Notationコンテキスト

- [x] LF / CRLFのoffsetを保持するline scannerを実装する。
- [x] Notation candidate classifierを実装する。
- [x] Node Declaration parserを実装する。
- [x] Nested Relationのparent stackを実装する。
- [x] Cross Relation parserとdocument全体のreference resolverを実装する。
- [x] Group scopeとmembership parserを実装する。
- [x] Layout Directive parserを実装する。
- [x] すべてのdiagnostic codeとrecovery ruleを実装する。
- [x] UTF-16準拠の`SourceRangeDto`を実装する。
- [x] 決定的なoccurrence keyを実装する。
- [x] canonical、invalid、Group、forward referenceのfixtureを追加する。
- [x] emoji、CRLF、BOMのtestを追加する。
- [ ] CodeMirrorのsyntax highlightを追加する。
- [ ] diagnostic gutter、underline、accessible detailを追加する。

完了条件:

- [x] 統合仕様書第4章をexecutable testとして網羅する。
- [x] Parserが前revisionのデータを混在させない。
- [x] Parserの公開contractにUI固有型が含まれない。

## 4. Graphコンテキスト

- [x] Semantic Graphの`ThoughtGraph` modelを実装する。
- [x] Parsed DTOからGraphへのmappingを実装する。
- [x] duplicate explicit IDとparallel Edgeを処理する。
- [x] Nodeの複数Group所属を実装する。
- [x] 240 × 88固定Node boundsを実装する。
- [x] `GraphLayoutPort`と`CancellationSignal`を実装する。
- [x] Dagre Web Worker adapterを実装する。
- [x] occurrence key順にlayout inputを正規化する。
- [x] 24px paddingのGroup overlay boundsを実装する。
- [x] `GraphExportSceneDto`を実装する。
- [x] Graph、layout、cancellationのcontract testを追加する。

完了条件:

- [x] Graph Domainに`SourceRange`やframework固有型が含まれない。
- [x] 同じinputから決定的なGraphとlayoutを生成する。
- [x] 基準fixtureに対するlayout workerのp95が200ms以下になる。

## 5. Workspaceコンテキスト

- [x] 全Contextのpublic facadeを実装する。
- [x] source updateのorchestrationを実装する。
- [x] revisionの伝播を実装する。
- [x] cancellationとlatest-winsのcommit guardを実装する。
- [x] `ProjectionSourceMapDto`を実装する。
- [x] `WorkspaceProjectionDto`のrevision整合性checkを実装する。
- [x] GraphからTextへのselection effectを実装する。
- [x] TextからGraphへのselection mappingを実装する。
- [x] Import確認とProject置換のorchestrationを実装する。
- [x] Download inputのassemblyを実装する。
- [x] 遅い旧requestと速い新requestを再現する非同期testを追加する。

## 6. プレゼンテーション

- [ ] starter UIをGranvas shellへ置き換える。
- [ ] Top BarとImport / Download actionを実装する。
- [ ] 比率を変更できるSplitPaneを実装する。
- [ ] `GranvasEditor`を実装する。
- [ ] read-onlyの`ReactFlowGraphView`を実装する。
- [ ] Node、Edge、Groupのvisual styleを実装する。
- [ ] Pan / Zoom / Fit Viewを実装する。
- [ ] 通常のsource update中はviewportを維持する。
- [ ] 初回表示とImport後にFit Viewを実行する。
- [ ] dirty、revision、要素数、diagnosticsを表示するStatusBarを実装する。
- [ ] Graph clickからText selectionへの移動を実装する。
- [ ] Text cursorからGraph highlightへの連携を実装する。
- [ ] Graph Nodeのkeyboard activationを実装する。
- [ ] IME composition中の動作を実装する。
- [ ] component testとaccessibility testを追加する。

## 7. Transferコンテキスト

- [x] `DownloadFormat`とfile name policyを実装する。
- [x] `.granvas` file picker adapterを実装する。
- [x] extension、5 MiB上限、厳密なUTF-8、BOMを検証する。
- [x] Browser Blob download adapterを実装する。
- [x] `.granvas` Downloadを実装する。
- [x] SVG exporterを実装する。
- [ ] Canvas PNG exporterと8192px上限を実装する。
- [ ] PDF生成library選定のADRを作成する。
- [ ] single-page PDF exporterを実装する。
- [ ] Download dialogとerror stateを実装する。
- [ ] SVG / PNG / PDFのDownload後もdirtyを維持する。
- [ ] `.granvas`のdownload開始成功後にcleanへ変更する。
- [ ] `beforeunload`と破壊的操作の警告を実装する。
- [x] Import / Downloadのcontract testとXSS fixtureを追加する。

## 8. 性能・アクセシビリティ・セキュリティ

- [ ] 500 lines / 200 nodes / 300 edges / 10 groupsのperformance fixtureを追加する。
- [ ] input paint、Parser、layout worker、Graph paintのp95を計測する。
- [ ] keyboard-only E2Eを追加する。
- [ ] WCAG 2.2 AAの自動検査を追加する。
- [ ] productionのoutbound request監視testを追加する。
- [ ] Vercel preview / productionでCSPを検証する。
- [ ] Supabase SDK、credential、telemetry、remote APIがbundleに含まれないことを確認する。

## 9. E2Eテスト

- [ ] Text → Graph → click → Textを検証する。
- [ ] `.granvas` Download → Import → 編集再開を検証する。
- [ ] incomplete notationがあっても他のcurrent valid Graphを維持することを検証する。
- [ ] SVG / PNG / PDFにfull Graphが含まれることを検証する。
- [ ] 古いlayoutが最新projectionを上書きしないことを検証する。
- [ ] keyboardによるGraph Node → Text移動を検証する。
- [ ] 全scenarioをChromium、Firefox、WebKitで実行する。

## 10. OSS・リリース

- [ ] canonical `.granvas` exampleを追加する。
- [x] READMEへローカル起動方法とProject file workflowを記載する。
- [ ] CONTRIBUTINGを追加する。
- [ ] SECURITYを追加する。
- [ ] OSSライセンスを決定し、LICENSEを追加する。
- [ ] typecheck / lint / test / build / E2E用のGitHub Actionsを追加する。
- [ ] Vercel productionへdeployする。
- [ ] direct access / reloadを検証する。
- [ ] `docs/GRANVAS_SPEC_v0.1.md`のDefinition of Doneを完了する。

## 11. 最終品質確認コマンド

```bash
bunx tsc -b
bunx eslint .
bun run test:run
bunx playwright test
bun run build
```
