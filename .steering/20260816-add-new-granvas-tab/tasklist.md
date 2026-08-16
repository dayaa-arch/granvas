# 新しいGranvasを新規タブで始める機能 タスクリスト

> 作成日: 2026-08-16
> ステータス: レビュー中
> Issue: [#40](https://github.com/dayaa-arch/granvas/issues/40)
> PR: [#41](https://github.com/dayaa-arch/granvas/pull/41)

## 1. 準備・仕様

- [x] AGENTS.md、初期要求、永続文書、統合仕様、ADR、roadmapを確認する。
- [x] Top Bar、bootstrap、24時間一時保存、E2Eの影響範囲を監査する。
- [x] requirements / design / tasklistを作成する。
- [x] requirements / design / tasklistの承認を得る。
- [x] Issueを起票し、`codex/add-new-granvas-tab` branchを作成する。
- [x] ADR-0009と統合仕様へ新規タブ / recovery slot contractを先行反映する。
- [x] 永続文書、README、公式利用ガイドを新しい起動contractへ同期する。

## 2. Launch / bootstrap

- [x] `#new`と`#project=<uuid>`を解釈するpure launch resolverを実装する。
- [x] UUID allowlist、不正fragment fallback、canonical hashをunit testする。
- [x] `createApplication()`へ初期Projectとtemporary storage keyを注入できるようにする。
- [x] isolated slotが空なら空の`untitled` Project、保存済みなら同slotのProjectを復元する。
- [x] fragmentなし起動が既存sample / fixed recovery keyを維持することをtestする。

## 3. Presentation

- [x] Top Bar右側へ`新しいGranvas`ボタンを追加する。
- [x] 同一SPAの`#new` URLを`noopener,noreferrer`付きで新しいtabへ開く。
- [x] visible textとaccessible nameで新規tab操作を日本語表示する。
- [x] 既存action style、focus indicator、960px minimum layoutを維持する。
- [x] 元tabのWorkspaceをflush / replace / mutateしないことを保証する。

## 4. 一時保存の分離

- [x] 新規tabごとに`granvas:temporary-project:v1:<uuid>`を使う。
- [x] reloadでcanonical fragmentの同じslotから復元する。
- [x] 2つの新規tabが互いのText / dirty stateを上書きしないことをE2Eで検証する。
- [x] default fixed keyの既存24時間復元を回帰testする。
- [x] expired / corrupt / unavailable処理が対象slotだけへ作用することを確認する。

## 5. E2E / browser verification

- [x] buttonをpointer / keyboardで実行しpopupを取得するE2Eを追加する。
- [x] 新規tabのempty Text / `untitled` / clean / Node 0件を検証する。
- [x] `window.opener === null`と元tab不変を検証する。
- [x] multi-tab別Textのreload復元をChromium / Firefox / WebKitで検証する。
- [x] WCAG 2.2 A / AA、keyboard-only flowを更新する。
- [x] production buildを実browserで操作し、Top Bar、複数tab、reload、960px幅を確認する。
- [x] 日本語公式利用ガイドの実画面screenshotを更新・表示確認する。

## 6. Quality

- [x] `bunx tsc -b`を成功させる。
- [x] `bunx eslint .`を成功させる。
- [x] `bun run test:run`を成功させる。
- [x] `bun run build`を成功させる。
- [x] `bun run docs:build`を成功させる。
- [x] `bunx playwright test`をChromium / Firefox / WebKitで成功させる。
- [x] architecture、security、privacy、accessibility、performanceへの影響を監査する。

## 7. GitHub完了処理

- [x] tasklist、roadmap、specification、README、official Docsを実績へ同期する。
- [x] 意図した変更だけをcommit / pushする。
- [x] PRへ要求、設計、検証、multi-tab isolation判断、残課題を記載する。
- [ ] local / CIがgreenの場合だけPRを`main`へmergeする。
- [ ] Issue close、branch削除、`main`同期、Vercel Production反映を確認する。

## 完了条件

- [x] `requirements.md`の受け入れ条件をすべて満たす。
- [x] 新しいGranvasが現在Projectを壊さず新規tabで始まり、各tabの24時間復元が分離される。
- [ ] PRの全quality gateがgreenである。
