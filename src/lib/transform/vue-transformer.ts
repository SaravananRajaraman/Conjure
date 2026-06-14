/**
 * Builds a self-contained HTML document that renders a Vue 3 single-file
 * component project in the preview iframe.
 *
 * Unlike the React pipeline (which pre-compiles JSX with Babel and wires blob
 * URLs through an import map), Vue SFCs are compiled *inside* the iframe by
 * vue3-sfc-loader, which bundles @vue/compiler-sfc. We hand it the virtual
 * files as a plain map and let it compile/resolve on the fly. This keeps the
 * heavy compiler out of the main bundle and off the server.
 */

const VUE_RUNTIME_URL = "https://esm.sh/vue@3.5.13";
const SFC_LOADER_URL =
  "https://cdn.jsdelivr.net/npm/vue3-sfc-loader@0.9.5/dist/vue3-sfc-loader.js";

/** Pick the entry SFC: prefer /App.vue, then any root .vue, then any .vue. */
export function findVueEntry(files: Map<string, string>): string | null {
  if (files.has("/App.vue")) return "/App.vue";
  const roots = Array.from(files.keys())
    .filter((p) => p.endsWith(".vue") && p.split("/").filter(Boolean).length === 1)
    .sort();
  if (roots.length) return roots[0];
  const anyVue = Array.from(files.keys())
    .filter((p) => p.endsWith(".vue"))
    .sort();
  return anyVue[0] ?? null;
}

export function createVuePreviewHTML(
  files: Map<string, string>,
  entryPoint: string
): string {
  // Serialize the virtual file system for the in-iframe loader. JSON.stringify
  // safely escapes </script> sequences in user code as "<\/script>" only if we
  // also guard the closing tag below.
  const fileMap: Record<string, string> = {};
  for (const [path, content] of files) {
    fileMap[path] = content ?? "";
  }
  const filesJson = JSON.stringify(fileMap).replace(/<\/script>/gi, "<\\/script>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vue Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #app { width: 100vw; min-height: 100vh; }
    .preview-error {
      color: #7c2d12; background: #fef5f5; border: 2px solid #ff6b6b;
      border-radius: 12px; padding: 24px; margin: 24px;
      font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 13px;
      white-space: pre-wrap; line-height: 1.5;
    }
  </style>
  <script src="${SFC_LOADER_URL}"></script>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import * as Vue from '${VUE_RUNTIME_URL}';

    const FILES = ${filesJson};
    const ENTRY = ${JSON.stringify(entryPoint)};

    function showError(err) {
      const el = document.createElement('div');
      el.className = 'preview-error';
      el.textContent = (err && (err.stack || err.message)) ? (err.message + '\\n\\n' + (err.stack || '')) : String(err);
      document.body.innerHTML = '';
      document.body.appendChild(el);
    }

    // Resolve a specifier to a concrete file path that exists in FILES.
    function resolvePath(refPath, relPath) {
      if (relPath === 'vue') return 'vue';
      let base;
      if (relPath.startsWith('@/')) {
        base = '/' + relPath.slice(2);
      } else if (relPath.startsWith('/')) {
        base = relPath;
      } else if (relPath.startsWith('.')) {
        const dir = refPath ? refPath.slice(0, refPath.lastIndexOf('/')) : '';
        const parts = (dir + '/' + relPath).split('/');
        const stack = [];
        for (const part of parts) {
          if (part === '' || part === '.') continue;
          if (part === '..') stack.pop();
          else stack.push(part);
        }
        base = '/' + stack.join('/');
      } else {
        // bare module other than vue — not supported in preview
        base = relPath;
      }
      const candidates = [base, base + '.vue', base + '.js', base + '.ts', base + '/index.vue'];
      for (const c of candidates) {
        if (FILES[c] != null) return c;
      }
      return base;
    }

    const options = {
      moduleCache: { vue: Vue },
      pathResolve({ refPath, relPath }) {
        return resolvePath(refPath, relPath);
      },
      getFile(url) {
        if (FILES[url] != null) return FILES[url];
        throw new Error('File not found: ' + url);
      },
      addStyle(textContent) {
        const style = document.createElement('style');
        style.textContent = textContent;
        document.head.appendChild(style);
      },
      log(type, ...args) {
        if (type === 'error' || type === 'warn') console[type](...args);
      },
    };

    const loader = window['vue3-sfc-loader'];
    if (!loader || !loader.loadModule) {
      showError(new Error('Failed to load the Vue SFC compiler from CDN.'));
    } else {
      loader
        .loadModule(ENTRY, options)
        .then((component) => {
          const app = Vue.createApp(component);
          app.config.errorHandler = (err) => showError(err);
          app.mount('#app');
        })
        .catch(showError);
    }
  </script>
</body>
</html>`;
}
