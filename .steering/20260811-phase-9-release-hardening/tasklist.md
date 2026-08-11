# Phase 9 Release Hardening タスクリスト

> 作成日: 2026-08-11
> ステータス: 完了
> Issue / PR: [#31](https://github.com/dayaa-arch/granvas/issues/31) / [#32](https://github.com/dayaa-arch/granvas/pull/32)

## 1. 準備・仕様

- [x] Phase 8完了とclean mainを確認する。
- [x] requirements / design / tasklistの承認を得る。
- [x] Issueを起票し、`codex/phase-9-release-hardening` branchを作成する。
- [x] 統合仕様、roadmap、永続文書を実装前のrelease契約へ更新する。
- [x] ADR-0006でofficial Docs完全版へのpromotionを記録する。

## 2. Performance

- [x] canonical 500 / 200 / 300 / 10 fixtureを追加する。
- [x] Parser / layout / SourceEditPlan p95 benchmarkを追加する。
- [x] input / projection / Graph edit / pan-zoom browser benchmarkを追加する。
- [x] 全budgetを計測し、結果をSteering / PRへ記録する。

## 3. Accessibility

- [x] `@axe-core/playwright`を追加する。
- [x] root / Download / Graph dialogsのWCAG 2.2 A / AA scanを追加する。
- [x] keyboard-only E2Eを追加する。
- [x] focus、aria-live、certainty、diagnosticの非色情報をheaded browserで確認する。

## 4. Security / Dependency

- [x] CSP / security header contract testを強化する。
- [x] asset load後のoutbound request 0をE2Eで確認する。
- [x] build artifactのremote URL / credential / source map監査を追加する。
- [x] `bun audit --audit-level=high`を成功させる。
- [x] production dependency licenseとbundle sizeを監査する。

## 5. OSS / Distribution

- [x] MIT `LICENSE`を追加する。
- [x] `CONTRIBUTING.md`を追加する。
- [x] `SECURITY.md`を追加する。
- [x] `examples/canonical-demo.granvas`を追加する。
- [x] README、package version、support / security / license導線を更新する。

## 6. GitHub Actions

- [x] quality / E2E / performance workflowを追加する。
- [x] frozen installと3-browser setupを検証する。
- [x] workflowにcredentialやdeployment権限を追加していないことを確認する。
- [x] PR checksをgreenにする。

## 7. Official Docs完全版

- [x] preview / Phase 8 / 9予定表記を完全版へ更新する。
- [x] PNG / PDF / Vercel / MIT / security / contributing / qualityを記述する。
- [x] production app CTAと最新screenshotを追加する。
- [x] docs build、no-JS、desktop / mobile、keyboardを検証する。

## 8. Vercel Preview / Production

- [x] `granvas` projectをVercelへ作成しpreview deployする。
- [x] previewでcanonical demo、Import、SVG / PNG / PDF、Undoを検証する。
- [x] CSP、outbound 0、direct access / reloadを検証する。
- [x] main merge後にproduction deployする。
- [x] production URLとdeployment statusを記録する。

## 9. Full Quality Gate

- [x] typecheck / lint / unit / component / coverageをgreenにする。
- [x] app / docs buildをgreenにする。
- [x] 3-browser E2E / accessibility / performance / securityをgreenにする。
- [x] architecture boundaryとv0.1 DoDを全項目auditする。
- [x] PDFをPoppler render、app / Docsをheaded browserで最終確認する。

## 10. GitHub / Pages / Closeout

- [x] tasklist、roadmap、specification、READMEを実績へ同期する。
- [x] 意図した変更だけをcommit / pushする。
- [x] PRへ全gate、Vercel preview、license、残課題を記載する。
- [x] green確認後にmainへmergeする。
- [x] final mainからPages artifactをbuildし`gh-pages`へpublishする。
- [x] live Pages / productionを再検証する。
- [x] Issue / branch整理、tracked main一致を確認し、ユーザー所有の未追跡fileを保全する。

## 完了条件

- [x] Phase 9 Exit Criteriaとv0.1 Definition of Doneを満たす。
- [x] Vercel productionとPages完全版がreview済みmainに一致する。
- [x] product v1.0 migrationを暗黙に行っていない。
