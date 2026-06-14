# Theming

Conjure supports a switchable **light/dark** theme built on Tailwind v4 design
tokens.

## How it works

- **Tokens** are defined in `src/app/globals.css` as CSS variables on `:root`
  (light) and `.dark` (dark), exposed to Tailwind via `@theme inline` as
  `--color-background`, `--color-foreground`, `--color-card`,
  `--color-muted(-foreground)`, `--color-border`, etc. The `dark` variant is
  declared with `@custom-variant dark (&:is(.dark *))`.
- **Toggling** adds/removes the `dark` class on `<html>`
  (`src/lib/contexts/theme-context.tsx`) and persists the choice to
  `localStorage` under `conjure-theme`.
- **No flash.** An inline script (`themeNoFlashScript`) injected at the top of
  `<body>` in `src/app/layout.tsx` applies the stored theme (or the OS
  preference for first‑time visitors) before React hydrates, so there's no
  flash of the wrong theme.
- **Toggle UI** is `src/components/ThemeToggle.tsx` (sun/moon) in the top bar.

## Using tokens in components

Prefer semantic token classes over hardcoded colors so both themes work:

| Use | Class |
|-----|-------|
| Page / canvas background | `bg-background` |
| Card / panel surface | `bg-card` |
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Borders | `border-border` |
| Subtle surface | `bg-muted` |

The accent color used across the UI is sky/violet (e.g. `text-sky-500`,
`from-violet-500`). The Monaco code editor switches between `vs-dark` and
`light` based on the active theme.

## Adding a themed component

1. Build with the token classes above (avoid `neutral-*`/`gray-*`/`white`).
2. Read the theme with `useTheme()` if you need the value (e.g. to pick a
   third‑party widget theme like Monaco).
3. Verify it in both themes by toggling.
