# Granvas ユビキタス言語

> Status: Draft / Approval Candidate  
> Updated: 2026-08-11

## 1. 言語規則

- Product UIは日本語を標準とし、ユーザー操作を`プロジェクトを読み込む`と`ダウンロード`で表現する。
- Codeでは、domain conceptに英語名を使用する。
- `Node`、`Relation`、`Group`、`Layout`はNotationとGraphで意味が異なる場合があるため、必要に応じ`Parsed`、`Graph`、`Positioned`を付ける。
- `Save` / `保存済み`は自動保存と誤解されるため、v0.1のUIでは`.granvasのダウンロード`、`ダウンロード済み / 未ダウンロード`を使う。
- Graph上の操作は`編集`と呼び、`移動`や`配置`とは呼ばない。座標を保存しないため、位置の操作という語は誤解を生む。
- `Certainty`は`確信度`と訳す。`ステータス`や`状態`は`DirtyState`と衝突するため使わない。

## 2. Product Terms

| 日本語 / UI | English | Code name | Definition |
| --- | --- | --- | --- |
| Granvas | Granvas | `Granvas` | Textから思考Graphを投影するWeb editor |
| Project | Project | `GranvasDocument` | 現在編集中の単一sourceとlifecycle |
| 正本 | Source of Truth | `DocumentSource` | 意味構造を再生成できる唯一のText |
| 投影 | Projection | `WorkspaceProjectionDto` | Textから導出されたGraph / SourceMap / Diagnosticsの同一revision集合 |
| プロジェクトを読み込む | Import Project | `ImportProject` | `.granvas`をactive Projectとして読み込む操作 |
| ダウンロード | Download | `DownloadCurrentProject` | 選択formatのfileをuser deviceへ生成する操作 |
| 再編集可能なProject | Editable Project | `ProjectFile` | sourceを保持する`.granvas` file |
| 派生成果物 | Derived Artifact | `RenderedFileDto` | SVG / PNG / PDFのread-only graph output |
| 未ダウンロード | Unsaved / Dirty | `DirtyState.Dirty` | clean baseline以降にsourceが変更され、`.granvas`として未ダウンロードの状態 |
| ダウンロード済み | Clean | `DirtyState.Clean` | imported sourceまたは最後の`.granvas` download revisionと一致する状態。browserへの自動保存を意味しない |
| 公式利用ガイド | Official Documentation | `docs-site` | 日本語UIの使い方と現在の制約を説明するGitHub Pages site |
| 公開プレビュー | Public Preview | — | 正式release前の公式Docs公開状態。対応実装と未完了機能を併記する |

## 2.1 UI Translation Terms

| UI日本語 | Internal / English | 用途 |
| --- | --- | --- |
| テキスト | Text | 正本を編集する左pane |
| グラフ | Graph | Textから導出される右pane |
| 構造を変更 | Move by meaning / Semantic Drag | 親子関係・Group所属を変更し、座標を保存しない操作 |
| 確信度 | Certainty | Typeと独立した確からしさ |
| 指定なし | Neutral | certainty markerなし |
| 未確定 | Tentative | `?` marker |
| 確定 | Confirmed | `!` marker |
| 棄却 | Rejected | `~` marker。Graphから消さない |
| 診断 | Diagnostic | 入力を妨げずに問題と回復結果を示す情報 |

## 3. Notation Terms

| Term | Code name | Definition |
| --- | --- | --- |
| Granvas Notation | `GranvasNotation` | 構造として解釈されるline-orientedな軽量記法 |
| Notation candidate | `NotationCandidate` | 予約prefixにより構文解析をcommitしたline |
| Plain Text | `PlainTextLine` | valid document contentだがGraphへ投影しないline |
| Node Declaration | `NodeDeclaration` | `[type] Label`形式のNode宣言 |
| Explicit ID | `explicitId` | `@id`形式のuser-facing reference ID |
| Occurrence Key | `key` | Parserが構造要素へ付与する内部一意ID |
| Nested Relation | `NestedRelation` | indentationと`->`で親子を表すRelation |
| Cross Relation | `CrossRelation` | Explicit ID同士を接続するRelation |
| Group Header | `GroupDeclaration` | `{Group Name}`形式のvisual grouping宣言 |
| Group Member | `GroupMember` | Group scope内のNodeまたはNode reference |
| Layout Directive | `LayoutDirective` | `@layout flow TB/LR`形式の配置指示 |
| Relation Operator | `RelationOperator` | `->` / `?->` / `!->` / `~->`。有向Edgeを生成し確信度を伴う |
| Certainty | `NotationCertainty` / `GraphCertainty` | `neutral` / `tentative` / `confirmed` / `rejected`の4状態。Typeと直交する軸 |
| Certainty Marker | `CertaintyMarker` | `[` 直後の`?` / `!` / `~`。確信度を指定する記号 |
| Source Range | `SourceRange` / `SourceRangeDto` | Text上のUTF-16半開区間と開始line / column |
| Token Spans | `NodeSourceSpans`ほか | 宣言行内のtoken単位range。最小差分編集に使う |
| Insertion Point | `idInsertionPoint`ほか | 存在しないtokenを挿入すべきoffset |
| Source Edit | `SourceEdit` / `SourceEditDto` | current sourceへの`{from, to, insert}`単位の変更 |
| Source Edit Plan | `SourceEditPlan` / `SourceEditPlanDto` | Graph操作から導いた編集列、またはその拒否理由 |
| Notation Editor | `NotationEditor` | 編集規則を持つNotation domainのpure function群 |
| Edit Rejection | `NotationEditRejection` | 実行できない操作の理由。例外ではなく戻り値で返す |
| Round-trip | — | planを適用したsourceを再parseすると意図した構造になる契約 |
| Diagnostic | `Diagnostic` / `DiagnosticDto` | 入力を妨げずに問題と回復結果を示す情報 |
| Partial Result | `ParseResultDto` | current source内のvalidな構造とdiagnosticsの組 |
| Group Scope | `GroupScope` | Group Headerから次のnon-empty indent 0 line直前まで |

