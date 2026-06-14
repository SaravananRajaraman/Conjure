"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  DEFAULT_FRAMEWORK,
  FrameworkId,
  isFrameworkId,
} from "@/lib/frameworks";

export const FRAMEWORK_STORAGE_KEY = "conjure-framework";

interface FrameworkContextType {
  framework: FrameworkId;
  setFramework: (framework: FrameworkId) => void;
}

const FrameworkContext = createContext<FrameworkContextType | undefined>(
  undefined
);

export function FrameworkProvider({ children }: { children: ReactNode }) {
  // Start from the SSR-safe default so the server and the first client render
  // agree. The persisted choice is read from localStorage after mount to avoid
  // a hydration mismatch (the server can't know the user's stored value).
  const [framework, setFrameworkState] = useState<FrameworkId>(DEFAULT_FRAMEWORK);

  useEffect(() => {
    const stored = localStorage.getItem(FRAMEWORK_STORAGE_KEY);
    if (isFrameworkId(stored)) {
      setFrameworkState(stored);
    }
  }, []);

  const setFramework = useCallback((next: FrameworkId) => {
    setFrameworkState(next);
    try {
      localStorage.setItem(FRAMEWORK_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <FrameworkContext.Provider value={{ framework, setFramework }}>
      {children}
    </FrameworkContext.Provider>
  );
}

export function useFramework() {
  const context = useContext(FrameworkContext);
  if (context === undefined) {
    throw new Error("useFramework must be used within a FrameworkProvider");
  }
  return context;
}
