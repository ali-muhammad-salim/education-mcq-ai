import prisma from '../lib/prisma';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
async function main() {
  for (const name of ['recent_submissions', 'custom_quizzes', 'ai_doubt_queue']) {
    const file = path.join(process.cwd(), 'data', name + '.json');
    let raw: string;
    try { raw = await fs.readFile(file, 'utf8'); } catch (error) { if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue; throw error; }
    const records = z.array(z.json()).parse(JSON.parse(raw));
    for (const record of records) {
      const id = createHash('sha256').update(name + ':' + JSON.stringify(record)).digest('hex');
      await prisma.legacyArchive.upsert({ where: { id }, update: {}, create: { id, kind: name, data: record === null ? { value: null } : record } });
    }
    console.log('Archived', name, records.length);
  }
  console.log('Legacy records preserved for administrator reconciliation. Untrusted historical scores were not promoted into official grades.');
}
main().catch(() => { console.error('Legacy archival failed; source files were preserved.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
