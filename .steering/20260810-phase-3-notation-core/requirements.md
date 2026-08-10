# Phase 3 Notation Core 要求定義

> 作成日: 2026-08-10
> ステータス: 承認省略（継続実装指示）
> 開発タイトル: `phase-3-notation-core`

## 1. 目的

`docs/GRANVAS_SPEC_v0.1.md`第4章をexecutable specificationとして実装し、現在のTextとdocument revisionから、Node・Relation・Group・Layout・Diagnosticsを決定的に導出するframework-independentなNotation published contractを提供する。

## 2. 対象

- LF / CRLFを保持するline scannerとUTF-16 `SourceRangeDto`。
- Notation candidateとPlain Textのcommit point。
- Node Declaration、Explicit ID、Nested Relation、Cross Relation。
- Group scope、Node declaration / reference membership、Group内Nested Relation。
- Flow Layout TB / LRとdefault layout。
- document-wide forward reference / duplicate ID resolution。
- `GNV001`〜`GNV013`の全diagnosticとpartial recovery。
- deterministic occurrence key。
- canonical / invalid / Group / forward reference / emoji / CRLF / BOM境界fixture。

## 3. 受け入れ条件

- Canonical Demoから5 Nodes、3 Relations、1 Group、TB、0 Diagnosticsを返す。
- 第4章のcandidate・構文・recovery必須caseをunit testで網羅する。
- incomplete / invalid要素があっても、同一revision内の他のvalid構造を維持する。
- Nested Relationのorphan / level skipでもvalidなchild Nodeを保持する。
- duplicate IDのNodeを保持し、参照は最初の宣言へ解決する。
- forward reference、self-loop、cycle、parallel Edge、複数Group所属を保持する。
- UTF-16 surrogate pairとCRLFを含むoffset / line / columnが一致する。
- 同一source / revisionから同一occurrence keyとParseResultを返す。
- ParseResultと全diagnosticが入力document revisionだけを持ち、前revisionの構造を混在させない。
- public contractにReact、CodeMirror、React Flow、Dagre、browser API型を含めない。
- typecheck、lint、全unit test、build、既存3-browser E2Eがgreenである。

## 4. 制約・スコープ外

- CodeMirror syntax highlight、gutter、underline、accessible diagnostic detailはPresentation工程で実装する。
- Graph mapping、layout、Workspace orchestrationは後続Phaseで実装する。
- Parser generatorやruntime dependencyを追加しない。
- sourceを正規化せず、改行とUTF-16 offsetを保持する。
- BOM除去はTransfer境界の責務とし、Parserは渡されたJavaScript stringをそのまま解釈する。
- GitHub Actionsは追加しない。

## 5. 永続文書への影響

既存仕様の実装であり`docs/*.md`の変更は不要。完了時に`.steering/20260810-initial-implementation/tasklist.md`のNotation Core該当項目を更新する。
