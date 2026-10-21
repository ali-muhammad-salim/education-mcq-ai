import Link from "next/link";
import { redirect } from "next/navigation";
import { SUPPORTED_BOARDS } from "@/lib/boardHierarchy";
import { studyScope } from "@/services/study/navigation";
import { studyKinds } from "@/services/study/contracts";
import styles from "@/components/Study.module.css";

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
  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Study material</span>
          <h1>Start with your board</h1>
          <p className={styles.muted}>
            Choose your board, class and subject. Your chapter resources are
            together inside each subject.
          </p>
        </div>
      </header>
      <div className={styles.grid}>
        {SUPPORTED_BOARDS.map((board) => (
          <Link className={styles.card} href={"/" + board.id} key={board.id}>
            <h2>{board.name}</h2>
            <p className={styles.muted}>{board.fullName}</p>
            <span>Choose your class →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
