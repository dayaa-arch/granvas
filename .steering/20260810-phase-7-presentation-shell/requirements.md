# Phase 7 Presentation Shell 要求定義

> 作成日: 2026-08-10
> ステータス: 承認省略（継続実装指示）

## 1. 目的

starter UIをGranvasの実用的なText / Graph editor shellへ置換し、既存Document / Notation / Graph / Transfer / Workspace APIをユーザー操作として統合する。

## 2. 必須要件

- canonical projectを初期sourceとしてclean状態で表示する。
- Top BarにGranvas、tagline、Import Project、Downloadを表示する。
- CodeMirror 6 editorへline number、syntax decoration、diagnostic decoration、source selection / scrollを実装する。
- IME composition中の一時更新をprojectionへcommitせず、compositionendで最新sourceを反映する。
- React Flowをread-onlyで表示し、Node / Edge / Group、Pan / Zoom / Fit Viewを提供する。
- Node click / Enter / SpaceでGraph → Text selectionを行う。
- Text cursorからcurrent Nodeをhighlightする。
- default 55 / 45でpointer / keyboard操作可能なSplitPaneを実装する。
- StatusBarへdirty、cursor、要素数、diagnostics、projection statusを表示する。
- Import、dirty confirmation、Download dialogとTransfer facadeを結線する。
- `.granvas` Download lifecycle、visual Downloadでdirtyを維持する。
- dirty時の`beforeunload` warningを登録する。
- 初回 / Import時のみFit Viewし、通常編集ではviewportを維持する。

## 3. 受け入れ条件

- canonical Textから5 Nodes / 3 Edges / 1 Groupが表示される。
- editor更新後にrevision / Graph / diagnosticsが同じcurrent snapshotへ更新される。
- Graph Node click / keyboard activationで宣言行がeditor selectionになる。
- cursorがNode宣言range内へ移動するとGraph Nodeがselectedになる。
- visual formatはGraph 0件時disabled、diagnostics時はvalid projection noticeを表示する。
- SplitPane dividerはpointerとArrow keyで操作できる。
- accessible name、focus-visible、dialog Escape / focus returnを満たす。
- typecheck / lint / test / build / 3 browser E2Eがgreen。

## 4. スコープ外

- Canvas PNG / PDF exporter具象。
- visual regression service、production deploy。
- GitHub Actions。

## 5. 永続文書への影響

既存Presentation設計の実装であり`docs/*.md`は変更しない。
