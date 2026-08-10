# Phase 4 Graph Core 要求定義

> 作成日: 2026-08-10
> ステータス: 承認省略（継続実装指示）
> 開発タイトル: `phase-4-graph-core`

## 1. 目的

Notation由来のframework-neutral inputから、座標を持たないSemantic Graphを決定的に生成し、Application Port越しのDagre Web WorkerでPositioned GraphとExport Sceneを生成するGraphコンテキストを実装する。

## 2. 必須要件

- `ThoughtGraph` / Graph Node / Edge / GroupをDomainに実装する。
- input occurrence keyから決定的かつ一意なGraph IDを生成する。
- duplicate explicit ID、parallel Edge、self-loop、cycleを失わない。
- Nodeの複数Group所属とGroup member deduplicationを保持する。
- Graph DomainへNotationの`SourceRange`やUI / Dagre型を持ち込まない。
- layout inputをGraph ID順に正規化し、Node boundsを240 × 88に固定する。
- `GraphLayoutPort`とframework-neutralな`CancellationSignal`をApplicationに定義する。
- DagreをWeb Worker内で実行し、output座標をNode左上へ変換する。
- member配置後に24px paddingのGroup overlay boundsを計算する。
- full graph bounds + 24px paddingの`GraphExportSceneDto`を生成する。
- layout failure / cancellation / revision mismatchをtyped errorとして扱う。

## 3. 受け入れ条件

- same inputからsame Semantic Graph / layout input / positioned outputを生成する。
- 5 Nodes / 3 Edges / 1 Groupのcanonical inputをTB / LRでlayoutできる。
- parallel Edge、self-loop、cycle、multiple Group membershipを保持する。
- Node positionがfiniteで、width 240 / height 88、x/yがtop-leftである。
- Group boundsが全member boundsを24px paddingで囲む。
- cancellationでworkerをterminateし、stale resultを返さない。
- revisionが一致しないlayout outputをApplicationが拒否する。
- 200 Nodes / 300 Edges / 10 Groups fixtureのlayout p95が200ms以下である。
- typecheck / lint / 全test / build / 3-browser E2Eがgreenである。

## 4. スコープ外

- Notation `SourceRange`からGraph IDへのmappingはWorkspaceが所有する。
- React Flow presentation、label wrapping visual、viewportは後続Presentation工程。
- SVG / PNG / PDF serializationはTransfer工程。
- GitHub Actionsは追加しない。

## 5. 永続文書への影響

既存Graph設計の実装であり`docs/*.md`の更新は不要。完了時に初回実装tasklistのGraph項目を更新する。
