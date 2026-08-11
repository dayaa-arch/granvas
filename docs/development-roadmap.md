# Granvas 開発ロードマップ

> Status: Active
> Target: v0.1
> Updated: 2026-08-11
> Phase Source of Truth: この文書

## 1. 目的と用語

Granvas v0.1の仮説「文章を書く行為と、思考構造を見る行為を一つの連続した体験にできるか」を、検証可能な実装単位へ分割する。

- **Milestone**: 複数Phaseを束ねるrelease-level checkpoint。M0〜M6で表す。
- **Phase**: 原則として1つのsteering、Issue、PRで完結する実装・検証単位。Phase 0〜12で表す。
- **Task**: Phase内の具体的な作業項目。初回実装タスクリストの番号を独立したPhase番号として解釈しない。

Phaseの名称、順序、進捗はこの文書を正本とする。完了済みsteering、Issue、PRは履歴であるため改名せず、本書の対応表から追跡する。

**Phase番号は採番順であり、実行順ではない。** 実行順は§2のMilestoneと§3のstatus表に従う。Phase 10〜12はPhase 8〜9より後に採番されたが、先に実行する。

## 2. Release Milestones

```mermaid
flowchart LR
    M0["M0 Documentation Baseline<br/>Phase 0"] --> M1["M1 Projection Core<br/>Phase 1–4"]
    M1 --> M2["M2 Workspace Core<br/>Phase 5"]
    M2 --> M3["M3 Transfer & Presentation<br/>Phase 6–7"]
    M3 --> M4["M4 Authoring Core<br/>Phase 10–12"]
    M4 --> M5["M5 Visual Export<br/>Phase 8"]
    M5 --> M6["M6 Vercel Release Candidate<br/>Phase 9"]
```

| Milestone | 対象Phase | Exit |
| --- | --- | --- |
| M0 Documentation Baseline | Phase 0 | 要求、仕様、基本設計、開発規約が承認済み |
| M1 Projection Core | Phase 1〜4 | Textから決定的なPositioned Graphを生成可能 |
| M2 Workspace Core | Phase 5 | revision整合性とText / Graph往復がapplication contractで成立 |
| M3 Transfer & Presentation | Phase 6〜7 | browser上で編集、投影、`.granvas`保存・再開、SVG共有が可能 |
| M4 Authoring Core | Phase 10〜12 | 確信度を記法で表現でき、Graph操作がTextの最小差分として反映される |
| M5 Visual Export | Phase 8 | SVG / PNG / PDFへfull Graphを出力可能 |
| M6 Vercel Release Candidate | Phase 9 | DoD、OSS、品質、production検証をすべて完了 |

## 3. Phase Status / History

