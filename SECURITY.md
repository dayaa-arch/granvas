# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| `main` / `0.1.x` Release Candidate | Yes |
| Earlier development snapshots | No |

Granvas v0.1はclient-onlyのstatic SPAです。backend、account、cloud storage、telemetryはありませんが、Importした`.granvas`、生成するSVG / PNG / PDF、dependency、hosting headerはsecurity boundaryとして扱います。

## Reporting a vulnerability

脆弱性の詳細を公開Issue、Discussion、Pull Requestへ書かないでください。[GitHub Private Vulnerability Reporting](https://github.com/dayaa-arch/granvas/security/advisories/new)から非公開で報告してください。

報告には、可能な範囲で次を含めてください。

- 影響するversion / commit / URL
- 再現手順または最小入力
- 想定される影響
- 既知の回避策
- 連絡可能なGitHub account

受領後7日以内に初回確認を行い、影響と修正方針を調査します。修正時期と公開方法は重大度、悪用可能性、利用者への影響に応じて調整します。修正が利用可能になる前の公開は避けてください。

## Security scope

次をsecurity issueとして扱います。

- untrusted notation / label / file nameによるscript実行やmarkup injection
- `.granvas` Importによるvalidation bypass、denial of service、意図しないnetwork access
- SVG / PNG / PDF生成によるcode execution、data exposure、resource leak
- CSP / security headerの回避
- build artifact、GitHub Actions、Vercel、Pagesへのcredential混入
- dependencyの既知の重大脆弱性

一般的な不具合、機能提案、意図された5 MiB file limit、v0.1で対象外のaccount / cloud機能は通常Issueの対象です。
