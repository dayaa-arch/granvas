# Granvas プロダクト要求定義書

> Status: Release Candidate
> Target: v0.1  
> Updated: 2026-08-15
> Source of Truth: `docs/ideas/initial-requirements.md`

## 1. プロダクトビジョン

Granvas は、文章とグラフを「同じ思考の異なる表現」として扱う、オープンソースのビジュアル思考エディタである。

> Write thoughts. See structure.

ユーザーは通常の文章を書く流れを保ちながら、必要な箇所だけ軽量な Granvas Notation で意味と関係を記述する。Text を正本とし、Graph は現在の Text からリアルタイムに導出される。

## 2. 解決する課題

- 文章は書きやすいが、課題・原因・アイデア・行動の関係を俯瞰しにくい。
- 一般的な作図ツールでは配置や装飾の操作が必要になり、思考を書く流れが中断される。
- 構造化記法だけを要求すると、自由なメモと構造化された思考を同じ場所に残しにくい。
- 既存の軽量記法は「確定した構造」を描く言語であり、検証前の仮説や棄却した案を構造として残せない。思考の途中には必ず未確定が含まれる。
- テキストから図を生成するツールは、図を見て気づいたことを図の上で直せない。結局テキストへ戻って該当箇所を探す必要がある。
- クラウドアカウントを前提にすると、試用・自己ホスト・機密メモ利用の敷居が上がる。

## 3. ターゲットユーザー

- メモを書きながら課題の構造を整理したい個人。
- プロダクト企画、調査、設計、振り返りで因果や関連を可視化したい人。
- Markdown に近い軽量な入力体験を好む開発者・知識労働者。
- アカウント登録なしでブラウザ上の思考整理ツールを試したい人。

## 4. プロダクト原則

1. **Text is the source of truth.** Graph は派生表示であり、意味をGraphだけに保存しない。Graph上の操作もTextの書き換えとして実現し、Graph自身に状態を持たせない。
2. **書くことを妨げない。** 未完成構文や一部の誤りがあってもText編集を続けられる。
3. **意味を記述し、見た目は委ねる。** 座標・色・形をNotationへ持ち込まない。ドラッグも座標ではなく意味の操作として扱う。
4. **未確定を捨てない。** 仮説・検証済み・棄却を記法で表現でき、棄却したものは図から消えず棄却として残る。
5. **ユーザーがProjectを所有する。** v0.1の継続可能な保存形式は `.granvas` とする。
6. **アカウント不要。** v0.1は認証・クラウド同期・backend APIに依存しない。
7. **日本語で迷わせない。** 製品UIと公式利用ガイドは日本語を標準とし、Notationのcode tokenとユーザー操作の説明を明確に分ける。

原則 1 と 3 の帰結として、Graph からテキスト全文を再生成することは行わない。通常文が破壊されるためである。Graph 操作は現在のテキストに対する最小の編集列として適用する。

## 5. v0.1 のスコープ

### 5.1 必須機能

- 左Text / 右Graphの分割UIと可変divider。
- 通常文と Granvas Notation の混在編集。
- Node、Nested Relation、Cross Relation、Group、Flow Layoutの解析。
- Node / Relationの確信度（未確定・確定・棄却）の解析と表示。
- TB / LRの自動Layout。
- Text → Graphのリアルタイムprojection。
- Graph Node選択 → 対応Text宣言への移動。
- Textカーソル → 対応Graph Nodeのhighlight。
- Graph上でのNodeラベル / Type編集。
- Graph上でのNode作成、Edge接続、削除。
- 意味ドラッグによる親子関係・Group所属の変更。
- Graph操作をTextの最小差分として反映し、Undoで戻せること。
- syntax highlightと非破壊的diagnostics。
- Pan / Zoom / Fit View。
- `.granvas` ProjectのImport。
- `.granvas` / SVG / PNG / PDFから選択するDownload。
- `.granvas`をImportし、保存時点から編集を再開できること。
- 未ダウンロード変更のdirty表示と、破棄操作・離脱時の警告。
- active Textの24時間一時保存と、reload / 同一browser再訪時の復元。
- Vercel上で利用でき、ローカルでも起動できるOSS Webアプリ。
- visible text、accessible name、通知、error、初期サンプルを含む日本語UI。
- 実装済みの使い方と現在の制約を説明する、GitHub Pages上の日本語公式利用ガイド。

