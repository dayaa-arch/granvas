# ADR-0007: Temporary browser project recovery

- Status: Accepted
- Date: 2026-08-14
- Phase: 14 Temporary Browser Recovery
- Issue: [#34](https://github.com/dayaa-arch/granvas/issues/34)

## Context

Granvas v0.1は`.granvas` Download / Importだけを継続可能な保存手段とし、active Projectをbrowser memoryにだけ保持している。この設計はユーザーがProject fileを所有できる一方、誤ったreloadや短時間の中断でもDownload前のTextをすべて失う。

ユーザーは、恒久的なcloud storageやProject managerではなく、同一browser内に数時間から1日だけ編集内容を保持する復旧手段を要求した。これは`docs/ideas/initial-requirements.md`と統合仕様の「localStorage / IndexedDBへ自動永続化しない」という明示的なscopeを変更するため、保存範囲、期限、layer ownership、dirty lifecycleとの関係を決定する必要がある。

## Decision

active Projectの短期復旧用snapshotを、同一originの`localStorage`へversioned JSONとして保存する。

- keyは`granvas:temporary-project:v1`とする。
- payloadはschema version、Project name、Text source、dirty flag、保存時刻、失効時刻だけを含む。
- Graph、座標、projection、diagnostics、selection、Undo履歴は保存しない。Graphは復元したTextから再投影する。
- TTLは最後に成功したwriteから24時間のsliding expirationとする。
- 開いているtabでは期限到達時に削除を試みる。閉じている間に期限切れとなった値は次回起動時に削除する。
- validなsnapshotはdefault Projectより優先して復元し、保存されたdirty flagを維持する。
- `.granvas` Download / Importを恒久的なProject所有の手段として維持する。一時保存はdirtyをcleanへ変更しない。
- corrupt JSON、未知schema、不正field、期限切れ、clock tamperは復元しない。
- quota、security policy、private browsingその他のread / write / remove failureは編集・Import・Downloadを失敗させず、UIへ一時保存利用不可として示す。

`TemporaryProjectStoragePort`をDocument Applicationに定義し、schema / TTL / error normalizationもApplication serviceが所有する。browser `localStorage` adapterはDocument Infrastructureに置き、`src/app/bootstrap/`で生成・注入する。Workspaceはpublished contractを使い、Text、Graph edit、Import、Download lifecycleの保存timingだけを協調する。

Text Editorのpending sourceは120msのprojection debounce前に保存する。これにより入力直後のreloadでも最後の入力を復元できる。同期writeのinput performance影響をrelease budgetで検証する。

## Consequences

- 誤reloadや24時間以内の再訪から、最後のTextを復元できる。
- browser storageが`.granvas`に代わる恒久保存でないことを、dirty表示と一時保存表示を分離して伝える必要がある。
- localStorageはbrowser / origin / policyに依存し、quotaやuserによる消去で失われる。公式ガイドは保証範囲を明記する。
- TTLは論理的な有効期限である。browserが閉じている間は自動実行できないため、物理削除は次回起動時になる場合がある。
- source sizeに比例する同期serialization / writeが発生するため、既存input paint budgetを継続監視する。
- Document Contextに初めてInfrastructure layerが追加されるが、browser APIはportの背後に隔離される。
- production asset load後のoutbound request 0、serverlessなし、accountなし、Node座標非永続化は維持される。

## Alternatives Considered

### `sessionStorage`を使用する

reloadには耐えるが、tabやbrowserを閉じた後に数時間・翌日まで復元する要求を満たさないため採用しない。

### IndexedDBを使用する

大容量・非同期I/Oには有利だが、single active Text snapshotだけのv0.1に対してschema migration、transaction、async bootstrapの複雑さが大きい。5 MiB近傍のProjectでlocalStorage quotaを超える場合は利用不可として明示し、将来のstorage拡張で再検討する。

### 期限なしでlocalStorageへ保存する

ユーザーが求めた短期保持を超え、共有端末上へProjectを無期限に残すため採用しない。

### `.granvas` Downloadだけを維持する

誤reloadで作業が失われる現在の課題を解決しないため採用しない。
