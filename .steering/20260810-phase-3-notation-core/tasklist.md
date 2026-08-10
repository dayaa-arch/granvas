# Phase 3 Notation Core タスクリスト

> 作成日: 2026-08-10
> ステータス: 完了

## 0. Git準備

- [x] GitHub Issueを`enhancement`で起票する（#7）。
- [x] `main`を最新化する。
- [x] `codex/phase-3-notation-core`branchを作成する。

## 1. Scanner / Candidate

- [x] LF / CRLFを保持するline scannerを実装する。
- [x] UTF-16 SourceRangeを実装する。
- [x] candidate classifierとGroup scope commit pointを実装する。
- [x] Tab / invalid indent候補を分類する。

## 2. Parser / Resolver

- [x] Node Declaration / Explicit IDを実装する。
- [x] Nested Relation parent stackとrecoveryを実装する。
- [x] Cross Relationとforward resolverを実装する。
- [x] Group scope / membership / nested relationを実装する。
- [x] Layout default / TB / LR / duplicateを実装する。
- [x] `GNV001`〜`GNV013`を実装する。
- [x] deterministic occurrence keyを実装する。

## 3. Application Contract

- [x] immutable DTOと`parseNotation` use caseを実装する。
- [x] document revisionを全result / diagnosticへ伝播する。
- [x] `src/modules/notation/index.ts`からpublished contractだけを公開する。

## 4. Test

- [x] scanner / classifier testを追加する。
- [x] canonical / invalid / Group / forward fixtureを追加する。
- [x] 全必須構文・recovery caseをtestする。
- [x] 全13 diagnostic codeをtestする。
- [x] emoji / CRLF / BOM境界をtestする。
- [x] key determinismとrevision isolationをtestする。

## 5. 品質・動作検証

- [x] typecheckを成功させる。
- [x] lintを成功させる。
- [x] 全unit testを成功させる。
- [x] production buildを成功させる。
- [x] Chromium / Firefox / WebKit E2Eを成功させる。
- [x] canonical demoをpublished APIでparseし、5 / 3 / 1 / TB / 0を観測する。
- [x] UI / browser / storage dependencyがないことを確認する。

## 6. 文書・GitHub完了

- [x] 初回実装tasklistの完了項目を更新する。
- [x] 本tasklistを完了状態へ更新する。
- [x] commit / push / PRを作成する。
- [x] local gateがgreenのPRをsquash mergeする。
- [x] Issue close、remote branch削除、cleanなmain同期を確認する。

## 完了条件

- [x] 仕様書第4章のNotation Coreがpublished APIとして利用できる。
- [x] executable specificationと全quality gateがgreenである。
- [x] PR経由でmainへmerge済みである。
