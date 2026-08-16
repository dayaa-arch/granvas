# 新しいGranvasを新規タブで始める機能 設計

> 作成日: 2026-08-16
> ステータス: 承認済み
> Issue: [#40](https://github.com/dayaa-arch/granvas/issues/40)
> Related: `requirements.md`

## 1. 実装方針

Top Barの`新しいGranvas`操作は、現在のWorkspaceを置換せず、同一SPAを`noopener`付きの新規タブで開く。新規タブの起動時にApp composition rootがURL fragmentを解釈し、空の初期Projectとタブ固有の一時保存adapterを`createApplication()`へ注入する。

```text
Top Bar: 新しいGranvas
  → current URL + #new をnoopener付き新規タブで開く
  → bootstrapが一意なslot IDを生成
  → URLを#project=<slot-id>へreplace
  → localStorage keyをgranvas:temporary-project:v1:<slot-id>へ分離
  → empty Text / untitled / cleanでWorkspace起動
  → 編集後はそのslotだけへ24時間一時保存
```

既存のfragmentなしURLは従来のstorage keyと初期サンプルを使い、既存利用者の復元データを移行なしで維持する。

## 2. Launch contract

### 2.1 URL fragment

- `#new`: 新しいProject slotを要求する一時的なlaunch marker。
- `#project=<slot-id>`: reload時にも同じProject slotを識別するcanonical fragment。
- `<slot-id>`は`crypto.randomUUID()`で生成し、UUID形式のallowlistを満たす値だけを受理する。
- `#new`を処理した直後、`history.replaceState`でcanonical fragmentへ置換し、reloadで別slotが発行されないようにする。
- fragmentはserver requestへ送信されないため、Vercel routingやstatic SPA contractを変更しない。

### 2.2 起動結果

pureなlaunch resolverを`src/app/`配下へ置き、browser objectそのものではなく文字列とID factoryを入力にする。

```ts
type GranvasProjectLaunch =
  | { type: 'default' }
  | {
      type: 'isolated-project'
      slotId: string
      canonicalHash: string
      initialProject: { name: 'untitled'; source: '' }
    }
```

不明または不正なfragmentは`default`へfallbackし、入力値をstorage keyへ直接連結しない。

## 3. Bootstrap / Document Infrastructure

- `BrowserLocalStorageTemporaryProjectAdapter`の既存key注入機能を利用し、新しいstorage schemaやpayloadは導入しない。
- `createApplication()`へ任意の初期Projectと一時保存keyを渡せるcomposition inputを追加する。
- 同じslotにvalidな一時保存がある場合は、空の初期Projectより復元Projectを優先する。
- slotが空の場合だけ、空Text / `untitled` / cleanを初期値としてWorkspaceへ渡す。
- fragmentなし起動は既存の`DEFAULT_PROJECT_SOURCE`と固定keyを使い、動作を変更しない。

## 4. Presentation

- `App.tsx`の`topbar__actions`先頭へ`新しいGranvas`ボタンを追加する。
- click handlerは現在URLの既存fragmentを`#new`へ置換し、`window.open(url, '_blank', 'noopener,noreferrer')`を同期的に呼ぶ。
- visible labelは`新しいGranvas`、accessible nameは`新しいGranvasを新しいタブで開く`とする。
- 現在タブのWorkspace API、flush、Import / New confirmationを呼ばない。
- buttonは既存のquiet action styleを再利用し、focus indicatorと960px minimum layoutを維持する。

## 5. 一時保存と並行タブ

storage key namespace:

```text
default URL               → granvas:temporary-project:v1
#project=<uuid>           → granvas:temporary-project:v1:<uuid>
```

- payload schema、24時間sliding TTL、expired / corrupt cleanup、dirty flagは既存contractのまま。
- expiry timerとclearは注入されたadapter keyだけを対象にする。
- 新規ボタンで作ったtab同士は異なるkeyを使うため相互上書きしない。
- 同じ`#project=<uuid>`を手動で複製したtab間の同時編集競合は対象外とし、Project一覧も提供しない。

## 6. 永続文書への影響

この変更はTop Bar、Project起動、一時保存key contractを拡張するため、実装より先に仕様を更新する。

- `docs/adr/0009-isolated-new-tab-project-launch.md`：新規タブ、URL fragment、isolated recovery slot、既存key互換を決定する。
- `docs/ideas/initial-requirements.md`：現在Projectを保持した新規タブ開始を追加する。
- `docs/GRANVAS_SPEC_v0.1.md`：scope、Top Bar、Project lifecycle、storage key、security、test、DoDを更新する。
- `docs/product-requirements.md`：必須機能、user story、FR / NFRへ追加する。
- `docs/functional-design.md`：Top Bar、launch flow、recovery key分離を追加する。
- `docs/architecture.md`：browser launch boundaryとstorage namespaceを追加する。
- `docs/repository-structure.md`：launch resolverの配置責務を追記する。
- `docs/development-guidelines.md`：launch fragment validationとmulti-tab isolation test規則を追加する。
- `docs/glossary.md`：`新しいGranvas`、Project slotを定義する。
- `docs/development-roadmap.md`：Phase 16 New Granvas Tabを追加する。
- `README.md` / `docs-site/index.html`：利用方法と24時間復元の分離を説明する。
- `docs-site/public/images/workspace-overview.png`：Top Barの新規操作を含む実画面へ更新する。

## 7. Test Strategy

- Launch resolver unit test：default、`#new`、valid `#project=<uuid>`、invalid ID、ID factory異常。
- Bootstrap unit test：空のisolated Project、同slot復元優先、default起動の既存互換、storage unavailable。
- Browser adapter regression：custom keyがread / write / removeの全操作へ使われる。
- Presentation / E2E：button表示、keyboard到達、popup、新規tabの空Text / clean / Node 0件、`window.opener === null`。
- Multi-tab E2E：元tabを編集後に新規tabを開いても元tabが不変、2つの新規tabが別Textをreload復元する。
- Security / accessibility：不正fragmentが任意keyへ到達しない、WCAG 2.2 A / AA自動検査。
- Regression：既存fixed keyのreload復元、Import / Download、runtime outbound 0、Vercel static build。
- Manual browser QA：Top Bar配置、popup、empty editor focus、複数tab、reload、960px幅を確認する。

## 8. Architecture Review

- Domain boundary：Project launchはApp composition root、Text / dirty lifecycleはDocument、storage I/OはDocument Infrastructureが所有する。
- SRP：launch resolverはfragment解釈、adapterはkey-value I/O、bootstrapは注入、Appはuser interactionだけを担当する。
- One-way dependency：Domain / ApplicationからURL、History API、`window.open`、`localStorage`を参照しない。
- Loose coupling：launch DTOへ`Window` / `Location` / `Storage`型を含めず、文字列とframework-neutralな初期値だけを渡す。
- DIP：既存`TemporaryProjectStoragePort`を維持し、slotごとの具象keyはcomposition rootで決定する。

## 9. Security / Privacy / Performance

- `noopener,noreferrer`で新規tabからopenerへの参照を遮断する。
- slot IDをUUID allowlistで検証し、fragmentを任意のstorage keyとして利用しない。
- Project sourceや名前をURLへ含めない。URLはrandom IDだけを保持する。
- sourceは引き続き同一originのbrowser内だけに保存し、networkへ送信しない。
- 新規tab起動時の処理は同期的なID生成・fragment正規化だけとし、既存input / projection performance budgetへ影響させない。
