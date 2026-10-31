import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DocumentViews from "@/components/DocumentViews";
import MaterialList from "@/components/MaterialList";
import { studyScope } from "@/services/study/navigation";
import { subjectMaterials } from "@/services/materials/catalog";
import styles from "@/components/MaterialLayout.module.css";
import physicsIX from "@/data/physics/ssc1_exact_syllabus.json";
import physicsX from "@/data/physics/ssc2_exact_syllabus.json";
import csIX from "@/data/computer-science/ssc1_exact_syllabus.json";
import csX from "@/data/computer-science/ssc2_exact_syllabus.json";
import SyllabusClient from "./SyllabusClient";
import {publishedCurriculum} from '@/services/materials/curriculum';
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const compiled=await publishedCurriculum(scope.board.shortCode,scope.classDef.level,scope.meta.title);
  const docs = await subjectMaterials(
    raw.board,
    raw.class,
    raw.subject,
    "syllabus",
  );
  const isPhysics =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const isComputerScience =
    scope.board.id === "akueb" &&
    scope.meta.slug === "computer-science" &&
    [9, 10].includes(scope.classDef.level);
  const legacy = isPhysics || isComputerScience;

  const defaultOriginalPdf = isComputerScience
    ? `/materials/ssc/computer-science/ssc-${scope.classDef.level === 9 ? '1' : '2'}/computer-science-ssc-full-syllabus-2025.pdf`
    : `/materials/ssc/physics/ssc-${scope.classDef.level === 9 ? '1' : '2'}/physics-ssc-full-syllabus-2025.pdf`;

  const defaultUnits = isComputerScience
    ? (scope.classDef.level === 9 ? csIX : csX)
    : (scope.classDef.level === 9 ? physicsIX : physicsX);


  return (
    <section className={styles.page} style={{maxWidth:1280}}>
      <Breadcrumbs
        items={[
          { label: scope.board.name, href: "/" + scope.board.id },
          {
            label: scope.classDef.name,
            href: "/" + scope.board.id + "/" + scope.classDef.roman,
          },
          { label: scope.meta.title, href: scope.baseUrl },
          { label: "Syllabus", active: true },
        ]}
      />
      {docs.length > 0 && (
        <MaterialList
          items={docs.map((d) => ({
            label: d.metadata.title || "Syllabus",
            href: "/materials/" + d.id,
          }))}
        />
      )}{" "}
      {legacy || compiled ? (
        <DocumentViews
          title={scope.meta.title+" syllabus"}
          original={compiled?.original || defaultOriginalPdf}
        >
          <SyllabusClient board={scope.board} classDef={scope.classDef} meta={scope.meta} baseUrl={scope.baseUrl}
            originalUrl={compiled?.original || defaultOriginalPdf}
            units={compiled?.units || defaultUnits}
          />
        </DocumentViews>
      ) : (
        !docs.length && <p className={styles.muted}>Coming soon</p>
      )}
    </section>
  );
}
