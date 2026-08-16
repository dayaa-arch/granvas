# ADR-0009: Isolated new-tab Project launch

- Status: Accepted
- Date: 2026-08-16
- Phase: 16 New Granvas Tab
- Issue: [#40](https://github.com/dayaa-arch/granvas/issues/40)
- Related: [ADR-0007](0007-temporary-browser-project-recovery.md)

## Context

Granvasはbrowser tabごとにsingle active Projectを持つが、新しいメモを始める操作がない。現在のProjectを残したまま別の作業を始めるには、新しいtabで同じSPAを開き、空Projectとして起動する導線が必要である。

単に新しいtabを開くだけでは、すべてのtabがADR-0007の固定key`granvas:temporary-project:v1`を共有する。新しいtabでTextを編集すると元tabの24時間一時保存を上書きし、どちらかをreloadしたときに別のProjectが復元される。これは新規tabで現在のメモを保持するという要求と、短期復旧のdata loss防止目的に反する。

一方、Project一覧や永続的な複数Project管理を導入するとv0.1のscopeを超える。必要なのは、新規作成操作から開いたtab同士が24時間だけ独立して復元できる最小の識別境界である。

## Decision

Top Barの`新しいGranvas`操作は、同一SPAの`#new` URLを`noopener,noreferrer`付きの新規tabで開く。

新規tabのcomposition rootは次のlaunch contractを適用する。

1. `#new`を検出したら`crypto.randomUUID()`でProject slot IDを生成する。
2. URL fragmentを`#project=<uuid>`へ`history.replaceState`で正規化する。
3. 空Text、name `untitled`、clean stateを初期Projectとする。
4. 24時間一時保存には`granvas:temporary-project:v1:<uuid>`を使用する。
5. reload時はcanonical fragmentから同じslotを解決し、そのslotのvalid recordを空Projectより優先して復元する。

fragmentなしの通常起動は、既存の固定key`granvas:temporary-project:v1`と日本語初期サンプルを引き続き使用する。既存recordのmigrationは行わない。

slot IDはUUID形式のallowlistを満たす場合だけ受理する。URL fragmentを任意のlocalStorage keyとして直接使用しない。Project sourceやnameはURLへ含めない。

各tabは引き続きsingle active Projectだけを持つ。Project一覧、recent history、folder、tab間同期は導入しない。同じcanonical URLを手動複製したtab間の同時編集競合は本決定の対象外とする。

## Consequences

### 得られるもの

- 現在のProjectを変更せず、空のGranvasを1操作で別tabに開始できる。
- 新規tabごとにTextと24時間復元が分離され、元tabを上書きしない。
- fragmentはHTTP requestへ送られないため、Vercel static routing、outbound request 0、serverlessなしを維持できる。
- ADR-0007のpayload schema、24時間TTL、failure policy、dirty lifecycleを変更せず再利用できる。
- 既存の固定keyを維持するため、現在の利用者の一時保存は移行なしで復元される。

### 引き受けるコスト

- 同一originのlocalStorageに期限付きrecordが複数存在し得る。各recordは24時間TTLで個別に失効し、一覧UIは提供しない。
- canonical fragmentを失うと、そのisolated slotをURLから再発見できない。恒久保存は引き続き`.granvas` Downloadで行う。
- 同じ`#project=<uuid>`を複数tabで開くとlast write winsになる。自動競合解決は将来のmulti-document / collaboration設計で扱う。
- `window.open`がbrowser policyで拒否された場合、新規tabは開かない。同期click handlerから呼び、通常のpopup許可条件を満たす。

## Alternatives Considered

### 固定keyを全tabで共有する

実装は最小だが、新規tabの最初の編集が元tabの復旧データを上書きするため採用しない。

### 新規tabでは一時保存を無効にする

元tabは保護できるが、新しいメモだけreload復旧できず、既存の安全性を予告なく失うため採用しない。

### `sessionStorage`でtabを分離する

reloadには耐えるがtabを閉じた後の24時間復旧を満たさない。browserによるopenerからの初期copy挙動にも依存するため採用しない。

### IndexedDBでProject一覧を管理する

検索・一覧・競合・migrationを伴う複数Project管理となり、今回の要求とv0.1 scopeを超えるため採用しない。
