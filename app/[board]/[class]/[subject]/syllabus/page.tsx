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
import chemIX from "@/data/chemistry/ssc1_exact_syllabus.json";
import chemX from "@/data/chemistry/ssc2_exact_syllabus.json";
import mathIX from "@/data/mathematics/ssc1_exact_syllabus.json";
import mathX from "@/data/mathematics/ssc2_exact_syllabus.json";
import SyllabusClient from "./SyllabusClient";
import {publishedCurriculum} from '@/services/materials/curriculum';
import { hsscPhysicsSyllabus } from "@/lib/hsscPhysicsSyllabus";
import { physicsSyllabusSections } from "@/lib/physicsSyllabusSections";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  const raw = await params,
    scope = studyScope(raw.board, raw.class, raw.subject);
  if (!scope) notFound();
  const hssc = hsscPhysicsSyllabus(scope.board.id, scope.classDef.level, scope.meta.slug);
  const compiled = await publishedCurriculum(scope.board.shortCode,scope.classDef.level,scope.meta.title).catch(error => {
    if (hssc && error.name === "PrismaClientInitializationError") return null;
    throw error;
  });
  const docs = await subjectMaterials(
    raw.board,
    raw.class,
    raw.subject,
    "syllabus",
  ).catch(error => {
    if (hssc && error.name === "PrismaClientInitializationError") return [];
    throw error;
  });
  const isPhysics =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const isComputerScience =
    scope.board.id === "akueb" &&
    scope.meta.slug === "computer-science" &&
    [9, 10].includes(scope.classDef.level);
  const isChemistry =
    scope.board.id === "akueb" &&
    scope.meta.slug === "chemistry" &&
    [9, 10].includes(scope.classDef.level);
  const isMathematics =
    scope.board.id === "akueb" &&
    scope.meta.slug === "mathematics" &&
    [9, 10].includes(scope.classDef.level);
  const legacy = isPhysics || isComputerScience || isChemistry || isMathematics;

  const defaultOriginalPdf = isComputerScience
    ? `/materials/ssc/computer-science/ssc-${scope.classDef.level === 9 ? '1' : '2'}/computer-science-ssc-full-syllabus-2025.pdf`
    : isChemistry
      ? `/materials/ssc/chemistry/ssc-${scope.classDef.level === 9 ? '1' : '2'}/chemistry-ssc-full-syllabus-2025.pdf`
      : isMathematics
        ? `/materials/ssc/mathematics/ssc-${scope.classDef.level === 9 ? '1' : '2'}/mathematics-science-group-ssc-syllabus-2025.pdf`
        : `/materials/ssc/physics/ssc-${scope.classDef.level === 9 ? '1' : '2'}/physics-ssc-full-syllabus-2025.pdf`;

  const dedicatedOriginalPdf = isComputerScience
    ? (scope.classDef.level === 9
      ? '/materials/ssc/computer-science/ssc-1/computer-science-ssc-i-syllabus-grade-9-dedicated.pdf'
      : '/materials/ssc/computer-science/ssc-2/computer-science-ssc-ii-syllabus-grade-10-dedicated.pdf')
    : isChemistry
      ? (scope.classDef.level === 9
        ? '/materials/ssc/chemistry/ssc-1/chemistry-ssc-i-syllabus-grade-9-dedicated.pdf'
        : '/materials/ssc/chemistry/ssc-2/chemistry-ssc-ii-syllabus-grade-10-dedicated.pdf')
      : isMathematics
        ? `/materials/ssc/mathematics/ssc-${scope.classDef.level === 9 ? '1' : '2'}/mathematics-science-group-ssc-syllabus-2025.pdf`
        : (scope.classDef.level === 9
          ? '/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf'
          : '/materials/ssc/physics/ssc-2/physics-ssc-ii-syllabus-grade-10-dedicated.pdf');

  const originalPdf = legacy ? dedicatedOriginalPdf : (compiled?.original ?? hssc?.original ?? defaultOriginalPdf);

  const defaultUnits = isComputerScience
    ? (scope.classDef.level === 9 ? csIX : csX)
    : isChemistry
      ? (scope.classDef.level === 9 ? chemIX : chemX)
      : isMathematics
        ? (scope.classDef.level === 9 ? mathIX : mathX)
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
      {hssc || legacy || compiled ? (
        <DocumentViews
          title={scope.meta.title+" syllabus"}
          original={originalPdf}
          continuousPdf
        >
          <SyllabusClient board={scope.board} classDef={scope.classDef} meta={scope.meta} baseUrl={scope.baseUrl}
            originalUrl={originalPdf}
            units={compiled?.units ?? hssc?.units ?? defaultUnits}
            physicsSections={!compiled || isPhysics ? physicsSyllabusSections(scope.board.id, scope.classDef.level, scope.meta.slug) : null}
          />
        </DocumentViews>
      ) : (
        !docs.length && <p className={styles.muted}>Coming soon</p>
      )}
    </section>
  );
}
