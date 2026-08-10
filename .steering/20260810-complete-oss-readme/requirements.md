# OSS向けREADME完成 要求定義

> 作成日: 2026-08-10  
> ステータス: 承認済み  
> 開発タイトル: `complete-oss-readme`

## 1. 目的

Vite starterの説明が残る`README.md`を、Granvasの利用者・導入検討者・コントリビューターが、プロジェクトの目的、現在地、利用方法、設計原則、参加方法を正確に理解できるOSS向けREADMEへ全面改訂する。

## 2. 読者

- Granvasが何を解決するか知りたい利用候補者。
- ローカルで試したい開発者。
- 実装状況とroadmapを確認したいcontributor候補者。
- architectureやprivacy方針を確認したいreviewer / maintainer。

## 3. 機能要件

### FR-01: プロジェクト紹介

- `Granvas`、tagline、プロダクトの一文説明を冒頭に置く。
- Textが正本でGraphがread-only projectionであることを明記する。
- draw.io型のユーザー主導file persistenceを説明する。
- `.granvas`が再編集可能、SVG / PNG / PDFが派生成果物であることを区別する。

### FR-02: 現在の開発状態

- 現在はearly developmentで、Phase 1の基盤まで完了していると明記する。
- starter UIが残り、Notation editorやImport / Downloadは未実装であることを隠さない。
- production URL、release、完成済み機能を存在するように記載しない。

### FR-03: プロダクト理解

- 主な価値、v0.1の計画機能、明確なnon-goalsを説明する。
- Canonical DemoのGranvas Notation例を掲載する。
- privacy方針として、v0.1は認証・backend・cloud sync・telemetryを持たずbrowser内処理を目指すことを明記する。
- 将来認証providerがSupabase Authであることは将来方針としてのみ記載する。

### FR-04: ローカル開発

- Bun 1.3.xとGitを前提条件として示す。
- clone、install、dev server起動手順をcopy可能なcommandで示す。
- typecheck、lint、unit test、E2E、build、previewのcommandを現在の`package.json`と一致させる。
- Playwright browser導入が必要な場合のcommandを示す。

### FR-05: OSS参加導線

- architecture、specification、roadmap、development guidelinesへの相対linkを設ける。
- Issueをbug report / feature proposalの入口として案内する。
- PR前に関連Issueとsteering / docsを確認する開発フローを簡潔に示す。
- `CONTRIBUTING.md`、`SECURITY.md`、`LICENSE`が未作成であることを正確に示す。

### FR-06: 文書品質

- README本文は英語を主言語とし、世界のOSS利用者が読めるようにする。
- Japanese product taglineを併記してプロジェクトの出自を保つ。
- heading階層、link、code fence、tableがMarkdownとして正しい。
- badgeは実在・検証可能な情報だけに限定し、CI、license、release badgeを追加しない。

## 4. 受け入れ条件

- starter templateの一般説明が削除されている。
- Purpose / Status / Features / Notation / Persistence / Architecture / Getting Started / Commands / Contributing / Security / License / Roadmapが見つけやすい。
- README内の相対file linkがすべて存在する。
- README記載commandが`package.json`および`AGENTS.md`と一致する。
- 未実装機能と実装済み基盤を誤認させない。
- `bun run typecheck`、`bun run lint`、`bun run test:run`、`bun run build`が引き続き成功する。
- Markdownの構造・linkを自動またはscriptで検証する。

## 5. 制約・スコープ外

- `LICENSE`の種類は本作業で決定しない。
- `CONTRIBUTING.md`、`SECURITY.md`、Code of Conduct、GitHub Actionsは本作業で作成しない。
- logo、screenshot、demo GIF、production URLは未確定・未実装のため追加しない。
- source code、runtime behavior、dependency、Vercel設定を変更しない。
- READMEから完成済みproductであると誤認させる表現を避ける。

## 6. 永続文書への影響

既存の`docs/*.md`がREADMEの内容を規定しており、新しい仕様判断は行わないため更新不要とする。`.steering/20260810-initial-implementation/tasklist.md`の「READMEへローカル起動方法とProject file workflowを記載する」だけを完了へ更新する。
