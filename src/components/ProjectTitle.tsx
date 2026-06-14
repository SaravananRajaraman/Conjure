"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { renameProject } from "@/actions/rename-project";

interface ProjectTitleProps {
  projectId?: string;
  initialName?: string;
}

export function ProjectTitle({ projectId, initialName }: ProjectTitleProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [draft, setDraft] = useState(initialName ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep local state in sync when the server passes a new project name
  // (e.g. after navigating between projects or a router.refresh()).
  useEffect(() => {
    setName(initialName ?? "");
    setDraft(initialName ?? "");
  }, [initialName]);

  // Anonymous / unsaved session: nothing to rename yet.
  if (!projectId) {
    return (
      <h1 className="text-base font-semibold text-foreground tracking-tight">
        Untitled session
      </h1>
    );
  }

  const startEditing = () => {
    setDraft(name);
    setIsEditing(true);
  };

  const cancel = () => {
    setDraft(name);
    setIsEditing(false);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      cancel();
      return;
    }

    setIsSaving(true);
    try {
      await renameProject(projectId, trimmed);
      setName(trimmed);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to rename project:", error);
      cancel();
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={draft}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        aria-label="Project name"
        className="h-8 max-w-[260px] text-base font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title="Click to rename"
      className="group flex items-center gap-2 text-base font-semibold text-foreground tracking-tight transition-colors hover:text-muted-foreground"
    >
      <span className="truncate max-w-[240px]">{name || "Untitled"}</span>
      <Pencil className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
