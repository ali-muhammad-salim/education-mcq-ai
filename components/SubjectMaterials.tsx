import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  FlaskConical,
  Info,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import Trail from "./rise/Trail";
import styles from "./rise/discovery.module.css";
import { studyScope, studyChapters } from "@/services/study/navigation";
import { subjectMaterialTypes } from "@/services/materials/catalog";
import { supportingMaterialLabels } from '@/lib/materialTypes';
import { mappedChapterGroups, mappedTheoryUnits } from '@/services/materials/practice';
import { hsscPhysicsSyllabus } from '@/lib/hsscPhysicsSyllabus';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';

type Group = "papers" | "practice" | "study" | "lab" | "support";

const GROUPS: { id: Group; title: string; note: string; icon: typeof FileText }[] = [
  { id: "papers", title: "Papers & syllabus", note: "Board documents", icon: FileText },
  { id: "practice", title: "Question practice", note: "By chapter & paper", icon: ListChecks },
  { id: "study", title: "Study material", note: "Notes & revision", icon: NotebookPen },
  { id: "lab", title: "Practicals", note: "Lab work", icon: FlaskConical },
  { id: "support", title: "Supporting resources", note: "Extras", icon: BookOpen },
];

export default async function SubjectMaterials({
  params,
}: {
  params: { board: string; class: string; subject: string };
}) {
  const scope = studyScope(params.board, params.class, params.subject);
  if (!scope) notFound();
  const hssc = hsscPhysicsSyllabus(scope.board.id, scope.classDef.level, scope.meta.slug);
  const senior = hsscPhysicsResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const [documents, chapters] = await Promise.all([
    subjectMaterialTypes(params.board, params.class, params.subject).catch(error => {
      if (hssc && error.name === "PrismaClientInitializationError") return new Set<string>();
      throw error;
    }),
    studyChapters(scope),
  ]);
  const legacy =
    scope.board.id === "akueb" &&
    scope.meta.slug === "physics" &&
    [9, 10].includes(scope.classDef.level);
  const isCsIX = scope.board.id === "akueb" && scope.meta.slug === "computer-science" && scope.classDef.level === 9;
  const isCsX = scope.board.id === "akueb" && scope.meta.slug === "computer-science" && scope.classDef.level === 10;
  const isChemIX = scope.board.id === "akueb" && scope.meta.slug === "chemistry" && scope.classDef.level === 9;
  const isChemX = scope.board.id === "akueb" && scope.meta.slug === "chemistry" && scope.classDef.level === 10;
  const chemistry = isChemIX || isChemX;
  const mathematics =
    scope.board.id === "akueb" &&
    scope.meta.slug === "mathematics" &&
    [9, 10].includes(scope.classDef.level);
  const [mathMcqs, mathTheory] = mathematics
    ? await Promise.all([mappedChapterGroups(scope.board.shortCode, scope.classDef.level, scope.meta.title), mappedTheoryUnits(scope.board.shortCode, scope.classDef.level, scope.meta.title)])
    : [[], []];
  const available = (kind: string) => documents.has(kind);
  const items: {
    label: string;
    href: string;
    pending?: boolean;
    group: Group;
  }[] = [
    {
      label: "Syllabus",
      href: scope.baseUrl + "/syllabus",
      pending: !hssc && !legacy && !isCsIX && !isCsX && !chemistry && !mathematics && !available("syllabus"),
      group: "papers",
    },
    {
      label: "Model papers",
      href: scope.baseUrl + "/model-papers",
      pending: !senior && !legacy && !isCsIX && !chemistry && !available("model_paper"),
      group: "papers",
    },
    {
      label: "Past papers",
      href: scope.baseUrl + "/pastpapers",
      pending:
        !(senior?.grade === 11) && !legacy && !isCsIX && !chemistry && !available("past_paper"),
      group: "papers",
    },
    {
      label: "Books & resource guides",
      href: scope.baseUrl + "/books",
      pending: !senior && !legacy && !chemistry && !available("textbook"),
      group: "papers",
    },
    ...(hssc ? [{
      label: "Chapters & learning outcomes",
      href: scope.baseUrl + "/study",
      group: "study" as Group,
    }] : []),
    ...(senior ? [
      { label: "Teaching & learning resource guide", href: senior.base + "/books?view=guide", group: "papers" as Group },
      { label: "28-week instructional pacing guide", href: senior.base + "/books?view=pacing", group: "papers" as Group },
    ] : []),
    ...(legacy
      ? [
          {
            label: "Teaching & learning resource guide",
            href:
              scope.classDef.level === 9
                ? "/resources/physics-ix-resource-guide"
                : "/resources/physics-x-resource-guide",
            pending: false,
            group: "papers" as Group,
          },
          {
            label: "28-week instructional pacing guide",
            href:
              scope.classDef.level === 9
                ? "/resources/physics-ix-pacing-guide"
                : "/resources/physics-x-pacing-guide",
            pending: false,
            group: "papers" as Group,
          },
        ]
      : chemistry
        ? [
            {
              label: "Teaching & learning resource guide",
              href:
                scope.classDef.level === 9
                  ? "/resources/chemistry-ix-resource-guide"
                  : "/resources/chemistry-x-resource-guide",
              pending: false,
              group: "papers" as Group,
            },
            {
              label: "28-week instructional pacing guide",
              href:
                scope.classDef.level === 9
                  ? "/resources/chemistry-ix-pacing-guide"
                  : "/resources/chemistry-x-pacing-guide",
              pending: false,
              group: "papers" as Group,
            },
          ]
        : []),
    {
      label: "MCQs (Chapter-wise, Past Papers & Full Book)",
      href: scope.baseUrl + "/mcqs",
      pending: !senior && !legacy && !isCsIX && !chemistry && !mathMcqs.length && !available("mcq"),
      group: "practice",
    },
    ...(['crqs', 'erqs', 'numericals'] as const).filter(mode => mathTheory.some(unit => unit[mode].length > 0)).map(mode => ({
      label: mode === 'crqs' ? 'Chapter-wise CRQs (Short Response Questions)' : mode === 'erqs' ? 'Chapter-wise ERQs (Extended Response Questions)' : 'Chapter-wise Numericals & Worked Problems',
      href: scope.baseUrl + '/' + mode,
      pending: false,
      group: 'practice' as Group,
    })),
    ...(legacy
      ? [
          {
            label: "Chapter-wise CRQs (Short Response Questions)",
            href: scope.baseUrl + "/crqs",
            pending: false,
            group: "practice" as Group,
          },
          {
            label: "Chapter-wise ERQs (Extended Response Questions)",
            href: scope.baseUrl + "/erqs",
            pending: false,
            group: "practice" as Group,
          },
          {
            label: "Chapter-wise Numericals & Worked Problems",
            href: scope.baseUrl + "/numericals",
            pending: false,
            group: "practice" as Group,
          },
          {
            label: "Chapter-wise SLO Notes & Definitions",
            href: scope.baseUrl + "/chapter-notes",
            pending: false,
            group: "study" as Group,
          },
        ]
      : (
          [
            ["CHAPTER_NOTES", "Chapter notes", "study"],
            ["NUMERICAL_GUIDE", "Worked numericals", "practice"],
            ["FORMULA_SHEET", "Formula sheets", "study"],
            ["CHEAT_SHEET", "Revision sheets", "study"],
            ["FLASHCARDS", "Flashcards", "study"],
            ["PRACTICE_SET", "Practice questions", "practice"],
            ["CHAPTER_READER", "Chapter reader", "study"],
          ] as const
        ).map(([kind, label, group]) => ({
          label,
          href: scope.baseUrl + "/study?kind=" + kind,
          pending: !chapters.some((c) =>
            c.kinds.some((k) => k.kind === kind && k.count > 0),
          ),
          group: group as Group,
        }))),
    {
      label: "Practicals",
      href: scope.baseUrl + "/practicals",
      pending: !hssc && !(legacy && scope.classDef.level === 9) && !chemistry && !available('practical_paper'),
      group: "lab",
    },
    ...Object.entries(supportingMaterialLabels)
      .filter(([kind]) => kind !== 'practical_paper' && available(kind))
      .map(([kind, label]) => ({
        label,
        href: scope.baseUrl + '/resources/' + kind,
        group: "support" as Group,
      })),
  ];
  const ready = items.filter((item) => !item.pending).length;
  return (
    <div className="rise-ui">
      <section className={styles.shell}>
        <Trail
          items={[
            { label: scope.board.shortCode, href: "/" + scope.board.id },
            {
              label: scope.classDef.name,
              href: "/" + scope.board.id + "/" + scope.classDef.roman,
            },
            { label: scope.meta.title },
          ]}
        />

        <header className={styles.masthead}>
          <span className={styles.mastStamp}>
            {scope.board.shortCode} · {scope.classDef.stageLabel}
          </span>
          <h1 className={styles.mastTitle}>{scope.meta.title}</h1>
          <div className={styles.mastMeta}>
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>Class</span>
              <span className={styles.metaValue}>{scope.classDef.name}</span>
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>Available now</span>
              <span className={styles.metaValue} data-r-num>
                {ready} of {items.length} resources
              </span>
            </span>
          </div>
        </header>

        {ready === 0 && (
          <div className={styles.notice}>
            <Info aria-hidden="true" className={styles.noticeIcon} size={18} />
            <p className={styles.noticeText}>
              Nothing is published for {scope.meta.title} {scope.classDef.name}{" "}
              yet. The sections below show what the {scope.board.shortCode}{" "}
              curriculum covers, so you can see what is on the way.
            </p>
          </div>
        )}

        <div className={styles.groups}>
          {GROUPS.map((group) => {
            const groupItems = items.filter((item) => item.group === group.id);
            if (!groupItems.length) return null;
            const Icon = group.icon;
            const live = groupItems.filter((item) => !item.pending).length;
            return (
              <section key={group.id}>
                <div className={styles.groupHead}>
                  <h2 className={styles.groupTitle}>{group.title}</h2>
                  <span className={styles.groupCount} data-r-num>
                    {live}/{groupItems.length} ready
                  </span>
                </div>
                <ul className={styles.itemGrid}>
                  {groupItems.map((item) => (
                    <li key={item.href + item.label}>
                      <Link
                        className={
                          item.pending
                            ? `${styles.item} ${styles.itemPending}`
                            : styles.item
                        }
                        href={item.href}
                      >
                        <span className={styles.itemIcon}>
                          <Icon aria-hidden="true" size={17} />
                        </span>
                        <span className={styles.itemText}>
                          <span className={styles.itemLabel}>{item.label}</span>
                          <span className={styles.itemState}>
                            {item.pending ? "Coming soon" : "Open"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
