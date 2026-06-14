import JSZip from "jszip";
import { FrameworkId } from "@/lib/frameworks";

/**
 * Packages the virtual file system into a complete, runnable project for the
 * selected framework and returns it as a ZIP Blob. Unzipping and running
 * `npm install && npm run dev` yields the designed page.
 *
 * In-app components import non-library files with the "@/" alias, so every
 * exported project maps "@" -> "./src" and places the virtual files under src/,
 * preserving those imports.
 */

const GITIGNORE = `node_modules
dist
.DS_Store
*.local
`;

// MIT license bundled with every export so the generated code is free to use.
const LICENSE = `MIT License

Copyright (c) ${new Date().getFullYear()} Generated with Conjure

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

const POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

/** Place every virtual file under src/, preserving the "@/" -> src mapping. */
function addSourceFiles(zip: JSZip, files: Map<string, string>) {
  for (const [path, content] of files) {
    const relative = path.replace(/^\/+/, "");
    if (!relative) continue;
    zip.file(`src/${relative}`, content ?? "");
  }
}

function findEntry(
  files: Map<string, string>,
  preferred: string[],
  matcher: (p: string) => boolean
): string | null {
  const found = preferred.find((p) => files.has(p));
  if (found) return found;
  return Array.from(files.keys()).find(matcher) ?? null;
}

// ---------------------------------------------------------------------------
// React (Vite)
// ---------------------------------------------------------------------------

function buildReactZip(files: Map<string, string>): Promise<Blob> {
  const zip = new JSZip();
  const entry =
    findEntry(
      files,
      ["/App.jsx", "/App.tsx", "/index.jsx", "/index.tsx"],
      (p) => p.endsWith(".jsx") || p.endsWith(".tsx")
    ) ?? "/App.jsx";
  const entrySpecifier = "@" + entry.replace(/\.(jsx|tsx)$/, "");

  zip.file(
    "package.json",
    `{
  "name": "conjure-export",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^5.4.11"
  }
}
`
  );
  zip.file(
    "vite.config.js",
    `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
`
  );
  zip.file(
    "index.html",
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Conjure Export</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
  );
  zip.file(
    "tailwind.config.js",
    `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
`
  );
  zip.file("postcss.config.js", POSTCSS_CONFIG);
  zip.file(".gitignore", GITIGNORE);
  zip.file("LICENSE", LICENSE);
  zip.file("src/index.css", INDEX_CSS);
  zip.file(
    "src/main.jsx",
    `import React from "react";
import { createRoot } from "react-dom/client";
import App from "${entrySpecifier}";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
  );
  zip.file(
    "README.md",
    `# Conjure Export (React)

Standalone React app scaffolded with Vite and Tailwind CSS.

\`\`\`bash
npm install
npm run dev
\`\`\`

## License

MIT — see [LICENSE](./LICENSE). Generated with Conjure; you are free to use,
modify, and distribute this code.
`
  );

  addSourceFiles(zip, files);
  return zip.generateAsync({ type: "blob" });
}

// ---------------------------------------------------------------------------
// Vue (Vite)
// ---------------------------------------------------------------------------

function buildVueZip(files: Map<string, string>): Promise<Blob> {
  const zip = new JSZip();
  const entry =
    findEntry(files, ["/App.vue"], (p) => p.endsWith(".vue")) ?? "/App.vue";
  const entrySpecifier = "@" + entry; // keep the .vue extension for Vue imports

  zip.file(
    "package.json",
    `{
  "name": "conjure-export",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^5.4.11"
  }
}
`
  );
  zip.file(
    "vite.config.js",
    `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
`
  );
  zip.file(
    "index.html",
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Conjure Export</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`
  );
  zip.file(
    "tailwind.config.js",
    `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: { extend: {} },
  plugins: [],
};
`
  );
  zip.file("postcss.config.js", POSTCSS_CONFIG);
  zip.file(".gitignore", GITIGNORE);
  zip.file("LICENSE", LICENSE);
  zip.file("src/index.css", INDEX_CSS);
  zip.file(
    "src/main.js",
    `import { createApp } from "vue";
import App from "${entrySpecifier}";
import "./index.css";

createApp(App).mount("#app");
`
  );
  zip.file(
    "README.md",
    `# Conjure Export (Vue)

Standalone Vue 3 app scaffolded with Vite and Tailwind CSS.

\`\`\`bash
npm install
npm run dev
\`\`\`

## License

MIT — see [LICENSE](./LICENSE). Generated with Conjure; you are free to use,
modify, and distribute this code.
`
  );

  addSourceFiles(zip, files);
  return zip.generateAsync({ type: "blob" });
}

