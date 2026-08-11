# Phase 9 Release Hardening 設計

> 作成日: 2026-08-11
> ステータス: 承認済み / 実装中
> Issue: [#31](https://github.com/dayaa-arch/granvas/issues/31)

## 1. Release flow

Phase 8をmainへmergeした後、Phase 9を独立したIssue / branch / PRで進める。

```text
Phase 8 main
  → Phase 9 specification / gates / OSS docs / Pages source
  → preview deploy + browser verification
  → PR green + main merge
  → Vercel production deploy
  → production / Pages closeout
  → complete Docs publish from reviewed main
```

## 2. 永続文書 / ADR

- 統合仕様書のStatusをRelease Candidateへ更新し、DoDをtest / manual / production evidenceに基づき閉じる。
- roadmapのPhase 9、M7、release status、Issue / PRを更新する。
- product requirements / functional design / architecture / repository structure / development guidelines / glossaryをrelease実績へ同期する。
- ADR-0006でofficial Docsを公開プレビューから完全版へpromoteし、ADR-0004のhosting境界を維持する。
- product v1.0 migrationは行わず、Docs edition 1.0とproduct v0.1 RCを明記する。

## 3. Performance evidence

- `tests/performance/canonicalPerformanceFixture.ts`をsingle sourceにする。
- VitestでParser / plan / layoutをwarm-up後20回以上計測し、nearest-rank p95を判定する。
- PlaywrightでPerformanceObserverとapplication-visible stateを使い、input / graph edit / paint timingを取得する。
- benchmark値はmachine variabilityを考慮して生値をPRへ記録するが、仕様budgetを超えた場合はmergeしない。

## 4. Accessibility evidence

- `@axe-core/playwright`をdev dependencyに追加し、root / Download dialog / Graph authoring dialogをWCAG 2.2 A / AAでscanする。
- existing pointer scenarioと別にkeyboard-only scenarioを作り、focus order、activation、Escape、focus return、aria-liveをassertする。
- automated resultとheaded browser確認の両方をtasklistへ記録する。

## 5. Security evidence

- existing `vercel-config.test.ts`をexact CSP / headersへ強化する。
- browser network listenerでinitial same-origin assetsを許可し、ready後のcross-origin requestを0とassertする。
- `bun audit --audit-level=high`をlocal / Actionsで実行する。
- build artifactへcredential pattern、source map、unexpected remote URLがないことをscriptで検証する。
- dynamic PDF chunkを含むproduction bundle sizeを記録する。

## 6. GitHub Actions

`.github/workflows/quality.yml`を追加する。

- `quality`: checkout、Bun setup、frozen install、typecheck、lint、test、build、docs build、audit、artifact verification。
- `e2e`: Playwright browser install、three-browser E2E、failure artifact upload。
- `performance`: deterministic node benchmark。browser performanceは環境差を記録し、release validationで実行する。
- Actionsはquality verificationだけを担当し、Pages / Vercel deploymentは行わない。

## 7. OSS files

- MIT licenseのcopyright holderは`Granvas contributors`とする。
- CONTRIBUTINGはAGENTS / steering / Bun commands / architecture boundary / test matrixを案内する。
- SECURITYはGitHubのPrivate vulnerability reportingを第一選択とし、公開Issueへ脆弱性詳細を書かないよう案内する。repository設定が利用可能かも確認する。
- canonical exampleはspec §26と同じ構造を日本語labelで提供し、期待件数をREADMEへ記載する。

## 8. Vercel / Pages

- Vercel connectorでteam `taigahr12-gmailcoms-projects`に`granvas` projectを作成する。
- branch sourceからpreviewを作成し、main merge後にproductionへdeployする。
- rootと任意direct pathが`index.html`へrewriteされることを確認する。
- PagesはADR-0004どおり`gh-pages` root / legacy / HTTPSを維持し、完全版artifactだけを再publishする。
- live QAはPlaywright CLIを使用し、1280px / 390px、keyboard、console / network errorを確認する。

## 9. Merge / closeout

- Phase 9 feature PRはlocal / preview / GitHub checksがgreenの場合だけmergeする。
- production URL確定後、必要ならcloseout PRでURL、DoD、roadmap、Steeringを最終同期する。
- Pagesは最終mainからbuildし、`gh-pages`へpublishする。
- Issue close、remote / local branch整理、clean main一致を確認して停止する。

## 10. Release evidence

| Gate | 実績 | 判定 |
| --- | --- | --- |
| Canonical fixture | 500 lines / 200 Nodes / 300 Edges / 10 Groups | pass |
| Parser / SourceEditPlan / layout p95 | 3.53 ms / 0.65 ms / 55.99 ms | pass（50 / 20 / 200 ms未満） |
| Browser input / projection / Graph edit p95 | 14.30 ms / 207.80 ms / 42.50 ms | pass（50 / 350 / 350 ms未満） |
| pan / zoom long task | 最大0.00 ms | pass（100 ms以下） |
| Unit / component | 27 files / 151 tests | pass |
| Istanbul coverage | statements 85.22% / branches 74.37% / functions 85.53% / lines 85.69% | pass |
| Accessibility | root / Download / Graph authoringでWCAG 2.2 A / AA violation 0、keyboard-only flow pass | pass |
| Security | audit 0、runtime cross-origin 0、source map / secret / tracking / unexpected URL 0 | pass |
| Production dependencies | 45 packages、MIT-compatible licenseのみ | pass |
| App build | initial entry 247.68 kB、PDF lazy chunk 428.24 kB（gzip 178.34 kB） | pass |
| Vercel Preview | `dpl_GT7GY5nSodYMZ9cXF2R459cKggRS` / `READY` | pass |
| Preview manual QA | canonical demo、Import、Graph edit → Undo、SVG / PNG / PDF、`/workspace` direct access | pass |
| Official Docs source | complete edition build、no-JS content、1440×900 / 390×844、keyboard focus | pass |

Preview URL: <https://granvas-e9o90nmyo-taigahr12-gmailcoms-projects.vercel.app>

Production / Pages evidenceはreview済みmainの公開後に追記する。
