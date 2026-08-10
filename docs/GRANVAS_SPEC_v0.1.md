# Granvas v0.1 Product & Engineering Specification

> **Write thoughts. See structure.**  
> 文章を書くように、思考のグラフを書く。

- Status: Draft / Approval Candidate
- Target: Granvas v0.1
- Architecture: Domain-Driven Design + Layered Architecture + Modular Monolith
- Frontend: React + TypeScript + Vite
- Hosting: Vercel
- Persistence: User-managed Import / Download
- Date: 2026-08-10

---

## 0. この文書の目的

この文書は、Granvas v0.1 のプロダクト仕様・Granvas Notation v0.1・UI・アーキテクチャ・モジュール境界・技術構成・テスト方針・リリース条件を統合して定義する。

要求の真の情報源は `docs/ideas/initial-requirements.md` とする。本書は要求を実装可能な契約へ具体化した統合仕様であり、永続的な設計方針は `docs/product-requirements.md`、`docs/functional-design.md`、`docs/architecture.md` ほか `dev-docs` 標準文書へ分離して保持する。

v0.1 の開発では、本書を実装判断の基準とする。仕様変更が必要になった場合は、実装を先に変えるのではなく、本書または対応する ADR（Architecture Decision Record）を更新する。

---

# 1. Product Definition

## 1.1 Vision

Granvas は、**文章とグラフを「同じ思考の異なる表現」として扱う、オープンソースのビジュアル思考エディタ**である。

Markdown が文書構造を軽量な記法で表現したように、Granvas は思考の構造を軽量な記法で表現することを目指す。

中心となる体験は次のループである。

```text
書く
 ↓
構造として解釈される
 ↓
グラフとして見える
 ↓
構造に気づく
 ↓
また書く
```



## 1.2 Core Principle

v0.1 では次を原則とする。

> **Text is the source of truth. Graph is a live projection of thought.**

- テキストが正本である。
- グラフはテキストから導出される。
- グラフの座標・見た目は正本ではない。
- 同じテキストから同じ意味構造を再生成できることを優先する。

将来的には `Text ⇄ Graph` の双方向編集を目指すが、v0.1 は **Text → Graph** に集中する。

## 1.3 v0.1 が提供する価値

ユーザーは、通常の文章を書きながら、必要な箇所だけ Granvas Notation を用いて思考構造を記述できる。

入力と同時に右側へグラフが投影され、文章と図の対応関係を保ったまま思考を往復できる。

---



# 2. Scope / Non-goals



## 2.1 v0.1 で実装するもの

- 左: テキストエディタ / 右: グラフの分割 UI
- 通常文と Granvas Notation の混在
- Granvas Notation v0.1 のリアルタイム解析
- Node / Relation / Group / Layout の解釈
- Flow レイアウト
- Text → Graph のリアルタイム投影
- グラフノード選択 → 対応するテキスト位置へ移動
- テキストカーソル位置 → 対応するグラフノードをハイライト
- 構文ハイライト
- 非破壊的な diagnostics 表示
- `.granvas` プロジェクトの Import
- `.granvas` / SVG / PNG / PDF を選択できる Download
- 未ダウンロード変更の状態表示と離脱警告
- Pan / Zoom / Fit View
- OSS としてローカルで起動でき、Vercel へ配備可能な Web アプリ



## 2.2 v0.1 では実装しないもの

- draw.io の代替となる自由作図
- グラフ上からのノード・エッジ編集
- ノード位置の永続化
- ノード色・形・サイズ・座標を指定する記法
- Map / Outline / Kanban / Timeline など複数ビュー
- 複数ドキュメント管理 UI
- localStorage / IndexedDB への自動永続化
- クラウド同期
- アカウント / 認証
- 共同編集
- バックエンド API
- AI 自動生成
- プラグインシステム
- モバイルアプリ
- 完全な Markdown 互換
- Obsidian / Notion の代替
- リアルタイム共同作業

将来認証を導入する場合の認証基盤は **Supabase Auth** とする。ただし v0.1 では Supabase SDK、認証 UI、session、環境変数、保護 route を導入しない。



## 2.3 記法の設計原則

Granvas Notation は「見た目」を書く言語ではなく、**意味と関係を書く言語**とする。

以下のような記法は v0.1 に導入しない。

```text
color: #ff0000
x: 120
y: 300
width: 240
shape: roundedRectangle
```

ユーザーは「何を考えているか」を書き、Granvas が「どう見せるか」を担当する。

---



# 3. Primary Use Cases



## UC-01: メモを取りながら構造を見る

1. ユーザーが文章を入力する。
2. Granvas Notation と認識できる行だけが解析される。
3. グラフが更新される。
4. 通常文はそのまま残り、グラフには投影されない。



## UC-02: 親子関係を素早く書く

```text
[problem] 顧客情報が散らばっている
  -> [cause] Excel が分散している
  -> [cause] 担当者ごとに管理している
```

入力後、3 Node / 2 Edge が表示される。

## UC-03: 離れたノード同士を接続する

```text
[problem @scattered] 顧客情報が散らばっている
[idea @unify] AI で統合する

@unify -> @scattered : solves
```

ID を使い、離れた場所に記述したノードを接続できる。

## UC-04: グラフからテキストへ戻る

1. ユーザーがグラフ上の Node をクリックする。
2. エディタが対応する宣言位置へスクロールする。
3. 該当範囲を選択またはカーソル移動する。



## UC-05: テキストからグラフを探す

1. ユーザーが Node 宣言行へカーソルを置く。
2. 対応する Graph Node がハイライトされる。



## UC-06: 書きかけでも壊れない

```text
[problem
```

のような未完成行が存在しても、それ以前に正常解析できた Node / Edge は表示を維持する。

---



# 4. Granvas Notation v0.1



## 4.1 基本方針

- UTF-8 のプレーンテキストを扱う。
- 推奨拡張子は `.granvas`。
- Granvas は Markdown のスーパーセットではない。
- 通常文は自由に記述できる。
- 記法として成立する行だけを構造として解釈する。
- Unknown Type を許容する。
- Parser は partial result を返せること。
- Parser error によりドキュメント全体を無効化しない。
- Parser は常に **現在 revision の source** だけから結果を生成する。前 revision の構造を last-known-good として混在させない。

### 4.1.1 Notation candidate の確定

各 non-empty line は先頭の空白と予約 prefix により、最初に Notation candidate か Plain Text かを分類する。

- indent 0 で `[` から始まる行は Node Declaration candidate。
- 2 spaces 以上の indent 後に `->` が続く行は Nested Relation candidate。
- indent 0 で `@layout` から始まる行は Layout Directive candidate。
- indent 0 で `@` から始まり、行内に `->` がある行は Cross Relation candidate。
- indent 0 で `{` から始まる行は Group Header candidate。
- open Group の内側で base indent 以上の `[`, `@`, `{` から始まる行は Group Member candidate。`{` は nested Group candidate として `GNV011_NESTED_GROUP_UNSUPPORTED` を返す。
- open Group の外側で indent 後に `[`, `@`, `{` から始まる行は invalid indentation candidate とし、`GNV006_INVALID_INDENT` を返す。
- 上記以外は Plain Text とする。

Notation candidate は構文が未完成でも Plain Text へフォールバックせず、対応する diagnostic を返す。これにより `[problem`、`@layout flow`、`  ->` のような入力途中の行を一意に扱う。

### 4.1.2 Recovery policy

- invalid candidate から Node / Edge / Group / Layout は生成しない。ただし Nested Relation の child Node Declaration 部分が valid なら child Node は生成し、解決できない Edge だけを省略する。
- invalid candidate 以外に、現在の source 内で valid な構造はすべて返す。
- 前 revision にだけ存在した構造は返さない。
- diagnostic は該当する現在 revision と同じ `documentRevision` を持つ。

