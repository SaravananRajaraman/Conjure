import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const ANTHROPIC_MODEL = "claude-haiku-4-5";

type ParsedToolCall = { toolName: string; args: Record<string, unknown> };

/**
 * Coerce a raw string parameter value into a number or array when it clearly
 * looks like one, otherwise leave it as a string. File contents (code) and
 * paths stay strings; insert_line/view_range become number/array.
 */
function coerceParamValue(raw: string): unknown {
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^\[[\s\S]*\]$/.test(raw)) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through, keep as string
    }
  }
  return raw;
}

/**
 * Parse qwen3-coder's tool-call markup out of a text blob. The model emits a
 * deterministic format that Ollama's streaming/non-streaming parser fails to
 * extract when there is surrounding prose:
 *
 *   <function=str_replace_editor>
 *   <parameter=command>
 *   create
 *   </parameter>
 *   ...
 *   </function>
 *   </tool_call>
 *
 * Returns the prose with the tool markup stripped, plus the parsed calls.
 */
export function parseXmlToolCalls(text: string): {
  text: string;
  toolCalls: ParsedToolCall[];
} {
  const toolCalls: ParsedToolCall[] = [];
  // Match a function block. Prefer a real </function> close, but tolerate a
  // truncated final block (no close) — e.g. when the response was cut off at
  // max tokens, or the closing tag was dropped. Without this, a truncated tool
  // call would parse to nothing and the raw markup would leak into the chat as
  // "pasted code". The lazy body stops at the next <function= or end of string.
  const functionRegex =
    /<function=([^>\s]+)>([\s\S]*?)(?:<\/function>|(?=<function=)|$)/g;

  let match: RegExpExecArray | null;
  while ((match = functionRegex.exec(text)) !== null) {
    const toolName = match[1];
    const body = match[2];
    // Avoid an infinite loop if a zero-length match occurs at end of string.
    if (match[0].length === 0) {
      functionRegex.lastIndex++;
      continue;
    }
    const args: Record<string, unknown> = {};

    // Same tolerance for parameters: accept a missing </parameter> on the last
    // (possibly truncated) parameter.
    const paramRegex =
      /<parameter=([^>\s]+)>([\s\S]*?)(?:<\/parameter>|(?=<parameter=)|$)/g;
    let param: RegExpExecArray | null;
    while ((param = paramRegex.exec(body)) !== null) {
      if (param[0].length === 0) {
        paramRegex.lastIndex++;
        continue;
      }
      const key = param[1];
      // Values are wrapped in newlines; strip one leading/trailing newline.
      const raw = param[2].replace(/^\n/, "").replace(/\n$/, "");
      args[key] = coerceParamValue(raw);
    }

    // Only count it as a tool call if we actually recovered some arguments;
    // a bare "<function=foo>" with no parsable params is not actionable.
    if (Object.keys(args).length > 0) {
      toolCalls.push({ toolName, args });
    }
  }

  // Strip the tool markup from the displayed prose — including any truncated
  // trailing block — so the user never sees raw <function=...> junk in chat.
  const cleaned = text
    .replace(/<function=[^>\s]+>[\s\S]*?(?:<\/function>|$)/g, "")
    .replace(/<\/?tool_call>/g, "")
    .trim();

  return { text: cleaned, toolCalls };
}

/**
 * Wraps a LanguageModelV1 so that `doStream` is served by the underlying
 * `doGenerate` (non-streaming) call, then re-emitted as a single-shot stream.
 *
 * Why: Ollama's OpenAI-compatible endpoint does not reliably parse tool calls
 * for models like qwen3-coder. In streaming mode (and in non-streaming mode
 * whenever the model emits prose before the call) it leaks the raw tool-call
 * markup as text content, so the AI SDK never sees a real tool call. This
 * adapter (1) generates non-streamed and (2) parses any leaked qwen-style
 * tool markup itself, then replays the result as a stream — keeping the app's
 * streaming interface intact. The fallback parsing only kicks in when no
 * structured tool call was returned, so natively-working models are untouched.
 * Trade-off: local responses arrive all at once rather than token-by-token.
 */
