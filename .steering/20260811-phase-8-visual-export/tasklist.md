# Phase 8 Visual Export タスクリスト

> 作成日: 2026-08-11
> ステータス: PRレビュー中
> Issue: [#29](https://github.com/dayaa-arch/granvas/issues/29)
> PR: [#30](https://github.com/dayaa-arch/granvas/pull/30)

## 1. 準備・仕様

- [x] 正本文書、Phase 6 / 13実装、Transfer / Graph contractを確認する。
- [x] requirements / design / tasklistの承認を得る。
- [x] Issueを起票し、`codex/phase-8-visual-export` branchを作成する。
- [x] 統合仕様と永続文書へ実装前の契約変更を反映する。
- [x] ADR-0005でPDF libraryとraster strategyを決定する。

## 2. Scene / SVG

- [x] Transfer export DTOへNode / Edge certaintyを追加する。
- [x] scene validationとformat共通描画規則を整理する。
- [x] SVGへcertainty 4状態の非色情報を追加する。
- [x] Group / Edge / relation label / Node / untrusted text contract testを更新する。

## 3. PNG

- [x] Canvas PNG adapterを実装する。
- [x] 2x / 8192px上限とnoticeを実装する。
- [x] Canvas / image decode / Blob failure testを追加する。
- [x] 日本語・certainty・Groupを含むPNGを実ブラウザで確認する。

## 4. PDF

- [x] `pdf-lib`を追加し、lockfileを更新する。
- [x] dynamic importするsingle-page PDF adapterを実装する。
- [x] page bounds / PNG埋め込み / signature / failure testを追加する。
- [x] PDFをPopplerでrenderし、layoutと日本語を目視確認する。

## 5. UI / Application

- [x] Composite exporterをcomposition rootへ注入する。
- [x] Download DialogでPNG / PDFを有効化する。
- [x] size noticeを日本語通知へ表示する。
- [x] visual success / render failure / download failureでdirty不変をtestする。

## 6. E2E / Quality

- [x] SVG / PNG / PDF full Graph Download E2Eを3 browserで追加する。
- [x] viewport非依存、signature、file name、dirty不変を検証する。
- [x] typecheck / lint / unit / component / performance / buildをgreenにする。
- [x] production buildを実ブラウザで確認する。
- [x] architecture、security、accessibility、bundle影響を監査する。

## 7. GitHub完了処理

- [x] tasklistと正本文書を実績へ同期する。
- [x] 意図した変更だけをcommit / pushする。
- [x] PRへ要求、設計、検証、dependency判断、残課題を記載する。
- [ ] green確認後にmainへmergeし、Issue / branchを整理する。

## 完了条件

- [x] Phase 8の受け入れ条件とroadmap Exit Criteriaをすべて満たす。
- [ ] review済みmainからSVG / PNG / PDFを再現できる。
