# Phase 1 プロジェクト基盤 タスクリスト

> 作成日: 2026-08-10  
> ステータス: 完了  
> 開発タイトル: `phase-1-foundation`

## 0. 承認とGit準備

- [x] requirements / design / tasklistの一括承認を得る。
- [x] GitHub Issue `Phase 1: プロジェクト基盤とアーキテクチャ制約を整備`を`enhancement`ラベルで起票する。
- [x] `main`をfast-forwardで最新化する。
- [x] `feat/phase-1-foundation`branchを作成する。
- [x] 退避した承認済みbaseline文書とstarter projectをbranchへ戻す。

## 1. Application構成ルート

- [x] `src/app/bootstrap/createApplication.ts`を追加する。
- [x] 構成ルートのcontract testを追加する。
- [x] `App.tsx`と`App.css`を`src/app/`へ移動する。
- [x] `src/main.tsx`から`createApplication()`を呼び、Appへ注入する。
- [x] `src/modules/transfer/index.ts`をpublished contract入口として追加する。
- [x] 実装のないLayerやshared directoryを追加していないことを確認する。

## 2. TypeScript / Vite設定

- [x] `@/* -> src/*`を`tsconfig.app.json`へ追加する。
- [x] Viteの`resolve.alias`へ`@`を追加する。
- [x] test / tool設定ファイルを`tsconfig.node.json`の対象へ追加する。
- [x] applicationとtestからaliasが解決できることを確認する。

## 3. Architecture boundary lint

- [x] ContextとLayerのfile patternを`eslint.config.js`へ定義する。
- [x] Context外から内部pathへのimportを禁止する。
- [x] Workspace以外のContext間importを禁止する。
- [x] Domainから上位Layer、React、browser globalへの依存を禁止する。
- [x] Applicationからinfrastructure / presentation、React、browser globalへの依存を禁止する。
- [x] composition rootの許可範囲を明示する。
- [x] 許可例と禁止例のfixture testを追加する。

## 4. 品質コマンドとVitest

- [x] `package.json`へ`typecheck` scriptを追加する。
- [x] `package.json`へ`lint` scriptを追加する。
- [x] `package.json`へ`e2e` scriptを追加する。
- [x] `vitest.config.ts`を追加する。
- [x] `src/test/setup.ts`を追加する。
- [x] 既存のtest scriptsを維持する。
- [x] dependency変更がない場合も`bun.lock`との整合性を確認する。

## 5. Playwright

- [x] `playwright.config.ts`を追加する。
- [x] Chromium projectを設定する。
- [x] Firefox projectを設定する。
- [x] WebKit projectを設定する。
- [x] Vite previewを起動する`webServer`を設定する。
- [x] `tests/e2e/bootstrap.spec.ts`を追加する。
- [x] 必要なbrowser binaryが利用可能であることを確認する。

## 6. Vercel静的SPAとCSP

- [x] Vercel公式schema付きの`vercel.json`を追加する。
- [x] Vite build commandと`dist` outputを設定する。
- [x] SPA fallback rewriteを設定する。
- [x] production CSPを全pathへ設定する。
- [x] `X-Content-Type-Options`と`Referrer-Policy`を設定する。
- [x] CSP必須directiveを検証するtestを追加する。
- [x] server function、remote API、Supabase設定がないことをtestで確認する。

## 7. 自動品質チェック

- [x] `bun install`を実行しlockfileを確認する。
- [x] `bun run typecheck`を成功させる。
- [x] `bun run lint`を成功させる。
- [x] `bun run test:run`を成功させる。
- [x] `bun run build`を成功させる。
- [x] `bun run e2e`を3 browser projectすべてで成功させる。

## 8. 動作検証

- [x] production buildをlocal previewで起動する。
- [x] root pageが表示されることをbrowserで確認する。
- [x] console errorと失敗requestがないことを確認する。
- [x] 任意のSPA pathが`index.html`へfallbackできることを確認する。
- [x] localでCSP / security header契約を確認する。

## 9. 文書・進捗更新

- [x] `.steering/20260810-initial-implementation/tasklist.md`のPhase 1項目を実績に合わせて完了へ更新する。
- [x] 本タスクリストの完了項目を更新する。
- [x] `docs/*.md`に仕様変更が不要であることを再確認する。

## 10. GitHub完了工程

- [x] 意図したファイルだけが変更対象で、機密情報がないことを確認する。
- [x] Conventional Commits形式でIssueをcloseするcommitを作成する。
- [x] `feat/phase-1-foundation`をoriginへpushする。
- [x] PR `feat: Phase 1のプロジェクト基盤を整備`を作成する。
- [x] localとCIのcheckがgreenであることを確認する。
- [x] greenの場合に限りsquash mergeし、remote branchを削除する。
- [x] local `main`をfast-forwardで更新する。
- [x] Issueがcloseされ、working treeが期待どおりであることを確認する。

## 完了条件

- [x] 構成ルート、alias、architecture boundary、Vitest、Playwright、Vercel SPA/CSP設定が実装済みである。
- [x] 型検査、lint、unit test、build、3 browser E2Eがすべてgreenである。
- [x] runtime検証でapplication起動とSPA fallbackを確認できる。
- [x] approved baselineとPhase 1がPR経由で`main`へmerge済みである。
