# OSS向けREADME完成 設計

> 作成日: 2026-08-10  
> ステータス: 承認済み  
> 関連: `requirements.md`, `docs/product-requirements.md`, `docs/development-roadmap.md`

## 1. 実装方針

`README.md`をVite starter文書からGranvas固有文書へ全面置換する。READMEは製品仕様の新しい真の情報源にはせず、`docs/`にある確定事項をOSS読者向けに要約し、詳細文書へ誘導する入口とする。

## 2. README構成

以下の順序で、初見の読者が「何か → 今使えるか → どう動くか → どう参加するか」を短時間で判断できる構成にする。

1. Project title / tagline / one-line value proposition。
2. Development status callout。
3. Why Granvas / core principles。
4. Planned v0.1 capabilitiesとnon-goals。
5. Canonical Granvas Notation example。
6. User-owned file workflow。
7. Architecture / technology stack。
8. Getting Started。
9. Available scripts。
10. Project documentation / repository structure。
11. Contributing。
12. Security / privacy。
13. License status。
14. Roadmap。

## 3. 表現上の設計

### 3.1 Status

README冒頭に次を明示する。

- `Early development`。
- Phase 1 project foundationは完了。
- UIとproduct featuresは未実装。
- 現時点はend-user releaseではない。

これによりpublic repositoryであっても、clone後にstarter画面が表示される現状との齟齬を防ぐ。

### 3.2 OSS transparency

- repositoryはpublicでsourceを閲覧・試験できる。
- ただし`LICENSE`未配置のため、利用・再配布条件はまだ確定していないと明記する。
- `CONTRIBUTING.md` / `SECURITY.md`はrelease hardeningで追加予定と明記する。
- Issueは公開してよいbug / proposalに利用し、security vulnerabilityをpublic Issueへ投稿しないよう案内する。
- private vulnerability reportingが現時点で無効なので、存在しないprivate channelは案内しない。

### 3.3 Badges

CI、coverage、release、licenseは裏付けがないため追加しない。GitHub repository linkを自然文とrelative linkで提供する。

## 4. Command設計

Getting Started:

```bash
git clone https://github.com/dayaa-arch/granvas.git
cd granvas
bun install
bun run dev
```

Quality / operation:

| Purpose | Command |
| --- | --- |
| Development | `bun run dev` |
| Type check | `bun run typecheck` |
| Lint | `bun run lint` |
| Unit tests | `bun run test:run` |
| E2E | `bun run e2e` |
| Build | `bun run build` |
| Preview | `bun run preview` |

Playwright browserがない環境だけ`bunx playwright install`を実行する。

## 5. Link設計

READMEから以下へ相対linkする。

- `docs/GRANVAS_SPEC_v0.1.md`
- `docs/product-requirements.md`
- `docs/functional-design.md`
- `docs/architecture.md`
- `docs/repository-structure.md`
- `docs/development-guidelines.md`
- `docs/glossary.md`
- `docs/development-roadmap.md`
- `AGENTS.md`

GitHub Issueへのlinkだけabsolute URLを使用する。

## 6. 変更ファイル

### 追加

- `.steering/20260810-complete-oss-readme/requirements.md`
- `.steering/20260810-complete-oss-readme/design.md`
- `.steering/20260810-complete-oss-readme/tasklist.md`

### 変更

- `README.md`
- `.steering/20260810-initial-implementation/tasklist.md`

### 変更しない

- `docs/*.md`
- application source / tests / package dependencies / lockfile。

## 7. 検証方針

- READMEの必須headingとstatus表現を検索する。
- relative Markdown linkのtargetが存在することをscriptで検証する。
- README記載commandと`package.json` scriptsを照合する。
- Vite starter固有文言が消えていることを確認する。
- Markdown code fenceの開閉数を確認する。
- projectの既存quality gateをすべて再実行する。
- README onlyのためbrowser UI検証は不要。代わりにGitHub上のrenderをPR diffで確認する。

## 8. 影響分析

- Product behavior: 変更なし。
- Architecture / dependencies: 変更なし。
- Contributor experience: projectの目的、現状、command、設計文書への導線が改善する。
- Legal: licenseを決定せず、未決定である事実を透明にする。
- Security: private報告channelがない事実を明記し、脆弱性をpublic Issueへ投稿しないよう注意する。
