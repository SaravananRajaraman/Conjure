# Contributing

Thanks for your interest in improving Conjure! This project is MIT‑licensed and
contributions are welcome.

## Getting started

```bash
npm run setup   # install deps, generate Prisma client, migrate
npm run dev     # http://localhost:3000
npm run test    # Vitest
```

See [docs/development.md](docs/development.md) for the project layout, scripts,
and conventions.

## Ground rules

- **Match the surrounding code.** Follow existing patterns, naming, and comment
  density.
- **Use theme tokens**, not hardcoded colors, so light and dark both work
  ([docs/theming.md](docs/theming.md)).
- **Keep tests green.** Run `npm run test`. If you change UI copy or class names
  an existing test asserts, update that test in the same change. Add tests for
  new logic (the virtual FS, transformers, and export scaffolds are good
  examples to follow).
- **Don't run `npm audit fix`.** Dependencies are pinned deliberately; see the
  dependency policy in [docs/development.md](docs/development.md#dependency-policy).
- **Don't have the model print code in chat.** All generated code must go
  through the tools; the system prompt enforces this.

## Common changes

- **Add a framework:** follow the checklist in
  [docs/frameworks.md](docs/frameworks.md#adding-a-new-framework).
- **Touch the preview:** see [docs/preview.md](docs/preview.md).
- **Touch export:** see [docs/export.md](docs/export.md) and extend
  `src/lib/__tests__/export-project.test.ts`.

## Submitting

1. Create a branch.
2. Make focused commits with clear messages.
3. Ensure `npm run lint` and `npm run test` pass.
4. Open a PR describing the change and how you verified it.
