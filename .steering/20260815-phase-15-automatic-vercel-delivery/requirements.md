# Phase 15 Automatic Vercel Delivery 要求

> 作成日: 2026-08-15
> ステータス: 承認済み
> 開発タイトル: `phase-15-automatic-vercel-delivery`
> Issue: [#37](https://github.com/dayaa-arch/granvas/issues/37)

## 背景

Phase 14の短期ブラウザ復旧はPR #35で`main`へマージ済みだが、`https://granvas.vercel.app`はマージ前のartifactを配信したままである。現在のGitHub Actionsはquality verificationだけを実行し、Vercel productionは手動公開する契約のため、`main`の更新がproductionへ自動反映されなかった。

## 要求

1. 現在のreview済み`main`をVercel Productionへ公開し、24時間一時保存を利用可能にする。
2. Vercel ProjectをGitHub repository `dayaa-arch/granvas`へ接続する。
3. VercelのProduction Branchを`main`とし、今後`main`へマージされたcommitを自動でProduction Deploymentする。
4. GitHub Actionsはquality verification専用のまま維持し、Vercel token、organization ID、project ID、deployment権限を追加しない。
5. deployment後にlive URLでdirect access、reload、24時間一時保存、CSP、runtime outbound 0を検証する。

## ユーザーストーリー

maintainerとして、greenなPRを`main`へマージしたら、追加の手動公開を忘れてもreview済みの変更がVercel Productionへ反映されてほしい。

利用者として、READMEと公式利用ガイドが案内するproduction URLで、`main`に存在する最新機能を利用したい。

## 受け入れ条件

- [x] `https://granvas.vercel.app`がPhase 14を含む最新のreview済みartifactを配信する。
- [x] live UIに`24時間一時保存`が表示され、Text入力直後のreloadで内容を復元する。
- [x] Vercel ProjectのGit repositoryが`dayaa-arch/granvas`へ接続されている。
- [x] Production Branchが`main`である。
- [x] 本作業のPRを`main`へマージした結果、新しいProduction Deploymentが自動で開始される。
- [x] 自動deploymentが`READY`となり、production aliasがそのdeploymentを指す。
- [x] GitHub ActionsへVercel credential、deployment job、repository write permissionを追加していない。
- [x] typecheck、lint、unit / component、build、release verification、3-browser E2Eがgreenである。
- [x] productionでdirect access / reload、CSP、asset load後のoutbound request 0を確認する。
- [x] deployment方針の変更をADR、統合仕様、永続文書、README、roadmapへ反映する。

## 制約

- Vercel標準のGit Integrationを使用し、GitHub ActionsによるCLI deploymentを実装しない。
- token、credential、`.vercel/project.json`などのlocal project metadataをcommitしない。
- existing `granvas.vercel.app` Projectへ接続し、同名の重複Projectを作成しない。
- productは引き続きstatic Vite SPAとし、Serverless / Edge Functionを追加しない。
- GitHub Pagesの公式利用ガイド公開方式は本Phaseで自動化しない。
- Production設定変更にはVercel認証が必要であり、CLI認証時だけユーザー操作を依頼する場合がある。

## スコープ外

- GitHub ActionsからのVercel deployment。
- Preview Deploymentをquality gateとして必須化すること。
- GitHub Pages deploymentの自動化。
- custom domain、environment variable、runtime backend、monitoring serviceの追加。
