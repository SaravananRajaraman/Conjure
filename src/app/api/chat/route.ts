import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText, appendResponseMessages, convertToCoreMessages } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getLanguageModel, isMockProvider } from "@/lib/provider";
import { getGenerationPrompt } from "@/lib/prompts/generation";
import type { FrameworkId } from "@/lib/frameworks";

export async function POST(req: Request) {
  const {
    messages,
    files,
    projectId,
    framework,
  }: {
    messages: any[];
    files: Record<string, FileNode>;
    projectId?: string;
    framework?: FrameworkId;
  } = await req.json();

  // Convert the useChat UI messages into core messages. This is required so
  // that tool calls / tool results from previous turns (carried in the UI
  // message `toolInvocations` field) are expanded into the tool-call and
  // tool-result content parts the model actually sees. Without it, follow-up
  // turns lose all tool context and the model stops creating/editing files.
  const coreMessages = convertToCoreMessages(messages);
  coreMessages.unshift({
    role: "system",
    content: getGenerationPrompt(framework),
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  });

  // Reconstruct the VirtualFileSystem from serialized data
  const fileSystem = new VirtualFileSystem();
  fileSystem.deserializeFromNodes(files);

  const model = getLanguageModel();
  // Use fewer steps for mock provider to prevent repetition
  const useMock = isMockProvider();
  const result = streamText({
    model,
    messages: coreMessages,
    maxTokens: 10_000,
    maxSteps: useMock ? 4 : 40,
    onError: (err: any) => {
      console.error(err);
    },
    tools: {
      str_replace_editor: buildStrReplaceTool(fileSystem),
      file_manager: buildFileManagerTool(fileSystem),
    },
    onFinish: async ({ response }) => {
      // Save to project if projectId is provided
      if (projectId) {
        try {
          // Get the messages from the response
          const responseMessages = response.messages || [];
          // Combine original messages with response messages
          const allMessages = appendResponseMessages({
            messages: [...messages.filter((m) => m.role !== "system")],
            responseMessages,
          });

          await prisma.project.update({
            where: {
              id: projectId,
            },
            data: {
              messages: JSON.stringify(allMessages),
              data: JSON.stringify(fileSystem.serialize()),
            },
          });
        } catch (error) {
          console.error("Failed to save project data:", error);
        }
      }
    },
  });

  return result.toDataStreamResponse();
}

export const maxDuration = 120;
