import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { publicMaterial, materialMetadata } from "@/services/materials/catalog";
import { studyScope } from "@/services/study/navigation";
import DocumentViews from "@/components/DocumentViews";
import SourceDocumentText from "@/components/SourceDocumentText";
import {literalSourceText} from '@/lib/sourceTables';
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "@/components/MaterialLayout.module.css";
import {z} from 'zod';
import {approvedEnhancement} from '@/services/ingestion/enhancement-review';
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const document = await publicMaterial(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const pageNumber = Math.max(
    1,
    Math.min(Math.max(1,Math.ceil(document.totalPages/10)), Math.floor(Number((await searchParams).page) || 1)),
  );
  const pages = await prisma.knowledgeArtifact.findMany({
    where: { documentId: id },
    select: { id: true, pageNumber: true, content: true,data:true,contentHash:true },
    orderBy: { pageNumber: "asc" },
    skip: (pageNumber - 1) * 10,
    take: 10,
  });
  const subject = document.subject,
    grade = subject.academicClass;
  const scope = studyScope(
    grade.programme.board.shortCode,
    String(grade.level),
    subject.name,
  );
  const metadata = materialMetadata.parse(document.catalogMetadata || {});
  const title =
    metadata.title ||
    subject.name + " " + document.resourceType.replaceAll("_", " ");
  return (
    <section className={styles.page}>
      <Breadcrumbs
        items={[
          {
            label: grade.programme.board.shortCode,
            href: scope ? "/" + scope.board.id : "/",
          },
          {
            label: grade.name,
            href: scope
              ? "/" + scope.board.id + "/" + scope.classDef.roman
              : "/",
          },
          { label: subject.name, href: scope?.baseUrl || "/" },
          { label: title, active: true },
        ]}
      />
      <h1>{title}</h1>
      <DocumentViews
        title={title}
        original={"/api/materials/" + id + "/original"}
      >
        <div className={styles.digital}>
          {pages.map((page) => (
            <section className={styles.source} key={page.id}>
              <h2>Page {page.pageNumber}</h2>
              <SourceDocumentText text={literalSourceText(page.data,page.content)} />
              {(()=>{
                const data=z.object({crops:z.array(z.object({region:z.number().int().nonnegative()})),enhancements:z.array(approvedEnhancement).default([])}).safeParse(page.data);
                return data.success?data.data.crops.map(c=><figure key={c.region} style={{margin:'1rem 0'}}>
                  <img src={`/api/materials/${id}/regions/${page.id}/${c.region}`} alt={`Source figure on page ${page.pageNumber}`} style={{maxWidth:'100%',height:'auto',background:'#fff',borderRadius:8}}/>
                  <figcaption className={styles.muted}>{data.data.enhancements.some(e=>e.region===c.region&&e.sourceHash===page.contentHash)?'Admin-approved enhanced figure':'Original source figure'} · Page {page.pageNumber}</figcaption>
                  {data.data.enhancements.some(e=>e.region===c.region&&e.sourceHash===page.contentHash)&&<details><summary style={{minHeight:44,cursor:'pointer',padding:'10px 0'}}>Original diagram</summary><img loading="lazy" src={`/api/materials/${id}/regions/${page.id}/${c.region}?variant=original`} alt="Exact original source diagram" style={{maxWidth:'100%',height:'auto',background:'#fff'}}/></details>}
                </figure>):null;
              })()}
              <Link
                href={"/api/materials/" + id + "/pages/" + page.id}
                target="_blank"
              >
                Source page ↗
              </Link>
            </section>
          ))}
          <div className={styles.actions}>
            {pageNumber > 1 && (
              <Link
                className={styles.button}
                href={"?page=" + (pageNumber - 1)}
              >
                Previous pages
              </Link>
            )}
            {pageNumber * 10 < document.totalPages && (
              <Link
                className={styles.button}
                href={"?page=" + (pageNumber + 1)}
              >
                Next pages
              </Link>
            )}
          </div>
        </div>
      </DocumentViews>
    </section>
  );
}
