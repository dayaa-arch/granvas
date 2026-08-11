# Phase 11 Source Edit Core タスクリスト

> 作成日: 2026-08-11
> ステータス: 実装・検証完了、PR準備中（Issue #21）

## 1. 準備

- [x] AGENTS.md、初期要求、統合仕様書、永続文書7点、ADR、roadmapを確認する。
- [x] Phase 10完了とPhase 11が次工程であることを確認する。
- [x] 現行Parser / Workspace / CodeMirror / React Flow / E2Eの影響範囲を監査する。
- [x] requirements / design / tasklistの承認を得る。
- [x] Issue #21を起票し、`codex/phase-11-source-edit-core` branchを作成する。

## 2. Parser Token Spans

- [x] Node / Relation / Groupのspan型をNotation Domainへ追加する。
- [x] Nodeのindent / certainty / type / explicitId / idInsertionPoint / labelを算出する。
- [x] Nested / Cross Relationのoperator / refs / label / labelInsertionPointを算出する。
- [x] Groupのheader / name / memberInsertionPointをscope終了位置から算出する。
- [x] application DTO / `index.ts`からpublished contractを公開する。
- [x] UTF-16 / CRLF / emoji / 日本語 / Group scopeを含むspan testを追加する。

## 3. Notation Editor

- [x] `NotationEditor.ts`へSourceEdit / Plan / Rejection / commandを定義する。
- [x] `planSetNodeLabel`とlabel validationを実装する。
- [x] `planSetNodeType`とtype validation / lowercase正規化を実装する。
- [x] source edit適用・offset mapping・編集列invariantを実装する。
- [x] `PlanNotationEdit` application use caseとpublished DTOを追加する。
- [x] round-trip、散文非破壊、他行不変、rejected、no-op testを追加する。

## 4. Workspace Integration

- [x] `ProjectionSourceMapDto`へ`nodeKeys` / `edgeKeys` / `groupKeys`を追加する。
- [x] index対応を廃止し、rangeとkeyを明示対応させる。
- [x] current `ParseResultDto`をprojection revisionとともに保持する。
- [x] Workspace `applyGraphEdit`とapplied / rejected result DTOを実装する。
- [x] source patch、Document revision更新、再投影、caret/selection再解決を実装する。
- [x] rejection時のsource / revision / dirty / projection不変をtestする。
- [x] current revision、latest-wins、key lookup、selectionをtestする。

## 5. Presentation Integration

- [x] `GranvasEditorHandle.applyEdits`を1 CodeMirror transactionで実装する。
- [x] patch適用時の`onSourceChange`再入を防ぎ、Import用全文置換を維持する。
- [x] patch適用後のselectionとUndo 1回をcomponent testする。
- [x] Graph Nodeのラベル / Type inline editorを実装する。
- [x] double click / F2 / Shift+F2 / Enter / Escape / focus returnを実装する。
- [x] IME composition中のEnter確定を抑止する。
- [x] Appでpending source flush → applyGraphEdit → editor patch → snapshot更新を配線する。
- [x] rejected / applied結果を`aria-live`で通知する。
- [x] Graph component testとApp integration E2Eを追加する。

## 6. E2E / 品質

- [x] Graphラベル編集がTextの該当spanだけを変え、Graphを再投影するE2Eを追加する。
- [x] Graph Type編集とkeyboard経路をE2Eで確認する。
- [x] 散文保持とUndo 1回をE2Eで確認し、pending source flushをApp配線で確認する。
- [x] `bun run typecheck`を成功させる。
- [x] `bun run lint`を警告0で成功させる。
- [x] `bun run test:run`を123件成功（performance 1件skip）で完了する。
- [x] isolated Graph performance testを成功させる。
- [x] `bun run build`を成功させる。
- [x] `bunx playwright test`をChromium / Firefox / WebKitの21件で成功させる。
- [x] 実ブラウザでラベル / Type編集、Escape取消、Undo、focusを確認する。
- [x] architecture boundary、security、accessibility、performance影響を監査する。

## 7. 文書・GitHub完了処理

- [x] README、roadmap、統合仕様書、初回tasklistをPhase 11実装・検証完了へ同期する。
- [ ] tasklistを最終状態へ更新する。
- [ ] 意図した変更だけをcommit / pushする。
- [ ] PRへ要求、設計、検証結果、残課題を記載する。
- [ ] greenを確認してPRをmainへmergeし、Issue closeとbranch削除を確認する。
- [ ] clean mainがorigin/mainと一致することを確認する。

## 完了条件

- [x] Phase 11の全受け入れ条件を満たす。
- [x] Text全文再生成、Graph DomainへのSourceRange混入、Workspaceでの記法組み立てが存在しない。
- [x] Graphラベル / Type編集がText最小差分・Undo 1回・current revisionで成立する。
- [x] 全品質gateと実ブラウザ検証がgreenである。
- [ ] PR経由でmainへmerge済みである。
