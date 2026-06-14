# Frameworks

Conjure can generate **React**, **Vue**, or **Angular**. The active framework is
chosen in the top‑bar dropdown and stored in `localStorage`
(`conjure-framework`). It is sent with every chat request and selects the system
prompt, so generated code follows that framework's conventions.

The registry lives in `src/lib/frameworks.ts`:

```ts
export const FRAMEWORKS = {
  react:   { entryFile: "/App.jsx",          previewSupported: true  },
  vue:     { entryFile: "/App.vue",          previewSupported: true  },
  angular: { entryFile: "/app.component.ts", previewSupported: false },
};
```

## What each framework generates

| Framework | Entry | Conventions enforced by the prompt |
|-----------|-------|------------------------------------|
| React | `/App.jsx` | JSX + Tailwind; default‑exported root component; `@/` import alias |
| Vue | `/App.vue` | Vue 3 SFCs with `<script setup>` + Tailwind; `@/` alias |
| Angular | `/app.component.ts` | Standalone components, `AppComponent` with `selector: 'app-root'`, inline templates + Tailwind |

The per‑framework rules are defined in `FRAMEWORK_RULES` inside
`src/lib/prompts/generation.tsx`. Shared rules (always use tools, never paste
code in chat, edit in place) apply to all frameworks.

## Live preview support

- **React** and **Vue** render live in the preview iframe.
- **Angular** is **code‑only**: a full in‑browser Angular preview needs the
  Angular JIT compiler, Zone.js, decorator metadata, and DI — too heavy for the
  lightweight iframe approach. The Code tab shows the generated source, and
  `Export` produces a runnable project. See [preview.md](preview.md) for why.

## Export support

All three frameworks export to a runnable Vite project. See [export.md](export.md).

## Adding a new framework

1. **Register it** in `src/lib/frameworks.ts` (`id`, `label`, `entryFile`,
   `extension`, `previewSupported`, `accentClass`).
2. **Add a system prompt** in `FRAMEWORK_RULES` in
   `src/lib/prompts/generation.tsx`.
3. **Preview (optional):** if `previewSupported: true`, add a transformer (see
   `vue-transformer.ts` for the in‑iframe‑compiler pattern) and branch to it in
   `src/components/preview/PreviewFrame.tsx`.
4. **Export:** add a `build<Framework>Zip` scaffold in
   `src/lib/export-project.ts` and a `case` in `buildProjectZip`.
5. **Tests:** extend `src/lib/__tests__/export-project.test.ts` and, if you added
   a preview transformer, add a transformer test.
