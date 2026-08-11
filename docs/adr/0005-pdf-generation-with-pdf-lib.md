# ADR-0005: PDF generation with pdf-lib

- Status: Accepted
- Date: 2026-08-11
- Phase: 8 Visual Export
- Issue: [#29](https://github.com/dayaa-arch/granvas/issues/29)

## Context

Granvas v0.1はcurrent valid projection全体を、browser内だけでsingle-page PDFへ変換する。日本語のNode label、relation label、Group名、certaintyの視覚表現を壊さず、Vercelのstatic SPA、既存CSP、Context境界を維持する必要がある。

PDFへ文字を直接描く方式では、日本語font assetとfont engineの追加、font license、subset処理、viewer差の検証が必要になる。一方、Graph exportは再編集用formatではなくread-onlyな派生成果物であり、v0.1ではtext selectionより表示の決定性を優先できる。

比較対象は`pdf-lib`、jsPDF、PDFKitとした。

| 候補 | Browser | PNG埋め込み / page size | v0.1での評価 |
| --- | --- | --- | --- |
| `pdf-lib@1.17.1` | modern browser対応 | Uint8Array、PNG埋め込み、任意page sizeを直接扱える | 採用。必要なsurfaceが小さく、MIT |
| jsPDF | browser対応 | 対応 | package surfaceが広く、今回の画像1枚PDFには過剰 |
| PDFKit | browser bundle可能 | 対応 | stream / browser bundleの依存と統合負荷が大きい |

## Decision

`pdf-lib@1.17.1`をTransfer infrastructureへ追加し、PDF選択時だけ`import('pdf-lib')`する。

PDF adapterは共通SVG sceneをCanvasでwhite backgroundのPNGへrasterizeし、そのPNGをPDFの1 page全面へ埋め込む。page sizeはGraph boundsを基準に`1 CSS px = 0.75 PDF pt`で算出する。source textはmetadataへ含めず、title、producer、revisionだけを記録する。

SVG / PNG / PDFは同じframework-neutralな`TransferGraphExportSceneDto`を入力とし、DOM / React Flow viewportのsnapshotを使わない。PNG bitmapは2xを基本とし、各辺8192pxを上限とする。

## Consequences

- 日本語を含むCanvas描画結果がそのままPDFへ入るため、PDF viewerのfont環境に依存しない。
- PDFはsingle-page、white background、full Graph boundsで決定的に生成できる。
- `pdf-lib`はdynamic chunkとなり、PDFを使わない初期loadへ同期読込されない。
- Phase 8のproduction buildではPDF専用chunkは428.24 kB（gzip 178.34 kB）であり、初期entryとは分離される。
- PDF内のGraph文字列は画像であり、選択・検索できない。これはv0.1の明示的なtrade-offとする。
- PDFのvisual回帰はsignature / page boundsのcontract testに加え、Poppler render後の画像確認で補う。
- Canvas / Image / Blob URLはTransfer infrastructure内に閉じ、Application public contractへ漏らさない。

## Alternatives Considered

### Vector text with an embedded Japanese font

検索可能なPDFになるが、font asset、font engine、subset、license、bundleが増えるためv0.1では採用しない。将来、アクセシブルPDFや印刷品質を優先する場合に別ADRで再検討する。

### Browser print dialog

出力sizeとpage countがbrowser / user設定に依存し、Download contractを満たさないため採用しない。

### DOM / React Flow screenshot

viewport、zoom、presentation DOMに依存し、full Graph sceneを正規入力とする境界を壊すため採用しない。
