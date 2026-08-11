# Phase 8 Visual Export 要求

> 作成日: 2026-08-11
> ステータス: PRレビュー中
> Roadmap: `docs/development-roadmap.md` Phase 8
> Issue: [#29](https://github.com/dayaa-arch/granvas/issues/29)
> PR: [#30](https://github.com/dayaa-arch/granvas/pull/30)

## 1. 目的

current revisionの有効なGraph全体を、viewportに依存しないSVG / PNG / PDFとして安全にダウンロードできるようにする。派生成果物の生成・成功・失敗はProjectのdirty stateを変更せず、正本Textを一切変更しない。

## 2. ユーザーストーリー

- ユーザーとして、Graph全体をPNG画像として共有したい。
- ユーザーとして、Graph全体を単一ページPDFとして印刷・配布したい。
- ユーザーとして、確信度、Group、Relation labelをすべてのvisual formatで識別したい。
- ユーザーとして、大きなGraphがPNG上限で縮小された場合に理由を知りたい。
- 日本語利用者として、日本語labelが文字化けせず出力されてほしい。

## 3. 機能要求

### 3.1 共通scene

- `GraphExportSceneDto`のcurrent revision、full bounds、Node / Edge / Group geometryを検証する。
- Transfer published DTOへNode / Edgeのcertaintyを明示的に含める。
- SVG / PNG / PDFはNode、Type、label、Edge、relation label、Group name、certainty 4状態を含む。
- certaintyは線種、太さ、badge、打ち消し等を併用し、colorだけに依存しない。
- source由来文字列を実行せず、XML / Canvas / PDF各sinkでtextとして扱う。

### 3.2 PNG

- Graph全体をwhite background、device-independentな2x scaleでPNG化する。
- bitmapの幅・高さはいずれも8192px以下とする。
- 2xを維持できない場合は上限内へ比例縮小し、日本語noticeをDownload結果へ表示する。
- zero / non-finite bounds、image decode、Canvas、Blob変換失敗を`graph-render-failed`として返す。

### 3.3 PDF

- PDF generation library選定をADR-0005へ記録する。
- PDFはwhite background、Graph boundsに対応するsingle pageとする。
- 日本語を含むGraphをブラウザで描画した画像として埋め込み、viewer固有fontへの依存を避ける。
- PDF libraryはPDF選択時だけdynamic importし、初期bundleへ同期読込しない。
- page bounds、page count、PNG埋め込み、PDF headerをcontract testと実PDF検証で確認する。

### 3.4 UI / lifecycle

- Download DialogでPNG / PDFを利用可能にする。
- Graphが空の場合だけSVG / PNG / PDFをdisabledにする。
- diagnosticsがある場合はvalid projectionだけを出力する説明を維持する。
- format別noticeと日本語errorを通知する。
- visual Downloadの成功・生成失敗・download開始失敗でdirty stateを変更しない。

## 4. 品質要求

- exporter unit / infrastructure contract / application / workspace / component testを追加する。
- Chromium / Firefox / WebKitでSVG / PNG / PDFの実downloadを検証する。
- PNG signature / dimensions、PDF signature / single page / boundsを検証する。
- Popplerで生成PDFをPNGへrenderし、文字化け、clipping、重なりがないことを目視確認する。
- full Graph出力がpan / zoom / viewportへ依存しないことをE2Eで確認する。
- dependency license、bundle差分、CSP compatibilityを監査する。

## 5. 受け入れ条件

- [x] SVG / PNG / PDFがfull Graphを含む。
- [x] Node / Edge / Group / relation label / certainty 4状態を各formatで確認できる。
- [x] PNGは2xを基本とし、8192px上限と縮小noticeを守る。
- [x] PDFはwhite backgroundのsingle pageで、Graph boundsに対応する。
- [x] 日本語とuntrusted labelを安全に出力できる。
- [x] visual Downloadの全経路でsourceとdirty stateを維持する。
- [x] 3-browser E2E、typecheck、lint、unit / component、buildがgreenである。

## 6. 対象外

- SVG / PNG / PDFからの再編集Import。
- 座標、色、用紙サイズをNotationへ追加すること。
- multi-page PDF、印刷設定UI、transparent PNG。
- Graph DOM / React Flow viewportのsnapshot。
