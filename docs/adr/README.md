# Architecture Decision Records

Granvas の設計上の意思決定のうち、後から「なぜこうなっているのか」を問われる可能性があるものを記録する。

## 運用規則

- `docs/GRANVAS_SPEC_v0.1.md` §0 の規定により、仕様変更が必要になった場合は実装を先に変えず、統合仕様書または ADR を先に更新する。
- ファイル名は `NNNN-kebab-case-title.md` とし、番号は採番順で再利用しない。
- Status は `Proposed` / `Accepted` / `Superseded by ADR-NNNN` / `Deprecated` のいずれか。
- 一度 `Accepted` になった ADR は書き換えず、決定が変わった場合は新しい ADR を起こして `Superseded by` を追記する。
- 各 ADR は Context / Decision / Consequences / Alternatives Considered を含める。

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-semantic-node-drag-without-coordinate-persistence.md) | Semantic node drag without coordinate persistence | Accepted | 2026-08-11 |
| [0002](0002-source-edit-plan-as-notation-domain-concern.md) | Source edit plan as a Notation domain concern | Accepted | 2026-08-11 |
| [0003](0003-certainty-markers-in-granvas-notation.md) | Certainty markers in Granvas Notation | Accepted | 2026-08-11 |
| [0004](0004-official-documentation-on-github-pages.md) | Official documentation on GitHub Pages | Accepted | 2026-08-11 |
| [0005](0005-pdf-generation-with-pdf-lib.md) | PDF generation with pdf-lib | Accepted | 2026-08-11 |
| [0006](0006-promote-official-documentation-to-complete-edition.md) | Promote official documentation to complete edition | Accepted | 2026-08-11 |
| [0007](0007-temporary-browser-project-recovery.md) | Temporary browser project recovery | Accepted | 2026-08-14 |
| [0008](0008-automatic-vercel-production-delivery.md) | Automatic Vercel production delivery from main | Accepted | 2026-08-15 |

## 起票が必要と分かっている論点

`docs/architecture.md` §16 の一覧を正本とする。現時点の未起票分は以下。

- 既定 Node size または measure-first layout への変更
- Parser を Web Worker へ移す判断
- State management library 導入
- Node 座標永続化を再検討する場合の ADR-0001 supersede
- Supabase Auth 実装開始時の identity boundary と session policy
