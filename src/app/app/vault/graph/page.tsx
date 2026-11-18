/**
 * /app/vault/graph — the student's knowledge graph: their notes over the
 * shared curriculum, with their mastery as an overlay.
 */
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { GraphExplorer } from "@/components/vault/graph/GraphExplorer";
import type { VaultGraphData } from "@/components/vault/graph/model";
import { VaultNav } from "@/components/vault/VaultNav";
import { requireStudent } from "@/modules/auth/session";
import { getEnrolledCourses } from "@/modules/learning/overview";
import { getGraph } from "@/modules/vault/service";

export const metadata: Metadata = { title: "Knowledge graph" };

export default async function VaultGraphPage() {
  const user = await requireStudent();
  const [graph, enrolled] = await Promise.all([
    getGraph(user, {}),
    getEnrolledCourses(user, user.id),
  ]);
  // Plain JSON for the client component.
  const initial = JSON.parse(JSON.stringify(graph)) as VaultGraphData;
  const courses = enrolled
    .map((c) => ({ id: c.courseId, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Knowledge graph"
        description="Your notes, the concepts they link to, and how those concepts connect — with your current level on every concept."
      />
      <VaultNav current="graph" />
      <GraphExplorer initial={initial} courses={courses} />
    </>
  );
}
