# ADR-0008: Automatic Vercel production delivery from main

- Status: Accepted
- Date: 2026-08-15
- Phase: 15 Automatic Vercel Delivery
- Issue: [#37](https://github.com/dayaa-arch/granvas/issues/37)
- Related: [ADR-0006](0006-promote-official-documentation-to-complete-edition.md)

## Context

ADR-0006は、GitHub Actionsをquality verificationだけに限定し、Vercel Productionをreview済み`main`から承認済み手動操作で公開すると決定した。Phase 14の短期ブラウザ復旧はPR #35で`main`へマージされ、localとCIの全quality gateもgreenだったが、手動Production Deploymentが実行されなかった。その結果、repositoryの正本と`https://granvas.vercel.app`のartifactが乖離し、利用者は追加済み機能を利用できなかった。

GitHub ActionsへVercel CLI deploymentを追加すれば自動化できるが、long-lived token、organization ID、project IDとdeployment責務をrepository CIへ持ち込む。Granvasはstatic Vite SPAであり、VercelのGit Integrationがstandard Git-push deploymentを提供するため、custom deployment workflowは不要である。

## Decision

Vercel ProjectをGitHub repository `dayaa-arch/granvas`へnative Git Integrationで接続し、Production Branchを`main`とする。

- `main`へのpushをVercelが検知し、Vercel Projectの権限でProduction Deploymentを作成する。
- feature branch / pull requestのPreview DeploymentはVercel標準動作に委ねるが、Granvasのmerge gateは引き続きGitHub Actionsのquality workflowとする。
- GitHub Actionsはtypecheck、lint、test、build、security、performance、three-browser E2Eだけを担当し、deployment jobを追加しない。
- Repository secretへ`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`を追加しない。
- `.vercel/`はlocal project metadataとしてignoreし、commitしない。
- Vercelは既存`vercel.json`の`bun run build`、`dist` output、SPA rewrite、security headerを使用する。
- production公開後はdeployment source commit、`READY`、production alias、direct access / reload、CSP、runtime outbound 0を検証する。
- GitHub Pagesのofficial Docsは引き続きADR-0004 / ADR-0006のlegacy `gh-pages`運用とし、本決定では自動化しない。

この決定はADR-0006の「Vercelは手動操作で公開する」という運用だけを置き換える。Docs edition、GitHub Pages、product version、quality-only GitHub Actionsという他の決定は維持する。

## Consequences

### 得られるもの

- greenなPRを`main`へマージした後、追加のCLI操作を忘れてもProductionがrepositoryの正本へ追従する。
- deployment credentialとwrite permissionをGitHub Actionsへ追加せずに自動化できる。
- Vercel deploymentからGit source repository、branch、commitを追跡できる。
- application runtime、Context boundary、static hosting、outbound 0のcontractを変更しない。

### 引き受けるコスト

- Vercel GitHub AppとProject connectionがexternal infrastructure stateとなり、repositoryだけでは完全に再現できない。ADRとlive verificationで設定を記録する。
- `main`へ直接pushした場合もProduction Deploymentが開始される。branch protectionとPR運用をrelease gateとして維持する必要がある。
- GitHub Actionsの`main` push checksとVercel buildは並行し得る。Productionへ入るcommitはPR上で既にgreenであることを前提とし、merge後のcheck失敗を検知した場合はrollbackを判断する。
- Vercel / GitHub Appの障害時は自動公開が遅延するため、deployment stateとaliasをmerge後に確認する運用は残る。

## Alternatives Considered

### GitHub ActionsからVercel CLIを実行する

buildとdeploy順序をworkflowで制御できるが、long-lived `VERCEL_TOKEN`とProject metadataをGitHub Secretsへ持ち込み、quality-only workflowの最小権限方針を崩す。標準Git Integrationで要件を満たせるため採用しない。

### Deploy Hookをmain workflowから呼ぶ

CLIより設定は少ないが、secret URLをGitHub側で管理し、source commitとの結び付きもGit Integrationより弱い。採用しない。

### 手動Production Deploymentを継続する

今回発生した公開漏れを構造的に防げないため採用しない。

### Previewを手動promoteする

artifactの事前検証には有効だが、merge後の手動操作が残り、要求する自動化を満たさない。将来、deployment approvalが必要になった場合に別ADRで再検討する。