// ---------------------------------------------------------------------------
// Angular (Vite + Analog plugin)
// ---------------------------------------------------------------------------

function buildAngularZip(files: Map<string, string>): Promise<Blob> {
  const zip = new JSZip();
  const entry =
    findEntry(
      files,
      ["/app.component.ts", "/App.component.ts"],
      (p) => p.endsWith(".component.ts")
    ) ?? "/app.component.ts";
  const entrySpecifier = "@" + entry.replace(/\.ts$/, "");

  zip.file(
    "package.json",
    `{
  "name": "conjure-export",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@angular/common": "^18.2.0",
    "@angular/compiler": "^18.2.0",
    "@angular/core": "^18.2.0",
    "@angular/platform-browser": "^18.2.0",
    "rxjs": "^7.8.1",
    "tslib": "^2.7.0",
    "zone.js": "^0.14.10"
  },
  "devDependencies": {
    "@analogjs/vite-plugin-angular": "^1.9.0",
    "@angular/build": "^18.2.0",
    "@angular/compiler-cli": "^18.2.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.5.4",
    "vite": "^6.0.0"
  }
}
`
  );
  zip.file(
    "vite.config.ts",
    `import { defineConfig } from "vite";
import angular from "@analogjs/vite-plugin-angular";
import path from "path";

export default defineConfig({
  plugins: [angular()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
`
  );
  zip.file(
    "tsconfig.json",
    `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictTemplates": true
  },
  "files": [],
  "include": ["src/**/*.ts"]
}
`
  );
  // Analog's Vite plugin looks for tsconfig.app.json to locate the entry; without
  // it the build silently emits an empty bundle.
  zip.file(
    "tsconfig.app.json",
    `{
  "extends": "./tsconfig.json",
  "compilerOptions": { "outDir": "./dist/out-tsc" },
  "files": ["src/main.ts"]
}
`
  );
  zip.file(
    "index.html",
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Conjure Export</title>
  </head>
  <body>
    <app-root></app-root>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
  );
  zip.file(
    "tailwind.config.js",
    `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,html}"],
  theme: { extend: {} },
  plugins: [],
};
`
  );
  zip.file("postcss.config.js", POSTCSS_CONFIG);
  zip.file(".gitignore", GITIGNORE);
  zip.file("LICENSE", LICENSE);
  zip.file("src/index.css", INDEX_CSS);
  zip.file(
    "src/main.ts",
    `import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "${entrySpecifier}";
import "./index.css";

bootstrapApplication(AppComponent).catch((err) => console.error(err));
`
  );
  zip.file(
    "README.md",
    `# Conjure Export (Angular)

Standalone Angular app scaffolded to run with Vite via @analogjs/vite-plugin-angular.

\`\`\`bash
npm install
npm run dev
\`\`\`

> The root component must be exported as \`AppComponent\` with \`selector: 'app-root'\`
> for bootstrapping to mount into index.html.

## License

MIT — see [LICENSE](./LICENSE). Generated with Conjure; you are free to use,
modify, and distribute this code.
`
  );

  addSourceFiles(zip, files);
  return zip.generateAsync({ type: "blob" });
}

export async function buildProjectZip(
  files: Map<string, string>,
  framework: FrameworkId = "react"
): Promise<Blob> {
  switch (framework) {
    case "vue":
      return buildVueZip(files);
    case "angular":
      return buildAngularZip(files);
    default:
      return buildReactZip(files);
  }
}
