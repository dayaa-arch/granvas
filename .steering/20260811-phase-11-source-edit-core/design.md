# Phase 11 Source Edit Core 設計

> 作成日: 2026-08-11
> ステータス: 承認済み（Issue #21）
> Related: `requirements.md`, `docs/adr/0002-source-edit-plan-as-notation-domain-concern.md`

## 1. 実装方針

Phase 11は、Notation Domainが生成した最小編集列をWorkspaceがcurrent Documentへ適用し、Presentationが同じ編集列をCodeMirrorの単一transactionへ適用する経路を作る。Graphは更新後Textから再投影し、Graph独自の意味状態を持たない。

```text
Graph inline edit
  → App: pending source flush
  → Workspace: Graph ID → occurrence key
  → Notation: SourceEditPlan
  → Workspace: current sourceへpatch / revision更新 / 再投影
  → App: Editorへ同じpatchを1 transactionで適用
  → Graph: 更新後Textから描画 / Node再選択
```

## 2. Notation Parser

### 2.1 公開型

`GranvasNotationParser.ts`へ次を追加し、既存`sourceRange`は変更しない。

- `NodeSourceSpans`: `indent`, optional `certainty`, `type`, optional `explicitId`, `idInsertionPoint`, `label`
- `RelationSourceSpans`: `operator`, optional `sourceRef`, optional `targetRef`, optional `label`, `labelInsertionPoint`
- `GroupSourceSpans`: `header`, `name`, `memberInsertionPoint`

Node解析の内部結果にrelative token位置を保持し、`addNode`が実offsetへ変換する。Nested Relationはoperator span、Cross Relationはoperator/ref/label spanをmatch位置から生成する。Groupは次のnon-empty indent 0 lineでscopeを閉じる時点、またはEOFを`memberInsertionPoint`に記録する。

### 2.2 不変条件

- 全rangeはUTF-16 offsetを使用する。
- width 0のindent rangeを許可する。
- `explicitId`は`@`を含む。
- `idInsertionPoint = type.to`。
- labelはtrim済み文字列に対応する実source範囲だけを指す。
- Group headerはbracesを含み、nameはtrim済み内容だけを指す。

## 3. Notation Editor / Application

`src/modules/notation/domain/NotationEditor.ts`を追加する。

主要domain contract:

```ts
type SourceEdit = Readonly<{ from: number; to: number; insert: string }>

type SourceEditPlan =
  | Readonly<{ type: 'applicable'; edits: readonly SourceEdit[]; caretAnchor?: number }>
  | Readonly<{ type: 'rejected'; reason: NotationEditRejection }>
```

pure function:

- `planSetNodeLabel(source, parseResult, nodeKey, label)`
- `planSetNodeType(source, parseResult, nodeKey, nodeType)`
- `planNotationEdit(source, parseResult, command)`
- test支援も兼ねるframework-neutralな`applySourceEdits(source, edits)`
- caret mapping用`mapSourceOffsetThroughEdits(offset, edits)`

application層へ`PlanNotationEdit.ts`を追加し、domain型をimmutable DTOとして公開する。Phase 11のcommandは`set-node-label` / `set-node-type`だけを受ける。

Validation:

- labelは前後空白をtrimして適用し、空またはCR/LFを含む場合は`invalid-value`。
- typeは`^[A-Za-z][A-Za-z0-9_-]*$`を満たす場合だけ小文字化して適用する。
- target nodeまたはspanがcurrent sourceに存在しなければ`unknown-target`。
- no-op値は空編集列を持つapplicable planとして扱い、不要なrevision更新はWorkspaceで抑止する。

## 4. Projection Source Map

現在の`pairRanges`による「sorted occurrenceとGraph配列をindexで対応させる」処理を廃止する。Graph ApplicationはGraph生成と同時に、Graph IDから入力occurrence keyへのframework-neutralな`GraphOccurrenceMapDto`を返す。Workspaceはこの明示対応とParseResultのkey別rangeを結合し、次を生成する。

- `nodeRanges`, `edgeRanges`, `groupRanges`
- `nodeKeys`, `edgeKeys`, `groupKeys`

Graph ContextはSourceRangeやNotation構文を知らず、入力として既に受け取っている汎用occurrence keyと自身が生成したGraph IDの対応だけを返す。Workspaceはrangeをkey lookupで結合し、不足・重複を既存`projection-mapping-failed`で拒否する。以後の編集対象解決は必ず`nodeKeys[graphNodeId]`を使う。

## 5. Workspace Application

Workspaceはcurrent projectionと同じrevisionの`ParseResultDto`を保持する。`WorkspaceApplication`へ次を追加する。

```ts
applyGraphEdit(command: WorkspaceGraphEditCommandDto): Promise<WorkspaceGraphEditResultDto>
```

