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
import { physicsUnit16Resource } from "@/lib/physicsUnit16Resource";
import { physicsUnit17Resource } from "@/lib/physicsUnit17Resources";
import { subjectMaterialTypes, subjectPaperListings } from "@/services/materials/catalog";
import { supportingMaterialLabels } from '@/lib/materialTypes';
import { hsscBiologyStudyResources } from '@/lib/hsscBiologyStudyResources';
import { mappedChapterGroups, mappedTheoryUnits } from '@/services/materials/practice';
import { hsscComputerScienceResources } from "@/lib/hsscComputerScienceResources";
import { hsscComputerScienceSyllabus } from "@/lib/hsscComputerScienceSyllabus";
import { hsscPhysicsSyllabus } from '@/lib/hsscPhysicsSyllabus';
import { hsscPhysicsResources } from '@/lib/hsscPhysicsResources';
import { hsscBiologySyllabus } from '@/lib/hsscBiologySyllabus';
import { hsscBiologyChapterTheory } from '@/lib/hsscBiologyChapterQuestions';
import { sscBiologySyllabus } from '@/lib/sscBiologySyllabus';
import { sscComputerScienceTheory } from '@/lib/sscComputerScienceTheory';

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
  const hssc = hsscPhysicsSyllabus(scope.board.id, scope.classDef.level, scope.meta.slug)
    ?? hsscComputerScienceSyllabus(scope.board.id, scope.classDef.level, scope.meta.slug);
  const computerScience = hsscComputerScienceResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const senior = hsscPhysicsResources(scope.board.id, scope.classDef.level, scope.meta.slug);
  const seniorBiology = hsscBiologySyllabus(scope.board.id, scope.classDef.level, scope.meta.slug);
  const biology = sscBiologySyllabus(scope.board.id, scope.classDef.level, scope.meta.slug);
  const ssc = scope.board.id === "akueb" && (scope.classDef.level === 9 || scope.classDef.level === 10);
  const legacy = ssc && scope.meta.slug === "physics";
  const sscComputerScience = ssc && scope.meta.slug === "computer-science";
  const chemistry = ssc && scope.meta.slug === "chemistry";
  const mathematics = ssc && scope.meta.slug === "mathematics";
  const includeStandard = scope.board.id === "akueb";
  const [documents, chapters, models, pastPapers] = await Promise.all([
    subjectMaterialTypes(params.board, params.class, params.subject).catch(error => {
      if ((hssc || biology || seniorBiology) && error.name === "PrismaClientInitializationError") return new Set<string>();
      throw error;
    }),
    studyChapters(scope),
    subjectPaperListings(scope, 'MODEL_EXAM', includeStandard),
    subjectPaperListings(scope, 'ANNUAL', includeStandard),
  ]);
  const [chapterMcqs, mappedTheory] = await Promise.all([
    mathematics || computerScience || biology ? mappedChapterGroups(scope.board.shortCode, scope.classDef.level, scope.meta.title) : [],
    seniorBiology ? hsscBiologyChapterTheory(scope.board.id, scope.classDef.level, scope.meta.slug) ?? []
      : sscComputerScience ? sscComputerScienceTheory(scope.classDef.level === 9 ? 9 : 10)
      : mathematics || computerScience || biology || chemistry ? mappedTheoryUnits(scope.board.shortCode, scope.classDef.level, scope.meta.title) : [],
  ]).catch(error => {
    if (biology && error.name === "PrismaClientInitializationError") return [[], []] as const;
    throw error;
  });
  const available = (kind: string) => documents.has(kind);
  const mathematicsMcqs = mathematics && [...models, ...pastPapers].some(paper => /-P1$/.test(paper.paperCode ?? '') && paper._count.questions > 0);
  const items: {
    label: string;
    href: string;
    pending?: boolean;
    group: Group;
  }[] = [
    {
      label: "Syllabus",
      href: scope.baseUrl + "/syllabus",
      pending: !biology && !seniorBiology && !hssc && !legacy && !sscComputerScience && !chemistry && !mathematics && !available("syllabus"),
      group: "papers",
    },
    {
      label: "Model papers",
      href: scope.baseUrl + "/model-papers",
      pending: !models.length && !seniorBiology && !available("model_paper"),
      group: "papers",
    },
    {
      label: "Past papers",
      href: scope.baseUrl + "/pastpapers",
      pending:
        !pastPapers.length && !available("past_paper"),
      group: "papers",
    },
    {
      label: "Books & resource guides",
      href: scope.baseUrl + "/books",
      pending: !senior && !legacy && !chemistry && !available("textbook"),
      group: "papers",
    },
    ...(hssc || biology || seniorBiology ? [{
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
      pending: !computerScience && !seniorBiology && !senior && !legacy && !sscComputerScience && !chemistry && !mathematicsMcqs && !chapterMcqs.length && !available("mcq"),
      group: "practice",
    },
    ...(['crqs', 'erqs', 'numericals'] as const).filter(mode => mappedTheory.some(unit => unit[mode].length > 0)).map(mode => ({
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
      pending: !biology && !seniorBiology && !hssc && !legacy && !sscComputerScience && !chemistry && !available('practical_paper'),
      group: "lab",
    },
    ...(scope.board.id === 'akueb' && scope.classDef.level === 10 && scope.meta.slug === 'physics'
      ? [
          { label: 'Formula sheets', href: scope.baseUrl + '/study?kind=FORMULA_SHEET', group: 'study' as Group },
          { label: 'Extra resources · D.C. Circuits notes and quiz', href: physicsUnit16Resource.href, group: 'support' as Group },
          { label: 'Extra resources · Magnetism and Electromagnetism', href: physicsUnit17Resource.href, group: 'support' as Group },
        ]
      : []),
    ...(seniorBiology && scope.classDef.level === 11 ? hsscBiologyStudyResources.map(resource => ({
      label: resource.title, href: resource.href, group: 'support' as Group, pending: false,
    })) : []),
    ...Object.entries(supportingMaterialLabels)
      .filter(([kind]) => kind !== 'practical_paper' && available(kind))
      .map(([kind, label]) => ({
        label,
        href: scope.baseUrl + '/resources/' + kind,
        group: "support" as Group,
      })),
  ];
  const visibleItems = biology ? items.filter(item => !item.pending) : items;
  const ready = visibleItems.filter((item) => !item.pending).length;
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
                {ready} of {visibleItems.length} resources
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
            const groupItems = visibleItems.filter((item) => item.group === group.id);
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