### 5.2 スコープ外

- 自由作図、Node座標の保存、手動配置。ドラッグは意味の操作としてのみ扱う。
- Graph上での通常文の編集。通常文はText paneでのみ編集する。
- 期限なしのbrowser永続化、複数Project履歴、browser間同期。
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

### US-05: 未確定のまま構造にする

ユーザーとして、検証していない仮説や棄却した案を、確定した内容と区別したまま図に残したい。

受け入れ条件:

- Node / Relationに未確定・確定・棄却を記法で付与できる。
- 確信度はNode Typeと独立して指定できる。
- 棄却したNode / EdgeはGraphから消えず、棄却として表示される。
- 確信度をcolorだけに依存せず判別できる。
- 確信度を導入する前に書いた`.granvas`は、同じ構造として解析される。

### US-06: Graphを触って構造を直す

ユーザーとして、図を見て気づいたことを、テキストへ戻らずその場で直したい。

受け入れ条件:

- Graph上でNodeのラベルとTypeを編集できる。
- Graph上でNode作成、Edge接続、削除ができる。
- NodeをドラッグしてほかのNodeへdropすると、親子関係が変わる。
- Graph Group overlayへdropすると、Group所属が変わる。
- 自分の子孫を親にする操作は拒否され、理由が示される。
- どの操作もTextの該当箇所だけを書き換え、通常文と無関係な行を変更しない。
- どの操作もUndo 1回で元に戻る。
- どの操作も`.granvas`へ座標を書き込まない。
- すべての編集操作へkeyboardから到達できる。

### US-07: アカウントなしで利用する

ユーザーとして、登録やクラウド送信なしで利用したい。

受け入れ条件:

- v0.1にsign-in / sign-up UIが存在しない。
- asset load後、編集・Import・Download中のoutbound requestが発生しない。
- telemetryを送信しない。

### US-08: 日本語で使い方を理解する

日本語利用者として、製品の操作とGranvas Notationを日本語のUIと公式利用ガイドから理解したい。

受け入れ条件:

- visible text、accessible name、通知、diagnostic、errorが日本語で表示される。
- 初期Projectの散文とlabelが日本語で、Notation token、Type、Explicit IDはgrammar互換のASCIIを維持する。
- 公式利用ガイドから画面構成、Notation、Graph編集、`.granvas` Download / Import、keyboard操作を学べる。
- 公式利用ガイドは未実装機能を利用可能と表示せず、対応実装とrelease状態を明示する。
- 公式利用ガイドはtracking、analytics、remote font、cookie、backendを使用しない。

### US-09: 誤reloadから作業を復元する

ユーザーとして、Download前に誤ってreloadまたはbrowserを閉じても、短時間であれば同じTextから作業を再開したい。

受け入れ条件:

- Text変更とGraph編集を、同一originのbrowser storageへTextだけ一時保存する。
- 最終保存から24時間未満のProjectを起動時に復元する。
- 24時間以上経過した値、壊れた値、未知schemaは削除して初期Projectを表示する。
- 一時保存は`.granvas` Download済みを意味せず、dirty lifecycleを変更しない。
- storageが利用できなくても編集・Import・Downloadを継続できる。

## 7. 機能要件

| ID | 要件 |
| --- | --- |
| FR-001 | Single active documentをmemory上で管理する |
| FR-002 | Granvas Notation v0.2をcurrent sourceから決定的に解析する |
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
| FR-013 | Node / Relationのcertaintyを解析し、colorに依存せず表示する |
| FR-014 | ParserがNode / Relation / Groupのtoken単位rangeを公開する |
| FR-015 | Graph操作をcurrent sourceへの最小編集列へ変換する |
| FR-016 | 編集規則をNotation domainのpure functionとして所有する |
| FR-017 | Graph編集を1トランザクションで適用し、Undo 1回で戻せるようにする |
| FR-018 | 実行できないGraph操作を理由付きで拒否し、sourceを変更しない |
| FR-019 | Graph編集後も`.granvas`にNode座標を含めない |
| FR-020 | v0.1として有効な既存`.granvas`を同じ構造へ解析する（後方互換） |
| FR-021 | 製品UIのvisible text、accessible name、通知、diagnostic、errorを日本語で提供する |
| FR-022 | 日本語の公式利用ガイドをGitHub Pagesへ静的公開し、実装済みの利用方法と現在の制約を説明する |
| FR-023 | Vercel productionのstatic SPAと公式Docs完全版からv0.1 Release Candidateを利用できる |
| FR-024 | active Projectのname / Text / dirty情報を同一browserへ24時間だけ一時保存し、reload時に復元する |
| FR-025 | 一時保存のinvalid / expired / unavailableを安全に処理し、GraphをTextから再生成する |
| FR-026 | Vercel Git Integrationがreview済み`main`のpushをProductionへ自動deployする |

