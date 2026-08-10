# OSS向けREADME完成 タスクリスト

> 作成日: 2026-08-10  
> ステータス: 完了  
> 開発タイトル: `complete-oss-readme`

## 0. 承認とGit準備

- [x] requirements / design / tasklistの一括承認を得る。
- [x] `READMEをOSSプロジェクト向けに完成させる`Issueを`documentation`ラベルで起票する。
- [x] `main`をfast-forwardで最新化する。
- [x] `docs/complete-oss-readme`branchを作成する。

## 1. README全面改訂

- [x] Vite starter説明を削除する。
- [x] Granvasのtitle、tagline、価値提案を記載する。
- [x] early development / Phase 1完了statusを明記する。
- [x] v0.1の計画機能とnon-goalsを整理する。
- [x] Canonical Granvas Notation exampleを掲載する。
- [x] `.granvas` / SVG / PNG / PDFのfile workflowを説明する。
- [x] architectureとtechnology stackを要約する。
- [x] BunによるGetting Startedを記載する。
- [x] package scripts一覧を記載する。
- [x] 永続文書とroadmapへのlinkを追加する。
- [x] Issue / PRによるcontribution flowを記載する。
- [x] privacy / security方針を記載する。
- [x] license、CONTRIBUTING、SECURITYの未整備状態を明記する。

## 2. 進捗文書更新

- [x] `.steering/20260810-initial-implementation/tasklist.md`のREADME項目を完了へ更新する。
- [x] 本タスクリストを実績に合わせて更新する。
- [x] `docs/*.md`に仕様変更が不要であることを再確認する。

## 3. README検証

- [x] 必須headingが存在することを確認する。
- [x] relative Markdown linkのtargetがすべて存在することを確認する。
- [x] commandが`package.json` / `AGENTS.md`と一致することを確認する。
- [x] starter固有文言が残っていないことを確認する。
- [x] Markdown code fenceが対応していることを確認する。
- [x] 未実装機能を完成済みと表現していないことを確認する。

## 4. 品質チェック

- [x] `bun run typecheck`を成功させる。
- [x] `bun run lint`を成功させる。
- [x] `bun run test:run`を成功させる。
- [x] `bun run build`を成功させる。

## 5. GitHub完了工程

- [x] 意図したファイルだけが変更対象で、機密情報がないことを確認する。
- [x] Conventional Commits形式でIssueをcloseするcommitを作成する。
- [x] branchをoriginへpushする。
- [x] PR `docs: OSS向けREADMEを完成させる`を作成する。
- [x] localとGitHubのcheckがgreenであることを確認する。
- [x] greenの場合に限りsquash mergeし、remote branchを削除する。
- [x] local `main`をfast-forwardで更新する。
- [x] Issueがcloseされ、working treeがcleanであることを確認する。

## 完了条件

- [x] READMEがOSS読者に目的・現在地・導入・設計・参加方法を正確に伝える。
- [x] link / command / Markdown構造の検証に成功する。
- [x] project quality gateがすべてgreenである。
- [x] PR経由で`main`へmerge済みである。
