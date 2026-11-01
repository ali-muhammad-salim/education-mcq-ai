import { notFound } from "next/navigation";
import {
  SUPPORTED_BOARDS,
  CLASS_DEFINITIONS,
  normalizeBoardId,
} from "@/lib/boardHierarchy";
import MaterialList from "@/components/MaterialList";
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "@/components/MaterialLayout.module.css";
export default async function Board({
  params,
}: {
  params: Promise<{ board: string }>;
}) {
  const raw = await params;
  const board = SUPPORTED_BOARDS.find(
    (b) => b.id === normalizeBoardId(raw.board),
  );
  if (!board) notFound();
  return (
    <section className={styles.page}>
      <Breadcrumbs items={[{ label: board.name, active: true }]} />
      <h1>{board.name}</h1>
      <MaterialList
        items={Object.values(CLASS_DEFINITIONS).map((grade) => ({
          label: grade.name,
          href: "/" + board.id + "/" + grade.roman,
        }))}
      />
    </section>
  );
}
