# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # install deps + generate Prisma client + run migrations (first-time)
npm run dev          # dev server (Next.js + Turbopack) on :3000
npm run build        # production build
npm run lint         # ESLint
npx vitest run       # run the whole test suite once (CI-style)
npm run test         # vitest in WATCH mode (note: not a single run)
npm run db:reset     # reset the SQLite database (destructive)
```

Run a single test file or test:

```bash
npx vitest run src/lib/__tests__/file-system.test.ts
npx vitest run -t "createFileWithParents overwrites"   # by test name
```

**Do not run `npm audit fix`.** Dependencies are pinned to a working matrix
(Babel standalone, AI SDK, Prisma, Tailwind v4, and the Angular export
toolchain are all version-sensitive). Update pinned versions deliberately
instead.

## The core loop (read these together)

Conjure turns a chat prompt into files in an in-memory **virtual file system**,
renders them in a sandboxed iframe, and can export a runnable project. The flow
spans several files and is the key thing to understand:

1. `src/lib/contexts/chat-context.tsx` — wraps the AI SDK `useChat`. On **every
   submit** it sends `{ messages, files, projectId, framework }` where `files`
   is a fresh serialization of the current VFS (sending it only at hook-init
   caused stale-edit bugs). `framework` comes from the framework context.
2. `src/app/api/chat/route.ts` — `convertToCoreMessages(messages)`, prepends
   `getGenerationPrompt(framework)`, **rebuilds a server-side
   `VirtualFileSystem` from `files`**, runs `streamText` with the two tools, and
   on finish **persists** the combined messages + serialized VFS to the project.
3. `src/lib/tools/{str-replace,file-manager}.ts` — the only ways the model
   writes files (`str_replace_editor`: create/str_replace/insert/view;
   `file_manager`: rename/delete). They operate on the server VFS.
4. `src/lib/contexts/file-system-context.tsx` — on the client, `onToolCall`
   mirrors each tool call into the client VFS and bumps `refreshTrigger`.
5. `src/components/preview/PreviewFrame.tsx` — rebuilds the iframe `srcdoc`
   whenever `refreshTrigger` or `framework` changes.

`src/lib/file-system.ts` is the `VirtualFileSystem`. Note: `createFileWithParents`
is an **upsert** (overwrites existing files) — models often re-issue `create` to
rewrite a file wholesale on a follow-up, and erroring would silently drop the
change.

## Model provider (`src/lib/provider.ts`)

`getLanguageModel()` selects, in order: **local LLM** (`LOCAL_LLM_BASE_URL`,
OpenAI-compatible e.g. Ollama) → **Anthropic** (`ANTHROPIC_API_KEY`) → **mock**
(canned responses, used in tests/offline). `isMockProvider()` gates `maxSteps`.

Local models (e.g. qwen3-coder via Ollama) often **leak tool calls as
`<function=…>` text** instead of structured calls. `NonStreamingToolAdapter`
generates non-streamed, then `parseXmlToolCalls` recovers that markup and
replays it as real tool calls (tolerant of truncation). Don't "simplify" this
away — it's why local generation works.

## Frameworks & preview

`src/lib/frameworks.ts` is the registry (id, entry file, `previewSupported`).
Per-framework system prompts live in `FRAMEWORK_RULES` in
`src/lib/prompts/generation.tsx`. The prompt's overriding rule: **the model must
write all code through tools and never paste code into chat** — this is enforced
verbosely and intentionally.

Preview pipelines (`PreviewFrame` branches on framework):
- **React** — `src/lib/transform/jsx-transformer.ts`: Babel transforms JSX →
  blob URLs wired through an import map (React from esm.sh), mounted with
  `ReactDOM.createRoot`.
- **Vue** — `src/lib/transform/vue-transformer.ts`: `.vue` SFCs compiled **inside
  the iframe** by `vue3-sfc-loader` against an embedded file map.
- **Angular** — code-only by design (JIT/Zone.js/DI too heavy for the iframe).

Both preview runtimes load from public CDNs, so preview needs network.

## Export (`src/lib/export-project.ts`)

`buildProjectZip(files, framework)` scaffolds a runnable Vite project per
framework (React/Vue/Angular), bundling an MIT `LICENSE`. The Angular scaffold
pins a specific working matrix (Vite 6, `@analogjs/vite-plugin-angular`,
`@angular/build`, `@angular/compiler-cli`, **and `tsconfig.app.json`** — without
it Analog silently emits an empty bundle). React/Vue use Vite 5 plugins.

## Theme & framework state (hydration-sensitive)

`theme-context.tsx` and `framework-context.tsx` are localStorage-backed. They
**must initialize to the SSR-safe default and sync from `localStorage` in a
mount `useEffect`** — reading storage/DOM in the `useState` initializer causes a
hydration mismatch (server renders default, client renders the persisted value).
Theme is applied to `<html>` before paint by `themeNoFlashScript` injected in
`src/app/layout.tsx`; the context syncs React state to it without re-touching
the DOM. Apply this same pattern to any new persisted client preference.

## Conventions

- **Styling:** use Tailwind theme tokens (`bg-background`, `text-foreground`,
  `bg-card`, `text-muted-foreground`, `border-border`, …) so light/dark both
  work — avoid hardcoded `neutral-*`/`gray-*`. Tokens are defined in
  `src/app/globals.css`. Accent is sky/violet.
- **Tests assert UI copy and class names** (e.g. MessageInput/MessageList/
  file-tree). When you change visible text or classes, update the matching test
  in the same change.
- **No authentication exists.** The Prisma schema has only a `Project` model
  (SQLite); projects are not user-scoped. `bcrypt`/`jose` are unused
  scaffolding. The Prisma client is generated to `src/generated/prisma`.

## More docs

`docs/` has deeper references: `architecture.md`, `frameworks.md`, `preview.md`,
`export.md`, `providers.md`, `theming.md`, `development.md`.
