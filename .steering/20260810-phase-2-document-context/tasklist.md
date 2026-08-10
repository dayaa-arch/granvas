# Phase 2 Document コンテキスト タスクリスト

> 作成日: 2026-08-10
> ステータス: 完了
> 開発タイトル: `phase-2-document-context`

## 0. 承認とGit準備

- [x] requirements / design / tasklistの一括承認を得る。
- [x] GitHub Issue `Phase 2: Documentコンテキストを実装`を、存在すれば`enhancement`ラベルで起票する（#5）。
- [x] `main`をfast-forwardで最新化する。
- [x] `codex/phase-2-document-context`branchを作成する。

## 1. Domain Model

- [x] `GranvasDocument`、`DocumentRevision`、lifecycle stateを定義する。
- [x] revision / clean baseline / exporting revisionのinvariantを実装する。
- [x] clean / dirtyをbaselineとの差から導出する。
- [x] source更新のimmutable transitionを実装する。
- [x] Project置換のimmutable transitionを実装する。
- [x] Download開始・成功・失敗・error解除のtransitionを実装する。
- [x] stale / invalid completionを拒否するtyped errorを実装する。

## 2. Application Contract / Use Cases

- [x] framework-neutralなDocument DTOとstatus DTOを定義する。
- [x] `CreateDocument`を実装する。
- [x] `UpdateDocumentSource`を実装する。
- [x] `ReplaceDocumentSource`を実装する。
- [x] `BeginProjectDownload`とrevision ticketを実装する。
- [x] `MarkProjectDownloaded`を実装する。
- [x] Download失敗とerror解除operationを実装する。
- [x] `src/modules/document/index.ts`からpublished application contractだけをexportする。

## 3. Unit / Application Test

- [x] Createの初期状態をtestする。
- [x] Updateのrevision増加・dirty化・immutabilityをtestする。
- [x] Replaceのrevision増加・clean化をtestする。
- [x] Download開始中のstatusをtestする。
- [x] current revisionのDownload成功でcleanになることをtestする。
- [x] Download中の追加入力後、古いrevision成功でdirtyを維持することをtestする。
- [x] Download失敗でsource / revision / baselineを維持することをtestする。
- [x] error解除時のclean / dirty復帰をtestする。
- [x] invalid / stale transitionをtestする。
- [x] published contract経由のapplication scenarioをtestする。

## 4. Architecture / Scope Check

- [x] Document Domain / ApplicationにReact、CodeMirror、browser API、storage API、他Context importがないことを確認する。
- [x] infrastructure、repository port、空directory、不要なbase abstractionを追加していないことを確認する。
- [x] public APIがdomain entityやframework固有型を漏らしていないことを確認する。
- [x] GitHub Actions、Supabase、backend、telemetryを追加していないことを確認する。

## 5. 自動品質チェック

- [x] `bun run typecheck`を成功させる。
- [x] `bun run lint`を成功させる。
- [x] `bun run test:run`を成功させる。
- [x] `bun run build`を成功させる。
- [x] `bun run e2e`で既存3 browser smoke scenarioのregressionがないことを確認する。

## 6. 動作検証

- [x] Document published APIだけを使い、Create → Update → Begin Download → 追加Update → Mark Downloadedのscenarioを実行する。
- [x] 最終sourceが維持され、最終statusがdirtyであることを観測する。
- [x] failure scenarioでsource / revisionを維持し、error解除後に編集を継続できることを観測する。

## 7. 文書・進捗更新

- [x] `.steering/20260810-initial-implementation/tasklist.md`の「2. Documentコンテキスト」を実績に合わせて完了へ更新する。
- [x] 本tasklistを完了状態へ更新する。
- [x] 既存永続文書からの仕様変更がないことを再確認する。

## 8. GitHub完了工程

- [x] 意図したファイルだけが変更対象で、機密情報がないことを確認する。
- [x] Conventional Commits形式でIssueをcloseするcommitを作成する。
- [x] branchをoriginへpushする。
- [x] PR `feat: Documentコンテキストを実装`を作成する。
- [x] GitHub Actionsは追加せず、local quality checkがすべてgreenであることをPRへ記載する。
- [x] greenの場合に限りrepository設定に合う方式でmainへmergeし、remote branchを削除する。
- [x] local `main`をfast-forwardで更新する。
- [x] Issueがcloseされ、working treeが期待どおりであることを確認する。

## 完了条件

- [x] source / revision / clean baseline / lifecycleがDocumentコンテキスト内で実装済みである。
- [x] Create / Update / Replace / Download lifecycleのpublished application APIが利用できる。
- [x] 全状態遷移、競合、failure pathのunit / application testがgreenである。
- [x] typecheck、lint、test、build、既存E2Eがgreenである。
- [x] architecture boundaryとスコープ外要件に違反していない。
- [x] PR経由でmainへmerge済みである。