### 4.1.3 Line endings

Parser は JavaScript string を入力として受け取り、`LF` と `CRLF` のいずれも line ending として認識する。Import した source の改行文字は保持し、Parser 内で source 自体を書き換えない。

---



## 4.2 Node Declaration



### Syntax

```text
[type] Label
```



### Example

```text
[problem] 顧客情報が散らばっている
[idea] AI で情報を統合する
[todo] ユーザーインタビュー
```



### Rules

- `type` は Node の意味分類を表す。
- `Label` は Node に表示する文字列。
- `Label` は前後空白を trim する。
- 空 Label は invalid とし diagnostic を返す。
- 同じ Label の Node は複数存在してよい。



### Built-in Types

v0.1 の標準 Type は以下とする。

```text
[node]
[problem]
[cause]
[idea]
[todo]
```

Built-in Type は初期表示スタイルを持つ。

### Custom Types

以下も valid とする。

```text
[customer] 個人事業主
[hypothesis] 価格より導入負荷が課題
[question] なぜ既存ツールでは足りないのか
```

未知 Type はエラーにせず default Node style で表示する。

Type 名は ASCII の英数字・`-`・`_` を許可し、比較時は小文字へ正規化する。

---



## 4.3 Explicit Node ID



### Syntax

```text
[type @id] Label
```



### Example

```text
[problem @scattered] 顧客情報が散らばっている
[idea @unify] AI で統合する
```



### Rules

- ID は任意。
- Cross Relation や Group reference で参照したい Node にのみ付与する。
- ID はドキュメント内で一意であること。
- ID は case-sensitive とする。
- ID は英字で開始し、以降は英数字・`-`・`_` を許可する。

Valid:

```text
@problem1
@customer-info
@idea_main
```

Invalid:

```text
@1problem
@customer info
```



### Duplicate ID

同じ ID が複数宣言された場合:

- 両 Node 自体は可能な限り表示する。
- diagnostic level `error` を返す。
- Cross Relation の ID 解決は最初に宣言された Node を採用する。

### Internal Identity

`@id` はユーザーが relation を記述するための参照 ID であり、レンダリング用の内部 ID とは分離する。

- Parser はすべての Node / Relation / Group / Layout occurrence に一意な `key` を付与する。
- `key` は同一 source を parse したとき常に同じ値になる決定的な文字列とする。
- v0.1 の既定値は `${kind}:${sourceRange.from}` とする。`kind` は `node` / `edge` / `group` / `layout`。
- 同一 offset から複数要素が生じる場合は `:${occurrenceIndex}` を末尾へ付与する。
- `explicitId` が重複しても内部 `key` は重複させない。
- source 前方の編集により offset が変わる場合、内部 `key` の変更は許容する。Workspace は各 revision ごとに selection を source range から再解決し、古い key を保持しない。
- Graph の Node / Edge / Group ID は対応する Parser occurrence key から決定的に生成する。

---



## 4.4 Nested Relation



### Syntax

```text
[parent-type] Parent
  -> [child-type] Child
```

インデントは **2 spaces = 1 level** とする。

### Example

```text
[problem] 顧客情報が散らばっている
  -> [cause] Excel が分散している
  -> [cause] 担当者ごとに管理している
```

生成される構造:

```text
Problem
 ├─> Cause A
 └─> Cause B
```



### Nested Example

```text
[problem] 顧客情報が散らばっている
  -> [cause] Excel が分散している
    -> [cause] チームごとにファイルが違う
```



### Rules

- `->` は有向 Edge を生成する。
- Edge の向きは **親 → 子**。
- Node Type は Edge の意味を自動決定しない。
- v0.1 の Nested Relation に Edge label は持たせない。
- level `n` の relation の親は、同一 scope 内で直前に宣言された level `n - 1` の Node とする。
- Top-level scope では Node Declaration を level 0、先頭 2 spaces の relation を level 1 とする。
- Group scope では base indent 2 spaces の Node Declaration を level 0、先頭 4 spaces の relation を level 1 として扱う。
- blank line と Plain Text は parent stack を変更しない。新しい同 level Node はその level 以深の stack を置換する。
- 1 level を超える段飛ばしは `GNV006_INVALID_INDENT` とし、Edge は生成しない。child Node Declaration 部分が valid なら Node は生成する。
- 親 Node が解決できない relation 行は `GNV008_ORPHAN_RELATION` を返し、その Edge は生成しない。
- Tab indentation は使用しない。
- candidate line の先頭 indent に Tab を検出した場合は `GNV007_TAB_INDENT` warning を返し、その行から構造を生成しない。

---



## 4.5 Cross Relation



### Syntax

```text
@source -> @target
```

または:

```text
@source -> @target : relation-label
```



### Example

```text
@unify -> @scattered : solves
```



### Rules

- source / target はドキュメント内の Node ID を参照する。宣言順に関係なく forward reference を許可し、文書全体を読み終えた後に解決する。
- relation-label は任意。
- relation-label は trim 後の文字列をそのまま表示用ラベルとして扱う。
- `:` が存在するのに trim 後の relation-label が空なら `GNV012_EMPTY_RELATION_LABEL` warning とし、ラベルなし Edge を生成する。
- 未解決 ID がある場合、warning を返し Edge は生成しない。
- v0.1 で使用できる relation operator は `->` のみ。
- self-loop、cycle、同一 source / target 間の複数 Edge は valid とし、宣言 occurrence ごとに別 Edge として保持する。
- Duplicate ID を参照した場合は Cross Relation / Group reference とも最初に宣言された Node を採用する。

以下は v0.1 では未対応。

```text
A <- B
A -- B
A <-> B
```

---



## 4.6 Group



### Syntax

```text
{Group Name}
  ...group members...
```



### Node Declaration inside Group

```text
{Discovery}
  [problem @scattered] 顧客情報が散らばっている
  [todo @interview] ユーザーインタビュー
```



### Existing Node Reference inside Group

```text
[problem @scattered] 顧客情報が散らばっている
[todo @interview] ユーザーインタビュー

{Discovery}
  @scattered
  @interview
```



### Rules

- Group は Node を視覚的にまとめる。
- Group 自体は Node ではない。
- Group 内 Node は通常どおり Relation を持てる。
- Group membership は Node の意味情報として保持する。
- v0.1 では Group のネストをサポートしない。
- 同一 Node が複数 Group に所属することは許容する。
- 未解決 Node reference は warning。
- Group Header は indent 0 にのみ置ける。header の次から、次の non-empty indent 0 line の直前までを Group scope とする。blank line は scope を閉じない。
- Group member の base indent は 2 spaces とする。base indent の Node Declaration と Node Reference を member として扱う。
- Group 内の Nested Relation は base indent に relation level を加えて解釈し、その relation が生成した child Node も同じ Group に所属する。
- Group scope 内の構文に一致しない行は Plain Text として保持し、scope を閉じない。
- Group name は前後空白を trim する。空 name は `GNV013_EMPTY_GROUP_NAME` error とし、Group を生成しない。
- 同名 Group は別 occurrence として許容する。同一 Group 内の同一 Node reference は membership 集合上で1件へ正規化する。
- 複数 Group 所属は意味モデル上で保持し、表示は重なり可能な background overlay / hull とする。React Flow の単一 `parentId` へは写像しない。

---



## 4.7 Layout Directive



### Syntax

```text
@layout flow TB
```

または:

```text
@layout flow LR
```



### Supported Values


| Value | Meaning       |
| ----- | ------------- |
| `TB`  | Top to Bottom |
| `LR`  | Left to Right |




