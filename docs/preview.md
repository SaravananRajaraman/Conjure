# Live preview

The preview panel renders the current virtual file system inside a sandboxed
`<iframe>` whose `srcdoc` is rebuilt whenever files change (`refreshTrigger`) or
the framework changes. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`)
routes to the right pipeline.

> Both pipelines load runtime libraries from public CDNs (esm.sh, jsDelivr) and
> Tailwind from `cdn.tailwindcss.com`, so the preview needs network access. This
> is by design — nothing is bundled into the app for the preview.

## React pipeline

`src/lib/transform/jsx-transformer.ts`:

1. **Transform** every `.js/.jsx/.ts/.tsx` file with Babel standalone using the
   React preset (and TypeScript preset for `.ts*`), turning JSX into `jsx()`
   calls.
2. **Wire an import map** — each file becomes a blob URL; `react`,
   `react-dom`, and the JSX runtimes point at `esm.sh`. The `@/` alias and
   extensionless variants are all mapped. Missing imports get placeholder
   modules so a partial project still renders.
3. **Mount** — `createPreviewHTML` emits an HTML doc that imports the entry blob
   and renders it with `ReactDOM.createRoot` inside an error boundary. Syntax
   errors are shown inline.

Entry detection prefers `/App.jsx`, then `App.tsx`, `index.*`, `src/App.*`, then
the first `.jsx/.tsx` file.

## Vue pipeline

`src/lib/transform/vue-transformer.ts`:

1. The virtual files are serialized into a JSON map embedded in the iframe HTML
   (with `</script>` escaped so user code can't break out).
2. The iframe loads the Vue 3 runtime (esm.sh) and **`vue3-sfc-loader`**
   (jsDelivr), which bundles `@vue/compiler-sfc`.
3. `loadModule(entry, options)` compiles `.vue` SFCs **in the browser**.
   `pathResolve`/`getFile` resolve the `@/` alias, relative imports, and
   extension fallbacks against the embedded file map; `addStyle` injects
   `<style>` blocks; the root component is mounted with `createApp`.

Entry detection prefers `/App.vue`, then the first root‑level `.vue`, then any
`.vue` (`findVueEntry`).

## Angular

Angular is intentionally **not** previewed live (`previewSupported: false`).
`PreviewFrame` is only rendered for preview‑capable frameworks; for Angular the
workspace shows a "Live preview is React/Vue‑only" panel with a button to open
the Code tab. Reasoning: a real Angular preview requires the JIT compiler,
`zone.js`, `reflect-metadata`, decorators, and DI bootstrap — far heavier than
the single‑file, CDN‑driven approach used here. Use **Export** to get a runnable
Angular project instead.

## Sandboxing

The iframe uses `sandbox="allow-scripts allow-same-origin allow-forms"`.
`allow-same-origin` is required so blob‑URL module imports (React) and the SFC
loader (Vue) work; scripts are still isolated to the iframe document.
