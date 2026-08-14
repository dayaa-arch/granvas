# 短期ブラウザ保存 タスクリスト

> 作成日: 2026-08-14
> ステータス: 完了
> Issue: [#34](https://github.com/dayaa-arch/granvas/issues/34)
> PR: [#35](https://github.com/dayaa-arch/granvas/pull/35)

## 1. 準備・仕様

- [x] AGENTS.md、初期要求、永続文書、統合仕様、ADR、roadmapを確認する。
- [x] existing Document / Workspace / bootstrap / App / E2Eの影響範囲を監査する。
- [x] requirements / design / tasklistを作成する。
- [x] requirements / design / tasklistの承認を得る。
- [x] Issueを起票し、`codex/add-temporary-browser-storage` branchを作成する。
- [x] ADR-0007と統合仕様へscope変更を先行反映する。
- [x] 永続文書、README、公式利用ガイドを新しい保存contractへ同期する。

## 2. Document storage contract

- [x] `TemporaryProjectStoragePort`をDocument Applicationに追加する。
- [x] JSON schema validationと24時間sliding TTLを持つrecovery serviceを実装する。
- [x] valid / expired / corrupt / unknown schema / clock tamperをunit testする。
- [x] read / write / remove failureをnon-blocking resultへ正規化してtestする。
- [x] Document published contractへ必要最小限のDTO / factoryだけを公開する。

## 3. Browser adapter / bootstrap

- [x] versioned keyを使うlocalStorage adapterをDocument Infrastructureへ追加する。
- [x] fake Storageによるread / write / remove / exception contract testを追加する。
- [x] composition rootでadapter、clock、recovery serviceを生成・注入する。
- [x] valid recoveryをdefault Projectより優先し、expired / invalid時にfallbackする。
- [x] bootstrap testへrestored / unavailable状態を追加する。

## 4. Workspace integration

- [x] clean / dirtyを維持したinitial recovered Documentを構築する。
- [x] pending Text sourceをprojection debounce前に一時保存するAPIを追加する。
- [x] source update / Project replacement / Graph edit / Download完了を一時保存へ同期する。
- [x] rejected / cancelled / failed operationがpayloadを不正に更新しないことをtestする。
- [x] storage failureがDocument / projectionをrollbackしないことをtestする。
- [x] expiry clearと最新保存時刻をWorkspace snapshotへ反映する。

## 5. Presentation

- [x] Status Barへ24時間一時保存の状態を追加する。
- [x] 復元成功を日本語のaccessible notificationで表示する。
- [x] storage unavailableの日本語表示を追加する。
- [x] `.granvas` dirty stateとの独立性をcomponent testで保証する。
- [x] 期限timerと再保存時のtimer更新をtestする。

## 6. E2E / quality

- [x] Text入力直後のreload復元E2Eを追加する。
- [x] Graph編集後のreload復元E2Eを追加する。
- [x] 24時間境界、期限切れ削除、corrupt fallback E2Eを追加する。
- [x] Chromium / Firefox / WebKitで新規E2Eを成功させる。
- [x] typecheck、lint、unit / component、build、docs buildをgreenにする。
- [x] architecture、security、privacy、accessibility、input performanceを監査する。
- [x] production buildを実browserで操作してreload復元を確認し、storage failureはautomated testで確認する。

## 7. GitHub完了処理

- [x] tasklist、roadmap、specification、README、official Docsを実績へ同期する。
- [x] 意図した変更だけをcommit / pushする。
- [x] PRへ要求、設計、検証、privacy / TTL判断、残課題を記載する。
- [x] local / CIがgreenの場合だけPRをmainへmergeする。
- [x] Issue close、branch削除、main同期を確認する。

## 完了条件

- [x] requirements.mdの受け入れ条件をすべて満たす。
- [x] 24時間を上限とする短期復旧がTextを失わず、恒久保存・Graph状態保存へ拡大していない。
- [x] PRの全quality gateがgreenである。
