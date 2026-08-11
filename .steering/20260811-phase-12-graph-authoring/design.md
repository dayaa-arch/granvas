# Phase 12 Graph Authoring 設計

> 作成日: 2026-08-11
> ステータス: 承認済み
> Issue: [#23](https://github.com/dayaa-arch/granvas/issues/23)
> PR: [#24](https://github.com/dayaa-arch/granvas/pull/24)
> Related: `requirements.md`、ADR-0001、ADR-0002

## 1. 実装方針

Phase 11の編集pipelineを一般化し、Graph presentationはframework-neutralなcommandだけをAppへ通知する。WorkspaceはGraph IDをoccurrence keyへ解決し、Notation Domainが生成したpatchをDocumentへ適用する。

```text
Graph authoring event
  → App: pending source flush
  → Workspace: Graph ID → occurrence key
  → NotationEditor: command → SourceEditPlan
  → Workspace: patch / revision / parse / graph / layout / selection
  → CodeMirror: same edits in one transaction
  → React Flow: source-derived graphへanimation
```

drag中の座標とdialog stateだけはGraph presentationの一時状態として許可する。確定済みの意味状態は保持しない。

## 2. 統合仕様の事前明確化

実装より先に`docs/GRANVAS_SPEC_v0.1.md`の`SourceEditPlan`へ任意のcaret affinityを追加する。

```ts
type SourceEditPlan =
  | {
      type: 'applicable'
      edits: readonly SourceEdit[]
      caretAnchor?: number
      caretAffinity?: 'before' | 'after'
    }
  | { type: 'rejected'; reason: NotationEditRejection }
```

- 既定は`after`としPhase 11の挙動を維持する。
- Node作成やsubtree移動では挿入前offsetを`before` affinityでmapし、挿入したroot Nodeを再選択する。
- ADR-0002の「caretAnchorは編集前offset」という決定は維持する。

これは既存方針の変更ではなく、複数行挿入後のselectionを一意にするcontractの補足である。Accepted ADRは変更しない。

## 3. Notation Domain

### 3.1 Command contract

`NotationEditCommand`を統合仕様§16の全commandへ拡張する。

- `set-node-certainty`
- `create-node`
- `connect-nodes`
- `reparent-node`
- `set-group-membership`
- `delete-node`
- `delete-relation`

Phase 11 commandは後方互換で維持する。

### 3.2 Source操作primitive

`NotationEditor.ts`内のprivate pure helperとして以下を持つ。

- current sourceとparse resultの整合検証。
- `scanSourceLines`を使うline range / line ending解決。
- document既存改行からのpreferred LF / CRLF選択。
- 行全体削除range（line endingを含む）と挿入文字列の生成。
- 昇順sort、隣接range merge、zero-width insert ordering。
- Nested Relationからのparent / descendants索引。
- Node宣言本体とrelation operatorをsource sliceから保持する変換。
- explicit ID uniqueness判定とASCII slug採番。

Grammar文字列の生成はこのDomain内だけで行う。

### 3.3 Set certainty

- `neutral`: marker削除。
- `tentative / confirmed / rejected`: `? / ! / ~`を挿入または置換。
- markerが無い場合はNode declarationの`[`直後へ挿入する。

### 3.4 Create Node

- top-level: EOFへ`[type] label`を追加。
- parent指定: parent宣言直後へ`parent indent + 2`と`-> `を持つ宣言を追加。
- Group指定: `memberInsertionPoint`へbase indent 2の宣言を追加。
- `type` / `label` validationはPhase 11と同じ規則を再利用する。
- insertion startを`caretAnchor` + `before`として返す。

### 3.5 Connect Nodes / ID allocator

1. endpointをcurrent parse resultで検証する。
2. explicit IDが無いendpointへ`idInsertionPoint`で` @id`を挿入する。
3. Cross Relationをdocument末尾へ追加する。
4. label / certaintyがあればoperator / suffixへ反映する。

slug規則:

- `normalize('NFKD')`後にASCII英数字を小文字化し、区切りを`-`へ正規化する。
- 先頭が英字でなければ`n-`を付ける。
- ASCII slugが空なら`node-1`から採番する。
- ID集合と衝突する場合は`-2`, `-3`を付ける。
- 同一Nodeへのself-loopではID挿入を1件にまとめる。

### 3.6 Reparent / detach

- Nested Relationの有向辺だけからdescendant集合を作り、parent候補が集合内なら`cyclic-parent`。
- 新parent指定時はrootとdescendantのNode declaration行をsource順で集め、新parent直後へsubtree blockとして移す。
- rootは新parentのindent + 2へ、descendantsはrootからの相対indentを維持する。
- 現在operatorのcertaintyを保持する。top-levelから初めてparent化する場合はneutral `->`。
- blank dropは行位置を保ち、現在Group scopeならbase indent 2、それ以外はindent 0へroot化する。descendantsも同じdeltaで昇格する。
- 散文・Cross Relation・Layout・Group headerは移動しない。

### 3.7 Group membership

- 既にmemberならno-op。
- Nodeが一意なexplicit IDを持たなければ採番して宣言へ追加する。
- Groupの`memberInsertionPoint`へ`  @id`を追加する。
- 複数Group所属を維持し、既存member行を削除しない。

### 3.8 Delete impact / delete plan

Notation applicationへpureな`previewNotationDelete`を公開する。

Node impact:

- target + Nested descendantsのNode key / label。
- 削除対象Cross Relation key。
- 解決済みGroup reference行のrangeと件数。

Relation impact:

- Cross: relation行の削除。
- Nested: child Node labelと「scope rootへ昇格」の情報。

`planDeleteNode`はimpactと同じ収集関数からpatchを生成する。`planDeleteRelation`のNested caseはchild subtreeの行位置を保ち、prefix / indentだけを変更する。

## 4. Workspace Application

`WorkspaceGraphEditCommandDto`をGraph IDベースの全commandへ拡張する。

- Node IDは`sourceMap.nodeKeys`。
- Edge IDは`sourceMap.edgeKeys`。
- Group IDは`sourceMap.groupKeys`。
- Create top-levelだけはtarget IDを必要としない。

`previewGraphDelete`を追加し、current revision検証後にNotation previewを呼ぶ。Workspaceは記法を解釈せず、Graph labelとNotation impactをuser-facingではないDTOへ合成する。

`applyGraphEdit`はcommandごとに必要なkeyを解決してNotationへ委譲する。`caretAffinity`を使ってselection offsetをmapし、create / move / Nested Edge削除後の対象Nodeを再選択する。

rejected / cancel時はDocument、revision、dirty、projection、selectionを変更しない。

## 5. Graph Presentation

### 5.1 Public event DTO

Graph moduleのpublic presentation APIはGraph IDと入力値だけを持つunionを公開する。Notation key、SourceRange、React Flow型をAppへ出さない。

主なevent:

- create node（optional parent / group Graph ID）。
- connect nodes。
- set certainty。
- reparent / detach / add group membership。
- delete node / relation。

### 5.2 Authoring toolbar / dialogs

Graph canvasへ常時到達可能な`Author graph` toolbarを置く。

- `New node`
- selected Node: `Add child`, `Connect`, `Move`, certainty select, `Delete`
- selected Edge: `Delete`

Create / Connect / Move / DeleteはGraph presentation内dialogを使用する。dialogはfocus trap、Escape、focus returnを持つ。Delete dialogは`onDeletePreview`の結果をlist表示し、confirm後だけdelete eventを送る。

### 5.3 Pointer authoring

- Pane double click: Create dialog。
- source handle → target handle: Connect command。
- source handle → blank: parent指定済みCreate dialog。
- Node drag: `useNodesState`相当のpresentation-only positionを使用。
- `getIntersectingNodes`でNodeを優先し、次にGroup overlay、該当なしをblankとする。
- drag中のcandidateをclass / textで示す。Graph Node / Groupの見た目とaccessible statusを更新する。
- source更新後のposition差分はCSS transform transitionでanimationし、`.dragging`中はtransitionを切る。

### 5.4 Keyboard

- toolbar / dialogを全操作の正式なkeyboard代替とする。
- Node focus時の既存F2 / Shift+F2を維持する。
- Delete / Backspaceで選択Node / EdgeのDelete previewを開く。
- toolbar操作後は対象Nodeまたは起点buttonへfocusを戻す。

## 6. App Orchestration

Phase 11の`handleGraphNodeEdit`を汎用`handleGraphEdit`へ拡張する。

1. pending sourceをflush。
2. projectionを更新中表示にする。
3. Workspace commandへ変換。
4. rejectedを`role=alert`で通知。
5. applicable patchをCodeMirrorへ1 transactionで適用。
6. editor source / ref / Workspace snapshotを同期。
7. 操作別success messageを通知。

Delete previewもcurrent sourceをflushしてからWorkspaceへ要求するが、previewだけではprojection / dirty stateを変更しない。

## 7. 永続文書への影響

実装前:

- `docs/GRANVAS_SPEC_v0.1.md`: `caretAffinity` contractを補足する。

完了時:

- `docs/development-roadmap.md`: Phase 12 status / deliverables / Issue / PR / 次工程を更新。
- `docs/GRANVAS_SPEC_v0.1.md`: Phase 12 statusと満たしたDoDを更新。
- `README.md`: current capabilitiesとroadmap checklistを更新。
- `.steering/20260810-initial-implementation/tasklist.md`: Phase 12進捗を更新。

`product-requirements.md`、`functional-design.md`、`architecture.md`、`repository-structure.md`、`development-guidelines.md`、`glossary.md`、Accepted ADRは既にPhase 12の方針を含むため、新しい決定が生じない限り変更しない。

## 8. Test Strategy

- Notation Parser互換: Phase 3 / 10 / 11 fixtureを無改変で維持。
- NotationEditor: 全command round-trip、no-op / rejected、edit invariant、散文非破壊、CRLF / emoji / 日本語。
- ID: ASCII slug、日本語fallback、先頭補正、collision、self-loop、duplicate ID拒否。
- Reparent: parent変更、detach、subtree、cycle、Group scope、operator certainty、散文保持。
- Delete: descendants、Cross Relation、Group reference、Nested Edge昇格、grandchild indent。
- Workspace: Node / Edge / Group key解決、preview、revision、selection、rejected不変、latest-wins。
- Graph component: toolbar / dialog、focus trap、keyboard、connect、drag target、delete preview、animation class。
- Editor: multi-patch Undo 1回を既存testで継続確認。
- E2E: create、connect、semantic drag、cycle rejection、delete / promotion、Undo、座標非永続を3 browserで確認。
- Manual: production buildをheaded browserで操作し、pointer / keyboard / focus / visual feedbackを確認。

## 9. Architecture Review

- Domain boundary: syntax / ID / deletion rulesはNotation、GraphはIDとUI eventだけを扱う。
- SRP: Graph presentationはinteraction、Workspaceはorchestration、Notationはgrammar transformation。
- One-way dependency: presentation → application → domainを維持し、AppとWorkspaceだけがpublished contractを統合する。
- Loose coupling: transient座標とReact Flow型をpublic DTOへ出さない。
- DIP: 新規adapter / dependencyは不要。既存GraphLayoutPortを維持する。