### Rules

- v0.1 の layout mode は `flow` のみ。
- default は `@layout flow TB`。
- Layout Directive が複数ある場合は warning を返し、最後の valid directive を採用する。
- Node 座標は記法に保存しない。

---



## 4.8 Plain Text

以下は valid document content だが Graph には投影されない。

```text
# New product idea

今日は新サービスについて考える。
ユーザーインタビューで情報の分散が課題だと分かった。
```

`#` は v0.1 では Granvas Notation として特別扱いしない。

---



## 4.9 Full Example

```text
@layout flow TB

# New product idea

今日はユーザーの情報管理について考える。

[problem @scattered] Customer information is scattered
  -> [cause] Excel files are fragmented
  -> [cause] Team knowledge is siloed

[idea @unify] AI unifies notes and structure
[todo @interview] User interviews

@unify -> @scattered : solves

{Discovery}
  @scattered
  @interview
```

---



## 4.10 Diagnostics



### Levels

```text
info
warning
error
```



### Principles

- diagnostics は入力を妨げない。
- error があっても解析可能な部分は Graph に残す。
- unknown node type は diagnostic にしない。
- typing 中の一時的不完全状態を想定する。
- UI は IDE のような強い赤エラー表示を避け、軽量な indicator を優先する。



### Initial Diagnostic Codes

```text
GNV001_INCOMPLETE_NODE
GNV002_EMPTY_LABEL
GNV003_INVALID_ID
GNV004_DUPLICATE_ID
GNV005_UNRESOLVED_REFERENCE
GNV006_INVALID_INDENT
GNV007_TAB_INDENT
GNV008_ORPHAN_RELATION
GNV009_INVALID_LAYOUT
GNV010_DUPLICATE_LAYOUT
GNV011_NESTED_GROUP_UNSUPPORTED
GNV012_EMPTY_RELATION_LABEL
GNV013_EMPTY_GROUP_NAME
```

| Code | Default level | Recovery |
| --- | --- | --- |
| `GNV001_INCOMPLETE_NODE` | `info` | candidate を省略 |
| `GNV002_EMPTY_LABEL` | `error` | Node を省略 |
| `GNV003_INVALID_ID` | `error` | explicit ID を持つ Node を省略 |
| `GNV004_DUPLICATE_ID` | `error` | Node は保持し、参照は最初の宣言へ解決 |
| `GNV005_UNRESOLVED_REFERENCE` | `warning` | 参照または Edge を省略 |
| `GNV006_INVALID_INDENT` | `warning` | Edge / membership を省略 |
| `GNV007_TAB_INDENT` | `warning` | candidate line を省略 |
| `GNV008_ORPHAN_RELATION` | `warning` | child Node が valid なら保持し、Edge を省略 |
| `GNV009_INVALID_LAYOUT` | `warning` | default または直前の valid layout を使用 |
| `GNV010_DUPLICATE_LAYOUT` | `warning` | 最後の valid directive を使用 |
| `GNV011_NESTED_GROUP_UNSUPPORTED` | `warning` | 内側 Group を生成しない |
| `GNV012_EMPTY_RELATION_LABEL` | `warning` | label なし Edge を生成 |
| `GNV013_EMPTY_GROUP_NAME` | `error` | Group を省略 |

Diagnostic の公開契約は以下とする。

```ts
export type DiagnosticDto = {
  code: DiagnosticCode;
  level: 'info' | 'warning' | 'error';
  message: string;
  range: SourceRangeDto;
  relatedRanges?: SourceRangeDto[];
  documentRevision: number;
};
```

Duplicate ID の `range` は2件目以降、`relatedRanges` は最初の宣言を指す。message は表示用であり、テストでは `code` / `level` / `range` を主要な契約とする。

---



## 4.11 Parser Output

Parser は UI ライブラリの型を返してはならない。

概念的には以下の構造を返す。

```ts
export type ParseResultDto = {
  documentRevision: number;
  nodes: ParsedNodeDto[];
  relations: ParsedRelationDto[];
  groups: ParsedGroupDto[];
  layout: ParsedLayoutDto;
  diagnostics: DiagnosticDto[];
};
```

すべての構造要素は元テキストとの対応を保持する。

```ts
export type SourceRangeDto = {
  from: number;
  to: number;
  line: number;
  column: number;
};
```

座標規約:

- `from` は JavaScript string / CodeMirror document と同じ **0-based UTF-16 code-unit offset**。
- `to` は exclusive とし、range は半開区間 `[from, to)`。
- `line` は UI 表示に合わせた 1-based の開始行。
- `column` は開始行内の 0-based UTF-16 code-unit offset。
- Node の primary `sourceRange` は indent を含む宣言行全体から line ending を除いた範囲。
- Relation / Group / Layout / Diagnostic も、自身を宣言した token または行の範囲を持つ。
- line ending は source のまま数える。`CRLF` は offset 上2 code units とする。
- BOM を含む file を Import した場合、先頭 BOM は decoder が除去してから application source とする。

この Source Mapping を `Graph → Text` navigation に利用する。

---



## 4.12 Simplified Grammar

以下は lexical grammar である。`group-block` と親 Node の解決は 4.1 / 4.4 / 4.6 の indentation state machine に従う。

```ebnf
document          = { line } ;

line              = empty-line
                  | top-level-line
                  | group-member-line ;

top-level-line    = layout-directive
                  | node-declaration
                  | nested-relation
                  | explicit-relation
                  | group-header
                  | plain-text ;

group-member-line = group-base-indent,
                    ( node-declaration
                    | group-reference
                    | group-header
                    | nested-relation-after-group-base
                    | plain-text ) ;

node-declaration  = "[", type, [ space, "@", identifier ], "]", space, label ;

nested-relation   = relation-indent, "->", space, node-declaration ;

nested-relation-after-group-base
                  = relation-indent, "->", space, node-declaration ;

explicit-relation = "@", identifier,
                    space, "->", space,
                    "@", identifier,
                    [ space, ":", space, relation-label ] ;

group-header      = "{", group-name, "}" ;

group-reference   = "@", identifier ;

layout-directive  = "@layout", space, "flow", space, ( "TB" | "LR" ) ;

identifier        = alpha, { alpha | digit | "-" | "_" } ;
type              = alpha, { alpha | digit | "-" | "_" } ;
group-base-indent = "  " ;
relation-indent   = "  ", { "  " } ;
space             = " ", { " " } ;
label             = non-newline, { non-newline } ;
relation-label    = non-newline, { non-newline } ;
group-name        = non-brace-newline, { non-brace-newline } ;
```

`alpha` は ASCII `A-Z` / `a-z`、`digit` は ASCII `0-9` とする。Node Type は parse 後に lowercase へ正規化する。Label、relation-label、group-name に escape syntax は導入せず、各行の閉じ delimiter より後または行末までを文字列として扱う。

---



# 5. Graph Projection Specification



## 5.1 Projection Rules

- Node Declaration → Graph Node
- Nested Relation → Directed Graph Edge
- Cross Relation → Directed Graph Edge
- Group → Graph Group / visual container
- Layout Directive → Layout configuration
- Plain Text → Graph には出さない
- Diagnostics → Graph state を破壊しない



## 5.2 Graph Domain Model

Graph の意味モデルは React Flow / Dagre に依存しない。

```ts
export type ThoughtGraph = {
  revision: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
};
```

```ts
export type GraphNode = {
  id: string;
  explicitId?: string;
  type: string;
  label: string;
};
```

```ts
export type GraphEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
};
```

```ts
export type GraphGroup = {
  id: string;
  name: string;
  memberNodeIds: string[];
};
```

