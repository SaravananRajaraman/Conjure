"use server";

import { prisma } from "@/lib/prisma";

export async function getProjects() {
  const projects = await prisma.project.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return projects;
}
