# Phase 12 Graph Authoring タスクリスト

> 作成日: 2026-08-11
> ステータス: PR #24 merge準備中
> Issue: [#23](https://github.com/dayaa-arch/granvas/issues/23)
> PR: [#24](https://github.com/dayaa-arch/granvas/pull/24)

## 1. 準備

- [x] AGENTS.md、初期要求、永続文書7点、統合仕様、ADR、roadmapを確認する。
- [x] Phase 11完了とPhase 12が次工程であることを確認する。
- [x] NotationEditor / Parser / Workspace / CodeMirror / React Flow / E2Eの影響範囲を監査する。
- [x] requirements / design / tasklistの承認を得る。
- [x] Issueを起票し、`codex/phase-12-graph-authoring` branchを作成する。

## 2. 仕様・Contract

- [x] 統合仕様へ`caretAffinity`とselection mapping規則を先行反映する。
- [x] Notation commandを全9操作へ拡張する。
- [x] delete impact preview DTO / use caseを定義する。
- [x] Workspace command / preview / result DTOをGraph IDベースで拡張する。
- [x] Graph presentation event / preview DTOをpublished contractへ追加する。

## 3. Notation Editor

- [x] line ending、line edit range、edit sort / merge helperを実装する。
- [x] current node / relation / groupとsource spanの整合validationを実装する。
- [x] `planSetNodeCertainty`を実装する。
- [x] `planCreateNode`をtop-level / parent / Group向けに実装する。
- [x] ASCII slug / fallback / collision回避ID allocatorを実装する。
- [x] `planConnectNodes`と複数patchを実装する。
- [x] nested parent / descendants索引とcycle検出を実装する。
- [x] `planReparentNode`とscope-aware detachを実装する。
- [x] `planSetGroupMembership`を実装する。
- [x] Node delete impactと`planDeleteNode`を実装する。
- [x] Cross / Nested用`planDeleteRelation`とchild昇格を実装する。
- [x] caret affinity対応offset mappingを実装する。

## 4. Notation / Workspace Test

- [x] 全commandのround-trip testを追加する。
- [x] 散文・対象外行・LF / CRLF・emoji・日本語保持をtestする。
- [x] edit昇順・非重複・no-op・invalid / unknown / duplicate ID拒否をtestする。
- [x] ID slug / fallback / collision / self-loop / parallel Edgeをtestする。
- [x] reparent / detach / subtree / Group scope / cycleをtestする。
- [x] Node cascade delete / Group ref / Cross Relation削除をtestする。
- [x] Nested Edge削除とgrandchild indent保持をtestする。
- [x] WorkspaceのNode / Edge / Group key lookupとdelete previewを実装・testする。
- [x] rejected時のsource / revision / dirty / projection不変をtestする。
- [x] create / move / promotion後のselectionとlatest-winsをtestする。

## 5. Graph Presentation

- [x] React FlowのNode drag / connect / edge selectionを有効化する。
- [x] Node / Group / blankのdrop target判定を実装する。
- [x] drop候補highlightとreprojection animationを実装する。
- [x] Pane double click / handle blank dropのCreate dialogを実装する。
- [x] handle connectionとkeyboard Connect dialogを実装する。
- [x] Author graph toolbarとNode certainty controlを実装する。
- [x] keyboard Move dialogでparent / Group / detachを実装する。
- [x] Node / Edge Delete preview dialogを実装する。
- [x] dialog focus trap / Escape / focus returnとaria-live statusを実装する。
- [x] presentation-only drag positionが公開contractへ漏れないことを確認する。
- [x] component testへpointer / keyboard / dialog / focus / previewを追加する。

## 6. App / E2E

- [x] 汎用Graph edit handlerへpending flush / Workspace / CodeMirror patchを配線する。
- [x] delete preview handlerをcurrent revisionへ配線する。
- [x] 操作別success / rejection noticeを実装する。
- [x] Create / Connect / certainty / Undo E2Eを追加する。
- [x] semantic drag / Group add / detach / cycle rejection E2Eを追加する。
- [x] Node cascade delete / Nested Edge promotion E2Eを追加する。
- [x] keyboard authoringと座標非永続をE2Eで確認する。

## 7. 品質・動作検証

- [x] `bun run typecheck`を成功させる。
- [x] `bun run lint`を警告0で成功させる。
- [x] `bun run test:run`を成功させる。
- [x] isolated Graph performance testを成功させる。
- [x] `bun run build`を成功させる。
- [x] `bunx playwright test`をChromium / Firefox / WebKitで成功させる。
- [x] production buildを実ブラウザでpointer / keyboard / focus / Undoまで検証する。
- [x] architecture boundary、security、accessibility、performance影響を監査する。

## 8. 文書・GitHub完了処理

- [x] README、roadmap、統合仕様書、初回tasklistをPhase 12完了へ同期する。
- [x] tasklistを最終状態へ更新する。
- [x] 意図した変更だけをcommit / pushする。
- [x] PRへ要求、設計、検証結果、残課題を記載する。
- [ ] greenを確認してPRをmainへmergeし、Issue closeとbranch削除を確認する。
- [ ] clean mainがorigin/mainと一致することを確認する。

## 完了条件

- [x] Phase 12の全受け入れ条件を満たす。
- [x] 全Graph authoring操作がText最小差分・Undo 1回・current revisionで成立する。
- [x] 循環拒否、delete preview、Nested Edge child昇格が成立する。
- [x] 座標非永続、散文非破壊、module boundaryを維持する。
- [ ] PR経由でmainへmerge済みである。
