# ADR-0004: Official documentation on GitHub Pages

- Status: Accepted
- Date: 2026-08-11
- Related: `docs/GRANVAS_SPEC_v0.1.md` §6.8 / §7.6 / §14 / §22、`docs/development-roadmap.md` Phase 13
- Phase: Phase 13 Japanese UI & Official Documentation

## Context

Phase 12完了時点で、GranvasはText / Graphの往復、確信度、Graph authoring、`.granvas` Import / Download、SVG Downloadまで実装している。一方、製品UIにはvisible text、accessible name、diagnostic、error、初期サンプルまで英語が残り、初回利用者向けの公式利用ガイドは存在しない。

ユーザーから「Granvas version 1.0公式ドキュメントとして使い方をGitHub Pagesへ公開し、その前にUIを日本語化する」という要求が追加された。

ただし正本のproduct targetとapplication contractはv0.1である。Phase 8のPNG / PDFとPhase 9のrelease hardening / Vercel production / OSS release gateは未完了で、`docs/GRANVAS_SPEC_v0.1.md`のDefinition of Doneも完了していない。この状態でproductを正式v1.0 releaseと表示すると、未実装機能を利用可能と誤認させる。

また、product applicationのproduction hostingはVercel static deploymentに決定済みである。公式Docsのためにこの方針を変更したり、内部engineering文書があるmainの`docs/`をPages sourceにすると、product runtimeとdocumentation、公開文書と内部設計文書の責務が混ざる。

GitHub Actionsは後回しにする明示的なユーザー指示があるため、repository-owned custom workflowを新設せずに公開できる構成が必要である。

## Decision

### 1. UIを日本語標準にする

公式利用ガイドの作成前に、製品UIのvisible text、accessible name、tooltip、dialog、status、notification、diagnostic、error、初期Projectを日本語へ統一する。

- Notation token、Node Type、Explicit ID、format名、製品名は翻訳しない。
- Domain / Applicationのmachine-readable error codeを維持し、presentation formatterが日本語表示文へ変換する。
- runtime locale switch、多言語化framework、locale selectorは導入しない。

### 2. Product hostingとDocs hostingを分離する

- Product application: Vercel static deployment。
- Official documentation: GitHub Pages project site。
- Official URL: `https://dayaa-arch.github.io/granvas/`。

official Docsはproduct runtime、Context、Project file、projectionへ接続しない独立した静的artifactとする。

### 3. Sourceとartifactを分離する

- main branchの`docs-site/`をofficial Docsのsource of truthとする。
- `docs/`はproduct / engineeringの永続文書として維持し、Pages sourceにしない。
- `bun run docs:build`がproject base path`/granvas/`のartifactを`dist-pages/`へ生成する。
- `dist-pages/`はmainへcommitしない。
- review済みmainから生成したartifactだけを`gh-pages` branch rootへ配置する。
- `gh-pages` rootへ`.nojekyll`を含める。

### 4. GitHub Pagesはlegacy branch sourceを使う

GitHub Pages REST APIで次を設定する。

```text
build_type: legacy
source.branch: gh-pages
source.path: /
https_enforced: true
```

`.github/workflows/`へcustom Pages workflowを追加しない。GitHub Pages platformが公開処理のため内部で表示するdeployment runは、repositoryがcustom workflowを定義することとは区別する。

### 5. Version表記を分離する

公開siteでは次を全pageに表示する。

```text
Granvas 1.0 公式ドキュメント
公開プレビュー
対応実装: Granvas v0.1 開発版（Phase 12完了時点）
```

- `1.0`はofficial Docsの公開候補versionとして扱う。
- 本Phaseでは`createApplication().version`、package version、`GRANVAS_SPEC_v0.1.md`のtarget、Notation versionを変更しない。
- PNG / PDF、Vercel production、release hardening、OSS licenseなどの未完了項目を現在の制約として明示する。
- 正式なproduct v1.0 release宣言とspecification migrationは、release scopeを別途決定してから行う。

### 6. Privacy / Accessibility

- analytics、tracking pixel、remote font、cookie、third-party runtime script、form backendを追加しない。
- semantic HTML、skip link、heading hierarchy、画像alt、focus indicator、responsive navigationを備える。
- screenshotは日本語UIのproduction buildから取得し、個人情報、credential、local pathを含めない。

## Consequences

### 得られるもの

- 日本語UIと利用ガイドの文言が一致し、初回利用者が操作名を対応づけられる。
- product applicationのVercel方針とofficial Docsの公開を独立して進められる。
- engineering `docs/`を外部向けinformation architectureへ流用せず、それぞれの読者に合わせて維持できる。
- main PRでsourceをreviewし、同じsourceからPages artifactを再現できる。
- custom GitHub Actions workflowを追加せずに公式Docsを公開できる。
- v1.0 Docsの準備を進めながら、現行v0.1の未完了機能を隠さず説明できる。

### 引き受けるコスト

- mainのsourceと`gh-pages` artifactという2 branchを同期する運用が必要になる。
- custom workflowを後回しにする間、publishは明示的な手動手順になる。
- official Docsの`1.0`とproduct implementationの`0.1`を説明するbannerを、正式なversion migrationまで維持する必要がある。
- UI copyをpresentation formatterへ集約する追加実装と、accessible nameを含むtest更新が必要になる。

### 運用上の制約

- `gh-pages`をsource of truthとして直接編集しない。
- review前のfeature branch artifactを公式URLへpublishしない。
- Pages artifactへ`.steering/`、engineering `docs/`、source map、test result、credentialを混入させない。
- live siteのHTML、CSS、JS、画像、anchor、404、HTTPSをpublish後に検証する。

## Alternatives Considered

### 案A: mainの`docs/`をGitHub Pages sourceにする

設定は最も単純だが、`docs/`はproduct requirements、architecture、roadmap、ADRなどengineeringの正本である。外部向け利用ガイドのnavigation、asset、entry fileを混ぜると責務と読者が曖昧になるため採用しない。

### 案B: Product SPAと公式Docsを同じVercel artifactへ含める

hostingを1つにできるが、product routing / CSP / bundleとDocsの公開が結合する。今回の要求はGitHub Pagesであり、product release前にDocsだけを独立公開できる利点も失うため採用しない。

### 案C: GitHub ActionsでPagesへ自動deployする

再現性と自動化は高いが、GitHub Actionsを後回しにするユーザー指示に反する。Phase 9でCI / deployment automationを扱う余地を残し、本Phaseではcustom workflowを作成しない。

### 案D: 現行productを正式にv1.0へ変更する

ユーザーの`version 1.0`表記と最も直接的に一致する。しかしPhase 8 / 9とv0.1 Definition of Doneが未完了で、specification、package、release gate、compatibility policyを横断するversion migrationが必要になる。未実装機能をrelease済みと誤認させるため採用しない。

### 案E: Version表記を完全に外す

誤認は避けられるが、「version 1.0公式ドキュメント」という明示要求を満たさない。`1.0 公開プレビュー`と対応実装v0.1を併記する決定を採用する。
