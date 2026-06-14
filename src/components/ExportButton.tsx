"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import { useFramework } from "@/lib/contexts/framework-context";
import { buildProjectZip } from "@/lib/export-project";

export function ExportButton() {
  const { getAllFiles } = useFileSystem();
  const { framework } = useFramework();
  const [busy, setBusy] = useState(false);

  const hasFiles = getAllFiles().size > 0;

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await buildProjectZip(getAllFiles(), framework);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conjure-${framework}-export.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="h-8 gap-2"
      onClick={handleExport}
      disabled={!hasFiles || busy}
      title={
        hasFiles
          ? "Download the generated project as a ZIP"
          : "Generate a component first to enable export"
      }
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {busy ? "Exporting..." : "Export"}
    </Button>
  );
}
