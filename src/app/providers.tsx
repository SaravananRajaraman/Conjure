"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { FrameworkProvider } from "@/lib/contexts/framework-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <FrameworkProvider>{children}</FrameworkProvider>
    </ThemeProvider>
  );
}
