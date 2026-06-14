# Architecture

Conjure is a Next.js 15 (App Router) application. The user describes a component
in chat; a language model writes files into an in‑memory **virtual file system**
by calling tools; those files are rendered in a sandboxed preview iframe and can
be exported as a runnable project.

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Next.js client)                                          │
│                                                                    │
│  ┌────────────┐   tool calls    ┌───────────────────────────────┐ │
│  │ ChatInterface│ ─────────────▶ │ FileSystemContext             │ │
│  │  (useChat)  │ ◀───────────── │  (VirtualFileSystem instance)  │ │
│  └─────┬──────┘   onToolCall    └──────────────┬────────────────┘ │
│        │ POST /api/chat                         │ refreshTrigger    │
│        │ { messages, files, projectId,          ▼                   │
│        │   framework }                  ┌─────────────────┐         │
│        │                                │ PreviewFrame    │         │
│        │                                │  (iframe srcdoc)│         │
│        │                                └─────────────────┘         │
└────────┼───────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  /api/chat  (Edge‑style route handler)                             │
│   1. convertToCoreMessages(messages)                               │
│   2. system prompt = getGenerationPrompt(framework)                │
│   3. rebuild VirtualFileSystem from `files`                        │
│   4. streamText({ model, tools, maxSteps })                        │
│   5. onFinish → persist messages + serialized FS to SQLite         │
└──────────────────────────────────────────────────────────────────┘
         │ getLanguageModel()
         ▼
   Local LLM  /  Anthropic Claude  /  Mock   (see docs/providers.md)
```

## Key modules

| Area | Path | Responsibility |
|------|------|----------------|
| Chat route | `src/app/api/chat/route.ts` | Runs the model with tools, persists results |
| Chat state | `src/lib/contexts/chat-context.tsx` | Wraps the AI SDK `useChat`; sends fresh `files` + `framework` per submit |
| Virtual FS | `src/lib/file-system.ts` | In‑memory file tree (create/read/update/delete/rename, serialize) |
| FS state | `src/lib/contexts/file-system-context.tsx` | React context; mirrors tool calls into the FS and triggers refresh |
| Tools | `src/lib/tools/str-replace.ts`, `src/lib/tools/file-manager.ts` | The two tools the model uses to write files |
| Prompts | `src/lib/prompts/generation.tsx` | `getGenerationPrompt(framework)` — shared rules + per‑framework rules |
| Provider | `src/lib/provider.ts` | Selects/normalizes the model (local/Anthropic/mock) |
| Frameworks | `src/lib/frameworks.ts` | Framework registry (label, entry file, preview support) |
| Preview (React) | `src/lib/transform/jsx-transformer.ts` | Babel JSX transform + import map |
| Preview (Vue) | `src/lib/transform/vue-transformer.ts` | In‑iframe SFC compilation |
| Export | `src/lib/export-project.ts` | Framework‑aware ZIP scaffolds |
| Persistence | `prisma/schema.prisma`, `src/actions/*` | `Project` model + server actions |

## The chat → file → preview loop

1. **Submit.** `chat-context` POSTs `{ messages, files, projectId, framework }`.
   The `files` are a fresh serialization of the current virtual FS on every
   submit, so follow‑up edits operate on up‑to‑date contents.
2. **Model runs with tools.** The route gives the model two tools
   (`str_replace_editor`, `file_manager`) bound to a server‑side
   `VirtualFileSystem` rebuilt from `files`. `maxSteps` lets it create/edit
   several files in one turn.
3. **Client mirrors tool calls.** The AI SDK fires `onToolCall` on the client
   for each call; `file-system-context` applies the same operation to the
   client‑side FS and bumps `refreshTrigger`.
4. **Preview re‑renders.** `PreviewFrame` recomputes the iframe `srcdoc` from
   the current files whenever `refreshTrigger` (or the framework) changes.
5. **Persist.** When the stream finishes, the route saves the combined messages
   and the serialized FS to the project row (if a `projectId` was provided).

## Persistence

A single Prisma `Project` model (SQLite) stores `name`, `messages` (JSON), and
`data` (the serialized virtual FS as JSON). Server actions in `src/actions/`
provide create/get/list/rename/delete. There is **no authentication** today —
projects are not user‑scoped; the `bcrypt`/`jose` dependencies are unused
scaffolding. See [development.md](development.md) before relying on this in a
shared deployment.

## Design notes worth knowing

- **`create` is an upsert.** `VirtualFileSystem.createFileWithParents` overwrites
  an existing file instead of erroring, because models often re‑issue `create`
  to rewrite a file wholesale on a follow‑up.
- **Local tool calls are recovered from text.** Some local models emit tool
  calls as `<function=…>` markup in the text stream; `provider.ts` parses and
  replays them (tolerant of truncation). See [providers.md](providers.md).
- **Fresh files every turn.** The `files` body is sent at submit time, not just
  at hook init, so edits never run against a stale snapshot.
