# Phase 6 Transfer Core 要求定義

> 作成日: 2026-08-10
> ステータス: 承認省略（継続実装指示）

## 1. 目的

ユーザー所有の`.granvas` Import / Downloadとvisual exportの境界をTransfer Contextへ実装し、untrusted file / graph textをbrowser内で安全に処理する。

## 2. 必須要件

- `DownloadFormat`、MIME、拡張子、file name sanitizationをDomain policyとして定義する。
- Project pickerはname / sizeを先に返し、5 MiB超過時はbytesを読まない。
- `.granvas` extensionを検証し、UTF-8をstrict decodeする。
- 先頭UTF-8 BOMだけを除去し、LF / CRLFとsource本文を維持する。
- `.granvas` Downloadはactive sourceだけをBOMなしUTF-8で生成する。
- Application public contractへ`File` / `Blob` / DOM / Canvas型を出さない。
- `ProjectFilePickerPort`、`FileDownloadPort`、`GraphExportPort`を定義する。
- browser file picker / Blob downloadの具象をInfrastructureへ隔離する。
- SVG exporterはfull scene bounds、Node / Edge / Group / relation labelを含み、すべてのuntrusted文字列をXML escapeする。
- PNG 2x / 8192px上限のscale policyを実装する。

## 3. 受け入れ条件

- extension不正と5 MiB超過は`readBytes()`を呼ばずerror resultになる。
- invalid / truncated / overlong UTF-8を拒否する。
- BOM / emoji / CRLFを含む`.granvas`がround-tripする。
- file nameからpath separator、control character、予約文字を除去し、拡張子を重複させない。
- `.granvas` / SVGのMIMEとbytesが正しい。
- SVGへ`<script>`相当の入力がmarkupとして混入しない。
- typecheck / lint / test / build / E2Eがgreen。

## 4. スコープ外

- PDF library選定・PDF生成（ADR後に実装）。
- Canvas PNG描画具象（scale policyとport contractまで）。
- Download dialog、WorkspaceとのUI結線、dirty lifecycle更新。
- GitHub Actions。

## 5. 永続文書への影響

既存Transfer設計の段階実装であり`docs/*.md`は変更しない。
