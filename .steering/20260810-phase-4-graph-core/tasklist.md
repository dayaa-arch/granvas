# Phase 4 Graph Core タスクリスト

> 作成日: 2026-08-10
> ステータス: 完了

## 0. Git準備

- [x] Issue #9起票、main更新、`codex/phase-4-graph-core`branch作成。

## 1. Semantic Graph

- [x] ThoughtGraph / Node / Edge / Groupを実装する。
- [x] deterministic Graph IDとkey順正規化を実装する。
- [x] parallel Edge / self-loop / cycle / duplicate explicit IDを保持する。
- [x] multiple Group membership / deduplicationを実装する。
- [x] dangling input validationを実装する。

## 2. Application / Layout

- [x] immutable public DTOとCreateThoughtGraphを実装する。
- [x] 240 × 88のnormalized layout inputを実装する。
- [x] GraphLayoutPort / CancellationSignalを実装する。
- [x] layout use caseとrevision guardを実装する。
- [x] 24px Group overlay boundsを実装する。
- [x] GraphExportSceneDto / full boundsを実装する。

## 3. Infrastructure

- [x] pure Dagre mappingを実装する。
- [x] Dagre Web Worker entryを実装する。
- [x] Worker adapterのsuccess / failure / cancellationを実装する。
- [x] browser / Dagre型をInfrastructure内に隔離する。

## 4. Test / Quality

- [x] Graph / mapping / validation testを追加する。
- [x] layout / group / export bounds testを追加する。
- [x] adapter / cancellation / revision mismatch testを追加する。
- [x] 200 / 300 / 10 fixtureのp95 200ms以下を確認する。
- [x] typecheck / lint / 全test / build / 3-browser E2Eを成功させる。
- [x] SourceRange / UI / browser依存がcore contractにないことを確認する。

## 5. 完了

- [x] 初回実装tasklistを更新する。
- [x] tasklistを完了状態にする。
- [x] commit / push / PR / squash mergeを完了する。
- [x] Issue close、branch削除、clean main同期を確認する。

## 完了条件

- [x] Graph Coreの全published contractとDagre Workerが実装済みである。
- [x] 全quality / performance gateがgreenである。
- [x] PR経由でmainへmerge済みである。
