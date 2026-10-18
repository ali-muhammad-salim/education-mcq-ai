import prisma from '@/lib/prisma';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function SyllabusPage() {
  let programmes: any[] = [];
  try {
    programmes = await prisma.programme.findMany({
      include: {
        academicClasses: {
          orderBy: { level: 'asc' },
          include: {
            subjects: {
              orderBy: { name: 'asc' },
              include: {
                _count: {
                  select: { syllabusVersions: true }
                }
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error fetching syllabus programmes:', err);
  }

  return (
    <main>
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Syllabus Tracker', active: true }
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, textAlign: 'left', fontSize: '2.4rem' }}>Unified Syllabus Tracker</h1>
      </div>

      <p style={{ color: '#666', marginBottom: '3rem', fontSize: '1.1rem' }}>
        Select your programme and class to view the officially mapped AKU-EB 2026 Student Learning Outcomes (SLOs).
      </p>

      {programmes.map((prog) => (
        <div key={prog.id} style={{ marginBottom: '4rem' }}>
          <h2 style={{ borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.5rem' }}>
            {prog.name} Programme
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
            {prog.academicClasses.map((cls: any) => (
              <div key={cls.id} className="card">
                <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem', fontSize: '1.5rem' }}>
                  Class {cls.name} <span style={{ fontSize: '1rem', color: '#666', fontWeight: 'normal' }}>(Grade {cls.level})</span>
                </h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {cls.subjects.map((sub: any) => (
                    <Link 
                      key={sub.id} 
                      href={`/syllabus/${sub.id}`}
                      className="btn"
                      style={{ 
                        background: '#fff',
                        color: 'var(--primary-color)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {sub.name}
                      {sub._count.syllabusVersions > 0 && (
                        <span style={{ 
                          marginLeft: '0.75rem', 
                          background: 'var(--secondary-color)', 
                          color: '#fff', 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px' 
                        }}>
                          Mapped
                        </span>
                      )}
                    </Link>
                  ))}
                  {cls.subjects.length === 0 && (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>No subjects found for this class yet.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