## 8. 非機能要件

| ID | 要件 |
| --- | --- |
| NFR-001 | 500 lines / 200 nodes / 300 edges / 10 groupsを基準規模とする |
| NFR-002 | debounce終了からGraph paintまでp95 350ms以下を目標とする |
| NFR-003 | Chromium / Firefox / WebKitで主要E2Eを通す |
| NFR-004 | WCAG 2.2 AAを適合目標とし、すべての編集操作へkeyboardから到達できる |
| NFR-005 | Domain / ApplicationへReact・CodeMirror・React Flow・Dagre・browser固有型を漏らさない |
| NFR-006 | production asset load後のoutbound requestを0とする |
| NFR-007 | Import fileのhard limitを5 MiBとする |
| NFR-008 | TypeScript error、lint errorを0とし、production buildを成功させる |
| NFR-009 | Graph編集の確定操作からGraph paintまでp95 350ms以下を目標とする |
| NFR-010 | 編集計画の生成をp95 20ms以下の同期pure functionに収める |
| NFR-011 | Graph編集が通常文と無関係な行を変更しないことをtestで保証する |
| NFR-012 | 公式利用ガイドをresponsiveかつkeyboardで利用可能にし、semantic HTML、heading、alt、focusを備える |
| NFR-013 | 公式利用ガイドへtracking、analytics、remote font、cookie、runtime backend requestを追加しない |
| NFR-014 | Parser p95 50ms、layout p95 200ms、SourceEditPlan p95 20msのrelease benchmarkを満たす |
| NFR-015 | WCAG 2.2 A / AA自動検査、keyboard-only E2E、runtime outbound 0、security header監査をrelease gateにする |
| NFR-016 | 一時保存payloadをversioned schemaとして検証し、Graph・座標・projection・Undo履歴を含めない |
| NFR-017 | browser storage failureがsource mutationをrollbackせず、既存input / projection performance budgetを維持する |
| NFR-018 | deployment credentialをGitHub Actionsへ置かず、production deploymentをsource commit / state / alias / live verificationで追跡する |

## 9. 成功の定義

v0.1の成功は、ユーザーがCanonical Demo相当の文章を自然に入力し、構造をGraphで理解し、Graph側から構造を直し、未確定と棄却を残したまま思考を進め、`.granvas`で保存・再開し、必要に応じてvisual formatを共有できることである。

構文プリミティブの単体は既存の軽量記法（Mermaid / D2 / nomnoml / Argdown）に先行事例がある。Granvasが固有に持つのは次の3点であり、機能の取捨はこの3点を強めるかどうかで判断する。

1. 散文がホストで、記法がopt-inであること。図を書くために別のモードへ入る必要がない。
2. 書きかけでも壊れないこと。candidateのcommit規則と部分回復を言語仕様として定義している。
3. 未確定を一級市民として扱えること。確定した構造だけを描く既存記法との差はここにある。

リリース判定は `docs/GRANVAS_SPEC_v0.1.md` のDefinition of Doneと `docs/development-roadmap.md` のrelease gateに従う。

## 10. ビジネス・配布要件

- source codeを公開し、ローカル起動手順をREADMEへ記載する。
- MIT licenseで公開し、rootへ`LICENSE`、`CONTRIBUTING.md`、`SECURITY.md`を配置する。
- production hostingはVercelを使用する。
- Vercel ProjectをGitHub repositoryへ接続し、Production Branch `main`へのpushを自動でProduction Deploymentする。
- 公式利用ガイドはGitHub Pagesのproject siteとして公開し、product applicationのVercel hostingと分離する。
- GitHub Actionsは品質検証だけを行い、Vercel / Pages deployment credentialやwrite permissionを持たない。
- v0.1では課金、広告、telemetry、利用者アカウントを導入しない。
