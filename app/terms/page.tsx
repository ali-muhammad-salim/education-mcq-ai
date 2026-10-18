import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Shield, AlertTriangle, BookOpen, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Rise Learner - AKU-EB Portal',
  description: 'Terms of Service and conditions of use for Rise Learner (AKU-EB Academic Intelligence Portal).',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'October 18, 2026';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '2.5rem 1.25rem 5rem 1.25rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Breadcrumb / Back Link */}
        <Link 
          href="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.88rem', 
            fontWeight: 600, 
            color: '#0b5e4a', 
            marginBottom: '1.5rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        {/* Hero Header Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0b5e4a 0%, #064032 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          boxShadow: '0 10px 25px rgba(11, 94, 74, 0.15)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '0.75rem'
          }}>
            <FileText size={14} />
            <span>Terms of Agreement</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff', letterSpacing: '-0.5px' }}>
            Terms of Service
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', maxWidth: '650px', lineHeight: 1.6 }}>
            Please read these Terms of Service carefully before utilizing the <strong>Rise Learner</strong> platform, including past paper archives, quizzes, and classroom management services.
          </p>
          <div style={{ marginTop: '1.25rem', fontSize: '0.82rem', color: '#a7f3d0', fontWeight: 600 }}>
            Last Updated: {lastUpdated}
          </div>
        </div>

        {/* Content Body Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.25rem'
        }}>

          {/* Section 1 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>1.</span> Acceptance of Terms
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7 }}>
              By creating an account, signing in via Google, or accessing any learning materials on Rise Learner (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>riselearner.com</code>), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service and our{' '}
              <Link href="/privacy" style={{ color: '#0b5e4a', fontWeight: 700, textDecoration: 'underline' }}>
                Privacy Policy
              </Link>.
              If you do not agree, you must immediately discontinue use of the platform.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>2.</span> Educational Purpose & Disclaimer
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              Rise Learner is an independent educational platform created to assist secondary and higher secondary students (SSC and HSSC) in preparing for board examinations through curated past questions, SLO alignment, and self-assessment tools.
            </p>
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.88rem',
              color: '#92400e',
              lineHeight: 1.6,
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Notice of Non-Affiliation:</strong> Rise Learner is an independent supplementary academic tool and is not officially endorsed, sponsored, or affiliated with the Aga Khan University Examination Board (AKU-EB) or any government examination body. All board trademarks belong to their respective holders.
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>3.</span> User Accounts & Authentication
            </h2>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li>
                <strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials (including passwords and Google login sessions). You agree to notify us immediately of any unauthorized account access.
              </li>
              <li>
                <strong>Role Accuracy:</strong> Users must choose the appropriate role during registration. Student accounts are designated for taking assessments, while Teacher and Administrator roles are reserved for educators managing classrooms and curricula.
              </li>
              <li>
                <strong>One Person, One Account:</strong> Users may not share accounts or impersonate other students or teachers.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>4.</span> Academic Integrity & Assessment Rules
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              To ensure valid learning evaluation, all users agree to adhere to the highest standards of academic integrity:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li>You may not use bots, scripts, or automated tools to answer quiz questions or scrape answer keys.</li>
              <li>During timed, proctored assessments, tab-switching and window-blurring events may be monitored and logged to provide verifiable reports to teachers.</li>
              <li>Attempting to manipulate or alter assessment scores via API tampering will lead to immediate, irreversible account suspension.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>5.</span> Intellectual Property Rights
            </h2>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li>
                <strong>Platform IP:</strong> The software, code, algorithms, user interfaces, branding, AI grading rubric prompts, and database designs of Rise Learner are the exclusive intellectual property of Rise Learner.
              </li>
              <li>
                <strong>Curriculum & Past Papers:</strong> Public syllabus learning outcomes, past examination papers, and model examination questions are referenced under standard educational fair-use principles to assist students and teachers in academic study.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>6.</span> Termination of Access
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7 }}>
              We reserve the right, at our sole discretion, to suspend or terminate any user account that violates these Terms of Service, compromises platform security, or engages in harassing behavior towards teachers or peers, without prior notice.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>7.</span> Limitation of Liability
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7 }}>
              Rise Learner is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While we strive for 100% syllabus alignment and accurate answer solutions, we make no warranties regarding uninterrupted access, nor do we guarantee specific board examination results. In no event shall Rise Learner be liable for any indirect, incidental, or consequential damages.
            </p>
          </section>

          {/* Section 8: Contact */}
          <section style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '1rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={18} style={{ color: '#0b5e4a' }} />
              <span>Questions & Legal Contact</span>
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>
              If you have any questions, feedback, or legal inquiries regarding these Terms of Service, please contact us at:
            </p>
            <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600 }}>
              Email:{' '}
              <a href="mailto:support@riselearner.com" style={{ color: '#0b5e4a', textDecoration: 'underline' }}>
                support@riselearner.com
              </a>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem' }}>
              Rise Learner Academic Platform • Karachi, Pakistan
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
