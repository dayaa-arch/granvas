# Phase 13 Japanese UI & Official Documentation 設計

> 作成日: 2026-08-11
> ステータス: 承認済み
> Issue: [#26](https://github.com/dayaa-arch/granvas/issues/26)
> Related: `requirements.md`、`docs/development-roadmap.md`、`docs/GRANVAS_SPEC_v0.1.md`

## 1. 実装方針

日本語UIを完成させ、そのproduction buildを公式利用ガイドの唯一の画面根拠として利用する。公式ガイドのsourceはmainへ置き、PRでreviewした後に静的artifactを専用`gh-pages` branchへ公開する。

```text
正本文書 / 用語更新
  → UI visible text / accessible text / error presentationの日本語化
  → component / E2E更新
  → production buildから実画面capture
  → 公式利用ガイド作成・local visual QA
  → main PR merge
  → docs build → gh-pages publish → live verification
```

## 2. Phase / Version設計

ロードマップへ採番順の`Phase 13 Japanese UI & Official Documentation`を追加し、実行順はPhase 12の次、Phase 8の前とする。

v1.0表記は公式Docsの公開候補versionとして扱い、現行product versionとは分離する。Pagesの全pageに一貫したrelease bannerを置く。

```text
Granvas 1.0 公式ドキュメント
公開プレビュー
対応実装: Granvas v0.1 開発版（Phase 12完了時点）
```

これにより、ユーザー要求のv1.0公式ドキュメントを準備・公開しながら、Phase 8 / 9未完了を隠さない。`createApplication().version`、package version、統合仕様のtargetは本Phaseで変更しない。

この配布判断はADR-0004として記録する。

## 3. 永続文書の先行更新

実装前に以下を更新する。

- `docs/ideas/initial-requirements.md`: 日本語UIと公式利用ガイド公開を追加。
- `docs/product-requirements.md`: UI language、Docs user story、公開時の正確性を追加。
- `docs/functional-design.md`: Japanese presentation copyとDocs distribution flowを追加。
- `docs/architecture.md`: Vercel product / GitHub Pages docsのhosting分離を追加。
- `docs/repository-structure.md`: `docs-site/`、docs build artifact、publish branchを追加。
- `docs/development-guidelines.md`: user-facing Japanese copyとerror-code / localized-message分離を追加。
- `docs/glossary.md`: 日本語UI用語を正本化。
- `docs/development-roadmap.md`: Phase 13と実行順を追加。
- `docs/GRANVAS_SPEC_v0.1.md`: UI language、official docs、Phase 13 statusを追加。
- `docs/adr/0004-official-documentation-on-github-pages.md`: hosting、branch、version banner、Actions非追加を決定。
- `README.md`: 公式利用ガイドへの導線と現在の表記を同期。

## 4. UI日本語化設計

### 4.1 Ownership

- App固有copyは`src/app`で管理する。
- 各Contextのpresentation copyは各`presentation`内で管理する。
- Parser / NotationEditor / Transfer / Workspaceが返すmachine-readable codeは変更しない。
- 画面へ表示するdiagnostic / rejection / transfer errorはcodeをpresentation用formatterへ渡して日本語化する。
- unknown errorだけは安全な日本語fallbackを表示し、開発用の原文をユーザーへ無制限に露出しない。

単一日本語UIであるため、runtime locale switchや汎用i18n libraryは導入しない。翻訳辞書の抽象化より、型付きの小さなformatterとpresentation-local constantを優先する。

### 4.2 Error presentation

```text
Domain / Application
  code + diagnostic data + fallback message
          ↓
Presentation formatter
  code → Japanese message
          ↓
tooltip / aria-label / notice / dialog
```

- Diagnosticは`GNV001`〜`GNV014`を全て日本語化する。
- Notation rejectionは`unknown-target` / `cyclic-parent` / `unresolved-reference` / `unsupported-structure` / `invalid-value`を日本語化する。
- Transfer errorは公開済みerror codeを日本語化する。
- file名、Node label、Group名などユーザー入力はescape済みReact textとして埋め込み、HTML化しない。

### 4.3 Accessibility

accessible nameもvisible copyと同じ日本語用語を使う。Node / Edgeのaccessible nameは次の形式へ統一する。

```text
<確信度>、<Type>：<Label>
<確信度>の関係：<source>から<target>［：label］
```

React Flow標準Controlsが持つ英語labelも、提供APIまたはpresentation wrapperで日本語化できる範囲をtestする。標準内部文言を安全に変更できない場合は、日本語のtoolbar controlを正式な操作経路として優先し、残存文言を監査結果へ明示する。

### 4.4 初期Project

初期sourceは日本語のcanonical相当へ変更する。

- prose / label / relation label / Group name: 日本語。
- Type、`@id`、operator、directive: grammar互換のASCII。
- 5 Nodes / 3 Relations / 1 Group / 0 diagnosticsの構造は維持する。

## 5. 公式利用ガイド設計

### 5.1 Source layout

```text
docs-site/
├── index.html
├── src/
│   ├── styles.css
│   └── docs.js
└── public/
    ├── .nojekyll
    ├── 404.html
    ├── favicon.svg
    └── images/
        ├── workspace-overview.png
        ├── graph-authoring.png
        └── download-dialog.png
```

生成物`dist-pages/`はcommitせず`.gitignore`へ追加する。sourceと画像はmainへcommitする。

### 5.2 Build

既存Viteを利用し、新しいdependencyは追加しない。

```text
bun run docs:dev
bun run docs:build
bun run docs:preview
```

`docs:build`はbase pathを`/granvas/`として`dist-pages/`へ出力する。asset path、404 entry、`.nojekyll`をbuild後に検証するtestまたはscriptを用意する。

### 5.3 Information architecture

単一page内のanchor navigationを基本にし、利用者が検索やroutingに依存せず全手順へ到達できるようにする。

```text
Overview
├── はじめる
├── 画面の見方
├── 記法を書く
│   ├── Node / Relation
│   ├── Group / Layout
│   └── 確信度
├── Graphから編集する
├── Projectを保持する
├── keyboard / accessibility
├── troubleshooting / FAQ
└── 現在の制約 / repository
```

固定header、mobile menu、skip link、section目次、code copy buttonを提供する。JavaScriptが無効でも本文とanchor navigationは利用可能にする。

### 5.4 Screenshots

日本語化後のproduction buildをPlaywrightで1280px以上のviewportに表示して取得する。機密情報やlocal pathを含めず、画像は可逆性のあるsource captureからWeb向けに最適化する。

画像だけに操作説明を依存せず、altと本文で同じ意味を提供する。

## 6. GitHub Pages公開設計

GitHub公式仕様に従い、source branchは任意のbranch、source pathはrootまたは`/docs`を利用できる。本Phaseでは内部設計文書`docs/`との混在を避けるため`gh-pages` rootを採用する。

公開手順:

1. mainのreview済みcommitで`bun run docs:build`を実行する。
2. temporary worktreeで`gh-pages` branchを作成または更新する。
3. `dist-pages/`だけをbranch rootへ配置し、`.nojekyll`を確認する。
4. publish commitを`gh-pages`へpushする。
5. GitHub Pages APIへ`build_type: legacy`、`source.branch: gh-pages`、`source.path: /`を設定する。
6. `https_enforced`とlive URLを確認する。
7. live HTML、CSS、画像、主要anchor、404をHTTPとbrowserで検証する。
8. repository homepage URLをlive Docsへ更新する。

custom workflow fileは作成しない。GitHub Pages platformによるdeployment runは許容する。

## 7. Test Strategy

### UI

- App / Editor / SplitPane / StatusBar / DownloadDialog / Graph componentのvisible copyとaccessible name。
- Diagnostic / rejection / transfer codeの日本語formatter全分岐。
- 日本語初期sourceの構造とdiagnostics 0。
- Import、Download、Graph authoring、focus、Undo、IMEの既存振る舞い。
- Chromium / Firefox / WebKit E2Eのlocatorを日本語UIへ更新。

### Docs

- docs production build。
- `/granvas/` base下のCSS / JS / image URL。
- heading階層、landmark、skip link、alt、external link属性。
- code copy、mobile navigation、keyboard focus。
- 1280px / 390px screenshotによるvisual QA。
- 文書上のcapability一覧をapplication / roadmapと照合。

### Full quality gate

```bash
bun run typecheck
bun run lint
bun run test:run
bun run test:graph-performance
bun run build
bun run docs:build
bunx playwright test
```

加えてapp production buildとdocs buildをheaded browserで確認し、公開後にlive URLを再確認する。

## 8. Security / Privacy

- Pagesへanalytics、tracking pixel、remote font、third-party scriptを追加しない。
- source由来の文字列をDocsへ動的挿入しない。
- user-generated projectや個人情報をscreenshotへ含めない。
- external link以外のruntime network requestを行わない。
- custom domain / DNS / secret / credentialをrepositoryへ追加しない。
- Pages公開物に`.steering/`や内部engineering docsを混入させない。

## 9. Rollback

- UI変更はmain PR単位でrevert可能。
- Pages sourceはmainの`docs-site/`に残す。
- Pages公開に問題がある場合は直前の`gh-pages` commitを再publishする。
- 重大な誤情報やsecurity問題ではPages APIでunpublishし、修正版を公開する。
- branch削除やPages無効化は破壊的なため、実施が必要になった場合は対象を再確認する。

## 10. Architecture Review

- Domain boundary: locale copyをGraph / Notation domain ruleへ混ぜず、code contractを維持する。
- SRP: product UI、docs source、deployment artifactを分離する。
- One-way dependency: presentationがlocalized formatterを所有し、domain / applicationはpresentationを参照しない。
- Loose coupling: GitHub Pagesはproduct runtimeに依存しないstatic documentationとする。
- DIP: product applicationのport / adapterに変更は不要。
