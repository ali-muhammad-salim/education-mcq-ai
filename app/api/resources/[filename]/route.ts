import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    let filename = decodeURIComponent(resolvedParams.filename);

    if (!filename.endsWith('.json')) {
      filename += '.json';
    }

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'data', 'physics', 'compiled_resources', safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Resource ${safeFilename} not found` }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const { searchParams } = new URL(request.url);
    const downloadType = searchParams.get('download'); // 'json', 'md', 'csv'

    // 1. Download as Markdown Study Guide
    if (downloadType === 'md') {
      let md = `# ${data.board || 'AKU-EB'}\n`;
      md += `## ${data.subject || 'Physics'} - ${data.class_level || 'SSC'}\n`;
      md += `### ${data.chapter || safeFilename}\n\n`;
      md += `*Document generated from Official AI-Extracted Knowledge Base*\n\n---\n\n`;

      md += `## 1. Student Learning Outcomes (SLOs) & Essential Definitions\n\n`;
      if (data.definitions_and_laws && data.definitions_and_laws.length > 0) {
        data.definitions_and_laws.forEach((def: any, i: number) => {
          md += `### SLO ${def.slo_code || i + 1}: ${def.term || 'Outcome'}\n`;
          md += `> **Standard Description:** ${def.definition || 'N/A'}\n\n`;
          if (def.mathematical_form) md += `- **Mathematical Formula:** \`${def.mathematical_form}\`\n`;
          if (def.si_unit) md += `- **SI Unit:** \`${def.si_unit}\`\n`;
          if (def.key_points && def.key_points.length > 0) {
            md += `- **Key Concepts:** ${def.key_points.join(', ')}\n`;
          }
          md += `\n`;
        });
      } else {
        md += `*No specific definitions recorded for this unit.*\n\n`;
      }

      md += `---\n\n## 2. Model Paper Multiple Choice Questions (MCQs)\n\n`;
      const allMcqs = [...(data.past_paper_mcqs || []), ...(data.book_mcqs || [])];
      if (allMcqs.length > 0) {
        allMcqs.forEach((mcq: any, i: number) => {
          md += `#### Question ${mcq.question_number || i + 1} (${mcq.cognitive_level ? `Cognitive Level: ${mcq.cognitive_level}` : '1 Mark'})\n`;
          md += `**${mcq.stem_text}**\n\n`;
          (mcq.options || []).forEach((opt: string) => {
            md += `- ${opt}\n`;
          });
          if (mcq.explanation) {
            md += `\n> **Step-by-Step Explanation & Key:**\n> ${mcq.explanation}\n`;
          }
          md += `\n`;
        });
      } else {
        md += `*No model MCQs mapped directly to this sub-unit.*\n\n`;
      }

      md += `---\n\n## 3. Constructed & Extended Response Questions (CRQs / ERQs)\n\n`;
      const allCrqs = [...(data.crqs || []), ...(data.erqs || [])];
      if (allCrqs.length > 0) {
        allCrqs.forEach((crq: any, i: number) => {
          md += `#### Question ${crq.question_number || i + 1} [${crq.marks || 3} Marks]\n`;
          md += `**${crq.question_text || crq.stem_text}**\n\n`;
          if (crq.rubric && crq.rubric.length > 0) {
            md += `**Marking Rubric:**\n`;
            crq.rubric.forEach((r: any) => {
              md += `- [${r.marks || 1}M] ${r.description || r}\n`;
            });
            md += `\n`;
          }
          if (crq.model_answer) {
            md += `> **Model Answer Guidance:** ${crq.model_answer}\n\n`;
          }
        });
      } else {
        md += `*No constructed response items recorded for this sub-unit.*\n\n`;
      }

      const outName = safeFilename.replace('.json', '') + '_study_guide.md';
      return new NextResponse(md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${outName}"`,
        },
      });
    }

    // 2. Download as CSV
    if (downloadType === 'csv') {
      const rows: string[] = [];
      rows.push('Type,Question_Number,Cognitive_Level,Marks,Question_Stem,Options,Explanation_Rubric');

      const allMcqs = [...(data.past_paper_mcqs || []), ...(data.book_mcqs || [])];
      allMcqs.forEach((mcq: any) => {
        const type = 'MCQ';
        const num = `"${(mcq.question_number || '').replace(/"/g, '""')}"`;
        const cog = `"${(mcq.cognitive_level || '').replace(/"/g, '""')}"`;
        const marks = mcq.marks || 1;
        const stem = `"${(mcq.stem_text || '').replace(/"/g, '""')}"`;
        const opts = `"${(mcq.options || []).join(' | ').replace(/"/g, '""')}"`;
        const exp = `"${(mcq.explanation || '').replace(/"/g, '""')}"`;
        rows.push([type, num, cog, marks, stem, opts, exp].join(','));
      });

      const allCrqs = [...(data.crqs || []), ...(data.erqs || [])];
      allCrqs.forEach((crq: any) => {
        const type = 'CRQ';
        const num = `"${(crq.question_number || '').replace(/"/g, '""')}"`;
        const cog = `"${(crq.cognitive_level || '').replace(/"/g, '""')}"`;
        const marks = crq.marks || 3;
        const stem = `"${(crq.question_text || crq.stem_text || '').replace(/"/g, '""')}"`;
        const opts = '""';
        const rubricStr = (crq.rubric || []).map((r: any) => `${r.marks || ''}M: ${r.description || r}`).join('; ');
        const exp = `"${rubricStr.replace(/"/g, '""')}"`;
        rows.push([type, num, cog, marks, stem, opts, exp].join(','));
      });

      const outName = safeFilename.replace('.json', '') + '_questions.csv';
      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${outName}"`,
        },
      });
    }

    // 3. Download as JSON file
    if (downloadType === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
        },
      });
    }

    // Default: return raw JSON payload for UI viewer
    return NextResponse.json({
      success: true,
      fileName: safeFilename,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error processing resource' }, { status: 500 });
  }
}
