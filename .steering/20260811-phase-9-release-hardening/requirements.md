# Phase 9 Release Hardening 要求

> 作成日: 2026-08-11
> ステータス: 承認済み / 実装中
> Roadmap: `docs/development-roadmap.md` Phase 9
> Issue: [#31](https://github.com/dayaa-arch/granvas/issues/31)

## 1. 目的

Granvas v0.1のDefinition of Doneを証拠付きで満たし、OSS release candidateとしてVercel productionへ安全かつ再現可能に公開する。完了後、GitHub Pagesの公式利用ガイドをPhase 8 / 9完了内容とproduction URLに一致する完全版へ更新する。

## 2. Release scope

- product versionは`0.1.0`、release stateは`Release Candidate`とする。
- Pagesはユーザー要求どおり`Granvas 1.0 公式ドキュメント — 完全版`へ更新する。
- Docsの`1.0`はdocumentation editionであり、product implementationが`Granvas v0.1 Release Candidate`であることを明記する。
- 正式なproduct v1.0 migration、schema migration、v1.0 tagは本Phaseに含めない。
- OSS licenseはMITを採用する（本承認ゲートで決定する）。

## 3. Quality gates

### 3.1 Performance

- 500 lines / 200 Nodes / 300 Edges / 10 Groupsのcanonical fixtureを追加する。
- Parser p95 50ms、layout p95 200ms、SourceEditPlan p95 20msを自動benchmarkする。
- input → paint p95 50ms、debounce終了 → Graph paint p95 350ms、Graph編集 → Graph paint p95 350msをbrowserで計測する。
- pan / zoomで100ms超long taskがないことを検証する。

### 3.2 Accessibility

- `@axe-core/playwright`でWCAG 2.2 A / AAの重大違反0を検証する。
- keyboard-onlyでpane、Node選択、Graph編集、Download、Import、dialog cancel / focus returnへ到達するE2Eを追加する。
- certainty、diagnostic、selection、errorがcolor以外でも伝わることを確認する。

### 3.3 Security / privacy

- Vercel productionのCSP、`nosniff`、referrer policyを検証する。
- asset load後の編集・Import・visual Download中にcross-origin requestが0であることを検証する。
- `bun audit --audit-level=high`をquality gateにする。
- bundleへsecret、Supabase、tracking、remote font、runtime backendを追加しない。
- dependency licenseとproduction bundle差分を記録する。

## 4. OSS distribution

- rootへMIT `LICENSE`を追加する。
- `CONTRIBUTING.md`へsetup、steering、test、PR、architecture boundaryを記載する。
- `SECURITY.md`へsupported version、非公開報告方法、脅威範囲、応答方針を記載する。
- `examples/canonical-demo.granvas`へ日本語UIで利用できるcanonical exampleを配置する。
- READMEを実装済みcapability、production URL、license、security、contributionへ同期する。
- `package.json` versionを`0.1.0`へ更新する。

## 5. GitHub Actions

以前「後で追加」とされたGitHub Actionsを、roadmapが定めるPhase 9で追加する。

- pull request / main pushでBun frozen install、typecheck、lint、unit / component、build、docs build、security auditを実行する。
- Chromium / Firefox / WebKit E2Eを実行する。
- performance benchmarkを明示的なjob / commandとして実行する。
- Pages deployment workflowは追加せず、`gh-pages` legacy branch sourceを維持する。
- Vercel credentialをActionsへ追加せず、production deployは承認済み手動/API操作で行う。

## 6. Vercel production

- Vercel teamへ`granvas` projectを新規作成する。
- Vite static artifactだけをdeployし、server / edge functionを作成しない。
- previewで全gateを確認後、review済みmainをproductionへdeployする。
- production URLでroot、direct path / reload、canonical demo、Import / Download、CSP、outbound 0を検証する。
- `.vercel/`のproject metadata、token、credentialをcommitしない。

## 7. 公式利用ガイド完全版

- preview / Phase 8予定 / Phase 9予定の表記を除去する。
- PNG / PDF、Vercel production、MIT license、security / contribution、quality gateを説明する。
- production appへの明確なCTAを追加する。
- Download Dialogなど最新production screenshotへ更新する。
- analytics、tracking、remote font、cookie、backendなしを維持する。
- review済みmainからPages artifactを再buildし、`gh-pages`へpublishする。
- live HTML / CSS / JS / images / anchors / 404 / responsive / keyboardを再検証する。

## 8. 受け入れ条件

- [ ] Granvas v0.1 Definition of Doneが証拠付きで完了している。
- [ ] localとGitHub Actionsの全quality gateがgreenである。
- [ ] Vercel productionで主要flow、direct access、CSP、outbound 0を確認できる。
- [ ] MIT LICENSE、CONTRIBUTING、SECURITY、canonical exampleが公開されている。
- [ ] Pages完全版がPhase 8 / 9完了内容とproduction URLに一致する。
- [ ] main、production、Pages、roadmap、specificationのrelease状態が一致する。

## 9. 対象外

- 正式なproduct v1.0 migration / release tag。
- account、Supabase、backend、analytics、cloud persistence。
- GitHub ActionsからのVercel / Pages自動deploy。
- custom domain、search backend、CMS。