Graph Domain は Notation ownership の `SourceRange` を保持しない。Text との対応は Workspace が公開 DTO を用いて次の mapping として保持する。

```ts
export type ProjectionSourceMapDto = {
  revision: number;
  nodeRanges: Readonly<Record<string, SourceRangeDto>>;
  edgeRanges: Readonly<Record<string, SourceRangeDto>>;
  groupRanges: Readonly<Record<string, SourceRangeDto>>;
};
```



## 5.3 Layout

- Semantic Graph と Layout Result を分離する。
- Domain は x/y 座標を保持しない。
- Application が `GraphLayoutPort` を通して layout を要求する。
- Infrastructure の Dagre Web Worker adapter が座標を生成する。
- Presentation は Positioned DTO を React Flow へ変換する。
- v0.1 の Node は layout 上 `240px × 88px` の固定 bounds とし、label は3行まで折り返す。超過分は visual 上 ellipsis とするが、完全な label は accessible name / tooltip で参照できる。
- Dagre 入力座標は CSS pixel、出力 `x/y` は Node bounds の左上座標とする。
- Group は member Node の配置後に、全 member bounds を囲む `24px` padding の overlay bounds を計算する。複数 Group の overlay は重なってよい。
- 同一 input に対する Node / Edge の順序を occurrence key 順へ正規化し、layout 結果を決定的にする。



## 5.4 Graph Editing

v0.1 の Graph は read-only projection とする。

許可:

- Select
- Pan
- Zoom
- Fit View

禁止:

- Node drag による意味変更
- Edge 作成
- Node 作成
- Node 削除
- 座標保存

Node drag は原則 disabled とする。

---



# 6. UI / UX Specification



## 6.1 Target

- Desktop-first Web application
- 推奨 viewport: 1280px 以上
- 最低想定 width: 960px
- Mobile optimization は v0.1 の対象外



## 6.2 Main Layout

```text
┌──────────────────────────────────────────────────────────┐
│ Granvas                   Write thoughts. See structure. │
├────────────────────────────┬─────────────────────────────┤
│                            │                             │
│        TEXT EDITOR         │            GRAPH            │
│                            │                             │
│ [problem] ...              │        ┌ Problem ┐         │
│   -> [cause] ...           │       /           \        │
│                            │   ┌ Cause ┐    ┌ Cause ┐   │
│                            │                             │
├────────────────────────────┴─────────────────────────────┤
│ Unsaved           Ln 4, Col 8       8 nodes / 7 edges   │
└──────────────────────────────────────────────────────────┘
```

Default split ratio:

```text
Text 55% / Graph 45%
```

Divider はドラッグで変更可能。

## 6.3 Top Bar

最低限以下を表示する。

- Granvas logo / name
- `Write thoughts. See structure.`
- Import Project
- Download

v0.1 では account / cloud / share UI は持たない。

## 6.4 Text Editor

CodeMirror 6 を利用する。

Requirements:

- line number
- current cursor position
- syntax highlight
- soft diagnostics
- source selection
- scroll-to-range API
- plain text editing
- IME を含む日本語入力

Highlight 対象:

- `[type]`
- `@id`
- `->`
- `{Group}`
- `@layout`
- relation label

IME composition 中は editor の文字列更新を妨げない。parse / layout / dirty 判定は更新してよいが、composition 中の一時的な diagnostic は gutter に表示せず、`compositionend` 後の revision で確定表示する。



## 6.5 Graph Pane

React Flow (`@xyflow/react`) を利用する。

v0.1 の view mode は `Flow` のみ。

Controls:

- Zoom In
- Zoom Out
- Fit View
- Pan

Graph Node は focusable とし、`Enter` / `Space` で click と同じ Graph → Text navigation を実行する。Node の accessible name は完全な label と type を含む。

初回表示と Project Import 完了時のみ Fit View を自動実行する。通常の Text 更新では現在の pan / zoom を維持し、選択 Node が viewport 外の場合だけ最小限 scroll / pan して表示する。

Node visual style は semantic type に応じて軽く差別化する。

Built-in Type 以外は default style。

## 6.6 Text / Graph Synchronization



### Graph → Text

Node click:

1. Node の `sourceRange` を取得。
2. Editor を対象行へ scroll。
3. line ending を除く Node 宣言行全体の `[from, to)` を selection に設定。
4. 対応 Node を selected state にする。



### Text → Graph

Editor cursor movement:

1. cursor offset を取得。
2. `sourceRange` に cursor を含む Node を検索。
3. 対応 Node を highlight。
4. 該当 Node がなければ highlight を解除。



## 6.7 Error UX

- typing 中に modal を出さない。
- parser error で Graph 全体を blank にしない。
- diagnostics は editor gutter / subtle underline / status indicator で示す。
- detail は hover または diagnostics panel で確認可能にする。

v0.1 では専用 diagnostics panel は optional とし、editor 内表示を優先する。

---



# 7. Persistence / File I/O



## 7.1 User-owned File Persistence

v0.1 は、Webアプリ版draw.ioのようにユーザーが明示的に Project をDownload / Importして継続する。

- 編集中の source は現在の browser tab の memory にだけ保持する。
- localStorage / IndexedDB へ自動永続化しない。
- telemetry、cloud storage、backend API call を行わない。
- Vercel から静的 asset を取得した後、編集・parse・layout・Import・Download は browser 内で完結する。
- `.granvas` だけを再編集可能な project format とする。SVG / PNG / PDF は read-only の派生成果物であり、Import 対象にしない。



## 7.2 Current Document

v0.1 は **single active document** とする。

ドキュメント一覧 / folder 管理は実装しない。

## 7.3 Dirty State

Workspace は `clean` / `dirty` / `exporting` / `error` を持つ。

- New Project の初期 source は `clean`。
- clean baseline 以降に source が変わると `dirty`。
- `.granvas` Import 成功直後は imported source を baseline として `clean`。
- `.granvas` Download の開始に成功した revision は baseline となり `clean`。
- SVG / PNG / PDF Download は再編集可能な保存ではないため dirty state を変更しない。
- dirty な状態で Import / New Project を実行する場合は、現在の Project が失われることを confirmation dialog で確認する。cancel 時は何も変更しない。
- dirty な状態で tab close / reload / route leave が発生する場合は browser の `beforeunload` warning を利用する。
- Download / Import の失敗は `error` として表示し、現在の source と clean baseline を変更しない。



## 7.4 Import Project

- Import 対象は `.granvas` file のみ。
- file size の hard limit は 5 MiB。超過時は読み込まず error を表示する。
- UTF-8 として厳密に decode する。先頭 BOM は除去し、改行コードは保持する。
- decode / read error 時は現在の Project を維持する。
- imported content は code execution せず、untrusted plain text として扱う。
- Import 成功後、source を active document とし、revision を更新して parse → graph → layout を実行する。
- Import した Project に diagnostics があっても開く。現在 source の valid な構造を表示し、diagnostics 件数を通知する。
- Import 成功時だけ Fit View を自動実行する。



## 7.5 Download

Download action は modal を開き、file name と次の format をユーザーに選択させる。

| Format | Purpose | Content |
| --- | --- | --- |
| `.granvas` | 再編集可能なProject保存 | active source textをUTF-8で保持 |
| SVG | 拡大可能な共有用Graph | current valid projection全体 |
| PNG | 画像としての共有 | current valid projection全体、2x scale、white background |
| PDF | 印刷・配布 | current valid projection全体を単一pageへ配置 |

共通規則:

