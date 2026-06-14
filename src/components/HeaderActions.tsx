"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, ChevronDown, Trash2, Loader2 } from "lucide-react";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { deleteProject } from "@/actions/delete-project";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface HeaderActionsProps {
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export function HeaderActions({ projectId }: HeaderActionsProps) {
  const router = useRouter();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load projects initially
  useEffect(() => {
    getProjects().then(setProjects).catch(console.error);
  }, [projectId]);

  // Refresh projects when popover opens
  useEffect(() => {
    if (projectsOpen) {
      getProjects().then(setProjects).catch(console.error);
    }
  }, [projectsOpen]);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentProject = projects.find((p) => p.id === projectId);

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    name: string
  ) => {
    // Stop cmdk from treating this as a project selection / navigation.
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteProject(id);
      const updated = await getProjects();
      setProjects(updated);
      // If we just deleted the project we're currently viewing, leave it.
      if (id === projectId) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleNewDesign = async () => {
    const project = await createProject({
      name: `Design #${~~(Math.random() * 100000)}`,
      messages: [],
      data: {},
    });
    router.push(`/${project.id}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={projectsOpen} onOpenChange={setProjectsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 gap-2" role="combobox">
            <FolderOpen className="h-4 w-4" />
            {currentProject ? currentProject.name : "Select Project"}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <Command>
            <CommandInput
              placeholder="Search projects..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup>
                {filteredProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    onSelect={() => {
                      router.push(`/${project.id}`);
                      setProjectsOpen(false);
                      setSearchQuery("");
                    }}
                    className="group flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {project.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${project.name}`}
                      title="Delete project"
                      disabled={deletingId === project.id}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) =>
                        handleDelete(e, project.id, project.name)
                      }
                      className="flex-shrink-0 p-1 rounded text-neutral-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button className="flex items-center gap-2 h-8" onClick={handleNewDesign}>
        <Plus className="h-4 w-4" />
        New Design
      </Button>
    </div>
  );
}
