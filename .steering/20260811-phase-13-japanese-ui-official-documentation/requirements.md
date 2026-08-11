# Phase 13 Japanese UI & Official Documentation 要求

> 作成日: 2026-08-11
> ステータス: 承認済み
> Issue: [#26](https://github.com/dayaa-arch/granvas/issues/26)
> Related: `docs/development-roadmap.md`、`docs/GRANVAS_SPEC_v0.1.md` §6、`docs/glossary.md`

## 1. 目的

Granvasの製品UIを日本語へ統一したうえで、その実装内容に一致する日本語の公式利用ガイドをGitHub Pagesへ公開する。

本PhaseはPhase 12までに実装済みのText / Graph編集、確信度、Project Import / Download、SVG Downloadをユーザーが迷わず利用できる状態にする。Phase 8のPNG / PDFとPhase 9のrelease hardeningを完了したようには表示しない。

## 2. バージョン表記の整合方針

現時点の正本はGranvas v0.1を対象とし、application contractも`version: '0.1'`である。Phase 8 Visual ExportとPhase 9 Release Hardeningは未完了であり、v0.1 Definition of Doneも未達である。

ユーザー要求の「Granvas version 1.0公式ドキュメント」を尊重しつつ、未完了機能を正式リリース済みと誤認させないため、公開サイトでは次の表記を採用する。

- サイト名: `Granvas 1.0 公式ドキュメント`
- リリース状態: `公開プレビュー`
- 対応実装: `Granvas v0.1 開発版（Phase 12完了時点）`
- PNG / PDF、Vercel production、release hardeningは「未対応・今後の予定」と明示する。
- 本Phaseではapplication version、統合仕様書のtarget、Notation versionを`1.0`へ変更しない。

正式なGranvas v1.0 release宣言とversion migrationは、Phase 8 / 9を含むrelease scopeを別途確定してから行う。

## 3. ユーザーストーリー

- 日本語利用者として、ボタン、dialog、状態、通知、エラー、accessible nameを日本語で理解したい。
- 初回利用者として、最短の入力例からNode、Relation、Group、Layoutを段階的に学びたい。
- ユーザーとして、Graph側の作成・接続・意味ドラッグ・削除・確信度変更を日本語の手順で確認したい。
- ユーザーとして、`.granvas`の保存とImport、SVG共有、未実装のPNG / PDFの違いを正しく理解したい。
- keyboard利用者として、主要なshortcutと代替操作を日本語で確認したい。
- OSS利用者として、公式利用ガイドからrepositoryとローカル起動手順へ移動したい。

## 4. UI日本語化要求

### 4.1 対象

- HTMLの`lang`、page title、editor placeholder。
- Top Bar、Text / Graph pane、projection state、loading / empty state。
- Project Import、Download dialog、file name、format説明、diagnostics通知。
- Status Barの保存状態、projection状態、行・列、Node / Edge / diagnostics件数。
- Graph authoring toolbar、Create / Connect / Move / Delete dialog。
- certainty 4状態、drag / connect / delete結果、success / rejection通知。
- `aria-label`、screen-reader text、tooltip、dialog accessible name、`aria-live`文言。
- Parser diagnostics、Transfer error、Workspace / Notation rejectionなど、画面へ露出するエラー。
- 初期サンプルの散文、Node label、relation label、Group名。Notation token、Type、Explicit IDは互換性のためASCIIを維持する。

### 4.2 用語

- `Text`はUI上で`テキスト`、`Graph`は`グラフ`とする。
- `Import Project`は`プロジェクトを読み込む`、`Download`は`ダウンロード`とする。
- `Saved / Unsaved`は`ダウンロード済み / 未ダウンロード`とし、自動保存を連想させる`保存済み / 未保存`は使わない。
- Graph操作は`移動`ではなく、意味を変えることが分かる`構造を変更`を使う。
- `Certainty`は`確信度`、4状態は`指定なし / 未確定 / 確定 / 棄却`とする。
- Notationのcode token、Type値、format名、製品名は翻訳しない。

### 4.3 振る舞いの維持

- 日本語化でDomain / Application contract、Notation grammar、file format、source offsetを変更しない。
- 既存のIME、focus trap、focus return、keyboard操作、selection、Undoを維持する。
- エラーcodeは安定したmachine-readable contractとして維持し、表示文言だけを日本語化する。

## 5. 公式利用ガイド要求

### 5.1 公開場所

- Repository: `dayaa-arch/granvas`
- URL: `https://dayaa-arch.github.io/granvas/`
- GitHub Pages publishing source: `gh-pages` branchのroot。
- product applicationのVercel hostingとは分離する。
- custom domainは本Phaseの対象外。

### 5.2 コンテンツ

最低限、次を日本語で提供する。

1. Granvasとは何か、Textが正本であること。
2. 対応環境と利用開始方法。
3. 画面構成と初回操作。
4. Node、Nested Relation、Cross Relation、Group、Layoutの書き方。
5. 確信度マーカーと棄却要素が残る意味。
6. Text ↔ Graph navigation。
7. GraphからのNode作成、編集、接続、意味ドラッグ、削除、Undo。
8. `.granvas` Download / Importとdirty表示。
9. SVG Download、PNG / PDFの未対応状態。
10. keyboard操作とaccessibility。
11. diagnostics、よくある問題、FAQ。
12. privacy / security、repository、ライセンス未確定を含む現在の制約。

### 5.3 品質

- 日本語UIの実画面をproduction buildから撮影し、主要セクションへ掲載する。
- Desktopとmobile幅でnavigationと本文が破綻しない。
- keyboardでnavigationでき、focus indicatorとskip linkを持つ。
- semantic HTML、適切なheading階層、画像alt、十分なcontrastを備える。
- 外部tracking、analytics、remote font、cookie、form送信を追加しない。
- 実装済み機能だけを利用可能として記載し、計画中の機能を明確に分ける。

## 6. GitHub Pages / GitHub Actions方針

- main branchには`docs-site/`としてPagesのsourceを保持する。
- `bun run docs:build`でproject Pagesのbase path `/granvas/`を持つ静的artifactを生成する。
- review済みmainから生成したartifactだけを`gh-pages` branchへ公開する。
- `gh-pages` rootへ`.nojekyll`を含め、静的fileをそのまま配信する。
- GitHub Pages REST APIでlegacy branch sourceを設定し、HTTPSの公開URLを確認する。
- `.github/workflows/`へcustom GitHub Actions workflowを追加しない。
- GitHub Pages自身が内部で表示するPages deployment runはGitHubのplatform動作であり、本repositoryへActions定義を追加することとは区別する。

## 7. 受け入れ条件

- [x] 正本文書へ日本語UI、公式Docs hosting、Phase 13を実装前に反映している。
- [x] 主要なvisible text、accessible name、通知、errorが日本語になっている。
- [x] `html[lang="ja"]`と日本語page titleが設定されている。
- [x] 初期サンプルが日本語で、Notation grammarとASCII identifierは維持されている。
- [x] UI日本語化後もtypecheck、lint、unit / component、build、3-browser E2Eが成功する。
- [x] 公式利用ガイドが実装済み操作を網羅し、未実装機能を利用可能と誤記していない。
- [x] docs buildが再現可能で、project Pagesのsubpathからassetが読み込める。
- [x] docsをdesktop / mobile / keyboardで確認し、主要link、heading、alt、focusが成立する。
- [x] `gh-pages` branchから`https://dayaa-arch.github.io/granvas/`へ公開され、HTTPSで取得できる。
- [x] repository homepageが公式利用ガイドを指す。
- [x] custom GitHub Actions workflow、backend、tracking、credentialを追加していない。

## 8. 対象外

- Granvas application自体のGitHub Pages hosting。product hostingは引き続きVercel方針とする。
- Phase 8のPNG / PDF exporter実装。
- Phase 9のVercel production release、OSS license、CONTRIBUTING、SECURITY、全release hardening。
- 正式なGranvas v1.0 release宣言、`GRANVAS_SPEC_v1.0.md`の新設、application versionの変更。
- 英語 / 日本語のruntime切り替え、多言語化framework、locale selector。
- custom domain、search backend、analytics、cookie banner、CMS。
- custom GitHub Actions workflow。
