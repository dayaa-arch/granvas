# Granvas プロダクト要求定義書

> Status: Draft / Approval Candidate  
> Target: v0.1  
> Updated: 2026-08-10  
> Source of Truth: `docs/ideas/initial-requirements.md`

## 1. プロダクトビジョン

Granvas は、文章とグラフを「同じ思考の異なる表現」として扱う、オープンソースのビジュアル思考エディタである。

> Write thoughts. See structure.

ユーザーは通常の文章を書く流れを保ちながら、必要な箇所だけ軽量な Granvas Notation で意味と関係を記述する。Text を正本とし、Graph は現在の Text からリアルタイムに導出される。

## 2. 解決する課題

- 文章は書きやすいが、課題・原因・アイデア・行動の関係を俯瞰しにくい。
- 一般的な作図ツールでは配置や装飾の操作が必要になり、思考を書く流れが中断される。
- 構造化記法だけを要求すると、自由なメモと構造化された思考を同じ場所に残しにくい。
- クラウドアカウントを前提にすると、試用・自己ホスト・機密メモ利用の敷居が上がる。

## 3. ターゲットユーザー

- メモを書きながら課題の構造を整理したい個人。
- プロダクト企画、調査、設計、振り返りで因果や関連を可視化したい人。
- Markdown に近い軽量な入力体験を好む開発者・知識労働者。
- アカウント登録なしでブラウザ上の思考整理ツールを試したい人。

## 4. プロダクト原則

1. **Text is the source of truth.** Graph は派生表示であり、意味をGraphだけに保存しない。
2. **書くことを妨げない。** 未完成構文や一部の誤りがあってもText編集を続けられる。
3. **意味を記述し、見た目は委ねる。** 座標・色・形をNotationへ持ち込まない。
4. **ユーザーがProjectを所有する。** v0.1の継続可能な保存形式は `.granvas` とする。
5. **アカウント不要。** v0.1は認証・クラウド同期・backend APIに依存しない。

## 5. v0.1 のスコープ

### 5.1 必須機能

- 左Text / 右Graphの分割UIと可変divider。
- 通常文と Granvas Notation の混在編集。
- Node、Nested Relation、Cross Relation、Group、Flow Layoutの解析。
- TB / LRの自動Layout。
- Text → Graphのリアルタイムprojection。
- Graph Node選択 → 対応Text宣言への移動。
- Textカーソル → 対応Graph Nodeのhighlight。
- syntax highlightと非破壊的diagnostics。
- Pan / Zoom / Fit View。
- `.granvas` ProjectのImport。
- `.granvas` / SVG / PNG / PDFから選択するDownload。
- `.granvas`をImportし、保存時点から編集を再開できること。
- 未ダウンロード変更のdirty表示と、破棄操作・離脱時の警告。
- Vercel上で利用でき、ローカルでも起動できるOSS Webアプリ。

### 5.2 スコープ外

- Graph上からのNode / Edge編集、自由作図、座標保存。
- localStorage / IndexedDBへの自動永続化。
- 複数Project管理、folder、検索、backlink。
- アカウント、認証、クラウド同期、共同編集、backend API。
- AI生成、plugin、mobile app、desktop app。
- 完全なMarkdown互換。
- SVG / PNG / PDFからの再編集Import。

### 5.3 将来方針として確定済みの事項

将来認証を導入する場合、認証基盤は **Supabase Auth** とする。v0.1ではprovider選定だけを記録し、Supabase SDK、認証UI、session、環境変数、database、cloud syncは実装しない。

## 6. ユーザーストーリーと受け入れ条件

### US-01: 文章を書きながら構造を見る

ユーザーとして、通常文とNotationを同じEditorで書き、現在の思考構造をGraphで確認したい。

受け入れ条件:

- 通常文は保持されるがGraphには投影されない。
- validなNode / Relation / Groupが入力後350ms以内を目標にGraphへ反映される。
- incomplete candidateがあっても、現在source内の他のvalidな構造は残る。
- 前revisionにしか存在しない構造をcurrent Graphへ混在させない。

### US-02: TextとGraphを往復する

