# Export

The **Export** button packages the current virtual file system into a ZIP
containing a complete, runnable project for the selected framework. The logic is
in `src/lib/export-project.ts` (`buildProjectZip(files, framework)`), and the
download is named `conjure-<framework>-export.zip`.

Every export:

- places your generated files under `src/`, preserving the `@/` → `src` alias;
- includes a Tailwind setup, a `.gitignore`, a framework‑specific `README.md`,
  and an MIT **`LICENSE`** so the code is free to use;
- runs with `npm install && npm run dev`.

## React (Vite + React + Tailwind)

```
package.json · vite.config.js · index.html · postcss.config.js
tailwind.config.js · .gitignore · LICENSE · README.md
src/main.jsx · src/index.css · src/<your files>
```

`src/main.jsx` mounts the detected entry (`@/App` by default) with
`createRoot`. Built and verified with `vite build`.

## Vue (Vite + Vue 3 + Tailwind)

```
package.json · vite.config.js · index.html · postcss.config.js
tailwind.config.js · .gitignore · LICENSE · README.md
src/main.js · src/index.css · src/<your files>
```

`src/main.js` mounts the entry SFC (`@/App.vue`) with `createApp`. Uses
`@vitejs/plugin-vue`. Built and verified with `vite build`.

## Angular (Vite + Analog plugin)

```
package.json · vite.config.ts · index.html · postcss.config.js
tailwind.config.js · tsconfig.json · tsconfig.app.json
.gitignore · LICENSE · README.md
src/main.ts · src/index.css · src/<your files>
```

Runs Angular through Vite via **`@analogjs/vite-plugin-angular`**. `src/main.ts`
bootstraps `AppComponent` with `bootstrapApplication`, mounting into
`<app-root>` in `index.html` — so the generated root component must use
`selector: 'app-root'` (the Angular system prompt enforces this).

**Pinned toolchain.** The Angular export pins a working matrix: Vite 6,
`@analogjs/vite-plugin-angular`, **`@angular/build`**, **`@angular/compiler-cli`**,
and a `tsconfig.app.json` (without it, Analog silently emits an empty bundle).
Angular's tooling is version‑sensitive; a future Angular/Analog major may need
adjustments here. React and Vue exports use the stable Vite 5 plugins.

## Verifying an export

```bash
unzip conjure-<framework>-export.zip -d out && cd out
npm install
npm run build   # or: npm run dev
```

All three frameworks have been verified to build (`vite build`) from a clean
export. The structure of each scaffold is covered by
`src/lib/__tests__/export-project.test.ts`.
