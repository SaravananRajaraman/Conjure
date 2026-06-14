import { test, expect } from "vitest";
import {
  createVuePreviewHTML,
  findVueEntry,
} from "@/lib/transform/vue-transformer";

test("findVueEntry prefers /App.vue", () => {
  const files = new Map<string, string>([
    ["/components/Foo.vue", ""],
    ["/App.vue", ""],
  ]);
  expect(findVueEntry(files)).toBe("/App.vue");
});

test("findVueEntry falls back to the first root .vue, then any .vue", () => {
  expect(
    findVueEntry(new Map([["/components/Deep.vue", ""]]))
  ).toBe("/components/Deep.vue");
  expect(findVueEntry(new Map())).toBeNull();
});

test("createVuePreviewHTML embeds files, entry, and the SFC loader", () => {
  const files = new Map<string, string>([
    ["/App.vue", "<template><div>hi</div></template>"],
  ]);
  const html = createVuePreviewHTML(files, "/App.vue");

  expect(html).toContain("vue3-sfc-loader");
  expect(html).toContain("/App.vue");
  expect(html).toContain("createApp");
  expect(html).toContain("<template>");
});

test("escapes embedded </script> so it cannot break out of the script tag", () => {
  const files = new Map<string, string>([
    ["/App.vue", "<template><div></div></template><script>1</script>"],
  ]);
  const html = createVuePreviewHTML(files, "/App.vue");
  // The literal closing tag from user code must be escaped inside the JSON blob.
  expect(html).toContain("<\\/script>");
});
