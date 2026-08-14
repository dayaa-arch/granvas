# 短期ブラウザ保存 設計

> 作成日: 2026-08-14
> ステータス: 承認済み
> Issue: [#34](https://github.com/dayaa-arch/granvas/issues/34)
> Related: `requirements.md`

## 1. 実装方針

Document Contextへ短期復旧用のApplication serviceとstorage portを追加し、browser `localStorage`の具象adapterをInfrastructureへ隔離する。WorkspaceはDocumentのpublished contractを通じて、Project状態が変わる各経路を一時保存へ同期する。

```text
CodeMirror / Graph / Import / Download
  → App / Workspace
  → TemporaryProjectRecovery application service
  → TemporaryProjectStoragePort
  → BrowserLocalStorageTemporaryProjectAdapter

application bootstrap
  → recovery.load(now)
  → valid: recovered name / source / dirty
  → invalid or expired: remove + default Project
  → Workspace projection rebuild
```

Textだけを正本として保存し、復元後のGraphは通常のParse → Semantic Graph → Layout pipelineで再生成する。

## 2. 保存contract

versioned keyを`granvas:temporary-project:v1`とし、JSON payloadを次の形に限定する。

```ts
type TemporaryProjectRecord = Readonly<{
  schemaVersion: 1
  name: string
  source: string
  dirty: boolean
  savedAt: number
  expiresAt: number
}>
```

- `savedAt` / `expiresAt`はUnix epoch milliseconds。
- `expiresAt = savedAt + 24 hours`。成功したwriteごとにsliding TTLを更新する。
- 読み込み時にobject shape、有限のsafe integer、`expiresAt > savedAt`、最大TTL、name、source、booleanを検証する。
- payloadへrevisionを保存しない。起動したDocumentは新しいruntime revision系列を持つ。
- `dirty`は最後の`.granvas` Import / Download baselineとの関係だけを表す。
- browser storageから与えられる値はuntrusted inputとして扱う。

## 3. Document Context

### 3.1 Application port

`document/application/ports/TemporaryProjectStoragePort.ts`へ、browser型を含まないraw value境界を定義する。

```ts
interface TemporaryProjectStoragePort {
  read(): string | null
  write(value: string): void
  remove(): void
}
```

Application serviceがJSON encode/decode、schema validation、TTL、failure normalizationを所有する。Infrastructureはversioned keyに対する`localStorage.getItem / setItem / removeItem`だけを担当する。

### 3.2 Application service

`TemporaryProjectRecovery.ts`は次を提供する。

- `loadTemporaryProject()`：`restored / empty / unavailable`を返す。invalid / expiredはremoveを試みた後`empty`。
- `storeTemporaryProject(input)`：現在時刻から24時間のrecordを書き、`stored / unavailable`を返す。
- `clearTemporaryProject()`：期限timerまたは明示的なcleanupに使用する。
- clockは`now: () => number`として注入し、testで固定する。

例外はApplication境界で捕捉し、source editingを失敗させない。

### 3.3 Infrastructure adapter

`document/infrastructure/browser/BrowserLocalStorageTemporaryProjectAdapter.ts`を追加する。

- constructorへ`Storage`相当の最小interfaceを注入可能にし、unit testでfakeを使えるようにする。
- defaultはbrowserの`window.localStorage`をcomposition rootから渡す。
- browser API型をDocumentのpublished application DTOへ返さない。

## 4. Workspace / bootstrap

### 4.1 起動復元

`createApplication()`でadapterとrecovery serviceを生成し、Workspace作成前に`loadTemporaryProject()`を実行する。有効なrecordがある場合はname / source / dirtyをWorkspace初期入力へ渡す。

Workspaceはdirty復元時にDocumentをdirtyとして開始し、clean復元時はclean baselineとして開始する。Graph、diagnostics、selectionは保存値を使わず、`openWorkspace()`で再生成する。

`GranvasApplication`へ起動時のrecovery resultをframework-neutralなDTOとして持たせ、Appが復元通知を表示できるようにする。

### 4.2 変更同期

Workspaceへ一時保存serviceをoptional dependencyとして注入し、次の成功経路で現在Projectを保存する。

- pending Text source：`cachePendingSource(source)`でprojection debounce前に`dirty: true`として同期。
- `updateWorkspaceSource`成功時。
- `replaceWorkspaceProject`成功時。
- `applyGraphEdit`成功時。
- `markProjectDownloaded`完了時（dirty情報をcleanへ同期）。

rejected Graph編集、cancelled Import、Download失敗はsourceを変えないため新しいpayloadを書かない。storage失敗はWorkspace snapshotのtemporary storage statusへ反映するが、Document / projectionの成功を巻き戻さない。

## 5. Presentation

- `WorkspaceSnapshotDto`へ`temporaryStorage`状態（`ready / stored / unavailable`と保存・失効時刻）を追加する。
- Status Barへ`24時間一時保存`、保存成功、利用不可を短い日本語で表示する。
- App初回mount時、recovery resultが`restored`なら「24時間の一時保存から作業を復元しました。」を`role=status`で通知する。
- `.granvas` dirty stateは既存表示のまま独立して表示する。
- 期限timerはAppで有効な`expiresAt`まで設定し、期限到達時にstorage clearと状態更新を行う。次の編集成功で新しい期限を設定する。

## 6. 永続文書への影響

この変更は既存の「browser自動永続化なし」と直接矛盾するため、実装より先に仕様変更を記録する。

- `docs/adr/0007-temporary-browser-project-recovery.md`：localStorage、24時間sliding TTL、保存範囲、failure policyを決定する。
- `docs/ideas/initial-requirements.md`：browser自動永続化を短期復旧に限って許可する。
- `docs/GRANVAS_SPEC_v0.1.md`：scope、lifecycle、storage contract、security、DoDを改訂する。
- `docs/product-requirements.md`：scope外記述を置換し、user story / FR / NFRを追加する。
- `docs/functional-design.md`：起動復元・変更同期・UI status flowを追加する。
- `docs/architecture.md`：Document port / infrastructure、localStorage、privacy境界を追加する。
- `docs/repository-structure.md`：Document Infrastructureと配置規則を更新する。
- `docs/development-guidelines.md`：browser storage validation / TTL / failure test規則を追加する。
- `docs/glossary.md`：一時保存、一時復元、失効時刻を追加し、dirtyとの差を明記する。
- `docs/development-roadmap.md`：Phase 14 Temporary Browser Recoveryを追加する。
- `README.md` / `docs-site/index.html`：利用者向けの保存・制約説明を更新する。

## 7. Test Strategy

- Document Application：valid load、sliding TTL、23:59:59、24:00:00、future tamper、invalid JSON / schema / fields、read / write / remove例外。
- Infrastructure：versioned key、get / set / remove委譲、`Storage`例外伝播。
- Workspace：dirty / clean復元、pending source即時保存、Graph edit、Import、Download完了、rejected / failure不変。
- Bootstrap：valid record優先、expired / corrupt fallback、adapter注入。
- Component：Status Barのready / stored / unavailable、復元通知のaccessible role。
- E2E：Text入力直後reload、Graph編集reload、24時間未満復元、期限切れ削除、壊れたpayload fallback、3 browser。
- Existing regression：Import / Download / dirty warning、runtime outbound 0、performance budget、architecture boundary。
- Manual：production buildをbrowserで開き、reload、tab close/open相当、storage削除、private storage failureを確認する。

## 8. Architecture Review

- Domain boundary：Text / dirty lifecycleはDocument、browser APIはDocument Infrastructure、context orchestrationはWorkspaceが所有する。
- SRP：adapterはkey-value I/O、Application serviceはschema / TTL、Workspaceは保存timing、Presentationは通知だけを担当する。
- One-way dependency：Document Infrastructure → Application port、Workspace → Document published contractを維持する。
- Loose coupling：`Storage`、`window`、JSON recordの具象をWorkspace / Domain / public UI contractへ漏らさない。
- DIP：Applicationが定義した`TemporaryProjectStoragePort`へInfrastructure adapterをbootstrapで注入する。

## 9. Security / Privacy / Performance

- sourceはlocal device内だけに保存し、network送信しない。
- storage値はuntrustedとしてparseし、prototypeや追加fieldに依存しない。
- source sizeに比例する同期writeが入力応答budgetを悪化させないかbrowser performance testで確認する。必要なら保存を短いdebounceへ分離し、`beforeunload`で同期flushする。
- quota / security exceptionをuser data mutationのfailureへ昇格させない。
- TTLは論理的な有効期限であり、閉じたbrowserでは次回起動時に物理削除されることを文書化する。
