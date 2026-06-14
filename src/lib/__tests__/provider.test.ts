import { test, expect } from "vitest";
import { parseXmlToolCalls } from "@/lib/provider";

test("parses a well-formed qwen function block with parameters", () => {
  const text = `Sure, creating it now.
<tool_call>
<function=str_replace_editor>
<parameter=command>
create
</parameter>
<parameter=path>
/App.jsx
</parameter>
<parameter=file_text>
export default function App() { return <div>Hi</div>; }
</parameter>
</function>
</tool_call>`;

  const { text: cleaned, toolCalls } = parseXmlToolCalls(text);

  expect(toolCalls).toHaveLength(1);
  expect(toolCalls[0].toolName).toBe("str_replace_editor");
  expect(toolCalls[0].args.command).toBe("create");
  expect(toolCalls[0].args.path).toBe("/App.jsx");
  expect(toolCalls[0].args.file_text).toContain("export default function App()");
  // The raw markup must not leak into the chat-visible text.
  expect(cleaned).not.toContain("<function=");
  expect(cleaned).not.toContain("<parameter=");
  expect(cleaned).toContain("creating it now");
});

test("recovers a truncated tool call (missing closing tags)", () => {
  // Simulates output cut off at max tokens: no </parameter> or </function>.
  const text = `Updating the file.
<function=str_replace_editor>
<parameter=command>
str_replace
</parameter>
<parameter=path>
/App.jsx
</parameter>
<parameter=old_str>
text-black
</parameter>
<parameter=new_str>
text-purple-600`;

  const { text: cleaned, toolCalls } = parseXmlToolCalls(text);

  expect(toolCalls).toHaveLength(1);
  expect(toolCalls[0].args.command).toBe("str_replace");
  expect(toolCalls[0].args.path).toBe("/App.jsx");
  expect(toolCalls[0].args.old_str).toBe("text-black");
  expect(toolCalls[0].args.new_str).toBe("text-purple-600");
  // No leftover markup in the chat text.
  expect(cleaned).not.toContain("<function=");
  expect(cleaned).not.toContain("<parameter=");
});

test("parses multiple function blocks", () => {
  const text = `<function=file_manager>
<parameter=command>
create
</parameter>
<parameter=path>
/components/Display.jsx
</parameter>
<parameter=file_text>
export default function Display() { return null; }
</parameter>
</function>
<function=file_manager>
<parameter=command>
delete
</parameter>
<parameter=path>
/old.jsx
</parameter>
</function>`;

  const { toolCalls } = parseXmlToolCalls(text);
  expect(toolCalls).toHaveLength(2);
  expect(toolCalls[0].args.path).toBe("/components/Display.jsx");
  expect(toolCalls[1].args.command).toBe("delete");
});

test("a bare <function=> with no parsable params is not a tool call", () => {
  const text = "Here is some text <function=str_replace_editor> and more text";
  const { text: cleaned, toolCalls } = parseXmlToolCalls(text);
  expect(toolCalls).toHaveLength(0);
  // Markup still stripped from display.
  expect(cleaned).not.toContain("<function=");
});

test("plain prose with no markup is returned unchanged with no tool calls", () => {
  const text = "I've updated the counter component with a purple heading.";
  const { text: cleaned, toolCalls } = parseXmlToolCalls(text);
  expect(toolCalls).toHaveLength(0);
  expect(cleaned).toBe(text);
});
