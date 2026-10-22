import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DocumentViews from "@/components/DocumentViews";
import MaterialList from "@/components/MaterialList";
import { studyScope } from "@/services/study/navigation";
import { subjectMaterials } from "@/services/materials/catalog";
import styles from "@/components/MaterialLayout.module.css";
import physicsIX from "@/data/physics/ssc1_exact_syllabus.json";
import physicsX from "@/data/physics/ssc2_exact_syllabus.json";
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
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
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
          title="Physics syllabus"
          original={
            compiled?.original || "/materials/ssc/physics/ssc-" +
            (scope.classDef.level === 9 ? "1" : "2") +
            "/physics-ssc-" +
            (scope.classDef.level === 9 ? "i" : "ii") +
            "-syllabus-grade-" +
            scope.classDef.level +
            "-dedicated.pdf"
          }
        >
          <SyllabusClient board={scope.board} classDef={scope.classDef} meta={scope.meta} baseUrl={scope.baseUrl}
            units={compiled?.units || (scope.classDef.level === 9 ? physicsIX : physicsX)}
          />
        </DocumentViews>
      ) : (
        !docs.length && <p className={styles.muted}>Coming soon</p>
      )}
    </section>
  );
}
