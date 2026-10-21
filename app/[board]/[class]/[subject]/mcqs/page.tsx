import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { studyScope } from "@/services/study/navigation";
import { getFallbackPaper } from "@/lib/paperDataService";
import styles from "@/components/MaterialLayout.module.css";
import McqsClient from "./McqsClient";
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const model = legacy
    ? getFallbackPaper("PHY-" + scope.classDef.roman + "-P1")
    : null;
  return (
    <section className={styles.page}>
      <Breadcrumbs
        items={[
          { label: scope.board.name, href: "/" + scope.board.id },
          {
            label: scope.classDef.name,
            href: "/" + scope.board.id + "/" + scope.classDef.roman,
          },
          { label: scope.meta.title, href: scope.baseUrl },
          { label: "MCQs", active: true },
        ]}
      />
      <h1>MCQs</h1>
      {model ? (
        <McqsClient
          model={model}
          past={
            scope.classDef.level === 9
              ? getFallbackPaper("PHY-IX-2025-P1")
              : null
          }
        />
      ) : (
        <p className={styles.muted}>Coming soon</p>
      )}
    </section>
  );
}
