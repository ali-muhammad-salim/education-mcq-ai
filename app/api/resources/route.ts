import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exportMode = searchParams.get('export');
    const classFilter = searchParams.get('class'); // '9', '10', 'all'

    const resourcesDir = path.join(process.cwd(), 'data', 'physics', 'compiled_resources');
    
    if (!fs.existsSync(resourcesDir)) {
      return NextResponse.json({ error: 'Compiled resources directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(resourcesDir).filter(f => f.endsWith('.json'));

    // If exporting all as a single master bundle
    if (exportMode === 'all') {
      const allBundles: any[] = [];
      for (const file of files) {
        const filePath = path.join(resourcesDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (classFilter === '9' && content.class_level !== 'Class IX' && !file.startsWith('class_ix_')) {
            continue;
          }
          if (classFilter === '10' && content.class_level !== 'Class X' && !file.startsWith('class_x_')) {
            continue;
          }
          allBundles.push({
            fileName: file,
            ...content,
          });
        } catch (e) {
          console.error(`Error reading ${file}:`, e);
        }
      }

      const masterPayload = {
        title: 'AKU-EB Physics SSC (Class IX & X) Master Academic Resource Bundle',
        generatedAt: new Date().toISOString(),
        board: 'Aga Khan University Examination Board',
        totalUnits: allBundles.length,
        units: allBundles,
      };

      const filename = classFilter === '9' 
        ? 'aku_eb_physics_class_ix_master_bundle.json'
        : classFilter === '10'
        ? 'aku_eb_physics_class_x_master_bundle.json'
        : 'aku_eb_physics_complete_master_bundle.json';

      return new NextResponse(JSON.stringify(masterPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Otherwise return listing metadata for the UI
    const manifest = files.map(file => {
      const filePath = path.join(resourcesDir, file);
      const stat = fs.statSync(filePath);
      let classLevel = file.startsWith('class_ix') ? 'Class IX' : 'Class X';
      let chapter = file.replace(/class_(ix|x)_/, '').replace('.json', '').replace(/_/g, ' ');
      let sloCount = 0;
      let mcqCount = 0;
      let crqCount = 0;
      let numericalCount = 0;

      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.class_level) classLevel = data.class_level;
        if (data.chapter) chapter = data.chapter;
        sloCount = (data.definitions_and_laws || []).length;
        mcqCount = (data.past_paper_mcqs || []).length + (data.book_mcqs || []).length;
        crqCount = (data.crqs || []).length + (data.erqs || []).length;
        numericalCount = (data.numericals || []).length;
      } catch (err) {
        // use fallback parsed name
      }

      return {
        fileName: file,
        classLevel,
        chapter,
        sloCount,
        mcqCount,
        crqCount,
        numericalCount,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
      };
    });

    // Sort by Class IX then Class X, then by unit name
    manifest.sort((a, b) => {
      if (a.classLevel !== b.classLevel) {
        return a.classLevel.localeCompare(b.classLevel);
      }
      return a.chapter.localeCompare(b.chapter, undefined, { numeric: true });
    });

    return NextResponse.json({
      success: true,
      totalUnits: manifest.length,
      classIXCount: manifest.filter(m => m.classLevel === 'Class IX').length,
      classXCount: manifest.filter(m => m.classLevel === 'Class X').length,
      resources: manifest,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
