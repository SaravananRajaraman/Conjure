# Features

A tour of what Conjure does and where each piece lives.

## AI component generation

Describe a component in the chat pane. The model implements it by **calling
tools** that write to the virtual file system — it never pastes code into the
chat. Two tools are available:

- `str_replace_editor` — `create`, `str_replace`, `insert`, `view`
- `file_manager` — `rename`, `delete`

Follow‑up messages refine the existing files in place. The system prompt
(`src/lib/prompts/generation.tsx`) forbids code in chat and instructs in‑place
edits, which keeps the preview and the file tree authoritative.

## Multi‑framework generation

A dropdown in the top bar (`FrameworkSelector`) chooses the target framework:

| Framework | Entry file | Live preview |
|-----------|-----------|--------------|
| React | `/App.jsx` | ✅ |
| Vue | `/App.vue` | ✅ |
| Angular | `/app.component.ts` | ❌ (code only) |

The choice is sent to `/api/chat` and selects a framework‑specific system
prompt, so generated files follow that framework's conventions. The selection
is stored in `localStorage` (`conjure-framework`). See
[frameworks.md](frameworks.md).

## Live preview

The left panel renders the current files in a sandboxed iframe:

- **React** — files are compiled with Babel standalone and wired through an
  import map to React on a CDN.
- **Vue** — single‑file components are compiled in the iframe by
  `vue3-sfc-loader`.
- **Angular** — shows a "code‑only" notice with a button to open the Code tab.

Details in [preview.md](preview.md).

## Code view

Toggle to **Code** to see a file tree and a Monaco editor. The editor theme
follows the app theme (light/dark). Edits update the virtual file system.

## Projects

- **New Design** creates a project and navigates to it.
- The **project selector** lists saved projects; each row has a **delete**
  action (with confirmation).
- The **chat‑pane title** is an inline **rename** field — click it, type, press
  Enter.

Projects persist to SQLite via Prisma server actions (`src/actions/`).

## Theming

A sun/moon toggle switches light/dark. The choice is stored in `localStorage`
(`conjure-theme`) and applied before first paint by an inline script (no flash).
First‑time visitors default to their OS preference. See [theming.md](theming.md).

## Export

The **Export** button downloads a ZIP containing a runnable Vite project for the
selected framework, including an MIT `LICENSE`. See [export.md](export.md).

## "Built with Conjure" watermark

A subtle, non‑interactive badge is pinned to the bottom‑right of the workspace
canvas (`src/components/Watermark.tsx`). It overlays the preview/editor without
blocking interaction and adapts to the theme.

## Anonymous work tracking

Work done before a project exists is tracked in memory
(`src/lib/anon-work-tracker.ts`) so it isn't lost when a project is created.
