# Phase 8 Visual Export 設計

> 作成日: 2026-08-11
> ステータス: PRレビュー中
> Issue: [#29](https://github.com/dayaa-arch/granvas/issues/29)
> PR: [#30](https://github.com/dayaa-arch/granvas/pull/30)

## 1. 設計方針

Graph applicationが生成するframework-neutralな`GraphExportSceneDto`を唯一の入力とし、Transfer infrastructureがformat固有のbytesへ変換する。DOM snapshotやReact Flow型を渡さず、`GraphExportPort`越しに合成する。

```text
Workspace current projection
  → GraphExportSceneDto
  → Transfer GraphExportPort
      ├─ SVG renderer
      ├─ Canvas PNG adapter
      └─ PDF adapter (dynamic import pdf-lib)
  → FileDownloadPort
```

## 2. 仕様・ADR更新

- `docs/GRANVAS_SPEC_v0.1.md`: visual exporter、certainty、PDF raster strategy、test契約を実装前に具体化する。
- `docs/adr/0005-pdf-generation-with-pdf-lib.md`: `pdf-lib`、jsPDF、PDFKitを比較し、`pdf-lib@1.17.1`を選定する。
- `docs/adr/README.md`: ADR-0005を索引へ追加する。
- `docs/architecture.md` / `functional-design.md` / `repository-structure.md` / `development-guidelines.md` / `glossary.md`: 実装・配置・test・用語を同期する。
- `docs/development-roadmap.md`: Phase 8を実行中、完了時にIssue / PRと結果へ更新する。

## 3. Export scene renderer

既存SVG生成をscene描画の正規実装として整理し、次を追加する。

- `certainty`をTransfer Node / Edge DTOへ追加する。
- scene validation、node center、text wrapping、certainty styleを共通化する。
- SVGでneutral / tentative / confirmed / rejectedをstroke dash、width、badge、text decorationで表す。
- XML metacharacterをescapeし、script / event attribute / foreignObjectを生成しない。

PNG adapterは同じ自己完結SVGをBlob URLからImageへdecodeし、`createPngRenderSize`のpixel寸法でCanvasへ描画する。white backgroundを先に塗り、`toBlob('image/png')`をbytesへ変換する。Object URLは成功・失敗の両方でrevokeする。

## 4. PDF adapter

### 4.1 Library decision

`pdf-lib@1.17.1`を採用する。

- modern browserで動き、Uint8Arrayを直接生成できる。
- PNG埋め込みと任意page sizeを提供する。
- MIT licenseで、server / Node APIを要求しない。
- PDF選択時に`import('pdf-lib')`し、初期application chunkから分離できる。

jsPDFはbrowser向けだがpackage surfaceが大きく、PDFKitはbrowser bundleとstream依存が重い。日本語fontをvector textとして埋め込むとfont assetとfont engineが大幅に増えるため、v0.1はCanvas描画済みPNGをPDFへ埋め込む。代償としてPDF内textは選択できないが、日本語表示の決定性、CSP、bundle、実装境界を優先する。

### 4.2 Page mapping

- 1 CSS px = 0.75 PDF ptとしてpage sizeを計算する。
- page countは1。
- PNGをpage全面へ配置し、white backgroundを維持する。
- metadataへGranvasとrevisionを記録し、source text自体は埋め込まない。

## 5. Composition / UI

- `CompositeGraphExportAdapter`がformatをSVG / PNG / PDF具象へ委譲する。
- `createApplication.ts`だけが具象adapterを生成する。
- Download DialogのPNG / PDFをavailableへ変更する。
- Appは`RenderedGraphFileDto.notices`をsuccess noticeへ追記する。
- visual formatはDocument lifecycleのproject download transitionを呼ばない。

## 6. Test strategy

- pure SVG renderer: geometry、certainty、escaping、invalid scene。
- PNG policy: 2x、ceil、8192 limit、invalid bounds。
- Canvas adapter: browser primitive failure、Blob signature、notice。
- PDF adapter: `%PDF-`、single page、MediaBox、embedded image、dynamic chunk。
- application / workspace: render failure、download failure、dirty不変。
- component: 4 format availabilityとempty Graph disabled。
- E2E: 3 browserで3 visual formatsをdownloadし、signature / content / dirty不変を確認する。
- manual: production buildで日本語・Group・certaintyを含むPNG/PDFを生成し、PDFはPoppler render後に画像確認する。

## 7. Architecture / security

- Domain / ApplicationにDOM、Canvas、Blob、`pdf-lib`型を漏らさない。
- infrastructureから外へは`RenderedGraphFileDto`だけを返す。
- PDF dependencyはTransfer infrastructureだけがdynamic importする。
- input SVGはコード生成可能な固定markupとescaped textだけで構成する。
- 出力中もcurrent source、revision、dirty baselineを変更しない。
