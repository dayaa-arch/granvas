# Phase 15 Automatic Vercel Delivery タスクリスト

> 作成日: 2026-08-15
> ステータス: 進行中
> Issue: [#37](https://github.com/dayaa-arch/granvas/issues/37)
> PR: 実装後に作成

## 1. 準備・仕様

- [x] AGENTS.md、初期要求、永続文書、統合仕様、ADR、roadmapを確認する。
- [x] productionがPR #35より前のassetを配信していることを実browserで確認する。
- [x] GitHub Actionsにdeployment jobがなく、Vercel CLIが未認証であることを確認する。
- [x] requirements / design / tasklistを作成する。
- [x] requirements / design / tasklistの承認を得る。
- [x] Issueを起票し、`codex/phase-15-automatic-vercel-delivery` branchを作成する。
- [x] ADR-0008と統合仕様へdeployment contract変更を先行反映する。
- [x] 永続文書、README、AGENTS.mdを自動delivery contractへ同期する。

## 2. Immediate Production Deployment

- [x] Vercel CLIを認証する。
- [x] `granvas.vercel.app`を所有するexisting Projectを特定してlocal repositoryをlinkする。
- [x] current review済み`main`をProductionへ反映する。
- [x] deployment `READY`とproduction aliasを確認する。
- [x] live UIでPhase 14の24時間一時保存とreload復元を確認する。

## 3. Automatic Delivery

- [x] Vercel Projectを`dayaa-arch/granvas` GitHub repositoryへ接続する。
- [x] Production Branchが`main`であることを確認する。
- [x] `.gitignore`へ`.vercel`を追加する。
- [x] GitHub Actionsへdeployment job / credential / write permissionを追加していないことを監査する。
- [x] local `.vercel/` metadataやcredentialがcommit対象外であることを確認する。

## 4. Quality / Verification

- [x] typecheck、lint、unit / component、build、release verificationをgreenにする。
- [x] docs build / verification、license、audit、performanceをgreenにする。
- [x] Chromium / Firefox / WebKitのE2Eをgreenにする。
- [x] productionのdirect access / reload、CSP、runtime outbound 0を確認する。
- [x] source repository / branch / commit、deployment state、aliasを検証記録へ残す。

## 5. GitHub完了処理

- [ ] tasklist、roadmap、specification、ADR、READMEを実績へ同期する。
- [ ] 意図した変更だけをcommit / pushする。
- [ ] PRへ要求、設計、検証、credential方針、rollback、残課題を記載する。
- [ ] PRの全quality gateがgreenの場合だけ`main`へmergeする。
- [ ] merge commitをsourceとするProduction Deploymentが自動作成されることを確認する。
- [ ] 自動deployment後のlive smoke / reload / recoveryを再確認する。
- [ ] Issue close、branch削除、main同期を確認する。

## 完了条件

- [ ] requirements.mdの受け入れ条件をすべて満たす。
- [ ] 現在のPhase 14がproductionで利用できる。
- [ ] 今後の`main` mergeが追加の手動操作なしにVercel Productionへ反映される。
- [ ] GitHub ActionsへVercel credentialを保存していない。
- [ ] local / CI / production verificationがすべてgreenである。
