# ADR-0002: Source edit plan as a Notation domain concern

- Status: Accepted
- Date: 2026-08-11
- Related: `docs/GRANVAS_SPEC_v0.1.md` §8.2 / §10.2 / §11 / §16 / §21.1、[ADR-0001](0001-semantic-node-drag-without-coordinate-persistence.md)
- Phase: Phase 11 Source Edit Core、Phase 12 Graph Authoring

## Context

Graph → Text の双方向編集を導入するにあたり、「グラフ上の操作を Text の変更へ変換する責務を、どの Context のどの層が持つか」を決める必要がある。

前提として、この変換には**シリアライズが使えない**という強い制約がある。Granvas のドキュメントは散文と Notation が混在しており（§4.8）、グラフには散文が投影されない。したがって Graph から全文を再生成することは原理的に不可能であり、ユーザーが書いた散文を破壊せずに変更を反映するには、現在の source に対する**最小の編集列**を計算するしかない。

この制約は設計全体を規定する。「A と B を接続する」という操作は、実際には次のような Granvas Notation の文法知識を必要とする。

- 両端の Node に `@id` があるか。無ければどこへ挿入するか（§4.3 の ID 規則を満たす形で）。
- Cross Relation 行をドキュメントのどこへ挿入するか（§4.5）。
- 挿入した結果が Group scope（§4.6）や Nested Relation の parent stack（§4.4）を壊さないか。

これらはグラフの知識ではなく、Granvas Notation の文法そのものの知識である。

## Decision

**Graph 操作から Text 編集列への変換を、Notation Context の domain が pure function として所有する。**

### 1. `SourceEditPlan` を Notation domain に定義する

`src/modules/notation/domain/NotationEditor.ts` に、`(source, parseResult, command) → 編集列` の純関数群を置く。

```ts
export type SourceEdit = Readonly<{ from: number; to: number; insert: string }>

export type SourceEditPlan =
  | Readonly<{ type: 'applicable'; edits: readonly SourceEdit[]; caretAnchor?: number }>
  | Readonly<{ type: 'rejected'; reason: NotationEditRejection }>
```

規則:

- `edits` は `from` の昇順で、範囲が重複しないことを保証する。`planConnectNodes` は「2つの宣言行への `@id` 挿入」と「Cross Relation 行の追記」で3箇所を同時に触るため、この保証が必要になる。
- 実行できない操作は例外ではなく `rejected` として理由付きで返す。循環する親付け替え、解決できない参照などが該当する。
- `caretAnchor` は編集前の offset で表現する。適用側が編集列でマップして編集後の位置を得る。
- React、CodeMirror、React Flow、DOM、browser API を一切参照しない（§8.2-8 / §21.4）。

### 2. Parser がトークン単位の SourceRange を公開する

現在の `ParsedNode.sourceRange` は宣言行全体しか指しておらず、ラベルだけの置換や `@id` だけの挿入ができない。`ParsedNode` / `ParsedRelation` / `ParsedGroup` に `spans` を**追加**する（既存フィールドは変更しないため後方互換）。

```ts
export type NodeSourceSpans = Readonly<{
  indent: SourceRange
  type: SourceRange
  explicitId?: SourceRange
  idInsertionPoint: number
  label: SourceRange
}>
```

Parser のアルゴリズムは変わらない。内部で既に算出している位置を捨てずに返すだけである。

### 3. Presentation はパッチを適用し、全文置換をしない

CodeMirror は複数レンジの `changes` を1トランザクションとして扱えるため、グラフ操作が **Undo 1回で戻る**。全文置換の経路は Import 用に残し、編集用の経路と分ける。

### 4. Workspace が orchestration だけを担う

Workspace は「graph node id → notation occurrence key の解決」「plan の取得」「Document source への適用と再投影」「編集後の再選択」を担当するが、**Notation の文法知識を持たない**（§6.2 / §11.1）。

この配線のため、`ProjectionSourceMapDto` に `nodeKeys: Record<graphNodeId, notationKey>` を追加し、既存の「parse occurrence とグラフ ID をソート順のインデックスで突き合わせる」実装を key ベースの対応表へ置き換える。現在の index 対応は `createThoughtGraph` が要素を落とさないという暗黙の前提の上で成立しており、編集操作の土台としては脆い。

## Consequences

### 得られるもの

- **編集規則が executable specification になる。** `(source, parseResult, command) → 編集列` は完全な純関数なので、Parser のテストスイートと同じ方法で検証できる。最も強い契約は「plan を適用した source を再 parse すると意図した構造になっている」というラウンドトリップテストであり、これを全操作について書けることが本決定の最大の利点である。
- **散文が保護される。** 全文再生成の経路が存在しないため、「無関係な行が一切変化しないこと」をテストで明示的に保証できる。
- **Undo が正しく動く。** グラフ操作もテキスト編集も CodeMirror の同一 history に載るため、`Cmd+Z` の挙動が一貫する。
- 文法が拡張されたとき（`?->` の追加など）、編集規則の変更箇所が Notation domain に閉じる。

### 引き受けるコスト

- Parser の DTO が広くなる。`spans` は編集以外の用途では使われないが、公開契約として維持コストが発生する。
- 全操作について「編集列を計算する」実装が必要になり、素朴なシリアライズより実装量は多い。特に削除は連鎖（参照している Cross Relation 行、Group 参照行、Nested Relation の子孫）を扱うため複雑になる。
- 編集の前に **pending なテキスト更新を必ず flush する**必要がある。`App.tsx` は入力を 120ms debounce しているため、これを怠ると古い `parseResult` の offset に対してパッチを計算し、ずれた位置を書き換える。これは設計上の必然的な帰結であり、実装時の明示的な要件とする。

### 却下される設計

- Graph Context が Notation の文法を知ること。
- Workspace が Notation 記法の文字列を組み立てること。
- Presentation が編集規則を持つこと。
- Graph から Text を再生成（シリアライズ）すること。

## Alternatives Considered

### 案A: Graph → Text のシリアライザを書く

`ThoughtGraph` から Notation テキストを生成する関数を用意し、編集後のグラフを丸ごと書き出す。実装は最も単純だが、**散文が消える**ため採用の余地がない。加えて、ユーザーが書いた記法の書式（空行の入れ方、宣言の順序、Group の位置）もすべて正規化されてしまい、「テキストが正本」という体験が成立しない。

### 案B: 編集規則を Workspace Application に置く

Workspace は既に Notation と Graph の両方の DTO を持っているため、配線としては最短になる。しかし Notation の文法知識が Workspace へ漏れ、§6.2「Workspace は syntax や layout algorithm を実装しない」に反する。また Notation Context 単体でのテストができなくなり、編集規則の検証が Workspace のテストに巻き込まれて重くなる。

### 案C: CodeMirror の構文木や transaction API の上に編集規則を実装する

エディタの機能（構文木、position mapping）をそのまま使えるため実装は楽になる。しかし編集規則が presentation 層に固定され、§8.2-8「Domain に CodeMirror を持ち込まない」に反する。Parser を別環境（CLI、npm package 抽出、将来の VS Code 拡張）で再利用する余地も失われる。
