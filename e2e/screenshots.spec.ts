/**
 * Demo screenshot suite for Conjure.
 *
 * Captures the screens shown in docs/screenshots.md.
 * Works with all three providers:
 *   - Mock (no config needed, instant canned responses)
 *   - Local LLM (set LOCAL_LLM_BASE_URL in .env; tests wait up to 5 min)
 *   - Anthropic Claude (set ANTHROPIC_API_KEY in .env)
 *
 * Run:  npm run screenshots
 * Output goes to docs/screenshots/ so it is ready to commit.
 */

import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(__dirname, "../docs/screenshots");

// Generous timeout for local LLM generation (qwen3-coder etc. can be slow).
// The mock provider finishes in ~5 s; local models may take several minutes.
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

// Use the simplest possible prompt so local models produce small output fast.
const SIMPLE_PROMPT = "Create a simple button that says Hello";

function shot(name: string) {
  return path.join(OUT, name);
}

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Wait until the header and chat textarea are both visible. */
async function waitForShell(page: import("@playwright/test").Page) {
  await page.waitForSelector("header", { state: "visible" });
  await page.waitForSelector("textarea", { state: "visible" });
  await page.waitForTimeout(400);
}

/** Force a theme by writing to localStorage and toggling the html class. */
async function setTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark"
) {
  await page.evaluate((t) => {
    localStorage.setItem("conjure-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
  await page.waitForTimeout(200);
}

/**
 * Submit the chat form and wait for generation to finish, then wait for the
 * preview iframe to appear with real content (srcdoc > 500 chars).
 *
 * Uses GENERATION_TIMEOUT_MS for the stream-end wait so local LLMs have time.
 */
async function generateAndWaitForPreview(
  page: import("@playwright/test").Page
) {
  // Submit
  await page.locator('button[type="submit"]').click();

  // Wait for the model to start (textarea goes disabled)
  await page.waitForSelector("textarea:disabled", { timeout: 10_000 });

  // Screenshot mid-generation while the AI is streaming
  await page.screenshot({ path: shot("07-generating.png"), animations: "disabled" });

  // Wait for the full stream to finish (textarea re-enables)
  await page.waitForSelector("textarea:not([disabled])", {
    timeout: GENERATION_TIMEOUT_MS,
  });

  // Wait for the preview iframe to appear — it only renders once files exist.
  // Before any files are written the component shows "Welcome to Conjure" instead.
  await page.waitForSelector('iframe[title="Preview"]', {
    state: "visible",
    timeout: 15_000,
  });

  // Wait for srcdoc to be populated with the compiled component HTML.
  await page.waitForFunction(
    () => {
      const iframe = document.querySelector(
        'iframe[title="Preview"]'
      ) as HTMLIFrameElement | null;
      return iframe !== null && (iframe.srcdoc?.length ?? 0) > 500;
    },
    { timeout: 15_000 }
  );

  // Small pause to let the iframe's internal React/Vue runtime mount and paint.
  await page.waitForTimeout(800);
}

// ─── screens ─────────────────────────────────────────────────────────────────

test("01 - empty workspace, light theme", async ({ page }) => {
  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "light");
  await page.screenshot({ path: shot("01-workspace-light.png"), animations: "disabled" });
});

test("02 - empty workspace, dark theme", async ({ page }) => {
  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "dark");
  await page.screenshot({ path: shot("02-workspace-dark.png"), animations: "disabled" });
});

test("03 - framework selector open", async ({ page }) => {
  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "light");
  await page.click('[aria-label="Select framework"]');
  await page.waitForSelector("text=Generate code for", { state: "visible" });
  await page.screenshot({ path: shot("03-framework-selector.png"), animations: "disabled" });
});

test("04 - project selector open", async ({ page }) => {
  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "light");
  await page.click('button[role="combobox"]:has-text("Select Project")');
  // The popover renders a dialog — wait for that, not placeholder text
  await page.waitForSelector('[role="dialog"]', { state: "visible" });
  await page.screenshot({ path: shot("04-project-selector.png"), animations: "disabled" });
});

test("05 - new project, empty chat", async ({ page }) => {
  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "light");
  await page.click('button:has-text("New Design")');
  await page.waitForURL(/\/[a-zA-Z0-9]+/);
  await waitForShell(page);
  await page.screenshot({ path: shot("05-new-project.png"), animations: "disabled" });
});

test("06 - prompt typed in chat", async ({ page }) => {
  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "light");
  await page.click('button:has-text("New Design")');
  await page.waitForURL(/\/[a-zA-Z0-9]+/);
  await waitForShell(page);
  await page.fill("textarea", SIMPLE_PROMPT);
  await page.screenshot({ path: shot("06-prompt-typed.png"), animations: "disabled" });
});

test("07 + 08 + 09 - generate, preview, code editor (light)", async ({ page }) => {
  // Give this test the full LLM budget plus overhead
  test.setTimeout(GENERATION_TIMEOUT_MS + 60_000);

  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "light");
  await page.click('button:has-text("New Design")');
  await page.waitForURL(/\/[a-zA-Z0-9]+/);
  await waitForShell(page);

  await page.fill("textarea", SIMPLE_PROMPT);

  // 07-generating captured inside helper; then waits for full preview
  await generateAndWaitForPreview(page);

  // 08 - Live preview with the rendered component
  await page.screenshot({ path: shot("08-preview.png"), animations: "disabled" });

  // 09 - Code editor (file tree + Monaco)
  await page.click('[role="tab"]:has-text("Code")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot("09-code-editor.png"), animations: "disabled" });
});

test("10 - dark theme with generated component", async ({ page }) => {
  test.setTimeout(GENERATION_TIMEOUT_MS + 60_000);

  await page.goto("/");
  await waitForShell(page);
  await setTheme(page, "dark");
  await page.click('button:has-text("New Design")');
  await page.waitForURL(/\/[a-zA-Z0-9]+/);
  await waitForShell(page);

  await page.fill("textarea", SIMPLE_PROMPT);
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector("textarea:not([disabled])", {
    timeout: GENERATION_TIMEOUT_MS,
  });
  await page.waitForSelector('iframe[title="Preview"]', {
    state: "visible",
    timeout: 15_000,
  });
  await page.waitForFunction(
    () => {
      const iframe = document.querySelector(
        'iframe[title="Preview"]'
      ) as HTMLIFrameElement | null;
      return iframe !== null && (iframe.srcdoc?.length ?? 0) > 500;
    },
    { timeout: 15_000 }
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot("10-dark-preview.png"), animations: "disabled" });
});
