/** Targeted, atomic import for Class X (SSC-II) 2023 Mathematics papers.
 * Defaults to read-only preflight; --apply writes only these two papers.
 */
import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { mathematicsX2023Papers } from '../lib/mathematicsX2023';
import manifest from '../data/mathematics/ssc2_2023_source_manifest.json';
import { writeFileSync, mkdirSync } from 'node:fs';

loadEnvConfig(process.cwd());
const db = new PrismaClient();
const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

async function main() {
  const subjects = await db.subject.findMany({
    where: { name: { equals: 'Mathematics', mode: 'insensitive' }, academicClass: { level: { in: [9, 10] } } },
    include: {
      academicClass: { include: { programme: { include: { board: true } } } },
      syllabusVersions: {
        where: { isLatest: true },
        include: { topics: { include: { subtopics: { include: { slos: true } } } } },
      },
    },
  });

  const scope = new Map<number, { subject: (typeof subjects)[number]; version: (typeof subjects)[number]['syllabusVersions'][number] }>();
  console.log(
    JSON.stringify(
      {
        syllabusCandidates: subjects.map(s => ({
          id: s.id,
          name: s.name,
          grade: s.academicClass.level,
          board: s.academicClass.programme.board.shortCode,
          versions: s.syllabusVersions.map(v => ({ id: v.id, name: v.versionName, source: v.fileUrl, topics: v.topics.length })),
        })),
      },
      null,
      2
    )
  );

  for (const grade of [9, 10]) {
    const matches = subjects.filter(
      s =>
        s.academicClass.level === grade &&
        s.academicClass.programme.board.shortCode.toLowerCase().replace(/[^a-z]/g, '') === 'akueb' &&
        s.syllabusVersions.some(v => v.fileUrl?.endsWith('mathematics-science-group-ssc-syllabus-2025.pdf'))
    );
    if (matches.length !== 1 || matches[0].syllabusVersions.length !== 1) {
      throw new Error(`Grade ${grade}: require exactly one AKU-EB Mathematics subject and current syllabus before importing.`);
    }
    scope.set(grade, { subject: matches[0], version: matches[0].syllabusVersions[0] });
  }

  const outcomes = new Map<string, { id: string; topicId: string; subtopicId: string; versionId: string; description: string }>();
  for (const [grade, { version }] of scope) {
    for (const topic of version.topics) {
      for (const sub of topic.subtopics) {
        for (const slo of sub.slos) {
          if (slo.code) {
            outcomes.set(`${grade}:${slo.code}`, {
              id: slo.id,
              topicId: topic.id,
              subtopicId: sub.id,
              versionId: version.id,
              description: slo.description,
            });
          }
        }
      }
    }
  }

  for (const paper of mathematicsX2023Papers) {
    for (const question of paper.questions) {
      const meta = question.sourceRegion;
      if (!meta.current_slo) continue;
      const found = outcomes.get(`${meta.mapping_scope!.grade}:${meta.current_slo}`);
      if (!found || normalized(found.description) !== normalized(meta.current_mapping![0].description)) {
        throw new Error(`Syllabus mismatch for question ${paper.paperCode}/${question.questionNumber}: ${meta.current_slo}. No records imported.`);
      }
    }
  }

  const prior = await db.pastPaper.findMany({
    where: { paperCode: { in: mathematicsX2023Papers.map(p => p.paperCode) } },
    select: { id: true, paperCode: true, sourceHash: true, _count: { select: { questions: true } } },
  });

  for (const paper of mathematicsX2023Papers) {
    const existing = prior.filter(p => p.paperCode === paper.paperCode);
    if (existing.length > 1) throw new Error(`Duplicate paper code ${paper.paperCode}; resolve before importing.`);
    const source = manifest.sources[paper.paperCode.endsWith('P1') ? 'p1' : 'p2'];
    if (existing[0]?.sourceHash && existing[0].sourceHash !== source.sha256) {
      throw new Error(`Source hash conflict for ${paper.paperCode}.`);
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: process.argv.includes('--apply') ? 'APPLY' : 'READ_ONLY',
        papers: mathematicsX2023Papers.map(p => ({ code: p.paperCode, questions: p.questions.length })),
        existing: prior,
      },
      null,
      2
    )
  );

  if (!process.argv.includes('--apply')) return;

  const result = await db.$transaction(
    async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('import-mathematics-x-2023'))`;
      const records = [];
      const classXSubject = scope.get(10)!.subject;

      for (const kind of ['key', 'em'] as const) {
        const source = manifest.sources[kind];
        const data = {
          title: kind === 'key' ? 'Mathematics SSC-II 2023 Official MCQ Key' : 'Mathematics SSC-II 2023 E-Marking Notes',
          publisher: 'Aga Khan University Examination Board',
          subject: 'Mathematics',
          className: 'Class X',
          boardAssociation: 'AKU-EB',
          language: 'English',
          publicationYear: 2023,
          sourceFile: source.url,
          sourceHash: source.sha256,
          metadata: {
            resourceType: kind === 'key' ? 'answer_key' : 'e_marking',
            pages: source.pages,
            relatedPaperCodes: mathematicsX2023Papers.map(p => p.paperCode),
            sourceDiscrepancies:
              kind === 'key'
                ? ['All 45 MCQs verified 100% against official answer key']
                : ['Q9: circumscribed square construction around circle is outside revised 2025-2027 curriculum scope'],
          },
        };
        await tx.book.upsert({
          where: { id: `mth-x-2023-${kind}` },
          create: { id: `mth-x-2023-${kind}`, ...data },
          update: data,
        });
      }

      for (const paper of mathematicsX2023Papers) {
        const source = manifest.sources[paper.paperCode.endsWith('P1') ? 'p1' : 'p2'];
        const candidates = await tx.pastPaper.findMany({ where: { paperCode: paper.paperCode } });
        if (candidates.length > 1) throw new Error('Concurrent duplicate paper detected.');
        const existing = candidates[0];
        if (existing?.sourceHash && existing.sourceHash !== source.sha256) throw new Error('Concurrent source hash conflict.');

        const fields = {
          boardId: classXSubject.academicClass.programme.boardId,
          classId: classXSubject.classId,
          subjectId: classXSubject.id,
          examYear: 2023,
          examSession: paper.examSession,
          examType: 'ANNUAL',
          paperCode: paper.paperCode,
          fileUrl: source.url,
          title: paper.title,
          sourceFile: source.filename,
          sourceHash: source.sha256,
          pageCount: source.pages,
          verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES',
        };

        const saved = existing
          ? await tx.pastPaper.update({ where: { id: existing.id }, data: fields })
          : await tx.pastPaper.create({ data: { id: paper.id, ...fields } });

        for (const q of paper.questions) {
          const meta = q.sourceRegion;
          const mapped = meta.current_slo ? outcomes.get(`${meta.mapping_scope!.grade}:${meta.current_slo}`) : undefined;
          const payload = {
            questionText: q.questionText,
            normalizedQuestionText: normalized(q.questionText),
            questionType: q.questionType,
            marks: q.marks,
            pageNumber: meta.pageNumber,
            sourceRegion: JSON.parse(JSON.stringify(meta)) as Prisma.InputJsonValue,
            syllabusVersionId: mapped?.versionId || null,
            topicId: mapped?.topicId || null,
            subtopicId: mapped?.subtopicId || null,
            sloId: mapped?.id || null,
            difficulty: q.difficulty,
            diagramBased: !!q.diagramBased,
            verified: meta.answer_status !== 'KEY_CONFLICT' && meta.answer_status !== 'OFFICIAL_ASTERISK',
            section: meta.choice_instruction || null,
          };

          const existingQuestions = await tx.pastPaperQuestion.findMany({
            where: { pastPaperId: saved.id, questionNumber: q.questionNumber },
          });
          if (existingQuestions.length > 1) throw new Error(`Duplicate question ${q.questionNumber}.`);

          const row = existingQuestions[0]
            ? await tx.pastPaperQuestion.update({ where: { id: existingQuestions[0].id }, data: payload })
            : await tx.pastPaperQuestion.create({ data: { id: q.id, pastPaperId: saved.id, questionNumber: q.questionNumber, ...payload } });

          await tx.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: row.id } });
          await tx.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: row.id } });
          await tx.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: row.id } });

          if (mapped) {
            await tx.pastPaperQuestionTopic.create({ data: { pastPaperQuestionId: row.id, topicId: mapped.topicId } });
            await tx.pastPaperQuestionSubtopic.create({ data: { pastPaperQuestionId: row.id, subtopicId: mapped.subtopicId } });
            await tx.pastPaperQuestionSLO.create({ data: { pastPaperQuestionId: row.id, sloId: mapped.id } });
          }
        }

        const count = await tx.pastPaperQuestion.count({ where: { pastPaperId: saved.id } });
        if (count !== paper.questions.length) {
          throw new Error(`Unexpected question count for ${paper.paperCode}; transaction rolled back.`);
        }
        records.push({ id: saved.id, code: saved.paperCode, questions: count });
      }

      return records;
    },
    { timeout: 60000 }
  );

  mkdirSync('output/mathematics-x-2023', { recursive: true });
  writeFileSync(
    'output/mathematics-x-2023/database-import.json',
    JSON.stringify({ importedAt: new Date().toISOString(), records: result }, null, 2)
  );
  console.log(JSON.stringify({ imported: result }, null, 2));
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Import failed');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

