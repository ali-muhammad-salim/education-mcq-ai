import { notFound } from "next/navigation";
import Breadcrumbs from "./Breadcrumbs";
import MaterialList from "./MaterialList";
import styles from "./MaterialLayout.module.css";
import { studyScope, studyChapters } from "@/services/study/navigation";
import { subjectMaterialTypes } from "@/services/materials/catalog";

export default async function SubjectMaterials({
  params,
}: {
  params: { board: string; class: string; subject: string };
}) {
  const scope = studyScope(params.board, params.class, params.subject);
  if (!scope) notFound();
  const [documents, chapters] = await Promise.all([
    subjectMaterialTypes(params.board, params.class, params.subject),
    studyChapters(scope),
  ]);
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const available = (kind: string) => documents.has(kind);
  const items = [
    {
      label: "Syllabus",
      href: scope.baseUrl + "/syllabus",
      pending: !legacy && !available("syllabus"),
    },
    {
      label: "Model papers",
      href: scope.baseUrl + "/model-papers",
      pending: !legacy && !available("model_paper"),
    },
    {
      label: "Past papers",
      href: scope.baseUrl + "/pastpapers",
      pending:
        !(legacy && scope.classDef.level === 9) && !available("past_paper"),
    },
    {
      label: "Books",
      href: scope.baseUrl + "/books",
      pending: !legacy && !available("textbook"),
    },
    ...(
      [
        ["CHAPTER_NOTES", "Chapter notes"],
        ["NUMERICAL_GUIDE", "Worked numericals"],
        ["FORMULA_SHEET", "Formula sheets"],
        ["CHEAT_SHEET", "Revision sheets"],
        ["FLASHCARDS", "Flashcards"],
        ["PRACTICE_SET", "Practice questions"],
        ["CHAPTER_READER", "Chapter reader"],
      ] as const
    ).map(([kind, label]) => ({
      label,
      href: scope.baseUrl + "/study?kind=" + kind,
      pending: !chapters.some((c) =>
        c.kinds.some((k) => k.kind === kind && k.count > 0),
      ),
    })),
    { label: "MCQs", href: scope.baseUrl + "/mcqs", pending: !legacy },
    {
      label: "Practicals",
      href: scope.baseUrl + "/practicals",
      pending: !(legacy && scope.classDef.level === 9),
    },
  ];
  return (
    <section className={styles.page}>
      <Breadcrumbs
        items={[
          { label: scope.board.name, href: "/" + scope.board.id },
          {
            label: scope.classDef.name,
            href: "/" + scope.board.id + "/" + scope.classDef.roman,
          },
          { label: scope.meta.title, active: true },
        ]}
      />
      <h1>{scope.meta.title}</h1>
      <MaterialList items={items} />
    </section>
  );
}
