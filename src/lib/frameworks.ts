/**
 * Supported target frameworks for code generation. The selected framework is
 * sent to /api/chat and drives which system prompt the model gets, so the
 * generated files match the chosen framework's conventions.
 *
 * Live preview is currently React-only (the preview pipeline compiles JSX with
 * Babel). For other frameworks the generated code is shown in the Code tab.
 */
export type FrameworkId = "react" | "vue" | "angular";

export interface FrameworkConfig {
  id: FrameworkId;
  /** Short display name shown in the selector. */
  label: string;
  /** One-line description shown in the dropdown. */
  description: string;
  /** Entry file the model should always create first. */
  entryFile: string;
  /** File extension for components (used in placeholders/hints). */
  extension: string;
  /** Whether the in-app live preview can render this framework. */
  previewSupported: boolean;
  /** Tailwind text color class used as the framework's accent. */
  accentClass: string;
}

export const FRAMEWORKS: Record<FrameworkId, FrameworkConfig> = {
  react: {
    id: "react",
    label: "React",
    description: "JSX components with live preview",
    entryFile: "/App.jsx",
    extension: "jsx",
    previewSupported: true,
    accentClass: "text-sky-500",
  },
  vue: {
    id: "vue",
    label: "Vue",
    description: "Single-file components with live preview",
    entryFile: "/App.vue",
    extension: "vue",
    previewSupported: true,
    accentClass: "text-emerald-500",
  },
  angular: {
    id: "angular",
    label: "Angular",
    description: "Standalone components (code only)",
    entryFile: "/app.component.ts",
    extension: "ts",
    previewSupported: false,
    accentClass: "text-red-500",
  },
};

export const FRAMEWORK_IDS = Object.keys(FRAMEWORKS) as FrameworkId[];

export const DEFAULT_FRAMEWORK: FrameworkId = "react";

export function isFrameworkId(value: unknown): value is FrameworkId {
  return typeof value === "string" && value in FRAMEWORKS;
}

export function getFramework(id: unknown): FrameworkConfig {
  return isFrameworkId(id) ? FRAMEWORKS[id] : FRAMEWORKS[DEFAULT_FRAMEWORK];
}
