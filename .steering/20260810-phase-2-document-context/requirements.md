# Phase 2 Document コンテキスト 要求定義

> 作成日: 2026-08-10
> ステータス: 承認済み
> 開発タイトル: `phase-2-document-context`

## 1. 目的

Granvas v0.1 の single active document を、browser・storage・UI framework に依存しない Document コンテキストとして実装する。Text を正本として保持し、source 更新ごとの単調増加 revision、clean baseline、dirty lifecycle を後続の Notation / Workspace / Transfer コンテキストから利用できる published application contract として提供する。

本作業は `.steering/20260810-initial-implementation/tasklist.md` の「2. Documentコンテキスト」を対象とする。GitHub Actions はユーザー指示により後続フェーズへ延期する。

## 2. 背景

Phase 1 で module boundary、TypeScript、Vitest、ESLint、Playwright、Vercel static SPA の基盤が整った。一方、`src/modules/document/index.ts` は空であり、次工程が依存する source / revision / dirty lifecycle の実装が存在しない。

永続文書では Document が active source と dirty lifecycle を所有し、File API、CodeMirror、Parser、localStorage / IndexedDB を知らないことが定義されている。

## 3. ユーザーストーリー

### US-01: 新しいProjectを開始する

利用者として、新しいProjectを初期sourceとcleanな状態で開始し、後続処理がrevisionを一意に参照できるようにしたい。

### US-02: 編集状態を追跡する

利用者として、Textを変更するとrevisionが進み、最後に保存した`.granvas`のbaselineとの差から未ダウンロード変更が正しく判定されてほしい。

### US-03: Projectを置換する

利用者として、validation済みのImport結果でactive Projectを置換した場合、新しいsourceがclean baselineとなり、以前のsourceやerror状態が残らないようにしたい。

### US-04: 非同期Download中の編集を失わない

利用者として、`.granvas` Download中にさらに編集しても、古いrevisionのDownload成功によって最新revisionが誤ってclean扱いされないようにしたい。

### US-05: Download失敗後も編集内容を維持する

利用者として、Downloadが失敗してもcurrent source、revision、clean baselineが変わらず、errorを確認・解除して編集を続けたい。

## 4. 機能要件

### FR-01: Document Domain

- immutableな`GranvasDocument`を実装する。
- `DocumentRevision`は0以上のsafe integerとし、source更新・Project置換ごとに単調増加させる。
- source、name、current revision、clean baseline revision、lifecycle stateを保持する。
- dirty判定はcurrent revisionとclean baseline revisionの比較から導出し、二重管理しない。

### FR-02: Lifecycle State

- `clean`、`dirty`、`exporting`、`error`を表現する。
- New Projectは`clean`で開始する。
- source更新後は`dirty`になる。
- validation済みProject置換後は置換revisionをbaselineとする`clean`になる。
- `.granvas` Download開始時は対象revisionを記録した`exporting`になる。
- Download成功時は対象revisionだけをbaselineとして記録する。成功後にcurrent revisionが対象revisionより進んでいれば`dirty`を維持する。
- Download失敗時はsource、revision、baselineを維持した`error`になる。
- error解除後はbaselineとの差に応じて`clean`または`dirty`へ戻る。
- source更新は`error`を解消する。activeな`exporting`は対象revisionの完了通知を受け取れるよう維持し、最新sourceとの差をdirtyとして併記する。
- Project置換は以前のProjectに属する`exporting` / `error`を破棄し、新しいclean stateへ移る。

### FR-03: Application Use Cases

- `CreateDocument`を実装する。
- `UpdateDocumentSource`を実装する。
- `ReplaceDocumentSource`を実装する。
- `BeginProjectDownload`を実装し、対象revisionを表すframework-neutralなticketを返す。
- `MarkProjectDownloaded`を実装する。
- Download失敗とerror解除に必要なapplication operationを実装する。
- Context外へは`src/modules/document/index.ts`からimmutable DTOとpublished application APIだけを公開する。

### FR-04: Domain Boundary

- DocumentはFile API、Blob、DOM、localStorage、IndexedDB、CodeMirror、React、Parser、他Contextをimportしない。
- v0.1ではrepository portやinfrastructure adapterを作らない。
- browser / SDK固有型をpublic contractへ含めない。

### FR-05: Test

- Domain invariantと全lifecycle transitionをunit testする。
- 同期的な編集・置換と、古いdownload revision成功の競合をapplication testする。
- 不正なrevision、空でないerror message等の入力境界をtestする。
- published contractを経由して主要use caseを実行できることをtestする。

## 5. 受け入れ条件

- 新規Documentは指定したname / sourceをrevision 0、clean baseline 0、`clean`で公開する。
- source更新ごとにrevisionが1増え、sourceがTextの正本として置換される。
- Project置換はrevisionを1増やし、置換後revisionをclean baselineとして`clean`になる。
- `.granvas` Download開始・成功により、対象revisionがcurrentなら`clean`になる。
- Download開始後にsourceを更新し、古い対象revisionの成功を通知してもcurrent Documentは`dirty`のままである。
- Download失敗時にsource、revision、baselineは変わらず、`error`を解除するとbaselineとの差に応じた状態へ戻る。
- Domain / Applicationにbrowser・storage・React・CodeMirror・他Context依存がない。
- `bun run typecheck`、`bun run lint`、`bun run test:run`、`bun run build`が成功する。
- Document単体の実装であるため、既存bootstrap E2Eのregressionがないことを必要に応じ確認する。

## 6. 制約・スコープ外

- File picker、Blob Download、Import validation、visual exportはTransferコンテキストで実装する。
- dirty confirmation、`beforeunload`、StatusBarはWorkspace / Presentation工程で実装する。
- Parser、SourceRange、Graph、layout、selectionは実装しない。
- localStorage / IndexedDB、backend API、telemetry、Supabase SDK・credentialを追加しない。
- 新しいruntime dependencyを追加しない。
- GitHub Actionsは今回追加しない。

## 7. 永続文書への影響

Documentの責務、use case、境界、状態遷移は既存の`docs/product-requirements.md`、`docs/functional-design.md`、`docs/architecture.md`、`docs/repository-structure.md`、`docs/GRANVAS_SPEC_v0.1.md`で定義済みであり、仕様変更は不要とする。

作業完了時は `.steering/20260810-initial-implementation/tasklist.md` の「2. Documentコンテキスト」を実績に合わせて更新する。
