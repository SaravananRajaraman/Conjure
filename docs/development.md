# Development

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm run setup
```

This installs dependencies, generates the Prisma client, and runs migrations
(SQLite at `prisma/dev.db`).

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server (Next.js + Turbopack) on :3000 |
| `npm run dev:daemon` | Same, but backgrounded with logs in `logs.txt` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Run the Vitest suite |
| `npm run test:e2e` | Run the full Playwright suite |
| `npm run screenshots` | Capture demo screenshots → `docs/screenshots/` |
| `npm run setup` | Install + generate Prisma client + migrate |
| `npm run db:reset` | Reset the database (destructive) |

## Project layout

```
src/
  app/
    api/chat/route.ts      # model + tools + persistence
    layout.tsx             # providers + no-flash theme script
    main-content.tsx       # workspace shell (top bar, panels, watermark)
    page.tsx, [projectId]/ # routes
    providers.tsx          # Theme + Framework providers
  actions/                 # server actions: create/get/list/rename/delete project
  components/              # UI: chat, editor, preview, header, selectors, watermark
  lib/
    contexts/              # file-system, chat, theme, framework contexts
    prompts/generation.tsx # getGenerationPrompt(framework)
    tools/                 # str-replace, file-manager tools
    transform/             # jsx-transformer (React), vue-transformer (Vue)
    file-system.ts         # VirtualFileSystem
    frameworks.ts          # framework registry
    provider.ts            # model selection + local tool-call normalization
    export-project.ts      # framework-aware ZIP export
prisma/schema.prisma       # Project model (SQLite)
docs/                      # this documentation
```

## Testing

Vitest with jsdom and Testing Library. Run all tests:

```bash
npm run test
```

Tests live next to the code in `__tests__/` folders and cover the virtual file
system, transformers, export scaffolds, contexts, and chat UI components. When
you change UI class names or copy that a test asserts, update the test in the
same change.

## Environment / providers

Model selection is configured in `.env`; see [providers.md](providers.md).
With nothing configured, the app uses the mock provider, so it runs offline.

## Dependency policy

**Do not run `npm audit fix`.** Dependencies are pinned to versions that work
together; `audit fix` can bump them past compatible ranges and break the app
(Babel standalone, the AI SDK, Prisma, Tailwind v4, and the Angular export
toolchain are all version‑sensitive). Address security issues by updating the
pinned versions deliberately, and raise anything a scanner flags rather than
auto‑fixing.

## Conventions

- Style with theme tokens (`bg-background`, `text-foreground`, `border-border`,
  `text-muted-foreground`, `bg-card`, …) so light/dark both work — avoid
  hardcoded `neutral-*`/`gray-*` colors. See [theming.md](theming.md).
- The model writes files only through tools; never have it print code in chat
  (the system prompt enforces this).

## Notes / limitations

- **No authentication.** Projects are not user‑scoped; the local SQLite DB is
  shared. Don't expose a deployment publicly without adding auth.
- **Preview needs network** for CDN runtimes (see [preview.md](preview.md)).
