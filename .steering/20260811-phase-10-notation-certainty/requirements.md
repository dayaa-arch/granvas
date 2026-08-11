# Phase 10 Notation Certainty 要求定義

> 作成日: 2026-08-11
> ステータス: 承認済み（ロードマップ順での継続実装指示）

## 1. 目的

未確定・検証済み・棄却をNode Typeと直交する確信度としてGranvas Notation v0.2へ導入し、Textから意味Graphと画面表示まで決定的に投影する。

## 2. 必須要件

- Nodeマーカー`[?type]` / `[!type]` / `[~type]`をそれぞれ`tentative` / `confirmed` / `rejected`として解析する。
- マーカーなしのNodeを`neutral`として解析し、マーカーとType間の空白を許容する。
- Relation operator `?->` / `!->` / `~->`をNested / Cross Relationの両方で解析する。
- `[??type]` / `[?~type]` / `[?]`を`GNV014_INVALID_CERTAINTY_MARKER`として回復し、該当Nodeだけを省略する。
- `ParsedNode` / `ParsedRelation`から`GraphNode` / `GraphEdge`、layout DTO、Positioned Graphへ確信度を欠落なく伝播する。
- `rejected`なNode / EdgeをGraphから除外しない。
- Node / Edgeの4状態を線種・太さ・バッジ・打ち消しなど、色以外の手段でも判別可能にする。
- Node / Edgeのaccessible nameへ確信度を含める。
- CodeMirrorでNodeマーカーとRelationマーカーをType / arrowとは別にhighlightする。

## 3. 受け入れ条件

- 仕様書§26.1のCertainty Demoが6 Nodes / 5 Edges / 1 Group / diagnostics 0として投影される。
- DemoのNode確信度がneutral 2 / tentative 1 / confirmed 1 / rejected 2になる。
- DemoのEdge確信度がneutral 1 / tentative 2 / confirmed 1 / rejected 1になる。
- Node / Relationの全4状態がParser、Graph、Positioned Graphで一致する。
- `  ?->`の入力途中をPlain Textへ戻さずNested Relation candidateとして扱う。
- Phase 3の既存source fixtureを無改変で解析でき、既存要素の確信度がすべて`neutral`になる。
- rejected要素が画面に残り、非color表現とaccessible nameで棄却と判別できる。
- typecheck / lint / unit / component / build / 3-browser E2Eがgreenになる。

## 4. 制約

- Textを正本とし、Graph自体へ状態を追加しない。
- 確信度はlayoutと座標へ影響させない。
- Graph Domainへ`SourceRange`やNotation固有型を持ち込まない。
- Context間は各`index.ts`のpublished contractだけで接続する。
- GraphからTextを編集する機能、token spans、`NotationEditor`はPhase 11以降とする。
- PNG / PDFおよびvisual exportの確信度対応完了判定はPhase 8とする。
- GitHub ActionsはPhase 9まで追加しない。

## 5. 永続文書への影響

- 追加済みの`docs/GRANVAS_SPEC_v0.1.md`とADR-0003を実装の正本として保持する。
- `docs/development-roadmap.md`のPhase 10進捗・Issue / PR参照を同期する。
- `docs/ideas/initial-requirements.md`を追加済みscopeと整合させる。
- `.steering/20260810-initial-implementation/tasklist.md`へPhase 10〜12の実行順とPhase 10実績を反映する。
