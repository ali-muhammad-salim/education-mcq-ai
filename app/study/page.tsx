import { redirect } from "next/navigation";
import { studyScope } from "@/services/study/navigation";
import { studyKinds } from "@/services/study/contracts";

export default async function StudyDirectory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  if (
    typeof q.board === "string" &&
    typeof q.classLevel === "string" &&
    typeof q.subject === "string"
  ) {
    const scope = studyScope(q.board, q.classLevel, q.subject);
    if (scope) {
      const chapter =
        typeof q.topicId === "string"
          ? "/" + encodeURIComponent(q.topicId)
          : "";
      const kind =
        typeof q.kind === "string" && studyKinds.some((k) => k === q.kind)
          ? "?kind=" + q.kind
          : "";
      redirect(scope.baseUrl + "/study" + chapter + kind);
    }
  }
  redirect("/");
}
