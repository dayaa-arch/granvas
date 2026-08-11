# Phase 11 Source Edit Core 要求

> 作成日: 2026-08-11
> ステータス: 承認済み（Issue #21）
> Phase正本: `docs/development-roadmap.md` §13
> 設計判断: `docs/adr/0002-source-edit-plan-as-notation-domain-concern.md`

## 1. 目的

Graph上のNodeラベルまたはTypeを編集した結果を、現在のTextの対象tokenだけに対する最小差分として反映する。Phase 11ではこの最小操作でGraph → Text → Graphの経路を縦に完成させ、Phase 12の作成・接続・削除・意味ドラッグに先立って、編集計画、再投影、選択、Undo、pending source flushの契約を固める。

## 2. ユーザーストーリー

- ユーザーとして、Graphを見ながらNodeのラベルをその場で変更し、対応するTextだけが更新されてほしい。
- ユーザーとして、NodeのTypeをGraph側から変更し、certainty、explicit ID、indent、散文を維持したい。
- keyboard利用者として、pointerを使わず編集を開始・確定・取消でき、完了後に元のNodeへfocusを戻したい。
- 日本語入力の利用者として、IME変換中のEnterで編集が誤確定されないでほしい。

## 3. 受け入れ条件

### 3.1 Parser / Notation Domain

- `ParsedNode` / `ParsedRelation` / `ParsedGroup`が統合仕様書§4.11のtoken単位`spans`を必須で返す。
- spanは0-based UTF-16半開区間で、primary `sourceRange`内に収まり、CRLF・emoji・日本語・certainty・explicit ID・Group scopeで正しい。
- `NotationEditor.ts`がframework非依存のpure functionとして`SourceEditPlan`を所有する。
- `planSetNodeLabel`は対象Nodeのlabel spanだけを置換し、空白だけ・改行を含む値を`invalid-value`として拒否する。
- `planSetNodeType`は対象Nodeのtype spanだけを置換し、英字開始のASCII英数字・`-`・`_`以外を`invalid-value`として拒否し、小文字へ正規化する。
- 存在しないoccurrence keyは`unknown-target`として拒否し、例外や編集列を返さない。
- applicableな編集列は適用前source基準、`from`昇順、非重複である。

### 3.2 Workspace / Source Mapping

- `ProjectionSourceMapDto`がGraph IDからNotation occurrence keyへの`nodeKeys` / `edgeKeys` / `groupKeys`を公開する。
- source mapの生成はindex対応を廃止し、Graph要素とoccurrence keyを明示対応させる。WorkspaceはGraph ID生成規則を再現しない。
- Workspace `applyGraphEdit`はcurrent revisionのsource / parse result / source mapだけを使い、Notationの編集計画を適用して新revisionを再投影する。
- rejected時はsource、revision、dirty state、projectionを変更せず理由を返す。
- applicable時は適用した編集列と同一revisionのsnapshotを返し、編集後も対象Nodeを選択状態に再解決する。
- Graph編集開始前にAppがdebounce待機中のsourceをflushし、古いoffsetへpatchを適用しない。

### 3.3 Presentation

- `GranvasEditorHandle.applyEdits`が複数編集をCodeMirrorの1 transactionとして適用する。
- `applyEdits`は全文置換せず、editorの`onSourceChange`を再入させない。source propによる全文置換はProject Import用に維持する。
- Graph Nodeのラベルはラベルのdouble clickまたは`F2`、TypeはType表示のdouble clickまたは`Shift+F2`で編集開始できる。
- inline編集は`Enter`で確定、`Escape`で取消し、IME composition中のEnterでは確定しない。
- 確定・取消後は元のGraph Nodeへfocusを戻す。
- invalid値またはrejected理由を`aria-live`で通知し、Textを変更しない。

### 3.4 品質

- plan適用後のsourceを再parseし、ラベル / Typeの意図した構造が得られるround-trip testがある。
- 散文、無関係な行、indent、certainty、explicit ID、改行コードが変化しないことを明示的にtestする。
- editor patchがUndo 1回で戻るcomponent testがある。
- pending debounce中のGraph編集、selection再解決、rejected不変条件をapplication testで検証する。
- Chromium / Firefox / WebKitのE2Eでラベル / Type編集、散文保持、Graph再投影、Undoを確認する。
- typecheck、lint、全unit/component test、build、E2Eがgreenである。

## 4. 制約

- Textを唯一の正本とし、GraphからText全文を再生成しない。
- Workspace / PresentationはGranvas Notation文字列を組み立てない。
- `SourceRange` / `SourceEditPlan`をGraph Domainへ入れない。
- Notation Domain / ApplicationへReact、CodeMirror、React Flow、DOM、browser APIを持ち込まない。
- Node作成、Edge接続、削除、certainty変更、意味ドラッグはPhase 12へ残す。
- 座標をsourceまたは`.granvas`へ永続化しない。
- 新規dependency、Supabase、backend、GitHub Actionsを追加しない。

## 5. 対象外

- Node作成、Edge作成、Node / Edge削除。
- 親子関係・Group所属の変更。
- certaintyのGraph側変更。
- Graph上での散文編集。
- Visual Export、Release Hardening、GitHub Actions。
