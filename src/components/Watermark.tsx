import { Wand2 } from "lucide-react";

/**
 * Subtle "Built with Conjure" watermark pinned to the bottom-right of the
 * workspace canvas. Positioned absolutely within a `relative` parent and
 * non-interactive so it never blocks the preview or editor underneath.
 */
export function Watermark() {
  return (
    <div className="pointer-events-none absolute bottom-2.5 right-3 z-20 select-none">
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        <Wand2 className="h-3 w-3 text-violet-500" />
        Built with Conjure
      </div>
    </div>
  );
}
