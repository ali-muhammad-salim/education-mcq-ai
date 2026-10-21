import { redirect } from "next/navigation";
import BrowseMaterials from "@/components/BrowseMaterials";
import { normalizeClassRoman } from "@/lib/boardHierarchy";
import { studyScope } from "@/services/study/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; subject?: string; board?: string }>;
}) {
  const q = await searchParams,
    grade = q.grade ? normalizeClassRoman(q.grade) : null,
    scope = grade
      ? studyScope(q.board || "akueb", grade, q.subject || "physics")
      : null;
  if (scope) redirect(scope.baseUrl + "/pastpapers");
  return <BrowseMaterials title="Past papers" />;
}
