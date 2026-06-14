# Model providers

The model is selected at request time by `getLanguageModel()` in
`src/lib/provider.ts`. Resolution order:

1. **Local LLM** — used if `LOCAL_LLM_BASE_URL` is set (highest priority).
2. **Anthropic Claude** — used if `ANTHROPIC_API_KEY` is a real key.
3. **Mock** — used otherwise.

`isMockProvider()` reports whether the mock is active (the chat route uses fewer
`maxSteps` for the mock to avoid repetition).

## Local LLM (OpenAI‑compatible)

Works with Ollama, LM Studio, llama.cpp's `llama-server`, vLLM, and anything
exposing the OpenAI HTTP API. Include the path suffix the server expects
(usually `/v1`).

```bash
LOCAL_LLM_BASE_URL=http://localhost:11434/v1   # Ollama
LOCAL_LLM_MODEL=qwen3-coder:30b
LOCAL_LLM_API_KEY=not-needed                    # optional
```

Common bases: Ollama `:11434/v1`, LM Studio `:1234/v1`, vLLM `:8000/v1`,
llama.cpp `:8080/v1`.

### Tool‑call normalization (important for local models)

Some local models (e.g. `qwen3-coder`) don't return structured tool calls
through Ollama's OpenAI‑compatible endpoint — they leak the call into the text
as markup:

```
<function=str_replace_editor>
<parameter=command>create</parameter>
<parameter=path>/App.jsx</parameter>
<parameter=file_text>…</parameter>
</function>
```

`provider.ts` wraps the model in a **`NonStreamingToolAdapter`** that:

1. generates non‑streamed, then
2. if no structured tool call came back but the text contains `<function=…>`,
   parses it with `parseXmlToolCalls` and replays it as a real tool call.

The parser is **tolerant of truncated markup** (a tool call cut off at the token
limit is still recovered rather than leaking into the chat). Natively‑working
models are untouched. Trade‑off: local responses arrive all at once rather than
token‑by‑token.

## Anthropic Claude

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/settings/keys).
The model id is set by `ANTHROPIC_MODEL` in `provider.ts`.

## Mock provider

With no provider configured, `MockLanguageModel` returns canned components
(counter/form/card) over a few steps. This keeps the app fully runnable offline
and is what the tests exercise. The first mock response explains how to plug in a
real provider.
