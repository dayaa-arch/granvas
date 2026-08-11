# Phase 13 Japanese UI & Official Documentation タスクリスト

> 作成日: 2026-08-11
> ステータス: 完了
> Issue: [#26](https://github.com/dayaa-arch/granvas/issues/26)
> PR: [#27](https://github.com/dayaa-arch/granvas/pull/27) / [#28](https://github.com/dayaa-arch/granvas/pull/28)

## 1. 準備

- [x] AGENTS.md、初期要求、永続文書7点、統合仕様、ADR、roadmapを確認する。
- [x] Phase 12完了、Phase 8 / 9未着手、product version 0.1を確認する。
- [x] current UI copy、accessible name、diagnostics、error、default Projectを監査する。
- [x] GitHub Pagesが未作成で、repository admin権限があることを確認する。
- [x] branch publishingとPages APIのGitHub公式仕様を確認する。
- [x] requirements / design / tasklistとv1.0公開プレビュー表記の承認を得る。
- [x] Issueを起票し、`codex/phase-13-japanese-ui-official-documentation` branchを作成する。

## 2. 正本文書 / ADR

- [x] 初期要求へ日本語UIと公式Docs公開を追加する。
- [x] product requirementsへUI languageとofficial Docs user storyを追加する。
- [x] functional designへlocalized presentationとDocs distribution flowを追加する。
- [x] architectureへVercel product / GitHub Pages docs hosting分離を追加する。
- [x] repository structureへ`docs-site/`と`dist-pages/`を追加する。
- [x] development guidelinesへ日本語copyとcode / message分離規則を追加する。
- [x] glossaryのUI用語を日本語へ統一する。
- [x] roadmapへPhase 13とPhase 8より前の実行順を追加する。
- [x] 統合仕様へ日本語UI、official Docs、Phase 13を追加する。
- [x] ADR-0004でPages branch publishing、v1.0 preview banner、Actions非追加を記録する。
- [x] READMEへ公式利用ガイド導線を追加する。

## 3. App / HTML日本語化

- [x] `html lang`、page title、editor placeholderを日本語へ変更する。
- [x] Top Bar、pane header、loading、projection stateを日本語化する。
- [x] Import confirmation、success / error notice、dismiss labelを日本語化する。
- [x] 初期Projectを日本語化し、5 Nodes / 3 Relations / 1 Group / diagnostics 0を維持する。
- [x] visible textとaccessible textの用語が一致することをtestする。

## 4. Presentation日本語化

- [x] Workspace SplitPane / StatusBarのvisible / accessible copyを日本語化する。
- [x] Download Dialogのheading、説明、field、format、diagnostics、busy状態を日本語化する。
- [x] Graph toolbar、inline edit、tooltip、empty state、Controls accessible nameを日本語化する。
- [x] Create / Connect / Move / Delete dialogとfocus copyを日本語化する。
- [x] certainty 4状態とNode / Edge accessible nameを日本語化する。
- [x] drag / connect / delete impact / aria-live statusを日本語化する。

## 5. Diagnostic / Error日本語化

- [x] `GNV001`〜`GNV014`の表示formatterとtestを実装する。
- [x] Notation edit rejection codeの表示formatterとtestを実装する。
- [x] Transfer error codeの表示formatterとtestを実装する。
- [x] Workspace projection / unexpected errorの安全な日本語fallbackを実装する。
- [x] user inputをReact textとして保持し、HTML sinkを増やしていないことを確認する。

## 6. UI Test / E2E

- [x] App / Editor / SplitPane / StatusBar / DownloadDialog / Graph component testを日本語UIへ更新する。
- [x] 既存domain / application testのmachine-readable contractを維持する。
- [x] 3-browser E2E locatorとassertionを日本語UIへ更新する。
- [x] Import / Download / certainty / create / connect / drag / delete / Undoを再検証する。
- [x] keyboard、focus trap、focus return、IMEを再検証する。

## 7. 公式利用ガイド

- [x] `docs-site/`のsemantic HTML、responsive CSS、progressive JSを作成する。
- [x] v1.0公式Docs / 公開プレビュー / 対応実装のbannerを実装する。
- [x] Overview、Quick Start、画面、Notation、Graph編集、Project、keyboard、FAQを記述する。
- [x] Phase 8 / 9未完了と現在の制約を正確に記述する。
- [x] skip link、heading、landmark、alt、focus styleを実装する。
- [x] code copyとmobile navigationをkeyboard / no-JS両方で成立させる。
- [x] 日本語UIのproduction buildから実画面screenshotを取得・最適化する。
- [x] screenshotへaltと本文説明を付ける。
- [x] `docs:dev` / `docs:build` / `docs:preview` commandを追加する。
- [x] `/granvas/` base pathと`.nojekyll`をbuild artifactで検証する。

## 8. 品質 / Manual QA

- [x] `bun run typecheck`を成功させる。
- [x] `bun run lint`を警告0で成功させる。
- [x] `bun run test:run`を成功させる。
- [x] isolated Graph performance testを成功させる。
- [x] `bun run build`を成功させる。
- [x] `bun run docs:build`を成功させる。
- [x] `bunx playwright test`をChromium / Firefox / WebKitで成功させる。
- [x] app production buildを日本語UIでheaded browser検証する。
- [x] docsを1280px / 390px、keyboard、no-JSでheaded browser検証する。
- [x] docsのcapability表現をroadmap / implementationと照合する。
- [x] architecture boundary、security、privacy、accessibility、performance影響を監査する。

## 9. Git / GitHub / Pages

- [x] tasklistと永続文書を最終状態へ同期する。
- [x] 意図した変更だけをcommit / pushする。
- [x] PRへ要求、設計、検証結果、v1.0 preview policy、残課題を記載する。
- [x] greenを確認してPRをmainへmergeする。
- [x] review済みmainからdocs artifactを再buildする。
- [x] `gh-pages` branchへartifactと`.nojekyll`だけをpublishする。
- [x] Pages APIをlegacy / `gh-pages` / rootへ設定し、HTTPSを有効化する。
- [x] live URLのHTML、CSS、JS、画像、anchor、404を検証する。
- [x] repository homepageを`https://dayaa-arch.github.io/granvas/`へ設定する。
- [x] custom GitHub Actions workflowが追加されていないことを確認する。
- [x] Issue close、branch整理、clean main / origin/main一致を確認する。

## 完了条件

- [x] UI全体が日本語で利用でき、既存の編集・Import / Download契約が維持されている。
- [x] 公式利用ガイドが実装済みの使い方を正確に説明している。
- [x] Pagesが公式URLで公開され、repositoryから到達できる。
- [x] v1.0 previewと現行v0.1 implementationの違いが明示されている。
- [x] GitHub Actions、Phase 8 / 9機能、正式v1.0 releaseを暗黙に追加していない。
- [x] PR経由でmainへmerge済みで、公開内容がmain sourceから再現できる。