## 4. Graph Terms

| Term | Code name | Definition |
| --- | --- | --- |
| Semantic Graph | `ThoughtGraph` | 座標を持たないNode / Edge / Groupの意味モデル |
| Graph Node | `GraphNode` | Node Declarationから生成された意味Node |
| Graph Edge | `GraphEdge` | Nested / Cross Relationから生成された有向Edge |
| Graph Group | `GraphGroup` | member Node IDを持つ意味上のGroup |
| Positioned Graph | `PositionedGraphDto` | layout後のNode / Group boundsを含むDTO |
| Group Overlay | `PositionedGroupDto` | member boundsを囲む重なり可能なbackground表示 |
| Flow Layout | `FlowLayout` | TBまたはLRの自動配置 |
| Semantic Drag | `semantic drag` | 座標ではなく親子関係・Group所属を変える意味の操作 |
| Drop Target | `DropTarget` | ドロップ先の種別（別Node / Group overlay / 空白）。意味の分岐そのもの |
| Export Scene | `GraphExportSceneDto` | visual file生成に必要なframework-neutral scene |
| Full Graph Bounds | `GraphBounds` | viewportに依存しない全Node / Edge / Groupの外接範囲 |

## 5. Workspace / Concurrency Terms

| Term | Code name | Definition |
| --- | --- | --- |
| Document Revision | `documentRevision` | source更新ごとに単調増加するversion |
| Current Revision | `currentRevision` | UIが正本として扱う最新revision |
| Latest Wins | `latest-wins` | current以外のasync結果をcommitしない規則 |
| Cancellation Signal | `CancellationSignal` | browser型に依存しない処理cancel contract |
| Projection Source Map | `ProjectionSourceMapDto` | Graph IDからNotation SourceRange / occurrence keyへの対応 |
| Apply Graph Edit | `ApplyGraphEdit` | key解決 → 編集計画取得 → source適用 → 再投影 → selection再解決のorchestration |
| Caret Anchor | `caretAnchor` | 編集前offsetで表す、編集後に選択したい位置 |
| Pending Flush | `flushEditorSource` | Graph編集前にdebounce待機中のsource更新を確定させる操作 |
| Source Selection | `SourceSelection` | Editor上のselection / cursor位置 |
| Graph Selection | `GraphSelection` | 選択中Graph Node ID |
| Clean Baseline | `cleanBaselineRevision` | `.granvas` Import / Downloadで保存基準となったrevision |

## 6. Architecture Terms

| Term | Code name | Definition |
| --- | --- | --- |
| Bounded Context | Context / Module | 固有のdomain languageと責務を持つ境界 |
| Document Context | `document` | active source、revision、dirty lifecycleのowner |
| Notation Context | `notation` | Parser、Diagnostics、SourceRangeのowner |
| Graph Context | `graph` | Semantic Graph、Layout、Export Sceneのowner |
| Transfer Context | `transfer` | Import / Downloadとformat生成のowner |
| Workspace Context | `workspace` | 公開application APIを協調させるowner |
| Composition Root | `src/app/bootstrap` | Infrastructure具象を生成・注入する場所 |
| Presentation Composition Root | `src/app/App.tsx` | 各moduleのpublic UIを合成する場所 |
| Port | `*Port` | Applicationが定義しInfrastructureが実装する抽象 |
| Published Contract | DTO / Facade | Context間で共有できるimmutable public contract |

## 7. File Formats

| Format | MIME / Extension | Meaning |
| --- | --- | --- |
| Granvas Project | `.granvas`, UTF-8 text | 再編集可能な唯一のv0.1 Project format |
| SVG | `.svg`, `image/svg+xml` | scalableなvisual artifact |
| PNG | `.png`, `image/png` | 2x raster visual artifact |
| PDF | `.pdf`, `application/pdf` | single-page visual artifact |

## 8. Hosting / Future Terms

| Term | Definition |
| --- | --- |
| Vercel | v0.1のstatic Web hosting。server functionは使用しない |
| Supabase Auth | 将来認証を実装する場合に採用するprovider。v0.1には含めない |
| Identity Context | 将来追加する認証境界。Supabase adapterをinfrastructureに隔離する |
