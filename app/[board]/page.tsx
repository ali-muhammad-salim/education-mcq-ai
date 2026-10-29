import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  SUPPORTED_BOARDS,
  CLASS_DEFINITIONS,
  normalizeBoardId,
} from "@/lib/boardHierarchy";
import Trail from "@/components/rise/Trail";
import styles from "@/components/rise/discovery.module.css";

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

  const classes = Object.values(CLASS_DEFINITIONS);

  return (
    <div className="rise-ui">
      <section className={styles.shell}>
        <Trail items={[{ label: board.shortCode }]} />

        <header className={styles.masthead}>
          <span className={styles.mastStamp}>{board.shortCode}</span>
          <h1 className={styles.mastTitle}>{board.fullName}</h1>
          <p className={styles.mastLede}>{board.description}</p>
          <div className={styles.mastMeta}>
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>Status</span>
              <span className={styles.metaValue}>{board.status}</span>
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>Scope</span>
              <span className={styles.metaValue}>{board.tag}</span>
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>Levels</span>
              <span className={styles.metaValue} data-r-num>
                {classes.length} classes
              </span>
            </span>
          </div>
        </header>

        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Pick a class</h2>
          <span className={styles.sectionNote}>SSC &amp; HSSC</span>
        </div>

        <ul className={styles.classGrid}>
          {classes.map((grade) => (
            <li key={grade.roman}>
              <Link
                className={styles.classTile}
                href={`/${board.id}/${grade.roman}`}
              >
                <span className={styles.classRoman}>{grade.roman}</span>
                <span className={styles.classStage}>{grade.stageLabel}</span>
                <h3 className={styles.className}>{grade.name}</h3>
                <p className={styles.classDesc}>{grade.curriculum}</p>
                <span className={styles.itemState}>
                  Open <ArrowUpRight aria-hidden="true" size={12} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