- default file name は `untitled`。拡張子は選択 format に合わせてapplicationが付与し、重複拡張子を避ける。
- `.granvas` は source text をそのまま保存し、Graph座標・派生Graph・diagnosticsを含めない。
- SVG / PNG / PDF は Node / Edge / Group / relation label を含む full graph bounds に24px相当のpaddingを加える。現在viewportのpan / zoomには依存しない。
- SVG / PNG / PDF に埋め込むすべての文字列はtextとしてescapeし、HTMLとして解釈しない。
- Graph Nodeが0件の場合、SVG / PNG / PDFはdisabledとし、`.granvas`だけを許可する。
- diagnosticsが存在する場合もvisual formatをDownloadできるが、「validなprojectionだけが含まれる」ことと件数をmodal内に表示する。
- PNGは2x scaleを基本とし、生成bitmapが8192 × 8192 pixelsを超える場合は上限内へ縮小して通知する。
- PDFはsingle-page、white backgroundとし、graph boundsに合わせたpage sizeを使用する。
- browserがdownload開始を受理したときsuccessを通知する。生成またはdownload開始に失敗した場合はerrorを表示し、dirty stateを変更しない。

---



# 8. Architecture



## 8.1 Architecture Style

Granvas v0.1 は以下を採用する。

> **Domain-Driven Design + Layered Architecture + Modular Monolith**

単一 deployable Web application の中で domain boundary を明確に分離する。

v0.1 では npm package 単位の分割は行わず、`src/modules/*` のコード境界でモジュラモノリスを構成する。

将来必要になった場合のみ package 抽出する。

---



## 8.2 守るべき原則



### 1. Domain 分割

境界づけられたコンテキスト単位で module を分ける。

### 2. Single Responsibility

`presentation` / `application` / `domain` / `infrastructure` の責務を混ぜない。

### 3. One-way Dependency

基本依存方向:

```text
presentation
    ↓
application
    ↓
domain
```



### 4. Loose Coupling

外部 SDK・UI framework・storage API などの具体実装を domain / application に漏らさない。

### 5. Dependency Inversion

application / domain は infrastructure の具象ではなく interface / port に依存する。

### 6. Module Boundary

他 bounded context の内部ディレクトリを直接 import しない。

他 module を利用する場合は public API / published contract を介する。

### 7. Shared Minimalism

Granvas 固有の domain concept を `shared` へ逃がさない。

`shared` は本当に context-independent なものだけに限定する。

### 8. No Framework in Domain

以下の型・API を domain に持ち込まない。

- React
- CodeMirror
- React Flow
- Dagre
- localStorage
- DOM
- browser File API

---



# 9. Repository Structure

```text
granvas/
├── .steering/
│   └── YYYYMMDD-development-title/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
│
├── docs/
│   ├── ideas/initial-requirements.md
│   ├── GRANVAS_SPEC_v0.1.md
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md
│   ├── development-guidelines.md
│   ├── glossary.md
│   ├── development-roadmap.md
│   └── adr/
│
├── examples/
│   ├── brainstorming.granvas
│   ├── product-planning.granvas
│   └── meeting.granvas
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── bootstrap/
│   │   ├── providers/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── modules/
│   │   ├── document/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   ├── notation/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   ├── graph/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   ├── transfer/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   └── workspace/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       ├── presentation/
│   │       └── index.ts
│   │
│   └── shared/
│       ├── domain/
│       ├── infrastructure/
│       └── presentation/
│
├── tests/
│   ├── e2e/
│   ├── fixtures/
│   └── performance/
│
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
├── package.json
├── bun.lock
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

Layer folder は「必ずファイルを置く場所」ではない。

責務が存在しない場合は空または未作成でよい。形式のためだけに抽象を作らない。

---



# 10. Bounded Contexts



## 10.1 Document Context



### Responsibility

browser tab 内の Granvas document と dirty lifecycle を管理する。file I/O と visual format 生成は Transfer Context へ委譲する。

### Domain

候補:

```text
GranvasDocument
DocumentId
DocumentName
DocumentSource
DocumentRevision
DocumentDirtyState
```



### Application Use Cases

```text
CreateDocument
UpdateDocumentSource
ReplaceDocumentSource
MarkProjectDownloaded
```

### Infrastructure

```text
v0.1 では必須実装なし
```



### Presentation

- Dirty state indicator

Document context は CodeMirror を知らない。

---



## 10.2 Notation Context



### Responsibility

Granvas Notation の syntax / semantics / diagnostics / source mapping を管理する。

### Domain

候補:

```text
NotationDocument
NodeDeclaration
RelationDeclaration
GroupDeclaration
LayoutDirective
NodeType
NodeReference
SourceRange
Diagnostic
```



### Domain Service

```text
GranvasNotationParser
```

Parser は Granvas の言語仕様そのものなので、v0.1 の pure TypeScript parser は domain service として扱う。

外部 parser generator を将来導入する場合、その技術 adapter は infrastructure に置く。

### Application Use Case

```text
ParseNotation
```

Input:

```ts
{ source: string }
```

Output:

```ts
ParseResultDto
```



### Infrastructure

v0.1 では必須実装なし。

### Presentation

CodeMirror integration:

```text
Granvas syntax highlighting
Diagnostics decoration
Source range mapping
```

CodeMirror の型は presentation の外へ出さない。

---



## 10.3 Graph Context



### Responsibility

思考構造の semantic graph と、その表示用 layout を扱う。

### Domain

候補:

```text
ThoughtGraph
GraphNode
GraphEdge
GraphGroup
GraphDirection
```

Domain は座標を持たない。

### Application Use Cases

```text
CreateThoughtGraph
LayoutThoughtGraph
```



### Application Port

```ts
export interface GraphLayoutPort {
  layout(input: GraphLayoutInputDto, signal?: CancellationSignal): Promise<PositionedGraphDto>;
}

export interface CancellationSignal {
  readonly cancelled: boolean;
  onCancel(listener: () => void): () => void;
}
```



### Infrastructure

```text
DagreGraphLayoutWorkerAdapter
```

Dagre の型は infrastructure の外へ出さない。

### Presentation

```text
ReactFlowGraphView
GraphNodeView
GraphControls
```

React Flow の Node / Edge 型は presentation の外へ出さない。

---

## 10.4 Transfer Context

### Responsibility

ユーザー所有 file の Import、Download format 選択、framework-neutral な export scene から `.granvas` / SVG / PNG / PDF を生成する。

### Domain

```text
DownloadFormat
DownloadFileName
ProjectFile
ImportValidation
```

### Application Use Cases

```text
ImportProjectFile
DownloadProject
DownloadGraph
```

### Application Ports

```ts
export interface ProjectFilePickerPort {
  pickProjectFile(): Promise<PickedProjectFileDto | null>;
}

export interface FileDownloadPort {
  download(file: DownloadFileDto): Promise<void>;
}

export interface GraphExportPort {
  render(
    input: GraphExportSceneDto,
    format: 'svg' | 'png' | 'pdf',
  ): Promise<RenderedFileDto>;
}
```

### Infrastructure

```text
BrowserProjectFilePickerAdapter
BrowserFileDownloadAdapter
SvgGraphExportAdapter
CanvasPngExportAdapter
PdfGraphExportAdapter
```

browser / canvas / PDF library 固有型は infrastructure の外へ出さない。PDF library を追加する場合は ADR で選定理由と bundle size を記録する。

### Presentation

```text
ImportProjectAction
DownloadDialog
TransferStatus
```

---


## 10.5 Workspace Context



### Responsibility

Document / Notation / Graph / Transfer をユーザーの編集体験として協調させる。

Granvas の主要 UX である **Text ↔ Graph navigation** を扱う。

### Domain

必要になった場合のみ:

```text
WorkspaceSelection
SourceSelection
GraphSelection
```

v0.1 では無理に domain object を増やさない。

### Application Use Cases

```text
OpenWorkspace
UpdateWorkspaceSource
RebuildWorkspaceProjection
SelectGraphNode
SelectSourceRange
ImportProject
DownloadCurrentProject
```



### Cross-context Integration

Workspace application は他 context の内部 domain を直接 import しない。

連携には各 context が公開する application facade / DTO を利用する。

許可される conceptual dependency:

```text
Workspace
 ├─> Document public application API
 ├─> Notation public application API
 ├─> Graph public application API
 └─> Transfer public application API
