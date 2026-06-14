"use client";

import { useState } from "react";
import { Check, ChevronDown, Code2 } from "lucide-react";
import { useFramework } from "@/lib/contexts/framework-context";
import { FRAMEWORK_IDS, FRAMEWORKS } from "@/lib/frameworks";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function FrameworkSelector() {
  const { framework, setFramework } = useFramework();
  const [open, setOpen] = useState(false);
  const current = FRAMEWORKS[framework];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Select framework"
          className="h-8 gap-2"
        >
          <Code2 className={cn("h-4 w-4", current.accentClass)} />
          <span className="font-medium">{current.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-1.5" align="end">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Generate code for
        </p>
        {FRAMEWORK_IDS.map((id) => {
          const fw = FRAMEWORKS[id];
          const selected = id === framework;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setFramework(id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                selected && "bg-accent"
              )}
            >
              <Code2 className={cn("mt-0.5 h-4 w-4 shrink-0", fw.accentClass)} />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {fw.label}
                  {!fw.previewSupported && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                      code only
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fw.description}
                </span>
              </span>
              {selected && (
                <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
