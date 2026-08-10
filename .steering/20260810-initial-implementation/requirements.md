# Initial Implementation Requirements

> Date: 2026-08-10  
> Status: Draft / Approval Candidate  
> Scope: Granvas v0.1 initial implementation

## 1. Objective

Textを正本とするGranvas Notation editorを実装し、read-only Graph projection、Text / Graph navigation、ユーザー所有fileによるProject保存・再開、visual format DownloadをVercel-hosted Webアプリとして提供する。

## 2. Source Documents

- `docs/ideas/initial-requirements.md`
- `docs/product-requirements.md`
- `docs/functional-design.md`
- `docs/architecture.md`
- `docs/GRANVAS_SPEC_v0.1.md`

矛盾がある場合は要求メモを優先し、永続文書と統合仕様書を更新してから実装する。

## 3. User Stories

### US-01: Write and See Structure

ユーザーは通常文とNotationを同じEditorへ入力し、現在Textのvalidな構造をGraphで確認できる。

### US-02: Navigate Between Text and Graph

ユーザーはGraph Nodeから対応するTextへ、Text cursorから対応するGraph Nodeへ移動できる。

### US-03: Save and Resume a Project

ユーザーは`.granvas`をDownloadし、後でImportして保存時点から編集を再開できる。

### US-04: Download a Visual Artifact

ユーザーはfull GraphをSVG / PNG / PDFから選択してDownloadできる。

### US-05: Use Without an Account

ユーザーは認証、cloud sync、telemetryなしで利用できる。

## 4. Functional Requirements

- SplitPane、CodeMirror Editor、React Flow Graph、Top Bar、Status Barを実装する。
- Notation v0.1のNode / Nested Relation / Cross Relation / Group / Layoutを解析する。
- Notation candidate、indentation state、Group scope、diagnostic recoveryを仕様どおり実装する。
- current revisionのvalid構造だけをprojectionする。
- Graph DomainからSourceRangeを分離し、Workspace SourceMapでTextと関連付ける。
- revision、cancellation、latest-winsでstale Graphを防止する。
- fixed Node boundsとDagre Worker layoutを実装する。
- Groupを重なり可能なoverlayとして描画する。
- click / keyboardによるGraph → Text navigationを実装する。
- Text cursor → Graph highlightを実装する。
- `.granvas` Import、extension / 5 MiB / UTF-8 validationを実装する。
- `.granvas` / SVG / PNG / PDF Download dialogを実装する。
- clean / dirty / exporting / error状態、置換・離脱警告を実装する。
- Vercel static deploymentとproduction CSPを設定する。

## 5. Acceptance Criteria

- Canonical Demoから5 Nodes、3 Relations、1 Group、TB Layout、0 Diagnosticsを生成する。
- incomplete candidateを加えても、他のcurrent valid Graphが残る。
- emoji / CRLFを含むNodeを正しいText rangeへ選択できる。
- 連続入力で古いlayout結果が最新projectionを上書きしない。
- `.granvas` Download → Importでsourceとmeaning Graphが復元される。
- SVG / PNG / PDFがviewportではなくfull Graphを含む。
- visual Download後もdirty stateが維持される。
- Import / Download失敗時にcurrent sourceが維持される。
- Graph Nodeをkeyboardでactivateできる。
- Chromium / Firefox / WebKitで主要E2E 6scenarioが通る。
- performance、accessibility、security、quality gateが統合仕様書のDoDを満たす。

## 6. Constraints

- v0.1にlocalStorage / IndexedDB auto-saveを実装しない。
- v0.1にaccount / authentication / backend API / cloud syncを実装しない。
- 将来の認証providerはSupabase Authとするが、v0.1にSupabase SDK・credential・UIを追加しない。
- hostingはVercel、server functionなし。
- Textだけを正本とし、Graph座標を`.granvas`へ保存しない。
- External SDK / browser固有型をDomain / Application public contractへ出さない。

## 7. Out of Scope

- Graph編集、Node drag永続化、自由作図。
- multi-document workspace。
- SVG / PNG / PDF Import。
- AI、plugin、collaboration、mobile / desktop app。
- 完全なMarkdown互換。

## 8. Open Decision Before Phase 5

- PDF generation library。ADRでbundle size、vector output、license、browser support、CSP compatibilityを比較して決定する。

## 9. Release Blockers

- OSS license未決定。
- architecture boundary違反。
- `.granvas` round-trip失敗またはdata loss risk。
- stale projection。
- TypeScript / lint / build failure。
- primary E2E、accessibility、performance、CSP gate failure。