```

Document / Notation / Graph / Transfer は Workspace を参照しない。

### Presentation

```text
WorkspacePage
WorkspaceSplitPane
StatusBar
```

`src/app/App.tsx` が public presentation API として公開された `GranvasEditor`、`ReactFlowGraphView`、`DownloadDialog`、`WorkspaceSplitPane` を合成する。Workspace presentation が他 module の presentation 内部を直接 import しない。

---



# 11. Module Dependency Rules



## 11.1 Module Direction

```text
                   App / Composition Root
                           │
                           ▼
                        Workspace
                    /      |      |      \
                   v       v      v       v
             Document  Notation  Graph  Transfer
```

- `document` は `notation`, `graph`, `workspace` に依存しない。
- `notation` は `document`, `graph`, `workspace` に依存しない。
- `graph` は `document`, `notation`, `workspace` に依存しない。
- `transfer` は `document`, `notation`, `graph`, `workspace` に依存しない。
- `workspace` が public application contract を通して 4 context を統合する。
- `shared` は modules を import しない。
- `app` は composition root と presentation composition root として各 module の public API を結線できる。



## 11.2 Internal Layer Rules



### Domain may import

```text
own domain
shared/domain
```



### Application may import

```text
own domain
own application
shared/domain
other module's explicitly published application contract (workspace integration only)
```



### Infrastructure may import

```text
own application ports
own domain
shared/domain
shared/infrastructure
external SDK / browser API
```



### Presentation may import

```text
own application
shared/presentation
external UI libraries
```

Presentation は原則 domain object を直接描画せず、application DTO / View Model を受け取る。

## 11.3 Forbidden Imports

以下は禁止。

```ts
import { Something } from '@/modules/graph/domain/...';
import { Something } from '@/modules/notation/infrastructure/...';
```

他 module からは必ず public API を使う。

```ts
import { createGraphFacade } from '@/modules/graph';
```



## 11.4 Enforcement

- TypeScript path alias を利用する。
- ESLint `no-restricted-imports` 等で module internal import を禁止する。
- PR review で boundary violation を blocker とする。

---



# 12. Dependency Inversion / Composition Root

Infrastructure の具象は application が定義した port を実装する。

```ts
// transfer/application
export interface FileDownloadPort {
  download(file: DownloadFileDto): Promise<void>;
}
```

```ts
// transfer/infrastructure
export class BrowserFileDownloadAdapter
  implements FileDownloadPort {
  // ...
}
```

具象の生成と注入は `src/app/bootstrap/` で行う。

```text
src/app/bootstrap/
  createApplication.ts
```

Conceptual example:

```ts
const graphLayout = new DagreGraphLayoutWorkerAdapter();
const projectFilePicker = new BrowserProjectFilePickerAdapter();
const fileDownload = new BrowserFileDownloadAdapter();

const app = createGranvasApplication({
  graphLayout,
  projectFilePicker,
  fileDownload,
});
```

Application / Domain 内で `new Browser...` や `new Dagre...` を行わない。

---



# 13. Shared Policy

`shared` は最小化する。

以下を理由に shared へ移動してはいけない。

> 「2つの module から使っているから」

まず ownership を判断する。

Granvas 固有の概念は必ず owning context に置く。

Shared に置いてよい例:

```text
shared/presentation/Button
shared/presentation/IconButton
shared/presentation/SplitPane
shared/presentation/Toast
```

必要性が生まれた場合のみ:

```text
shared/domain/Result
shared/infrastructure/Logger
```

ただし `BaseEntity`, `BaseRepository`, `utils.ts`, `helpers.ts` のような抽象化は、明確な必要性がない限り作らない。

以下は shared に置かない。

```text
GraphNode
Document
NotationAST
SourceRange（notation ownership の間は notation に置く）
WorkspaceState
```

---



# 14. Technology Stack



## Core

```text
TypeScript
```



## Web / UI

```text
React
Vite
```



## Editor

```text
CodeMirror 6
```



## Graph Rendering

```text
@xyflow/react
```



## Graph Layout

```text
@dagrejs/dagre
```

## File Generation

```text
Browser File API / Blob / XMLSerializer / Canvas
PDF generation adapter（library選定時はADR必須）
```

## Hosting

```text
Vercel static deployment
```

Vercel 固有 SDK は application / domain に導入しない。v0.1 は静的 SPA として build し、server function を使用しない。

## Future Authentication Decision

将来認証を実装する場合は **Supabase Auth** を採用する。これは provider の先行決定だけであり、v0.1 では Supabase dependency、認証コード、環境変数、database、cloud sync を含めない。



## Testing

```text
Vitest
React Testing Library
Playwright (E2E)
```



## State Management

v0.1 では Redux / Zustand 等の global state library を導入しない。

- domain/application state は use case / model で管理する。
- presentation-only state は React state / `useReducer` を利用する。
- state library が必要になった時点で ADR を作成する。



## Package Policy

- bootstrap 時点の stable version を利用する。
- lockfile を commit する。
- dependency は必要最小限とする。

---



# 15. Main Runtime Flow



## 15.1 Typing Flow

```text
User typing
   ↓
Workspace Presentation
   ↓
UpdateWorkspaceSource
   ├─> Document Application
   │     └─> revision increment + dirty
   │
   └─> Notation Application
          ↓
      ParseResultDto
          ↓
      Workspace mapping
          ↓
      Graph Application
          ↓
      ThoughtGraph
          ↓
      LayoutThoughtGraph
          ↓
      GraphLayoutPort
          ├─> documentRevision / CancellationSignal
          ↓
      Dagre Worker Adapter
          ↓
      PositionedGraphDto
          ↓
      latest revision check
          ↓
      Graph Presentation
          ↓
      React Flow
```

すべての pipeline request は単調増加する `documentRevision` を保持する。新しい revision を開始した時点で古い layout を abort し、abort できない場合も完了結果の revision が current と一致しなければ破棄する。parse / layout の失敗時は current source と diagnostics を維持し、古い revision の Graph を current として再表示しない。



## 15.2 Selection Flow

```text
Graph Node click
   ↓
node id
   ↓
Workspace application
   ↓
ProjectionSourceMapDto lookup
   ↓
Editor presentation command
   ↓
scroll + selection
```

```text
Editor cursor move
   ↓
cursor offset
   ↓
Workspace application
   ↓
sourceRange lookup
   ↓
selected graph node id
   ↓
Graph presentation highlight
```

## 15.3 Import / Download Flow

```text
Import Project
   ↓
dirty confirmation
   ↓
Transfer Application → Browser file picker
   ↓
size / UTF-8 / extension validation
   ↓
Document ReplaceDocumentSource
   ↓
new revision → parse → graph → layout → Fit View
```

```text
Download
   ↓
format + file name selection
   ├─> .granvas: current source
   └─> SVG / PNG / PDF: current PositionedGraph + Groups
           ↓
       Transfer Application → GraphExportPort
   ↓
FileDownloadPort
   ↓