class NonStreamingToolAdapter implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;

  constructor(private readonly model: LanguageModelV1) {}

  get provider() {
    return this.model.provider;
  }
  get modelId() {
    return this.model.modelId;
  }
  get defaultObjectGenerationMode() {
    return this.model.defaultObjectGenerationMode;
  }
  get supportsImageUrls() {
    return this.model.supportsImageUrls;
  }
  get supportsStructuredOutputs() {
    return this.model.supportsStructuredOutputs;
  }
  get supportsUrl() {
    return this.model.supportsUrl;
  }

  /**
   * Run the underlying non-streaming generation, then recover any tool calls
   * that leaked into the text as qwen-style markup.
   */
  private async generateNormalized(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ) {
    const result = await this.model.doGenerate(options);

    let text = result.text ?? "";
    let toolCalls = result.toolCalls ?? [];
    let finishReason = result.finishReason;

    if (toolCalls.length === 0 && text.includes("<function=")) {
      const parsed = parseXmlToolCalls(text);
      if (parsed.toolCalls.length > 0) {
        text = parsed.text;
        toolCalls = parsed.toolCalls.map((tc, i) => ({
          toolCallType: "function" as const,
          toolCallId: `call_${Date.now()}_${i}`,
          toolName: tc.toolName,
          args: JSON.stringify(tc.args),
        }));
        finishReason = "tool-calls";
      }
    }

    return { result, text, toolCalls, finishReason };
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const { result, text, toolCalls, finishReason } =
      await this.generateNormalized(options);

    return {
      ...result,
      text,
      toolCalls,
      finishReason,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const { result, text, toolCalls, finishReason } =
      await this.generateNormalized(options);

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      start(controller) {
        if (text) {
          controller.enqueue({ type: "text-delta", textDelta: text });
        }

        for (const toolCall of toolCalls) {
          controller.enqueue({
            type: "tool-call",
            toolCallType: "function",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            args: toolCall.args,
          });
        }

        controller.enqueue({
          type: "finish",
          finishReason,
          usage: result.usage,
          logprobs: result.logprobs,
        });
        controller.close();
      },
    });

    return {
      stream,
      rawCall: result.rawCall,
      rawResponse: result.rawResponse,
      request: result.request,
      warnings: result.warnings,
    };
  }
}

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({ 
  title = "Welcome to Our Service", 
  description = "Discover amazing features and capabilities that will transform your experience.",
  imageUrl,
  actions 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {actions && (
          <div className="mt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button 
          onClick={decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Decrease
        </button>
        <button 
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Card 
          title="Amazing Product"
          description="This is a fantastic product that will change your life. Experience the difference today!"
          actions={
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              Learn More
            </button>
          }
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

function hasLocalLLM(): boolean {
  return !!process.env.LOCAL_LLM_BASE_URL?.trim();
}

function hasAnthropicKey(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  return !!apiKey && apiKey !== "your-api-key-here";
}

/**
 * Returns true when neither a local LLM endpoint nor a real Anthropic key is
 * configured, so the canned MockLanguageModel will be used.
 */
export function isMockProvider(): boolean {
  return !hasLocalLLM() && !hasAnthropicKey();
}

export function getLanguageModel() {
  // 1. Local LLM via any OpenAI-compatible endpoint
  //    (Ollama, LM Studio, llama.cpp's llama-server, vLLM, text-generation-webui, ...).
  //    Set LOCAL_LLM_BASE_URL to the server's base URL, e.g. http://localhost:8080/v1
  const baseURL = process.env.LOCAL_LLM_BASE_URL?.trim();
  if (baseURL) {
    const modelId = process.env.LOCAL_LLM_MODEL?.trim() || "local-model";
    // Most local servers don't require a real key, but the OpenAI client still
    // expects a non-empty value. LOCAL_LLM_API_KEY lets you set one if needed.
    const apiKey = process.env.LOCAL_LLM_API_KEY?.trim() || "not-needed";

    console.log(
      `Using local LLM at ${baseURL} (model: "${modelId}") via the ` +
        "OpenAI-compatible API."
    );

    const localProvider = createOpenAI({ baseURL, apiKey });
    // Force the /chat/completions API — local servers rarely implement the
    // newer OpenAI Responses API. Wrap in the non-streaming adapter so tool
    // calls are parsed correctly (see NonStreamingToolAdapter).
    return new NonStreamingToolAdapter(localProvider.chat(modelId));
  }

  // 2. Hosted Anthropic Claude.
  if (hasAnthropicKey()) {
    return anthropic(ANTHROPIC_MODEL);
  }

  // 3. No provider configured — fall back to the canned mock responses.
  console.log(
    "No LOCAL_LLM_BASE_URL or ANTHROPIC_API_KEY is set (or the key is still " +
      "the placeholder). Using the mock provider — responses will be canned. " +
      "Set LOCAL_LLM_BASE_URL in .env to use a local model, or " +
      "ANTHROPIC_API_KEY to use Claude."
  );
  return new MockLanguageModel("mock-" + ANTHROPIC_MODEL);
}
