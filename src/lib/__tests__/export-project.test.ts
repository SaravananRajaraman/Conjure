import { test, expect } from "vitest";
import JSZip from "jszip";
import { buildProjectZip } from "@/lib/export-project";

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

async function entries(blob: Blob): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob));
  const out: Record<string, string> = {};
  await Promise.all(
    Object.keys(zip.files).map(async (name) => {
      const f = zip.files[name];
      if (!f.dir) out[name] = await f.async("string");
    })
  );
  return out;
}

test("React export scaffolds a runnable Vite + React project", async () => {
  const files = new Map<string, string>([
    ["/App.jsx", "export default function App(){return <div>hi</div>}"],
  ]);
  const zip = await entries(await buildProjectZip(files, "react"));

  expect(zip["package.json"]).toContain('"react"');
  expect(zip["vite.config.js"]).toContain("@vitejs/plugin-react");
  expect(zip["src/main.jsx"]).toContain('from "@/App"');
  expect(zip["index.html"]).toContain("/src/main.jsx");
  expect(zip["src/App.jsx"]).toBeDefined();
  expect(zip["LICENSE"]).toContain("MIT License");
});

test("Vue export scaffolds a runnable Vite + Vue project", async () => {
  const files = new Map<string, string>([
    ["/App.vue", "<template><div>hi</div></template>"],
    ["/components/Btn.vue", "<template><button/></template>"],
  ]);
  const zip = await entries(await buildProjectZip(files, "vue"));

  expect(zip["package.json"]).toContain('"vue"');
  expect(zip["package.json"]).toContain("@vitejs/plugin-vue");
  expect(zip["vite.config.js"]).toContain("@vitejs/plugin-vue");
  expect(zip["src/main.js"]).toContain('from "@/App.vue"');
  expect(zip["src/main.js"]).toContain("createApp");
  expect(zip["index.html"]).toContain('id="app"');
  expect(zip["src/App.vue"]).toBeDefined();
  expect(zip["src/components/Btn.vue"]).toBeDefined();
  // No React leftovers
  expect(zip["package.json"]).not.toContain('"react"');
});

test("Angular export scaffolds a Vite + Angular project", async () => {
  const files = new Map<string, string>([
    [
      "/app.component.ts",
      "import { Component } from '@angular/core';\n@Component({selector:'app-root',standalone:true,template:'<div></div>'}) export class AppComponent {}",
    ],
  ]);
  const zip = await entries(await buildProjectZip(files, "angular"));

  expect(zip["package.json"]).toContain("@angular/core");
  expect(zip["package.json"]).toContain("@analogjs/vite-plugin-angular");
  expect(zip["package.json"]).toContain("@angular/build");
  expect(zip["package.json"]).toContain("@angular/compiler-cli");
  expect(zip["vite.config.ts"]).toContain("@analogjs/vite-plugin-angular");
  expect(zip["tsconfig.json"]).toContain("experimentalDecorators");
  expect(zip["tsconfig.json"]).toContain("angularCompilerOptions");
  expect(zip["tsconfig.app.json"]).toContain('"src/main.ts"');
  expect(zip["src/main.ts"]).toContain("bootstrapApplication");
  expect(zip["src/main.ts"]).toContain('from "@/app.component"');
  expect(zip["index.html"]).toContain("<app-root>");
  expect(zip["src/app.component.ts"]).toBeDefined();
});

test("defaults to React when no framework is given", async () => {
  const files = new Map<string, string>([["/App.jsx", "export default ()=>null"]]);
  const zip = await entries(await buildProjectZip(files));
  expect(zip["src/main.jsx"]).toBeDefined();
});
