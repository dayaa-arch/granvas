# Phase 1 プロジェクト基盤 要求定義

> 作成日: 2026-08-10  
> ステータス: 承認済み  
> 開発タイトル: `phase-1-foundation`

## 1. 目的

Granvas v0.1 の各機能を、承認済みの Domain-Driven Design、Layered Architecture、Modular Monolith の境界を保ちながら実装できる開発基盤へ整える。

本作業ではプロダクト機能を実装せず、構成ルート、パス解決、依存境界の静的検査、単体・E2Eテスト基盤、Vercel静的SPA設定、production CSPを確立する。

## 2. 背景

現状は Vite の starter 構成であり、以下が未整備である。

- `src/app/bootstrap` による依存の組み立て。
- `@/*` パスエイリアス。
- Context間・Layer間の不正importを検出する仕組み。
- package scriptとしての型検査・lint・E2E。
- Vitestが成功する最小の実行可能test suite。
- PlaywrightのChromium / Firefox / WebKit設定。
- Vercelでの静的SPA fallbackとproduction security headers。

## 3. ユーザーストーリー

### US-01: 一貫した開発コマンドを利用する

開発者として、型検査・lint・unit test・E2E・production buildを、明示されたpackage scriptから再現可能に実行したい。

### US-02: アーキテクチャ境界違反を早期検出する

開発者として、Contextの内部実装への直接参照や、Domain / Applicationへのframework・browser依存の混入を、レビュー前にlintで検出したい。

### US-03: Vercelで静的SPAを安全に配信する

利用者として、Vercel上の任意のSPA pathへ直接アクセスまたは再読み込みしてもアプリを開け、production responseに要求されたCSPが付与されていてほしい。

## 4. 機能要件

### FR-01: 構成ルート

- `src/app/bootstrap/createApplication.ts`を追加する。
- infrastructureの具象生成・注入を将来この場所へ集約できる公開入口とする。
- Phase 1では未実装Contextのfakeな業務処理や空の汎用抽象を追加しない。

### FR-02: パスエイリアス

- TypeScript、Vite、Vitestで`@/*`を`src/*`として同一に解決できる。
- application codeは新規・変更箇所で`@/`を利用できる。

### FR-03: モジュール境界

- Context外からの参照は`src/modules/<context>/index.ts`のpublished contractに限定する。
- Context内では`presentation → application → domain`の方向を守る。
- Domainはapplication / infrastructure / presentation / React / browser APIへ依存しない。
- Applicationはinfrastructure / presentation / React / browser APIへ依存しない。
- Workspace以外のContextから別Contextへの直接参照を禁止する。
- `src/app/bootstrap`はcomposition rootとして各published contractとinfrastructure具象を参照できる。
- 違反をESLintのfixture testで検証する。

### FR-04: 品質コマンド

- `package.json`へ`typecheck`、`lint`、`e2e` scriptを追加する。
- 既存の`test:run`と`build`を維持する。
- Bunをpackage managerとして使用し、lockfileをcommit対象に含める。

### FR-05: Unit / component test基盤

- Vitestをjsdom環境で実行できる設定と共通setupを追加する。
- `createApplication`の最小contract testを追加する。
- Vercel設定とCSPの構成値を機械的に検証するtestを追加する。

### FR-06: E2E基盤

- PlaywrightをChromium、Firefox、WebKitの3 projectで実行する。
- test実行時にVite preview serverを起動できる。
- starter applicationが表示されるsmoke scenarioを追加する。

### FR-07: Vercel静的SPAとCSP

- rootの`vercel.json`にVite build、`dist`出力、SPA fallbackを定義する。
- server functionを作成しない。
- 全responseへ少なくとも次を含むCSPを設定する。
  - `object-src 'none'`
  - `base-uri 'none'`
  - `frame-ancestors 'none'`
  - `connect-src 'none'`
- 現在のVite production bundleを動かすため、`default-src 'self'`、`script-src 'self'`、`style-src 'self' 'unsafe-inline'`、`img-src 'self' data: blob:`、`font-src 'self'`を許可する。
- `X-Content-Type-Options: nosniff`と`Referrer-Policy: no-referrer`を設定する。
- CSPは将来のExport機能に必要な`data:` / `blob:`を画像だけに限定し、外部接続を許可しない。

## 5. 受け入れ条件

- `bun run typecheck`が成功する。
- `bun run lint`が成功する。
- `bun run test:run`が成功し、構成ルート・境界lint・Vercel/CSP契約を検証する。
- `bun run build`が成功する。
- `bun run e2e`がChromium、Firefox、WebKitの全projectで成功する。
- architecture boundaryの禁止例がfixture testでlint errorになる。
- production previewの直接pathで`index.html`が返り、画面が表示される。
- `vercel.json`にserver function、Supabase SDK、credential、remote API設定が存在しない。
- approved baseline文書とPhase 1実装が同一PRでmainへ取り込まれる。

## 6. 制約・スコープ外

- Granvas UI、Document / Notation / Graph / Transfer / Workspaceの業務ロジックは実装しない。
- 空directoryを維持するためだけのplaceholderや、`BaseService`等の先行抽象を追加しない。
- localStorage / IndexedDB、backend API、telemetry、remote assetを追加しない。
- v0.1に認証を実装しない。将来providerがSupabase Authであるという既存方針は変更しないが、SDK・環境変数・認証UIは追加しない。
- Vercel productionへの本番deployはPhase 7のrelease hardening対象とし、本作業ではdeploy可能な設定とlocal contractを整える。

## 7. 永続文書への影響

`docs/`の要求・設計・構造・技術選定はすでに本作業を規定しているため、永続文書の仕様変更は不要とする。実装完了時に既存の`.steering/20260810-initial-implementation/tasklist.md`のPhase 1項目だけを実績に合わせて更新する。
