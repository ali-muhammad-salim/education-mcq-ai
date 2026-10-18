import prisma from '@/lib/prisma';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function SubjectSyllabusPage({ params }: { params: Promise<{ subjectId: string }> | { subjectId: string } }) {
  const resolvedParams = await Promise.resolve(params);
  
  let subject: any = null;
  try {
    subject = await prisma.subject.findUnique({
      where: { id: resolvedParams.subjectId },
      include: {
        academicClass: {
          include: { programme: true }
        },
        syllabusVersions: {
          where: { isLatest: true },
          include: {
            topics: {
              orderBy: { topicNumber: 'asc' },
              include: {
                subtopics: {
                  orderBy: { subtopicNum: 'asc' },
                  include: {
                    slos: {
                      orderBy: { code: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error fetching subject syllabus:', err);
  }

  if (!subject) {
    return (
      <main>
        <h1>Subject Not Found</h1>
        <Link href="/syllabus" className="btn">Back to Syllabus Tracker</Link>
      </main>
    );
  }

  const syllabus = subject.syllabusVersions[0];

  return (
    <main>
      <Breadcrumbs
        items={[
          { label: 'AKU-EB' },
          { label: 'Syllabus Tracker', href: '/syllabus' },
          { label: `${subject.name} (Class ${subject.academicClass.name})`, active: true }
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/syllabus" className="btn" style={{ marginRight: '1rem', background: 'transparent', border: '1px solid var(--accent-color)' }}>
          ← Back
        </Link>
        <div>
          <h1 style={{ margin: 0, textAlign: 'left', fontSize: '2rem' }}>{subject.name}</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            {subject.academicClass.programme.name} • Class {subject.academicClass.name} (Grade {subject.academicClass.level})
          </p>
        </div>
      </div>

      {!syllabus || syllabus.topics.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666', margin: 0 }}>
            No extracted syllabus data found for this subject yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {syllabus.topics.map((topic: any) => (
            <div key={topic.id} className="card">
              <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--secondary-color)', marginRight: '0.5rem' }}>{topic.topicNumber}</span> 
                {topic.name}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {topic.subtopics.map((sub: any) => (
                  <div key={sub.id} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--secondary-color)' }}>
                    <h3 style={{ fontSize: '1.25rem', color: '#444', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#888', marginRight: '0.5rem' }}>{sub.subtopicNum}</span>
                      {sub.name}
                    </h3>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sub.slos.map((slo: any) => {
                        const sloAnchor = slo.code ? `slo-${slo.code}` : `slo-${slo.id}`;
                        return (
                          <li
                            key={slo.id}
                            id={sloAnchor}
                            style={{
                              background: '#f8f9fa',
                              padding: '0.85rem 1.15rem',
                              borderRadius: '8px',
                              fontSize: '0.95rem',
                              display: 'flex',
                              gap: '1rem',
                              alignItems: 'flex-start',
                              border: '1px solid #e9ecef',
                              scrollMarginTop: '110px',
                              transition: 'all 0.25s ease'
                            }}
                          >
                            <span style={{ 
                              background: 'var(--primary-color, #0b5e4a)', 
                              color: '#fff', 
                              padding: '3px 10px', 
                              borderRadius: '5px', 
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              letterSpacing: '0.3px'
                            }}>
                              {slo.code || 'SLO'}
                            </span>
                            <div style={{ flexGrow: 1 }}>
                              <span style={{ color: '#1f2937', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                {slo.description}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
