import { getProject } from "@/actions/get-project";
import { MainContent } from "@/app/main-content";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;

  let project;
  try {
    project = await getProject(projectId);
  } catch (error) {
    // If project not found, redirect to home
    redirect("/");
  }

  return <MainContent project={project} />;
}
