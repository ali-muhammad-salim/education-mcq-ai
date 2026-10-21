import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DocumentViews from "@/components/DocumentViews";
import { studyScope } from "@/services/study/navigation";
import styles from "@/components/MaterialLayout.module.css";
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const original =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    scope.classDef.level === 9
      ? "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
      : undefined;
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
          { label: "Practicals", active: true },
        ]}
      />
      <h1>Practicals</h1>
      {original ? (
        <DocumentViews title="Practical paper" original={original} />
      ) : (
        <p className={styles.muted}>Coming soon</p>
      )}
    </section>
  );
}
