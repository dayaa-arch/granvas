# Phase 5 Workspace Core 要求定義

> 作成日: 2026-08-10
> ステータス: 承認省略（継続実装指示）

## 1. 目的

Document / Notation / Graphのpublished Application APIを統合し、current Textから同一revisionのGraph・SourceMap・Diagnosticsを構築するWorkspace Applicationを実装する。

## 2. 必須要件

- Open / source update / projection rebuild use case。
- Document revisionをParseResult、ThoughtGraph、PositionedGraph、SourceMap、Diagnosticsへ伝播する。
- 新revision開始時に旧layoutをcancelし、cancel不能でもstale completionをcommitしない。
- `ProjectionSourceMapDto`と`WorkspaceProjectionDto`のrevision consistency check。
- Graph Node ID → Text range、cursor offset → Graph Node ID selection mapping。
- dirty確認付きProject replacement。未確認時はDocumentを変更しない。
- `.granvas` source / visual `GraphExportSceneDto`のDownload input assembly。
- projection failure時もcurrent source / dirty stateを維持する。

## 3. 受け入れ条件

- canonical sourceをopenし、5 Nodes / 3 Edges / 1 Group / 0 Diagnosticsのprojectionを返す。
- Graph / SourceMap / Diagnosticsがすべてcurrent document revisionと一致する。
- 遅い旧layout完了が速い新layoutのprojectionを上書きしない。
- cancellation listenerが旧jobで発火する。
- Graph Node選択から宣言行range、emoji / CRLF cursorからNode IDを解決できる。
- dirty Projectの未確認replacementはconfirmation-required、確認済みreplacementはcleanな新revisionになる。
- visual download inputはcurrent projectionがない場合拒否し、`.granvas` inputはsourceを保持する。
- typecheck / lint / test / build / E2Eがgreen。

## 4. スコープ外

- Transfer file picker / serializer / browser download。
- UI debounce、CodeMirror / React Flow effect実行、dialog。
- GitHub Actions。

## 5. 永続文書への影響

既存Workspace設計の実装であり`docs/*.md`は変更しない。
