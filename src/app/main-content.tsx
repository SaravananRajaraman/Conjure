"use client";

import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FileSystemProvider } from "@/lib/contexts/file-system-context";
import { ChatProvider } from "@/lib/contexts/chat-context";
import { useFramework } from "@/lib/contexts/framework-context";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { FileTree } from "@/components/editor/FileTree";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderActions } from "@/components/HeaderActions";
import { ExportButton } from "@/components/ExportButton";
import { ProjectTitle } from "@/components/ProjectTitle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FrameworkSelector } from "@/components/FrameworkSelector";
import { Watermark } from "@/components/Watermark";
import { FRAMEWORKS } from "@/lib/frameworks";
import { Wand2, Eye, Code, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MainContentProps {
  project?: {
    id: string;
    name: string;
    messages: any[];
    data: any;
    createdAt: Date;
    updatedAt: Date;
  };
}

function Workspace({ project }: MainContentProps) {
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const { framework } = useFramework();
  const fw = FRAMEWORKS[framework];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top app bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 shadow-sm">
            <Wand2 className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">
              Conjure
            </span>
            <span className="text-[11px] text-muted-foreground">
              AI component studio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FrameworkSelector />
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <ExportButton />
          <HeaderActions projectId={project?.id} />
          <ThemeToggle />
        </div>
      </header>

      {/* Body */}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left — preview / code */}
          <ResizablePanel defaultSize={62} minSize={30}>
            <div className="relative flex h-full flex-col bg-background">
              <Watermark />
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
                <Tabs
                  value={activeView}
                  onValueChange={(v) => setActiveView(v as "preview" | "code")}
                >
                  <TabsList className="h-9 gap-1 bg-muted/60 p-1">
                    <TabsTrigger
                      value="preview"
                      className="gap-1.5 px-3 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger
                      value="code"
                      className="gap-1.5 px-3 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <Code className="h-3.5 w-3.5" />
                      Code
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <span className="text-xs font-medium text-muted-foreground">
                  {fw.label}
                </span>
              </div>

              <div className="min-h-0 flex-1 bg-muted/20">
                {activeView === "preview" ? (
                  <div className="h-full bg-background">
                    {fw.previewSupported ? (
                      <PreviewFrame />
                    ) : (
                      <UnsupportedPreview
                        label={fw.label}
                        onShowCode={() => setActiveView("code")}
                      />
                    )}
                  </div>
                ) : (
                  <ResizablePanelGroup
                    direction="horizontal"
                    className="h-full"
                  >
                    <ResizablePanel defaultSize={30} minSize={18} maxSize={50}>
                      <div className="h-full border-r border-border bg-card/40">
                        <FileTree />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle className="w-px bg-border transition-colors hover:bg-ring" />
                    <ResizablePanel defaultSize={70}>
                      <div className="h-full bg-background">
                        <CodeEditor />
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border transition-colors hover:bg-ring" />

          {/* Right — chat */}
          <ResizablePanel defaultSize={38} minSize={26} maxSize={55}>
            <div className="flex h-full flex-col bg-card/30">
              <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
                <ProjectTitle
                  projectId={project?.id}
                  initialName={project?.name}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ChatInterface />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function UnsupportedPreview({
  label,
  onShowCode,
}: {
  label: string;
  onShowCode: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <MonitorSmartphone className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Live preview is React-only</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {label} components are generated as source files. Open the Code tab to
          browse and edit the generated {label} code.
        </p>
      </div>
      <Button variant="outline" onClick={onShowCode} className="gap-2">
        <Code className="h-4 w-4" />
        View {label} code
      </Button>
    </div>
  );
}

export function MainContent({ project }: MainContentProps) {
  return (
    // Key on the project id so switching projects fully remounts the providers.
    // Both FileSystemProvider and ChatProvider only read initialData/
    // initialMessages on mount, so without this a client-side navigation
    // between projects keeps the previous project's files and chat.
    <FileSystemProvider
      key={project?.id ?? "new-project"}
      initialData={project?.data}
    >
      <ChatProvider projectId={project?.id} initialMessages={project?.messages}>
        <Workspace project={project} />
      </ChatProvider>
    </FileSystemProvider>
  );
}
