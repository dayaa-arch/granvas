# Phase 12 Graph Authoring 要求

> 作成日: 2026-08-11
> ステータス: 承認済み
> Issue: [#23](https://github.com/dayaa-arch/granvas/issues/23)
> Related: `docs/development-roadmap.md` Phase 12、`docs/GRANVAS_SPEC_v0.1.md` §5.4、ADR-0001、ADR-0002

## 1. 目的

Phase 11で確立した「Graph操作 → Notationの最小編集列 → Text更新 → 再投影」の経路へ、Node作成、Edge接続、意味ドラッグ、確信度変更、Node / Edge削除を追加する。

Graphは意味の入力面になるが状態を持たず、Textだけを正本とする。Node座標は一切永続化しない。

## 2. ユーザーストーリー

- ユーザーとして、Graphの空白からNodeを作り、その場でTypeとラベルを指定したい。
- ユーザーとして、Node handleから別NodeへEdgeを接続し、必要な`@id`を自動で付与してほしい。
- ユーザーとして、Nodeを別Node・Group・空白へドラッグし、座標ではなく親子関係やGroup所属を変更したい。
- ユーザーとして、Nodeの確信度をGraph側から変更したい。
- ユーザーとして、Node / Edgeを削除する前に影響範囲を確認し、意図しない連鎖削除を避けたい。
- keyboard利用者として、pointer操作と同じ編集へtoolbar / dialogから到達したい。

## 3. 機能要求

### 3.1 Notation編集コマンド

Phase 11の`set-node-label` / `set-node-type`に加え、以下を`NotationEditor`のpure functionとして実装する。

- `set-node-certainty`
- `create-node`
- `connect-nodes`
- `reparent-node`
- `set-group-membership`
- `delete-node`
- `delete-relation`

すべてのcommandはcurrent sourceとcurrent parse resultだけから、昇順・非重複の`SourceEditPlan`または理由付き`rejected`を返す。

### 3.2 Node作成

- Graph空白のdouble clickで作成dialogを開く。
- 選択Nodeの`Add child`操作、またはNode handleを空白へ引き出す操作でchild Node作成dialogを開く。
- Typeは`node`を初期値とし、labelはユーザー入力を必須とする。
- top-level Nodeはdocument末尾、child Nodeはparent宣言直後、Group内作成はGroup scope末尾へ挿入する。
- sourceのLF / CRLFを保持する。

### 3.3 Edge接続とID採番

- source handleからtarget handleへの接続でCross Relationを作成する。
- keyboard用Connect dialogでsource / target、任意label、certaintyを指定できる。
- endpointに`@id`が無ければNode labelからASCII slugを生成する。
- 英字開始、英数字・`-`・`_`のみ、空slug fallback、既存ID衝突時のsuffixを保証する。
- self-loop / parallel Edgeを許容する。
- duplicate explicit IDにより選択Nodeを一意に参照できない場合は、sourceを変えず拒否する。

### 3.4 意味ドラッグ

- 別Nodeへのdropでparentを変更する。
- Group overlayへのdropでmembershipを追加する。既存membershipは削除しない。
- 空白へのdropで現在scopeのrootへ昇格し、親子関係を解除する。
- subtreeのNested Relation構造とoperator certaintyを保持する。
- 自分自身または子孫へのdropは`cyclic-parent`として拒否する。
- drag中はNode / Groupのdrop候補を非色情報を含めてhighlightする。
- 確定・拒否後はTextから再投影された位置へanimationする。
- `.granvas`へx / yその他の座標を書き込まない。

### 3.5 削除

- Node削除前に、対象Node、Nested descendants、Cross Relation、Group referenceの件数と対象をdialogへ提示する。
- 確定時は宣言行、descendant宣言行、対象Nodeを参照するCross Relation行とGroup reference行を削除する。
- Cross Relation Edge削除はその宣言行だけを削除する。
- Nested Relation Edge削除はchildを消さず、現在scopeのrootへ昇格し、descendantsの相対indentを維持する。
- cancel / Escape時はsource、revision、dirty stateを変更しない。

### 3.6 Keyboard / Accessibility

- Graph authoring toolbarからCreate / Add child / Connect / Move / Group追加 / certainty変更 / Deleteへ到達できる。
- dialogはaccessible name、初期focus、Tab focus trap、Escape cancel、focus returnを持つ。
- 操作成功と`rejected`理由を`aria-live`で通知する。
- pointer drag / connectだけに依存する操作を作らない。

## 4. 受け入れ条件

- [ ] 全Notation commandにround-trip testがあり、再parse結果が意図した構造になる。
- [ ] Graph上でNode作成、Edge接続、Node確信度変更、Node / Edge削除ができる。
- [ ] Node → Node / Group / blankの意味ドラッグがTextへ反映される。
- [ ] 循環parent変更は拒否され、Text・revision・dirty stateが変化しない。
- [ ] Nested Relation Edge削除でchild / descendantsが失われない。
- [ ] Node削除の連鎖対象が確定前に提示される。
- [ ] ID採番が仕様§4.3を満たし、日本語labelと衝突を処理できる。
- [ ] 全操作がCodeMirror 1 transactionで適用され、Undo 1回で戻る。
- [ ] Graph編集前にpending source更新がflushされる。
- [ ] 散文の内容と、編集対象外のNotation行が変化しない。
- [ ] CRLF / emoji / 日本語を含むsourceでoffsetと改行が保持される。
- [ ] Graph編集後の`.granvas`に座標が含まれない。
- [ ] keyboard代替、focus管理、非color-onlyなdrop highlightが成立する。
- [ ] Chromium / Firefox / WebKitのGraph authoring E2Eが成功する。

## 5. 制約

- GraphからText全文を再生成しない。
- Workspace / App / Graph ContextはNotation文字列を組み立てない。
- `SourceRange` / `SourceEditPlan`をGraph Domainへ入れない。
- Notation DomainへReact / CodeMirror / React Flow / DOMを入れない。
- transientなdrag座標をDocument / Notation / Graph application contractへ渡さない。
- 新規dependency、backend、storage、authentication、GitHub Actionsを追加しない。

## 6. 対象外

- 兄弟Nodeの並べ替えdrag。
- Group membershipの削除・別Groupへの暗黙移動。Group dropは追加のみ。
- Node座標の永続化と自由配置。
- Graph上での通常文編集。
- PNG / PDF export、release hardening、GitHub Actions。