Workspace commandはGraph Node IDを受け、Notation commandへ変換するときだけ`nodeKeys`を参照する。記法文字列は組み立てない。

処理:

1. current projection / parse result / document revisionの一致を検証する。
2. `nodeKeys`からoccurrence keyを解決する。
3. Notation `planNotationEdit`を呼ぶ。
4. rejectedなら状態を変更せず返す。
5. applicableでeditsが空ならcurrent snapshotをappliedとして返す。
6. `applySourceEdits`でsourceを更新し、Document revisionを進める。
7. `caretAnchor`をeditsでmapして再投影する。
8. mapped offsetからcurrent Nodeを再選択する。
9. snapshotと元のeditsを返す。

既存latest-wins / cancellationを再利用し、編集の再投影中に新しいsource更新が来た場合も古いrevisionをcommitしない。

## 6. CodeMirror Presentation

`GranvasEditor`を`forwardRef`化し、framework-neutralなhandleを公開する。

```ts
type GranvasEditorHandle = Readonly<{
  applyEdits(edits: readonly SourceEditDto[], selection?: SourceRangeDto): void
}>
```

- CodeMirror `changes`へeditsを一括dispatchする。
- external patch guardで`onSourceChange`再入を止める。
- patch適用はhistoryへ記録し、Undo 1回で戻る。
- `source` propの差分による全文置換はImport /外部置換用として残す。
- source prop同期では同一文字列ならdispatchしないため、patch直後の全文置換を回避する。

## 7. Graph Presentation / App

### 7.1 Inline Edit

`ReactFlowGraphView`へ`onNodeEdit` callbackを追加する。presentation-only stateとして編集中Node ID、field、draft、IME compositionを保持する。

- label: ラベルdouble click / Node focus中`F2`
- type: Type double click / Node focus中`Shift+F2`
- Enter: trim済み値を確定（composition中は無視）
- Escape: 取消
- commit / cancel後:対象Nodeへfocus復帰
- editing中はNode activation / pane selectionを誤発火させない

1回のinline編集はlabelまたはtypeの一方だけを対象とし、SourceEditPlan 1件とCodeMirror transaction 1件に対応させる。

### 7.2 App Orchestration

`App.tsx`はGraph編集callbackで次を行う。

1. `flushEditorSource()`をawaitする。
2. Workspace `applyGraphEdit`を呼ぶ。
3. rejectedなら`aria-live` noticeを表示する。
4. appliedならEditor handleへeditsを適用する。
5. editor source ref/stateとWorkspace snapshotを同じ更新後sourceへ合わせる。
6. projection / selectionを更新し、成功noticeを表示する。

## 8. 永続文書への影響

基本仕様・ADR・設計は既にPhase 11の内容を定義済みであり、新しい仕様判断やADRは不要。完了時に進捗・実装済み契約を同期する。

- `docs/development-roadmap.md`: Phase 11 status / deliverables / Issue / PR / 次工程
- `docs/GRANVAS_SPEC_v0.1.md`: Phase 11 statusとPhase 11で満たしたDoD
- `README.md`: current phase、実装済み機能、roadmap checklist
- `.steering/20260810-initial-implementation/tasklist.md`: Phase進捗

`docs/product-requirements.md`、`functional-design.md`、`architecture.md`、`repository-structure.md`、`development-guidelines.md`、`glossary.md`、ADRは内容変更不要だが、実装後にコードとの整合を再監査する。

## 9. Test Strategy

- Parser: 全spans、zero-width indent、certainty、explicit ID、Nested/Cross Relation、Group scope、CRLF / emoji / 日本語。
- NotationEditor: label/type applicable/rejected/no-op、round-trip、散文・他行・書式非破壊、edits整列、caret mapping。
- Notation Application: command DTOとrevision/source整合。
- Workspace: key map、apply/reject、selection、latest-wins、current revision、pending flush相当のcurrent source編集。
- Editor: multi-change単一transaction、callback再入なし、Undo 1回、selection。
- Graph: label/type開始、Enter、Escape、IME、keyboard、focus return。
- E2E: Graphでlabel/type編集 → Text最小差分 → Graph更新 → Undo、debounce直後編集。

## 10. Architecture Review

- Domain boundary: spans / editsはNotation所有、GraphはSourceRangeを知らない。
- SRP: Notationが文法、Workspaceが協調、PresentationがUI transactionだけを担当する。
- One-way dependency: presentation → application → domainを維持し、Workspaceだけがpublished contractを統合する。
- Loose coupling: CodeMirror / React Flow型をpublic application contractへ出さない。
- DIP: 新しい外部adapterは不要。既存GraphLayoutPortの注入を維持する。