success / error notification
```

---



# 16. Public Contracts / DTO Policy

Bounded Context 間で domain entity を共有しない。

Context 間では immutable DTO / published contract を利用する。

例:

```ts
export type ParsedNodeDto = {
  key: string;
  explicitId?: string;
  type: string;
  label: string;
  sourceRange: SourceRangeDto;
};
```

```ts
export type ParsedRelationDto = {
  key: string;
  sourceNodeKey: string;
  targetNodeKey: string;
  label?: string;
  sourceRange: SourceRangeDto;
};

export type ParsedGroupDto = {
  key: string;
  name: string;
  memberNodeKeys: string[];
  sourceRange: SourceRangeDto;
};

export type ParsedLayoutDto = {
  key?: string;
  mode: 'flow';
  direction: 'TB' | 'LR';
  sourceRange?: SourceRangeDto;
};
```

default layout は source に occurrence を持たないため、`key` / `sourceRange` を省略する。

```ts
export type ThoughtGraphDto = {
  revision: number;
  nodes: ThoughtGraphNodeDto[];
  edges: ThoughtGraphEdgeDto[];
  groups: ThoughtGraphGroupDto[];
};
```

```ts
export type GraphLayoutInputDto = {
  revision: number;
  direction: 'TB' | 'LR';
  nodes: Array<{ id: string; width: number; height: number }>;
  edges: Array<{ id: string; source: string; target: string }>;
  groups: Array<{ id: string; name: string; memberNodeIds: string[] }>;
};
```

```ts
export type PositionedGraphDto = {
  revision: number;
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
  groups: Array<{
    id: string;
    name: string;
    memberNodeIds: string[];
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};
```

```ts
export type GraphExportSceneDto = {
  revision: number;
  graph: PositionedGraphDto;
  bounds: { x: number; y: number; width: number; height: number };
  theme: 'light';
};
```

Export adapter は `GraphExportSceneDto` から表示用 path / text / background を生成する。React Flow のDOM snapshotをapplication contractとして渡さない。

Workspace が presentation へ公開する最終 DTO は Graph の位置情報と Notation の source mapping を合成する。

```ts
export type WorkspaceProjectionDto = {
  revision: number;
  graph: PositionedGraphDto;
  sourceMap: ProjectionSourceMapDto;
  diagnostics: DiagnosticDto[];
};
```

React Flow / Dagre の型を DTO に含めない。

---



# 17. Performance / Responsiveness



## 17.1 UX Principle

入力操作を layout 処理でブロックしない。

- Editor input は常に最優先。
- input handler 内で parse / layout を同期実行しない。projection rebuild は 120ms を既定として debounce する。
- Dagre layout は Web Worker adapter で実行し、main thread には DTO だけを返す。
- revision / abort / latest-wins policy を必須とする。
- Graph 更新中でも text editing を継続できる。



## 17.2 v0.1 Target Size

主対象:

```text
500 lines 前後
200 nodes 前後
300 edges 前後
10 groups 前後
1 label 200 UTF-16 code units 以下
```

Canonical performance fixture を Chromium / Firefox / WebKit の最新安定版相当で計測し、通常の開発用desktop（4 logical cores、8 GiB RAM以上）で以下を満たす。

- editor input から次の paint: p95 50ms 以下。
- Parser: p95 50ms 以下。
- Layout worker round trip: p95 200ms 以下。
- debounce終了からGraph paint完了: p95 350ms 以下。
- pan / zoom 操作中のlong task: 100ms超を発生させない。

巨大 graph optimization は v0.1 の対象外。

---



# 18. Accessibility

v0.1 でも最低限以下を守る。

- toolbar controls に accessible name を付与する。
- keyboard で editor へアクセスできる。
- graph controls を keyboard 操作可能にする。
- Graph NodeをTabでfocusでき、Enter / SpaceでTextへ移動できる。
- color だけで Node Type を区別しない。
- selection / diagnostics は非色情報でも認識できるようにする。
- focus indicatorを表示し、status / transfer errorは`aria-live`で通知する。
- Download dialogはfocus trap、Escapeでcancel、実行後のfocus復帰を行う。

適合目標は WCAG 2.2 AA とし、自動検査に加えてkeyboard-only E2Eをrelease gateに含める。

---



# 19. Security / Privacy

- v0.1 は user-owned file / local processing を採用する。
- production asset load後のoutbound requestは0とする。remote API、telemetry、cloud storageを使用しない。
- imported `.granvas` は plain text として扱う。
- notation を JavaScript として実行しない。
- `eval` / dynamic code execution を使用しない。
- Node label、relation label、Group name、diagnostic message、file nameを含め、source / import由来の文字列はすべてuntrustedとして扱う。
- `dangerouslySetInnerHTML` を使用せず、HTML / SVG / attribute / file nameの各sinkでescapeまたはallowlistを適用する。
- Download file nameからpath separator、control character、予約文字を除去する。
- productionのVercel responseにCSPを設定し、少なくとも`object-src 'none'`、`base-uri 'none'`、`frame-ancestors 'none'`、`connect-src 'none'`を満たす。
- v0.1 bundleにSupabase SDKや認証secretを含めない。

---



# 20. Testing Strategy



## 20.1 Domain Tests

最優先は Notation Parser。

Parser test suite を executable specification として扱う。

Example:

```text
[problem] A
  -> [cause] B
```

Expected:

```text
nodes = 2
relations = 1
errors = 0
```

必須 case:

- valid node
- custom node type
- explicit ID
- duplicate ID
- nested relation
- multiple siblings
- multi-level nesting
- orphan relation
- cross relation
- unresolved reference
- group declaration
- group reference
- layout TB
- layout LR
- invalid layout
- plain text mixing
- incomplete node
- empty label
- tab indentation
- partial recovery
- source range correctness
- notation candidate vs plain text commit point
- Group scope termination / blank line / Plain Text
- Group内Nested Relation
- invalid level skip
- forward reference
- self-loop / cycle / parallel edges
- duplicate IDをCross Relation / Group referenceから参照
- empty relation label / empty Group name
- UTF-16 surrogate pair / CRLF / BOM除去後のsource range
- deterministic occurrence key



## 20.2 Application Tests

Port を fake / stub に差し替えて use case を test する。

対象:

```text
CreateDocument
UpdateDocumentSource
ReplaceDocumentSource
MarkProjectDownloaded
ParseNotation
LayoutThoughtGraph
SelectGraphNode
SelectSourceRange
ImportProject
DownloadCurrentProject
```

latest-wins、古いlayout結果の破棄、abort、dirty confirmation、`.granvas`以外のDownloadでdirtyを解除しないことを検証する。



## 20.3 Infrastructure Tests

- Browser project file picker contract
- Browser download adapter contract
- `.granvas` UTF-8 round-trip
- SVG / PNG / PDF export adapter mapping and escaping
- Dagre worker adapter mapping / abort
- Vercel production header / CSP configuration

Infrastructure test では library-specific behavior を domain test に混ぜない。

## 20.4 Presentation Tests

React Testing Library を利用する。

対象:

- toolbar actions
- split pane basic behavior
- diagnostics rendering
- graph node selection callback
- editor selection callback
- Download dialogのformat / file name / disabled state
- dirty / error status
- keyboard Node activation / focus return



## 20.5 E2E

Playwright で最低限以下を保証する。

Scenario 1:

```text
入力
→ graph node が表示
→ node click
→ editor が該当行へ移動
```

Scenario 2:

```text
入力 → .granvas Download
→ dirtyが解除
→別の内容へ変更
→ Downloadした.granvasをImport
→ sourceとGraphが保存時点へ復元され、編集を継続できる
```

Scenario 3:

```text
invalid/incomplete line を入力
→ 他の graph が消えない
```

Scenario 4:

```text
同一ProjectをSVG / PNG / PDFでDownload
→ full graphが各formatに含まれる
→ dirty stateは維持される
```

Scenario 5:

```text
連続入力で複数layoutを発生
→ 古いrevisionの結果が最新Graphを上書きしない
```

Scenario 6:

```text
keyboardだけでGraph Nodeを選択
→ 対応するText宣言へ移動
```

---



# 21. Coding Rules



## 21.1 Prefer Pure Functions

Parser / mapping / domain logic は可能な限り pure function にする。

## 21.2 No Premature Abstraction

以下を避ける。

```text
BaseUseCase
BaseRepository
AbstractService
GenericManager
utils.ts の肥大化
```

同じ形のコードが存在するだけでは抽象化しない。

## 21.3 Domain Language

コード上の名前は Granvas の ubiquitous language を優先する。

Prefer:

```text
NodeDeclaration
ThoughtGraph
SourceRange
LayoutDirection
```

Avoid:

```text
Data
Item
Manager
Processor
Helper
```



## 21.4 External Type Isolation

以下を domain / application public contract に出さない。

```text
ReactNode
EditorView
ReactFlow Node
ReactFlow Edge
Dagre GraphLabel
StorageEvent
FileSystemHandle
AbortSignal
```

---



# 22. Initial Implementation Order



## Phase 1: Project Bootstrap

- Vite + React + TypeScript
- ESLint / formatter
- path aliases
- module boundary rule
- Vitest
- directory skeleton



## Phase 2: Notation Core

- Notation domain model
- `SourceRange`
- diagnostics
- parser
- parser unit tests
- full example fixture



## Phase 3: Graph Core

- Graph domain model
- notation DTO → thought graph mapping
- layout port
- Dagre Web Worker adapter
- Group overlay bounds
- layout tests



## Phase 4: Workspace

- update source use case
- parse → graph → layout pipeline
- documentRevision / latest-wins / abort
- selection mapping
- source-range lookup



## Phase 5: Presentation

- split layout
- CodeMirror
- React Flow
- Graph → Text navigation
- Text → Graph highlight
- status bar
- keyboard navigation / accessibility



## Phase 6: File Transfer

- dirty / clean state
- `.granvas` Import / Download
- SVG / PNG / PDF Download
- dirty confirmation / beforeunload
- file validation / error handling



## Phase 7: Release Hardening

- E2E
- README
- examples
- CONTRIBUTING
- SECURITY
- license decision
- GitHub Actions
- Vercel production deployment / CSP headers
- performance / accessibility gate

---



# 23. Definition of Done — Granvas v0.1

v0.1 は以下をすべて満たしたとき release candidate とする。

## Product

- [ ] 左 Text / 右 Graph の分割 UI が動作する
- [ ] 分割比率を変更できる
- [ ] 普通の文章を自由に書ける
- [ ] Node declaration を Graph 化できる
- [ ] Nested Relation を Graph 化できる
- [ ] Explicit ID / Cross Relation が動作する
- [ ] Group が表示される
- [ ] TB / LR layout が動作する
- [ ] syntax highlight と全初期 diagnostic code が表示される
- [ ] Pan / Zoom / Fit View が動作し、通常更新でviewportを不必要にresetしない
- [ ] Graph Node click で Text へ移動できる
- [ ] keyboardでGraph NodeからTextへ移動できる
- [ ] Text cursor から Graph Node を highlight できる
- [ ] IME compositionで文字欠落や確定後の不正projectionが起きない
- [ ] incomplete notationでも現在source内のvalidなGraphが消えない
- [ ] `.granvas`をDownload / Importし、保存時点から編集を再開できる
- [ ] SVG / PNG / PDFを選択してfull graphをDownloadできる
- [ ] dirty状態のImport / New / 離脱でデータ消失警告が出る
- [ ] Download / Import失敗時に現在sourceが維持される



## Architecture

- [ ] `presentation / application / domain / infrastructure` の責務が分離されている
- [ ] Domain に UI / browser / SDK 依存がない
- [ ] Application が infrastructure concrete class を参照していない
- [ ] module internal direct import が禁止されている
- [ ] `shared` に Granvas 固有 domain model が逃げていない
- [ ] Graph Domain が Notation の `SourceRange` に依存していない
- [ ] Transfer Context のbrowser / export具象がports越しに隔離されている
- [ ] Workspace projectionが同一revisionのGraph / SourceMap / Diagnosticsだけを公開する
- [ ] composition root が `src/app/bootstrap` に集約されている



## Quality

- [ ] Parser executable specificationが4章の全candidate・回復規則を網羅している
- [ ] UTF-16 / emoji / CRLF / BOMを含むsource range testがある
- [ ] application use case tests がある
- [ ] Import / Download / dirty state / failure pathのtestがある
- [ ] latest-wins / abort testがある
- [ ] 主要 E2E 6 scenario がChromium / Firefox / WebKitで通る
- [ ] 17章のperformance budgetを満たす
- [ ] WCAG 2.2 AA自動検査とkeyboard E2Eが通る
- [ ] productionでruntime outbound requestがなく、CSP testが通る
- [ ] TypeScript error 0
- [ ] lint error 0
- [ ] production build success
- [ ] Vercel production deploymentでdirect access / reloadが動作する
- [ ] OSS licenseが決定され、`LICENSE`が存在する

---



# 24. Deferred Decisions

以下は v0.1 では決定・実装しない。

- Graph → Text の双方向編集
- Node drag の永続化
- Map view
- Outline view
- Timeline view
- multi-document workspace
- workspace folder
- backlinks
- search
- AI assistant
- collaboration
- cloud sync
- account / authentication implementation（providerはSupabase Authに決定済み）
- server API
- plugin API
- desktop app / Tauri
- VS Code extension
- parser npm package 抽出
- renderer npm package 抽出
- schema version directive
- comments syntax
- undirected relation syntax
- reverse relation syntax
- nested groups

これらは v0.1 の使用実績を見て ADR / v0.2 specification で判断する。

---



# 25. Release Philosophy

Granvas v0.1 の目的は、多機能なノートアプリを完成させることではない。

証明したい仮説はひとつである。

> **文章を書く行為と、思考構造を見る行為を一つの連続した体験にできるか。**

そのため、v0.1 では機能数より以下を優先する。

1. 書きやすいこと
2. 書きながら壊れないこと
3. 構造がすぐ見えること
4. Text と Graph の対応が分かること
5. Notation が初見でも推測できること
6. Domain / Parser が UI framework から独立していること

---



# 26. Canonical Demo Document

README / E2E / manual test で共通利用する基準 document とする。

```text
@layout flow TB

# New product idea

Write thoughts. See structure.

[problem @scattered] Customer information is scattered
  -> [cause] Excel files are fragmented
  -> [cause] Team knowledge is siloed

[idea @unify] AI unifies notes and structure
[todo @interview] User interviews

@unify -> @scattered : solves

{Discovery}
  @scattered
  @interview
```

Expected Graph:

```text
Nodes: 5
Nested Relations: 2
Cross Relations: 1
Groups: 1
Layout: flow TB
Diagnostics: 0
```

---



# 27. One-line Architecture Summary

```text
Granvas = User-owned-file Text Editor
        + Granvas Notation Parser
        + Semantic Thought Graph
        + Automatic Layout
        + Read-only Graph Projection
        + Project Import / Multi-format Download
        + Vercel Static Hosting
```

Architecture:

```text
Presentation → Application → Domain
      │              ↑
      └─ Infrastructure implements Ports
```

Modularity:

```text
Workspace → Document / Notation / Graph / Transfer
```

そして最も重要な不変条件は以下である。

> **Text is the source of truth.**
