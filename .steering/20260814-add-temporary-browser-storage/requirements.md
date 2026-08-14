# 短期ブラウザ保存 要求

> 作成日: 2026-08-14
> ステータス: 承認済み
> Issue: [#34](https://github.com/dayaa-arch/granvas/issues/34)
> PR: [#35](https://github.com/dayaa-arch/granvas/pull/35)
> Related: `docs/ideas/initial-requirements.md`、`docs/GRANVAS_SPEC_v0.1.md`、`docs/development-roadmap.md`

## 1. 目的

ブラウザをリフレッシュまたは一度閉じたときに、直前まで編集中だったProjectを失わず再開できるようにする。クラウド保存や恒久的なProject管理は導入せず、同一ブラウザ・同一origin内の短期的な復旧手段として提供する。

## 2. ユーザーストーリー

- ユーザーとして、編集中に誤ってリロードしても直前のTextから作業を再開したい。
- ユーザーとして、数時間後または翌日に同じブラウザを開いたとき、24時間以内の作業を復元したい。
- ユーザーとして、一時保存が恒久保存やクラウド同期ではないことを理解し、必要なProjectは引き続き`.granvas`として所有したい。
- プライバシーを重視するユーザーとして、保存対象・保存先・保持期限が限定され、期限切れデータが再利用されないことを期待する。

## 3. 機能要求

### 3.1 一時保存

- active Projectの`name`、Text source、dirty情報、保存時刻、失効時刻、schema versionだけを同一originの`localStorage`へ保存する。
- Text Editorの変更はWorkspaceの120ms projection debounceを待たずに一時保存へ反映する。
- Graph編集、Project Import、`.granvas` Download完了後も一時保存を現在状態へ同期する。
- 保存期限は最終保存成功時刻から24時間とする。編集を続けた場合は期限を24時間先へ更新する。
- Graph、座標、projection、diagnostics、selection、Undo履歴は保存しない。

### 3.2 復元と失効

- application起動時に有効な一時保存があれば、初期サンプルより優先してProjectを復元する。
- 復元後は保存されたdirty情報を維持し、ブラウザ一時保存を`.granvas` Download済みと誤認させない。
- 24時間を過ぎた一時保存、未知schema、壊れたJSON、不正なfieldは破棄し、初期サンプルで安全に起動する。
- 開いているtabでは失効時刻に削除を試み、閉じている間に失効したデータは次回起動時に削除する。
- `localStorage`が利用不可、quota超過、読み書き例外の場合も編集・Import・Downloadを止めない。

### 3.3 UI / 説明

- Status Barに「24時間一時保存」の状態を表示し、利用不可の場合は日本語で判別できるようにする。
- 一時保存から復元した起動では、日本語の`aria-live`通知で復元を知らせる。
- dirty表示の`未ダウンロード / ダウンロード済み`は`.granvas`の所有状態として維持し、一時保存状態と混同しない。
- 公式利用ガイドとREADMEに、同一ブラウザ限定、24時間TTL、private browsing・storage消去・quota等では保証されないことを記載する。

## 4. 受け入れ条件

- [x] Text Editorで変更した直後にreloadしても、最後の入力を含むTextが復元される。
- [x] Graph側で行った意味編集もreload後に同じTextとGraphとして復元される。
- [x] 有効な一時保存が初期サンプルより優先され、Project nameとdirty情報が維持される。
- [x] 最終保存から24時間未満のデータは復元され、24時間以上のデータは削除されて復元されない。
- [x] 壊れた・未知schemaの値でapplicationが停止せず、値を破棄して初期サンプルを表示する。
- [x] `localStorage`のread / write / remove失敗で主要編集フローが継続し、利用不可状態が表示される。
- [x] 保存payloadにGraph座標、projection、diagnostics、selection、Undo履歴が含まれない。
- [x] 一時保存は`.granvas` Downloadのdirty lifecycleを変更しない。
- [x] Chromium / Firefox / WebKitで保存、reload復元、期限切れをE2E確認できる。
- [x] typecheck、lint、unit / component、build、3-browser E2Eがgreenである。

## 5. 制約

- Textを唯一の正本とし、GraphからText全文を再生成しない。
- backend、クラウド同期、account、authentication、telemetry、remote requestを追加しない。
- `localStorage`、`window`、`Date`などのbrowser具象をDomain / Application public contractへ漏らさない。
- storage portはDocument Applicationに定義し、browser adapterはDocument Infrastructureへ置き、`src/app/bootstrap/`で注入する。
- 一時保存は復旧補助であり、恒久保存・複数Project管理・version履歴を提供しない。
- Node座標の非永続化を維持する。

## 6. 対象外

- 保持期間をユーザーが変更する設定UI。
- 複数Project、履歴、snapshot一覧、競合解決。
- tab間のリアルタイム同期。
- IndexedDB migration、Service Worker、offline asset cache。
- cloud storage、Supabase、認証、共同編集。
