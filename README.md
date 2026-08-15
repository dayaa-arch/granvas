# Granvas

> **Write thoughts. See structure.**  
> 文章を書くように、思考のグラフを書く。

Granvas is an open-source visual thinking editor available as a v0.1 Release Candidate. It lets you describe ideas and relationships in plain text, then projects the current text into a live graph you can read and edit — with the text staying the single source of truth.

ブラウザーでは[Granvas v0.1 Release Candidate](https://granvas.vercel.app)を利用できます。日本語での使い方は、[Granvas 1.0 公式ドキュメント — 完全版](https://dayaa-arch.github.io/granvas/)で案内します。Docs edition 1.0とproduct version v0.1.0は別のversion軸です。

> [!IMPORTANT]
> **Release Candidate:** Phases 0–13, including Visual Export and Release Hardening, are complete for the v0.1 scope. The static Vercel app supports Japanese text editing, live graph projection, certainty markers, Text/Graph navigation, Graph-side authoring, `.granvas` Import/Download, and viewport-independent SVG/PNG/PDF Download. This is not a product v1.0 declaration.

## Why Granvas?

Writing is a natural way to capture thoughts, but prose can make relationships between problems, causes, ideas, and actions difficult to see. Diagramming tools reveal structure, but manual positioning and styling can interrupt the act of thinking.

Granvas is built around a different loop:

```text
write → interpret structure → see the graph → notice something → write again
```

Its core principles are:

- **Text is the source of truth.** The graph is always derived from the current text. Editing the graph rewrites the text; it never gives the graph a second, separate state.
- **Describe meaning, not coordinates.** Notation expresses nodes and relationships; layout is automatic.
- **Keep writing through errors.** Incomplete notation should not remove other valid structures from the current document.
- **Don't throw away the uncertain.** Hypotheses, confirmed findings, and rejected ideas are all expressible, and rejected ones stay visible on the canvas.
- **Users own their projects.** Editable projects are downloaded as local `.granvas` files instead of being tied to an account.
- **No account required in v0.1.** Authentication, cloud sync, collaboration, and backend APIs are outside the first release.

Most of the individual syntax pieces have precedents — Mermaid, D2, nomnoml, and Argdown all cover similar ground. What Granvas combines is narrower: prose is the host document and notation is opt-in with no fences, a half-typed line never blanks the diagram, and uncertainty is part of the language rather than something you annotate around.

## v0.1 capabilities

- Desktop-first split view with a text editor and a live graph.
- Plain text mixed with Granvas Notation.
- Nodes, nested relations, cross relations, groups, and TB/LR flow layouts.
- Certainty markers for tentative, confirmed, and rejected thinking — rejected items stay on the canvas instead of disappearing.
- Live Text → Graph projection with non-destructive diagnostics.
- Graph Node → Text navigation and Text cursor → Graph highlighting.
- Graph-side editing: rename Node labels and Types, change certainty, create Nodes and Edges, add Group membership, delete with an impact preview, and drag to re-parent or detach. Every action rewrites the text as a minimal diff and undoes in one step.
- Pan, zoom, and fit-to-view controls.
- Editable project Import and Download using `.granvas` files.
- Full-graph SVG, PNG, and PDF downloads.
- Dirty-state indicators and warnings before discarding undownloaded changes.
- Static deployment on Vercel with no server functions. Vercel Git Integration automatically deploys reviewed `main` updates to Production.

The following are deliberately outside v0.1: free-form drawing, manual node positioning and coordinate persistence, unlimited browser persistence, multi-document workspaces, accounts, cloud sync, collaboration, AI features, plugins, and mobile or desktop apps.

Dragging a node changes what it *means* — its parent, or which group it belongs to — not where it sits. The layout engine still decides position, and no coordinates are ever written to your `.granvas` file. See [ADR-0001](docs/adr/0001-semantic-node-drag-without-coordinate-persistence.md) for why.

## Granvas Notation

The canonical demo document is:

```granvas
@layout flow TB

# New product idea

Write thoughts. See structure.

[problem @scattered] Customer information is scattered
  -> [cause] Excel files are fragmented
  -> [cause] Team knowledge is siloed

[idea @unify] AI unifies notes and structure
[todo @interview] User interviews

@unify -> @scattered : solves

{Discovery}
  @scattered
  @interview
```

This source produces five nodes, three relations, one group, and a top-to-bottom layout. Lines that are not valid Notation remain ordinary text.

### Certainty

A marker before the type — and on the arrow — records how sure you are. It is orthogonal to the type, so any type can carry any certainty.

```granvas
[problem @churn] Churn is increasing
  !-> [cause] Onboarding takes too long
  ?-> [?hypothesis @price] Price is too high
  ~-> [~cause] The UI looks dated

[!idea @onboarding] Cut first-run setup to three steps
[~idea @discount] Lower the price

@onboarding -> @churn : solves
@price ?-> @churn : maybe
```

| Marker | Meaning |
| --- | --- |
| *(none)* | Unqualified |
| `?` | Tentative — a hypothesis, not yet checked |
| `!` | Confirmed — verified or adopted |
| `~` | Rejected — ruled out, but kept on the canvas |

Rejected items are drawn struck through rather than removed. Keeping a record of what you considered and discarded is the point; to actually remove one, delete the line.

Existing documents are unaffected — `?`, `!`, and `~` were never valid at the start of a type name, so every v0.1 file parses identically. See [ADR-0003](docs/adr/0003-certainty-markers-in-granvas-notation.md).

See the [Granvas v0.1 specification](docs/GRANVAS_SPEC_v0.1.md) for the complete grammar, diagnostics, recovery rules, and canonical output.

## User-owned file workflow

Granvas keeps the active Text in the same browser for up to 24 hours so an accidental reload can be recovered. This is a temporary recovery cache, not durable project ownership.

| Format | Purpose | Editable in Granvas |
| --- | --- | --- |
| `.granvas` | UTF-8 project source used to continue editing later | Yes |
| SVG | Scalable full-graph artifact for documents and the web | No |
| PNG | Raster full-graph artifact | No |
| PDF | Single-page full-graph artifact for sharing and printing | No |

The v0.1 file workflow is:

1. Write or edit a project in the browser.
2. Choose **Download → `.granvas`** to save the editable source locally.
3. Import that `.granvas` file later to continue from the saved text.
4. Choose SVG, PNG, or PDF when a read-only full-graph artifact is needed. PNG uses a 2x white-background Canvas with an 8192px limit; PDF is a single page sized to the graph bounds.

The temporary browser record expires 24 hours after its last successful update and may be unavailable or cleared by private browsing, browser policy, quota, or user action. Download a `.granvas` file to retain work durably or move it between browsers. Graph coordinates, projections, diagnostics, selection, and undo history are never stored in the recovery record.

## Architecture

Granvas is a client-only React SPA organized as a Domain-Driven Design modular monolith with layered boundaries.

```text
Presentation → Application → Domain
                       ↑
Infrastructure ────────┘
```

The application is divided into five bounded contexts:

| Context | Responsibility |
| --- | --- |
| Document | Active source, revision, and dirty lifecycle |
| Notation | Parser, certainty, diagnostics, and source ranges |
| Graph | Semantic graph, automatic layout, and export scene |
| Transfer | Project Import and multi-format Download |
| Workspace | Coordination through published context contracts |

Context internals are private. External code consumes each context through `src/modules/<context>/index.ts`, and ESLint tests enforce Context and Layer boundaries.

### Technology stack

| Area | Technology |
| --- | --- |
| Language | TypeScript 6 |
| UI | React 19 |
| Build | Vite 8 |
| Package manager | Bun 1.3.x |
| Editor | CodeMirror 6 |
| Graph rendering | React Flow (`@xyflow/react`) |
| Graph layout | Dagre (`@dagrejs/dagre`) |
| Unit and component tests | Vitest and React Testing Library |
| End-to-end tests | Playwright: Chromium, Firefox, and WebKit |
| Hosting | Vercel static deployment |

Production delivery uses Vercel's native Git Integration. A reviewed pull request merged into `main` triggers a Production Deployment without storing Vercel credentials in GitHub Actions. The quality workflow remains verification-only.

## Getting started

### Prerequisites

- [Git](https://git-scm.com/)
- [Bun 1.3.x](https://bun.sh/)

### Run locally

```bash
git clone https://github.com/dayaa-arch/granvas.git
cd granvas
bun install
bun run dev
```

Open the local URL printed by Vite. The current app displays the Granvas split editor with a live graph where Node labels and Types can be edited inline.

### Available commands

| Purpose | Command |
| --- | --- |
| Start the development server | `bun run dev` |
| Type-check the project | `bun run typecheck` |
| Run ESLint and architecture boundaries | `bun run lint` |
| Run unit tests in watch mode | `bun run test` |
| Run unit tests once | `bun run test:run` |
| Run unit tests with coverage | `bun run test:coverage` |
| Run the three-browser E2E suite | `bun run e2e` |
| Create a production build | `bun run build` |
| Preview the production build | `bun run preview` |
| Build the official documentation | `bun run docs:build` |
| Preview the official documentation | `bun run docs:preview` |

If Playwright's browser binaries are not installed yet, run:

```bash
bunx playwright install
```

## Project documentation

The README is an entry point; the documents below are the durable source for product and engineering decisions.

- [Product requirements](docs/product-requirements.md)
- [Functional design](docs/functional-design.md)
- [Architecture and technical specification](docs/architecture.md)
- [Repository structure](docs/repository-structure.md)
- [Development guidelines](docs/development-guidelines.md)
- [Ubiquitous language and glossary](docs/glossary.md)
- [Development roadmap](docs/development-roadmap.md)
- [Integrated Granvas v0.1 specification](docs/GRANVAS_SPEC_v0.1.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Agent and repository guidance](AGENTS.md)

## Contributing

Contributions are welcome while the project is being built in public. Because the product contracts are still being implemented, coordination before a large change helps prevent competing assumptions.

1. Read the relevant specification and architecture documents.
2. Search [existing Issues](https://github.com/dayaa-arch/granvas/issues).
3. Open an Issue for a bug or proposal before substantial implementation.
4. Keep changes focused and add tests appropriate to the affected layer.
5. Run type-checking, linting, tests, and the production build before opening a PR.
6. Explain requirements, design impact, verification results, and remaining work in the PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete workflow, verification requirements, and architecture rules. Also follow the [development guidelines](docs/development-guidelines.md) for document-driven changes.

## Security and privacy

The v0.1 design is local-first at runtime:

- Editing, parsing, layout, Import, and Download are intended to remain in the browser after static assets load.
- No telemetry, cloud storage, backend API, account, or authentication is included in v0.1.
- Future authentication, if introduced after v0.1, will use Supabase Auth behind an infrastructure adapter. No Supabase SDK or credentials belong in the current client.
- Imported text and generated labels are treated as untrusted input.

See [SECURITY.md](SECURITY.md) and use GitHub private vulnerability reporting for sensitive reports. Do not publish exploit details, credentials, personal data, or other sensitive material in a public Issue.

## License

Granvas is released under the [MIT License](LICENSE). Production dependency licenses are checked by `bun run licenses:verify`.

## Roadmap

- [x] Phase 0 — Documentation Baseline.
- [x] Phase 1 — Foundation.
- [x] Phase 2 — Document Context.
- [x] Phase 3 — Notation Core.
- [x] Phase 4 — Graph Core.
- [x] Phase 5 — Workspace Core.
- [x] Phase 6 — Transfer Core.
- [x] Phase 7 — Presentation Shell.
- [x] Phase 10 — Notation Certainty: tentative/confirmed/rejected markers for nodes and relations.
- [x] Phase 11 — Source Edit Core: token spans, edit planning, and inline label/Type editing on the graph.
- [x] Phase 12 — Graph Authoring: semantic drag, node creation, edge connection, deletion preview, and nested-child promotion.
- [x] Phase 13 — Japanese UI & Official Documentation: Japanese UI and the official GitHub Pages guide are published.
- [x] Phase 8 — Visual Export: SVG/PNG/PDF full-graph export and three-browser verification.
- [x] Phase 9 — Release Hardening: performance, accessibility, security, OSS, CI, and Vercel production.
- [x] Phase 14 — Temporary Browser Recovery: active Text is recoverable from the same browser for 24 hours.
- [x] Phase 15 — Automatic Vercel Delivery: reviewed `main` merges automatically reach Production.

Phase numbers are assignment order, not execution order. Phases 10–13 were added on 2026-08-11 and run before Phases 8–9; the list above is in execution order.

The [development roadmap](docs/development-roadmap.md) is the source of truth for Phase names, status, history, milestone mapping, and exit criteria.
