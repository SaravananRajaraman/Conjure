"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function renameProject(projectId: string, name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Project name cannot be empty");
  }

  const project = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      name: trimmed,
    },
  });

  revalidatePath("/");
  revalidatePath(`/${projectId}`);

  return project;
}
