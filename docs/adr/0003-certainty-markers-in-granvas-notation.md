# ADR-0003: Certainty markers in Granvas Notation

- Status: Accepted
- Date: 2026-08-11
- Related: `docs/GRANVAS_SPEC_v0.1.md` §2.3 / §4.2 / §4.4 / §4.5 / §4.10 / §4.12 / §25
- Phase: Phase 10 Notation Certainty

## Context

Granvas Notation の構文プリミティブは、単体で見ればいずれも先行事例を持つ。

| Granvas | 先行事例 |
| --- | --- |
| `[type] Label` | nomnoml の `[<abstract> Name]`、Argdown の `[Statement]: text` |
| indent + `->` による親子 | Argdown の関係ツリー、PlantUML の WBS |
| `@id -> @id : label` | Structurizr DSL、D2、Graphviz DOT |
| `{Group}` | Mermaid の `subgraph`、D2 の container |
| `@layout flow TB` | Mermaid の `flowchart TD`、nomnoml の `#direction: down` |

つまり現状の記法だけでは、Granvas は「Mermaid + 散文混在 + エラー耐性」という説明で言い尽くされてしまう。

一方で、既存の軽量記法はすべて **確定した構造を描く言語**である。Mermaid も D2 も Argdown も、「これは仮説である」「この因果は検証されていない」「この案は棄却した」を表現する手段を持たない。しかし §25 が掲げる Granvas の仮説は「文章を書く行為と、思考構造を見る行為を一つの連続した体験にできるか」であり、**思考の途中には必ず未確定が含まれる**。

現状でもユーザーは `[hypothesis]` や `[question]` のようなカスタム Type を書ける（§4.2）。しかしこれは分類（type）であって確信度ではない。`[problem]` にも `[idea]` にも `[cause]` にも「確からしさ」は独立して存在するため、type 名で表現しようとすると `hypothesis-problem` / `hypothesis-idea` のような組み合わせ爆発になる。両者は直交する軸として扱う必要がある。

## Decision

**確信度（certainty）を type と直交する軸として導入し、Node と Relation の両方に同じ記号体系で付与する。**

### Node

型トークンの直前にマーカーを置く。

```text
[?hypothesis @price] 価格が導入障壁       tentative — 未確定・仮説
[!idea @unify] AI で統合する              confirmed — 確定・検証済み
[~idea @manual] 手動で統合する            rejected  — 棄却・見送り
[idea] AI で統合する                      neutral   — 既定
```

### Relation

同じ記号を operator の前置として使う。

```text
[problem @churn] 解約が増えている
  ?-> [cause] 価格が高い
  ~-> [cause] UI が古い

@price ?-> @churn : maybe
```

### 契約

- `ParsedNode.certainty` / `ParsedRelation.certainty`: `'neutral' | 'tentative' | 'confirmed' | 'rejected'`
- `relation-operator = "->" | "?->" | "!->" | "~->"`
- `GNV014_INVALID_CERTAINTY_MARKER`（`[??type]`、`[?]` など）— level `error`、該当要素を生成しない
- `GraphNode.certainty` / `GraphEdge.certainty` として Graph Domain へ伝播する

### 表示

- tentative: 破線ボーダー ＋ `?` バッジ
- rejected: 打ち消し線 ＋ グレーアウト
- confirmed: 実線太め ＋ `✓` バッジ
- neutral: 現行のまま

§18 の要件により、色だけで確信度を区別しない。線種・バッジ・テキスト装飾を併用する。

### 設計上の中心

**rejected な要素をグラフから消さない。** 棄却した仮説や否定された因果が図の上に残り続けることが、この機能の目的そのものである。「何を検討して何を捨てたか」が構造として残ることが、確定した構造だけを描く既存記法との差になる。削除したい場合はテキストから行を消せばよく、`~` は「消さずに棄却を記録する」ための記法である。

## Consequences

### 得られるもの

- 思考中の曖昧さを構造として保持したまま図にできる。これは調査した範囲の既存軽量記法には存在しない性質であり、Granvas の差別化の中心になる。
- type と certainty が直交するため、`[?problem]` `[?cause]` `[?idea]` がすべて自然に書ける。カスタム Type（§4.2）とも衝突しない。
- Node と Relation で同じ3記号を使うため、ユーザーが覚える項目は3つで済む。
- §2.3「意味と関係を書く言語であり、見た目を書く言語ではない」に適合する。`?` は破線を意味するのではなく「未確定である」という意味を書いており、破線はその表示上の帰結にすぎない。

### 互換性

- `?` `!` `~` は現在の `type = alpha, { alpha | digit | "-" | "_" }` において先頭文字として invalid であり、**既存の valid な文書と一切衝突しない**。
- 既存の `.granvas` はすべて従来どおり `neutral` として解析される。Phase 3 の全 fixture が無改変で通ることを後方互換の証明とする。
- 記法への syntax 追加であるため、統合仕様書 §4 の記法バージョンを **Granvas Notation v0.2** とする。ただし v0.1 文書はすべて v0.2 parser で読める（後方互換）。

### 引き受けるコスト

- 記法の学習項目が増える。ただし既定（マーカーなし）が従来どおりなので、知らなければ存在しないのと同じであり、段階的に発見できる。
- Parser の candidate 分類（`SourceText.ts`）に `?->` / `!->` / `~->` を Nested Relation candidate として認識させる変更が必要になる。行頭が `->` で始まるという既存の判定条件が変わるため、§4.1.1 の記述を更新する。
- 4状態を色に頼らず区別する表示設計が必要になる。

## Alternatives Considered

### 案A: カスタム Type で表現する（現状維持）

`[hypothesis]` `[rejected-idea]` のように type 名へ埋め込む。追加実装が不要という利点はあるが、type と certainty が直交しないため組み合わせ爆発を起こす。また Granvas 側が意味を理解できないため、破線表示や「棄却されたものだけ隠す」といった扱いが一切できず、単なる文字列ラベルに留まる。

### 案B: 後置マーカー `[idea?]`

英語の疑問形に近く読みやすい。しかし `@id` を伴う場合に `[idea @unify?]` と `[idea? @unify]` のどちらが正しいかが自明でなく、書き手が迷う。前置なら常に `[` の直後という一意な位置に決まる。

### 案C: 別行のディレクティブ

```text
@certainty @unify tentative
```

既存文法をまったく変えずに済む。しかし宣言と確信度が離れた場所に書かれるため、「書きながら状態を変える」という使い方ができない。`@id` の付与も強制される。思考ツールとしての即応性を損なうため採用しない。

### 案D: ラベル側の記号（`[idea] ? AI で統合する`）

label は §4.12 で「閉じ delimiter より後または行末まで」を自由文字列として扱うと定義されており、`?` で始まる正当なラベルと区別できない。escape syntax を導入しない方針（§4.12）とも衝突する。
