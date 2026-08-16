# 新しいGranvasを新規タブで始める機能 要求

> 作成日: 2026-08-16
> ステータス: 承認済み
> Issue: [#40](https://github.com/dayaa-arch/granvas/issues/40)
> Related: `docs/ideas/initial-requirements.md`、`docs/GRANVAS_SPEC_v0.1.md`、`docs/development-roadmap.md`

## 1. 目的

現在のGranvasを残したまま、Top Bar右側の操作から新しいメモを別タブで即座に始められるようにする。新規タブは空の`untitled` Projectとして起動し、既存タブのText、Graph、dirty state、24時間一時保存を変更しない。

## 2. ユーザーストーリー

- ユーザーとして、現在のメモを閉じたりImportで置換したりせず、新しいメモを別タブで始めたい。
- ユーザーとして、Top Bar右側の分かりやすいボタンから、1操作で新しいGranvasを開きたい。
- ユーザーとして、複数の新規タブを開いても、各タブの24時間一時保存が互いを上書きしないことを期待する。
- keyboard利用者として、新規作成操作へTabで移動し、Enter / Spaceで実行したい。

## 3. 機能要求

### 3.1 Top Bar操作

- Top Bar右側のプロジェクト操作群へ`新しいGranvas`ボタンを追加する。
- accessible nameから、新しいタブで開く操作であることを判別できるようにする。
- 既存の`プロジェクトを読み込む`、`ダウンロード`操作と視覚的・操作的に一貫させる。

### 3.2 新規タブ起動

- 操作時に同一Granvas applicationを新しいbrowser tabで開く。
- 新規タブは空のText、Project name `untitled`、clean state、空のGraphから開始する。
- 現在のタブはText、Graph、selection、dirty state、viewportを含めて変更しない。
- 現在のProjectを置換しないため、dirty confirmationは表示しない。
- 新規タブからopenerを操作できないよう`noopener`を適用する。

### 3.3 一時保存の分離

- 既存の通常起動URLは従来の`granvas:temporary-project:v1`を使い、24時間復元の後方互換性を維持する。
- `新しいGranvas`から開くタブには推測困難なProject slot IDを発行し、URL fragmentと`granvas:temporary-project:v1:<slot-id>`を対応させる。
- 新規タブをreloadした場合は、そのタブ固有の24時間一時保存から復元する。
- `新しいGranvas`を複数回実行した場合は毎回異なるslotを使い、各タブのTextを相互に上書きしない。
- slot IDはallowlistで検証し、不正なfragmentを任意のstorage keyとして使用しない。

## 4. 受け入れ条件

- [x] Top Bar右側に`新しいGranvas`ボタンが表示される。
- [x] buttonをpointerまたはkeyboardで実行すると、新しいタブでGranvasが開く。
- [x] 新規タブは空の`untitled` Projectとしてclean stateで起動し、Graph Nodeは0件である。
- [x] 新規タブを開いても、元タブのText、dirty state、24時間一時保存が変化しない。
- [x] 2つ以上の新規タブで異なるTextを入力してreloadしても、各タブが自身のTextを復元する。
- [x] 通常URLの既存一時保存は引き続き同じkeyから復元される。
- [x] 不正なlaunch fragmentで任意のlocalStorage keyへアクセスせず、安全に通常起動へfallbackする。
- [x] 新規タブは`window.opener`へアクセスできない。
- [x] visible text、accessible name、公式利用ガイドが日本語で一致する。
- [x] typecheck、lint、unit / component、build、関連E2Eがgreenである。

## 5. 制約

- Textを唯一の正本とし、Graphは空のTextまたは復元Textから投影する。
- backend、cloud storage、account、authentication、telemetry、remote requestを追加しない。
- browser URL、History API、Web Storageの具象をDomain / Application public contractへ漏らさない。
- 24時間TTL、versioned payload、dirty lifecycle、storage failureのnon-blocking policyを維持する。
- browser tabは同時に開けるが、Project一覧、検索、履歴、tab間リアルタイム同期は提供しない。

## 6. 対象外

- 現在タブ内でactive Projectを空Projectへ置換する`New Project`操作。
- browser内のProject一覧、recent Project、名前変更、folder、履歴管理。
- 同じProject slotを開いた複数タブ間の競合解決・リアルタイム同期。
- cloud sync、共同編集、account、認証。
- 新規タブの既定テンプレート選択UI。