| Phase | 名称 | 状態 | 実行順 | Steering | Issue / PR |
| --- | --- | --- | --- | --- | --- |
| 0 | Documentation Baseline | 完了 | 1 | `.steering/20260810-initial-implementation/` | baselineは[PR #2](https://github.com/dayaa-arch/granvas/pull/2)に包含 |
| 1 | Foundation | 完了 | 2 | `.steering/20260810-phase-1-foundation/` | [Issue #1](https://github.com/dayaa-arch/granvas/issues/1) / [PR #2](https://github.com/dayaa-arch/granvas/pull/2) |
| 2 | Document Context | 完了 | 3 | `.steering/20260810-phase-2-document-context/` | [Issue #5](https://github.com/dayaa-arch/granvas/issues/5) / [PR #6](https://github.com/dayaa-arch/granvas/pull/6) |
| 3 | Notation Core | 完了 | 4 | `.steering/20260810-phase-3-notation-core/` | [Issue #7](https://github.com/dayaa-arch/granvas/issues/7) / [PR #8](https://github.com/dayaa-arch/granvas/pull/8) |
| 4 | Graph Core | 完了 | 5 | `.steering/20260810-phase-4-graph-core/` | [Issue #9](https://github.com/dayaa-arch/granvas/issues/9) / [PR #10](https://github.com/dayaa-arch/granvas/pull/10) |
| 5 | Workspace Core | 完了 | 6 | `.steering/20260810-phase-5-workspace-core/` | [Issue #11](https://github.com/dayaa-arch/granvas/issues/11) / [PR #12](https://github.com/dayaa-arch/granvas/pull/12) |
| 6 | Transfer Core | 完了 | 7 | `.steering/20260810-phase-6-transfer-core/` | [Issue #13](https://github.com/dayaa-arch/granvas/issues/13) / [PR #14](https://github.com/dayaa-arch/granvas/pull/14) |
| 7 | Presentation Shell | 完了 | 8 | `.steering/20260810-phase-7-presentation-shell/` | [Issue #15](https://github.com/dayaa-arch/granvas/issues/15) / [PR #16](https://github.com/dayaa-arch/granvas/pull/16) |
| 10 | Notation Certainty | 実装完了・PR準備中 | 9 | `.steering/20260811-phase-10-notation-certainty/` | [Issue #19](https://github.com/dayaa-arch/granvas/issues/19) |
| 11 | Source Edit Core | 未着手 | 10 | 作業開始時に新規作成 | 未起票 |
| 12 | Graph Authoring | 未着手 | 11 | 作業開始時に新規作成 | 未起票 |
| 8 | Visual Export | 未着手 | 12 | 作業開始時に新規作成 | 未起票 |
| 9 | Release Hardening | 未着手 | 13 | 作業開始時に新規作成 | 未起票 |

**Phase 10 Notation Certainty**の実装と検証は完了し、PR準備中である。merge後の次の実装Phaseは**Phase 11 Source Edit Core**とする。GitHub Actionsはユーザー指示により後回しとし、Phase 9の未完了項目として保持する。

### 3.1 Scope Change: 2026-08-11

v0.1のscopeへ**Authoring Core（Phase 10〜12）を追加**し、Phase 8 / 9より先に実行する決定を行った。

背景: Phase 7完了時点のGranvasはText → Graphの一方向投影であり、記法の構文プリミティブはすべて既存の軽量記法（Mermaid / D2 / nomnoml / Argdown）に先行事例がある。この状態でreleaseすると、Granvasの説明が「Mermaid + 散文混在 + エラー耐性」で言い尽くされ、記法にも体験にも独自性が立たない。差別化の中核となる2点をrelease前に実装する。

1. 未確定・仮説を一級市民にする記法（Phase 10）。既存の軽量記法はすべて確定した構造を描く言語であり、ここは実際に空いている領域である。
2. Graph → Textの双方向編集（Phase 11〜12）。text-firstのツールでこれをやり切ったものはほぼ無い。

対応するADR:

- [ADR-0001 Semantic node drag without coordinate persistence](adr/0001-semantic-node-drag-without-coordinate-persistence.md)
- [ADR-0002 Source edit plan as a Notation domain concern](adr/0002-source-edit-plan-as-notation-domain-concern.md)
- [ADR-0003 Certainty markers in Granvas Notation](adr/0003-certainty-markers-in-granvas-notation.md)

Node座標の永続化は引き続き実装しない。ドラッグは座標ではなく意味（親子・Group所属・並び順）の操作として扱う。`Text is the source of truth`（仕様§1.2）と「座標を記法に保存しない」（仕様§2.3 / §4.7）は改訂しない。

## 4. Phase 0: Documentation Baseline

Goal: 実装判断の基準とmodule boundaryを確定する。

Deliverables:

- [x] `docs/ideas/initial-requirements.md`。
- [x] 永続文書7点と`docs/GRANVAS_SPEC_v0.1.md`。
- [x] `AGENTS.md`と初回実装steering。
- [x] Product scope、file persistence、hosting、future auth decisionの整合。
- [x] Context / layer / port、Parser recovery、SourceRange、identity、revision、Group contractの決定。
- [x] ユーザー承認。

## 5. Phase 1: Foundation

Goal: architecture ruleを機械的に守れる開発基盤を作る。

Deliverables:

- [x] Vite / React / TypeScript / Bunとcomposition root。
- [x] path alias、ESLint boundary rule、Vitest、React Testing Library、Playwright。
- [x] Chromium / Firefox / WebKit設定。
- [x] Vercel static SPA設定とproduction CSP contract。
- [x] typecheck、lint、test、build、3-browser E2E。

## 6. Phase 2: Document Context

Goal: active source、revision、clean baseline、dirty / exporting / error lifecycleをframework非依存で管理する。

Deliverables:

- [x] `GranvasDocument`とimmutable transition。
- [x] Create / Update / Replace / project Download lifecycle API。
- [x] stale completion、failure、編集競合のtest。
- [x] storage / browser依存を持たないpublished contract。

## 7. Phase 3: Notation Core

Goal: Granvas Notation v0.1をexecutable specificationとして実装する。

Deliverables:

- [x] line scanner、candidate classifier、indentation / Group scope state machine。
- [x] Node / Relation / Group / Layout parserとdocument-wide resolver。
- [x] DiagnosticDto、recovery、UTF-16 SourceRange、deterministic occurrence key。
- [x] canonical / invalid / Unicode / CRLF / BOM fixtures。
- [x] current source以外の構造を混在させないpure application contract。

## 8. Phase 4: Graph Core

Goal: Notation DTOからframework-independentなGraphと決定的Layoutを生成する。

Deliverables:

- [x] `ThoughtGraph` / Node / Edge / Groupとdeterministic mapping。
- [x] fixed Node bounds、`GraphLayoutPort`、CancellationSignal。
- [x] Dagre Web Worker adapterとlatest result guard。
- [x] Group overlay boundsと`GraphExportSceneDto`。
- [x] duplicate ID、multiple Group membership、parallel Edge、layout performanceのtest。

## 9. Phase 5: Workspace Core

Goal: published application APIを協調し、revision整合性とText / Graph selectionを成立させる。

Deliverables:

- [x] Document → Notation → Graph → Layout pipeline。
- [x] revision propagation、cancellation、latest-wins commit guard。
- [x] `ProjectionSourceMapDto`とselection mapping。
- [x] dirty confirmation付きProject replacement。
- [x] project / visual Download input assemblyとasync race test。

## 10. Phase 6: Transfer Core

Goal: Project Import / Downloadとvisual exportのframework-neutral contractを確立する。

Deliverables:

- [x] Download format、file name、MIME、PNG上限policy。
- [x] `.granvas` extension / 5 MiB / strict UTF-8 / BOM validation。
- [x] Project picker、Blob download、Graph export ports。
- [x] `.granvas` Download / Import round-trip。
- [x] SVG exporter、XML escaping、XSS / failure contract test。

Actual Canvas PNG生成とPDF生成はPhase 8へ分離する。

## 11. Phase 7: Presentation Shell

Goal: TextとGraphを往復できるdesktop-first Web editorを完成させる。

Deliverables:

- [x] Top Bar、SplitPane、StatusBar、Download Dialog。
- [x] CodeMirror editor、syntax highlight、diagnostic gutter、IME対応。
- [x] read-only React Flow Graph、Group overlay、Pan / Zoom / Fit View。
- [x] Text ↔ Graph selectionとkeyboard activation。
- [x] Import、`.granvas` / SVG Download、dirty warning。
- [x] component / accessibility testと3-browser E2E。

## 12. Phase 10: Notation Certainty

Goal: 未確定・仮説・棄却をNotationの一級市民として表現し、Text → Graphへ投影する。記法の追加のみを対象とし、Graph側からの操作はPhase 11以降で扱う。

決定の根拠は[ADR-0003](adr/0003-certainty-markers-in-granvas-notation.md)。

Deliverables:

- [x] Node確信度マーカー`[?type]` / `[!type]` / `[~type]`のscanと`certainty`付与。
- [x] Relation operator `?->` / `!->` / `~->`のcandidate分類と解析。
- [x] `GNV014_INVALID_CERTAINTY_MARKER`とrecovery規則。
- [x] `GraphNode.certainty` / `GraphEdge.certainty`のGraph Domainへの伝播。
- [x] 4状態を色以外の手段で判別できるNode / Edge表示とsyntax highlight。
- [x] certainty fixtureと、Phase 3既存fixtureが無改変で通ることの後方互換test。

Exit Criteria:

- [x] 既存の`.granvas`の意味構造が変化せず、追加された`certainty`がすべて`neutral`になる。
- [x] rejectedなNode / EdgeがGraphから消えず、棄却として表示される。
- [x] 確信度をcolorだけに依存せず判別できる（WCAG 2.2 AA）。
- [x] 4状態がText → Graphへ決定的に投影される。

## 13. Phase 11: Source Edit Core

Goal: Graph操作をTextの最小差分へ変換する経路を、最小の編集操作ひとつで縦に貫通させる。

対象UI操作は**Graph上のNodeラベル / 型のインライン編集だけ**に絞る。ラベル編集は単一トークンの置換で済むためパッチ生成が最も単純でありながら、「Graphを触るとTextが変わり、Graphが更新される」往復の手応えが完全に得られる。ここで配線・再解析・再選択・undoを固めてから、Phase 12で難しい操作を積む。

決定の根拠は[ADR-0002](adr/0002-source-edit-plan-as-notation-domain-concern.md)。

Deliverables:

- [ ] `ParsedNode` / `ParsedRelation` / `ParsedGroup`へのtoken単位`spans`追加（既存フィールドは不変）。
- [ ] Notation domainの`NotationEditor`と`SourceEditPlan`、`planSetNodeLabel` / `planSetNodeType`。
- [ ] `ProjectionSourceMapDto`のkey対応（`nodeKeys`）とindex対応の廃止。
- [ ] `GranvasEditorHandle.applyEdits`によるパッチ適用経路。全文置換経路はImport用に維持する。
- [ ] Workspace `applyGraphEdit`と、編集後のcaret / selection再解決。
- [ ] Graph Nodeのラベル / 型インライン編集UI（Enter確定 / Escape取消 / IME中は抑止）。
- [ ] plan適用 → 再parseのround-trip testと、散文が変化しないことのtest。

Exit Criteria:

- [ ] Graph上のラベル編集がTextの該当行だけを書き換える。
- [ ] 無関係な行と散文が一切変化しない。
- [ ] Graph編集がUndo 1回で戻る。
- [ ] debounce中の編集でもoffsetがずれない（編集前にpending sourceをflushする）。
- [ ] Notation domainがReact / CodeMirror / React Flowをimportしない。

## 14. Phase 12: Graph Authoring

Goal: 意味ドラッグ、Node作成、Edge接続、削除をGraph側から行い、すべてをTextへ反映する。座標は永続化しない。

決定の根拠は[ADR-0001](adr/0001-semantic-node-drag-without-coordinate-persistence.md)。各項目は独立して出荷可能な順に並べる。

Deliverables:

- [ ] 意味ドラッグ: 別Nodeへのdropで親付け替え、Group overlayへのdropでmembership追加、空白へのdropで親子解除。
- [ ] 循環する親付け替えの拒否と、拒否理由の通知（Textは変更しない）。
- [ ] drop先候補のハイライトと、確定後の再配置アニメーション（ADR-0001のConsequencesにより実装要件）。
- [ ] Node新規作成: 空白のdouble clickと、既存Nodeのhandle引き出し。
- [ ] Edge作成と`@id`自動採番（仕様§4.3のID規則を満たすslug化・衝突回避）。
- [ ] Node削除の連鎖範囲（Cross Relation行、Group参照行、Nested Relationの子孫）の事前提示と実行。
- [ ] Nested Relation Edge削除時のchild Node昇格（子を消さずindentと`-> `を除去する）。
- [ ] 全操作のround-trip testと`rejected`ケースのtest。
- [ ] Graph編集の3-browser E2E。

Exit Criteria:

- [ ] 全操作が`.granvas`へ座標を書き込まない。
- [ ] 循環する親付け替えが拒否され、Textが変化しない。
- [ ] Nested Relation Edgeの削除でchild Nodeが失われない。
- [ ] 全操作がUndoで戻る。
- [ ] Graph操作前後で散文が保持される。

## 15. Phase 8: Visual Export

Goal: current valid projectionのfull Graphを共有可能な全visual formatへ安全に出力する。

Deliverables:

- [ ] Canvas PNG exporterと2x / 8192px上限通知。
- [ ] PDF generation library ADR。
- [ ] single-page、white background、graph bounds page sizeのPDF exporter。
- [ ] SVG / PNG / PDFがNode、Edge、Group、relation labelを含むことのcontract test。
- [ ] certainty 4状態が各visual formatで色以外の手段でも判別できることのtest。
- [ ] visual Download成功・失敗のいずれでもProjectのdirty stateを変更しないことのtest。
- [ ] SVG / PNG / PDF full-graph Download E2E。

Exit Criteria:

- [ ] SVG / PNG / PDFへviewport非依存のfull Graphを出力できる。
- [ ] untrusted labelが各formatで実行・解釈されない。
- [ ] PNG制限とPDF page boundsが仕様どおりである。
- [ ] 生成・download失敗時にcurrent sourceとdirty stateを維持する。

## 16. Phase 9: Release Hardening

Goal: OSSとしてVercel上で安全かつ再現可能に利用できるrelease candidateを作る。

Deliverables:

- [ ] 500 lines / 200 nodes / 300 edges / 10 groupsのperformance benchmark。
- [ ] input paint、Parser、layout、Graph paintのp95検証。
- [ ] Graph編集操作のplan生成 → 再投影のp95検証。
- [ ] keyboard-only E2EとWCAG 2.2 AA自動検査。
- [ ] CSP、outbound request、bundle dependencyのsecurity検証。
- [ ] canonical example、CONTRIBUTING、SECURITY、OSS license。
- [ ] typecheck / lint / test / build / E2E用GitHub Actions（後回しの明示指示あり）。
- [ ] Vercel production deployment、direct access / reload検証。
- [ ] `docs/GRANVAS_SPEC_v0.1.md`のDefinition of Done完了。

Exit Criteria:

- [ ] localとCIの全quality gateがgreen。
- [ ] productionでruntime outbound requestがない。
- [ ] Vercel production URLでcanonical demoとDownload / Importが動作する。
- [ ] v0.1 Definition of Doneをすべて満たす。

## 17. Known Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Group overlayとDagre配置の不整合 | GroupがNodeを囲めない | member配置後にboundsを計算し、layoutにはGroup parentを使わない |
| 連続入力によるstale layout | TextとGraphが不一致 | revision、cancel、commit前check |
| PDF libraryのbundle増加 | 初期load悪化 | ADRでbundle / vector / license比較、lazy load検討 |
| 大きなImportでUI停止 | data loss / poor UX | 5 MiB hard limit、Worker、validation first |
| `.granvas` Download忘れ | Project喪失 | dirty indicator、Import/New/leave warning |
| Export文字列によるinjection | XSS / corrupt file | framework-neutral scene、sink別escape、CSP |
| Graph編集とinput debounceの競合 | 古いoffsetへpatchを当ててTextを破壊 | 編集前にpending sourceをflushし、planはcurrent revisionのparse resultからのみ生成する |
| 意味ドラッグ後の再配置が「元に戻った」と読まれる | 中核操作の体験を損なう | drop先ハイライトと確定後のアニメーション遷移を実装要件とする（ADR-0001） |
| Node削除の連鎖範囲が想定より広い | 意図しない構造の喪失 | 削除対象を事前提示し、Undo 1回で復元できることを保証する |
| `spans`追加によるParser公開契約の肥大 | 維持コストの増加 | 編集に必要なspanだけを公開し、用途をADR-0002に限定して記録する |
| certaintyマーカーによる既存文書の解析変化 | 後方互換の破壊 | `?` `!` `~` はtype先頭文字として現在invalidであることを前提とし、Phase 3の全fixtureが無改変で通ることをExit Criteriaにする |

## 18. Deferred Work

- Node座標の永続化と自由配置（[ADR-0001](adr/0001-semantic-node-drag-without-coordinate-persistence.md)により意図的に非対応。変更する場合はsuperseding ADRを起こす）。
- 兄弟Nodeの並び替えドラッグ（Phase 12のスコープ内だが初期実装からは外す）。
- Group membershipの「移動」（既定は追加。仕様§4.6が複数所属を許容するため）。
- multi-document workspace、folder、search、backlink。
- account / authentication implementation。
- cloud sync / collaboration。
- AI / plugin / mobile / desktop app。

認証実装を開始する場合のproviderはSupabase Authに決定済みだが、roadmapへの追加はv0.1完了後に別steering / ADRで行う。

## 19. Phase運用規則

- 新しいPhase名と番号は、実装開始前にこの文書へ記載する。
- Phase番号は採番順とし、再利用しない。実行順は§3のstatus表で管理する。
- steering directory、Issue、branch、PRのtitleは本書のPhase名と一致させる。
- 完了済み履歴は改名せず、対応表を更新して追跡可能性を維持する。
- Phase完了時はstatus表、対象Phaseのcheckbox、初回実装タスクリストを同じPRで更新する。
- 仕様の変更を伴うPhaseは、実装開始前にADRまたは`docs/GRANVAS_SPEC_v0.1.md`を更新する（仕様§0）。
