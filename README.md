<div align="center">

# ✦ Conjure

**An AI component studio — describe UI in plain English and get working code, live.**

Generate React, Vue, and Angular components from natural language, preview them
instantly, iterate in chat, and export a runnable project — all running locally
against Ollama (or any OpenAI‑compatible LLM), Anthropic Claude, or a built‑in
mock.

</div>

---

## Highlights

- 🤖 **AI generation** — describe a component; the model writes the files via tools (never pasted into chat).
- 🧩 **Multi‑framework** — generate **React**, **Vue**, or **Angular** from a dropdown.
- 👁️ **Live preview** — instant in‑iframe rendering for **React** (Babel) and **Vue** (SFC compiler). Angular is code‑only.
- 🌗 **Light / dark theme** — switchable and persisted, with no flash on load.
- 🗂️ **Projects** — create, rename (inline title), delete, and switch between saved designs.
- 💾 **Virtual file system** — nothing is written to disk while you work.
- 📦 **One‑click export** — download a runnable Vite project tailored to the selected framework (includes an MIT `LICENSE`).
- 🧪 **Well tested** — ~200 unit tests (Vitest).

## Quick start

**Prerequisites:** Node.js 18+ and npm.

```bash
npm run setup   # install deps, generate Prisma client, run migrations
npm run dev     # start the dev server
```

Open [http://localhost:3000](http://localhost:3000), pick a framework, and
describe a component in the chat.

> **Don't run `npm audit fix`.** Dependencies are pinned to versions that work
> together; `audit fix` can bump them past compatible ranges and break the app.
> See [docs/development.md](docs/development.md#dependency-policy).

## Choosing a model provider

Configure a provider in `.env`. Conjure selects one in this order:

| Priority | Provider | Enabled when |
|----------|----------|--------------|
| 1 | **Local LLM** (Ollama, LM Studio, llama.cpp, vLLM, …) | `LOCAL_LLM_BASE_URL` is set |
| 2 | **Anthropic Claude** | `ANTHROPIC_API_KEY` is a real key |
| 3 | **Mock** (canned responses, no network) | neither of the above |

```bash
# Local model (note the /v1 suffix most servers expect)
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=qwen3-coder:30b

# …or hosted Claude
ANTHROPIC_API_KEY=sk-ant-...
```

The app runs with no configuration at all — it falls back to the mock provider.
See [docs/providers.md](docs/providers.md) for details, including how local
tool‑calling is normalized.

## Screenshots

See [docs/screenshots.md](docs/screenshots.md) for a full visual walkthrough with flow diagrams.

| | |
|---|---|
| ![Light workspace](docs/screenshots/01-workspace-light.png) | ![Dark workspace](docs/screenshots/02-workspace-dark.png) |
| Light theme — empty workspace | Dark theme — empty workspace |
| ![Generating](docs/screenshots/07-generating.png) | ![Preview](docs/screenshots/08-preview.png) |
| AI generating a component | Live preview after generation |

## Documentation

| Doc | What's inside |
|-----|---------------|
| [docs/screenshots.md](docs/screenshots.md) | Visual walkthrough with Mermaid flow diagrams |
| [docs/architecture.md](docs/architecture.md) | How the pieces fit: chat flow, virtual FS, tools, persistence |
| [docs/features.md](docs/features.md) | Full feature tour: generation, projects, theming, watermark |
| [docs/frameworks.md](docs/frameworks.md) | React / Vue / Angular support and how to add a framework |
| [docs/preview.md](docs/preview.md) | The live‑preview pipelines (React Babel + Vue SFC loader) |
| [docs/export.md](docs/export.md) | What each export contains and how to run it |
| [docs/providers.md](docs/providers.md) | Local LLM, Anthropic, mock — and tool‑call handling |
| [docs/development.md](docs/development.md) | Setup, scripts, project layout, testing, conventions |
| [docs/theming.md](docs/theming.md) | Theme tokens and how dark mode works |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma + SQLite · Vercel AI SDK · Monaco Editor · Babel standalone ·
vue3‑sfc‑loader · JSZip · Vitest.

## License

[MIT](LICENSE) — free to use, modify, and distribute. Projects you export are
also MIT‑licensed (each export bundles its own `LICENSE`).

<div align="center"><sub>✦ Built with Conjure</sub></div>