ユーザーとして、Graphで気になったNodeと元の記述を相互に探したい。

受け入れ条件:

- Graph Nodeをclickまたはkeyboardでactivateすると、対応する宣言行全体をEditorで選択する。
- Node宣言内へcursorを置くと、対応Nodeをhighlightする。
- 日本語、emoji、CRLFを含むsourceでも選択位置がずれない。

### US-03: Projectを保存して再開する

ユーザーとして、編集中のProjectを手元へ保存し、後日続きから編集したい。

受け入れ条件:

- Download dialogで `.granvas` を選択できる。
- `.granvas`はactive sourceをUTF-8で保持し、Graph座標や派生データを含めない。
- Downloadした `.granvas`をImportすると、同じTextと意味Graphが再生成される。
- Import失敗時は現在のProjectを変更しない。
- dirtyなProjectをImport / Newで置換する前に確認する。

### US-04: Graphを共有可能な形式で出力する

ユーザーとして、Graphを文書・画像・印刷用に共有したい。

受け入れ条件:

- SVG / PNG / PDFを選択できる。
- visual formatはviewportではなくfull graphを含む。
- Group、Edge、relation labelを含む。
- visual formatのDownloadはProjectのdirty stateを解除しない。
- Graphが空の場合、visual formatを選べない理由を表示する。

### US-05: アカウントなしで利用する

ユーザーとして、登録やクラウド送信なしで利用したい。

受け入れ条件:

- v0.1にsign-in / sign-up UIが存在しない。
- asset load後、編集・Import・Download中のoutbound requestが発生しない。
- telemetryを送信しない。

## 7. 機能要件

| ID | 要件 |
| --- | --- |
| FR-001 | Single active documentをmemory上で管理する |
| FR-002 | Granvas Notation v0.1をcurrent sourceから決定的に解析する |
| FR-003 | Parserはdiagnosticsとpartial resultを同一revisionで返す |
| FR-004 | Semantic GraphとPositioned Graphを分離する |
| FR-005 | Groupを重なり可能なoverlayとして表示する |
| FR-006 | Text / Graphのselection mappingをWorkspaceが所有する |
| FR-007 | 古いparse / layout結果をcurrent projectionへ適用しない |
| FR-008 | `.granvas` Import前にextension・size・UTF-8を検証する |
| FR-009 | Download formatを `.granvas` / SVG / PNG / PDFから選択する |
| FR-010 | Projectのclean / dirty / exporting / errorを表示する |
| FR-011 | Download / Importの文字列をuntrustedとして安全に処理する |
| FR-012 | Vercelへstatic SPAとしてdeployできる |

## 8. 非機能要件

| ID | 要件 |
| --- | --- |
| NFR-001 | 500 lines / 200 nodes / 300 edges / 10 groupsを基準規模とする |
| NFR-002 | debounce終了からGraph paintまでp95 350ms以下を目標とする |
| NFR-003 | Chromium / Firefox / WebKitで主要E2Eを通す |
| NFR-004 | WCAG 2.2 AAを適合目標とする |
| NFR-005 | Domain / ApplicationへReact・CodeMirror・React Flow・Dagre・browser固有型を漏らさない |
| NFR-006 | production asset load後のoutbound requestを0とする |
| NFR-007 | Import fileのhard limitを5 MiBとする |
| NFR-008 | TypeScript error、lint errorを0とし、production buildを成功させる |

## 9. 成功の定義

v0.1の成功は、ユーザーがCanonical Demo相当の文章を自然に入力し、構造をGraphで理解し、`.granvas`で保存・再開し、必要に応じてvisual formatを共有できることである。

リリース判定は `docs/GRANVAS_SPEC_v0.1.md` のDefinition of Doneと `docs/development-roadmap.md` のrelease gateに従う。

## 10. ビジネス・配布要件

- source codeを公開し、ローカル起動手順をREADMEへ記載する。
- public release前にOSS licenseを決定し、`LICENSE`を配置する。
- production hostingはVercelを使用する。
- v0.1では課金、広告、telemetry、利用者アカウントを導入しない。
