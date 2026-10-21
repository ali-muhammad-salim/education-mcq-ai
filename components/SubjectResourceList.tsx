import Link from "next/link";
import {paperLabel} from "@/lib/paperPresentation";
import { notFound } from "next/navigation";
import Breadcrumbs from "./Breadcrumbs";
import MaterialList, { type MaterialItem } from "./MaterialList";
import DocumentViews from "./DocumentViews";
import styles from "./MaterialLayout.module.css";
import { studyScope } from "@/services/study/navigation";
import { subjectMaterials } from "@/services/materials/catalog";
import { getAllStandardPapers } from "@/lib/paperDataService";
import prisma from "@/lib/prisma";

export default async function SubjectResourceList({
  params,
  type,
  guide = false,
  after = "",
}: {
  params: { board: string; class: string; subject: string };
  type: "model_paper" | "past_paper" | "textbook";
  guide?: boolean;
  after?: string;
}) {
  const scope = studyScope(params.board, params.class, params.subject);
  if (!scope) notFound();
  const titles = {
    model_paper: "Model papers",
    past_paper: "Past papers",
    textbook: "Books",
  };
  const documents = await subjectMaterials(
    params.board,
    params.class,
    params.subject,
    type,
    after,
  );
  const items: MaterialItem[] = documents
    .slice(0, 100)
    .map((doc) => ({
      label: doc.metadata.title || titles[type],
      href: "/materials/" + doc.id,
    }));
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  if (type !== "textbook" && !after) {
    const stored = await prisma.pastPaper.findMany({
      where: {
        academicClass: {
          level: scope.classDef.level,
          programme: {
            board: {
              shortCode: { equals: scope.board.shortCode, mode: "insensitive" },
            },
          },
        },
        subject: { name: { equals: scope.meta.title, mode: "insensitive" } },
        examType: type === "model_paper" ? "MODEL_EXAM" : "ANNUAL",
      },
      select: {
        id: true,
        paperCode: true,
        title: true,
        fileUrl: true,
        _count: { select: { questions: true } },
      },
      orderBy: { examYear: "desc" },
      take: 100,
    });
    const seen = new Set<string>();
    for (const paper of [
      ...stored,
      ...(legacy
        ? getAllStandardPapers().filter(
            (p) =>
              p.academicClass?.level === scope.classDef.level &&
              (type === "model_paper"
                ? /MODEL/i.test(p.examSession || "")
                : !/MODEL/i.test(p.examSession || "")),
          )
        : []),
    ]) {
      const code = paper.paperCode || paper.id;
      if (seen.has(code)) continue;
      seen.add(code);
      if (!paper.fileUrl && !paper._count.questions) continue;
      items.push({
        label: paperLabel(paper.paperCode,paper.title),
        href: "/past-papers/" + encodeURIComponent(code),
      });
    }
    if (
      type === "model_paper" &&
      legacy &&
      scope.classDef.level === 9 &&
      !after
    )
      items.push({
        label: "Practical paper",
        href: scope.baseUrl + "/model-papers/P3",
      });
  } else if (legacy && !after)
    items.push({
      label: "Resources guide",
      href: scope.baseUrl + "/books?view=guide",
    });
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
          { label: titles[type], active: true },
        ]}
      />
      <h1>{titles[type]}</h1>
      {guide && legacy ? (
        <DocumentViews
          title="Resources guide"
          original={
            "/materials/ssc/physics/ssc-" +
            (scope.classDef.level === 9 ? "1" : "2") +
            "/resources-guide-2025-ssc-" +
            (scope.classDef.level === 9 ? "i" : "ii") +
            "-physics-dedicated.pdf"
          }
        />
      ) : items.length ? (
        <MaterialList items={items} />
      ) : (
        <p className={styles.muted}>Coming soon</p>
      )}
      {documents.length > 100 && (
        <p>
          <Link href={"?after=" + documents[99].id}>More documents →</Link>
        </p>
      )}
    </section>
  );
}
