# Conjure — Visual Walkthrough

Screenshots captured automatically by the Playwright suite in `e2e/screenshots.spec.ts`.
To regenerate: `npm run screenshots` (dev server must be running or will be started automatically).

---

## How Conjure works

```mermaid
flowchart TD
    A([Open Conjure]) --> B[Select Framework\nReact · Vue · Angular]
    B --> C[New Design]
    C --> D[Type a prompt in chat]
    D --> E[AI streams code via tools]
    E --> F{Preview supported?}
    F -->|React / Vue| G[Live iframe preview]
    F -->|Angular| H[Code editor only]
    G --> I[Iterate with follow-up prompts]
    H --> I
    I --> J[Export as Vite ZIP]
```

---

## Core data flow

```mermaid
flowchart LR
    U([User prompt]) --> Chat
    Chat -->|POST\nmessages + VFS + framework| Route[/api/chat]
    Route --> LLM[AI Model\nClaude · local LLM · mock]
    LLM -->|str_replace_editor| VFS[(Virtual\nFile System)]
    LLM -->|file_manager| VFS
    VFS -->|onToolCall mirror| Client[Client VFS]
    Client -->|refreshTrigger| Preview[iframe Preview]
    Route -->|onFinish| DB[(SQLite\nvia Prisma)]
```

---

## Screens

### 1. Empty workspace — light theme

The default view on first load. The left panel shows the live preview area; the right panel is the chat pane. The top bar has the framework selector, export button, project picker, and theme toggle.

![Empty workspace, light theme](screenshots/01-workspace-light.png)

---

### 2. Empty workspace — dark theme

The same layout with the dark theme active. The choice is stored in `localStorage` and applied before first paint with no flash.

![Empty workspace, dark theme](screenshots/02-workspace-dark.png)

---

### 3. Framework selector

Click the framework button in the top bar to switch between React (live preview), Vue (live preview), and Angular (code only). The selection changes the system prompt sent to the AI on the next turn.

![Framework selector open](screenshots/03-framework-selector.png)

---

### 4. Project selector

The project picker lists all saved designs. Type to filter, click to open, or use the trash icon to delete a project with confirmation.

![Project selector open](screenshots/04-project-selector.png)

---

### 5. New project

After clicking **New Design** a project is created in SQLite and the workspace is ready. The chat pane title defaults to "Untitled session" — click it to rename inline.

![New project, empty workspace](screenshots/05-new-project.png)

---

### 6. Prompt typed

Type a description in the chat textarea. Press **Enter** (or the send button) to submit. Shift+Enter adds a newline.

![Prompt typed in chat](screenshots/06-prompt-typed.png)

---

### 7. AI generating

While the model runs (up to 40 agentic steps), the textarea is disabled and the chat shows a streaming response. Tool calls write files directly into the virtual file system.

![AI generating](screenshots/07-generating.png)

---

### 8. Live preview

Once generation finishes, the iframe renders the component. React files are compiled in-browser by Babel standalone and wired through an import map to React on a CDN.

![Live preview with generated component](screenshots/08-preview.png)

---

### 9. Code editor

Switch to the **Code** tab to see the full file tree and a Monaco editor. Editing a file updates the virtual file system; switching back to Preview re-renders.

![Code editor with file tree](screenshots/09-code-editor.png)

---

### 10. Dark theme with generated component

Dark mode works throughout the live preview and the editor, adapting to the Tailwind theme tokens used by the app shell.

![Dark theme with generated component](screenshots/10-dark-preview.png)

---

## Provider fallback chain

```mermaid
flowchart TD
    Start([getLanguageModel]) --> L{LOCAL_LLM_BASE_URL\nset?}
    L -->|Yes| LocalLLM[Local OpenAI-compatible\nOllama · LM Studio · vLLM]
    LocalLLM --> Adapter[NonStreamingToolAdapter\nparses XML tool calls]
    L -->|No| A{ANTHROPIC_API_KEY\nreal key?}
    A -->|Yes| Claude[Anthropic Claude\nclaude-haiku-4-5]
    A -->|No| Mock[Mock provider\ncanned responses\nno network needed]
```

Set providers in `.env` — copy `.env.example` to get started.
See [providers.md](providers.md) for full details.
