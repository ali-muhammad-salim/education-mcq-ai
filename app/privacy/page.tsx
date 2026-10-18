import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, Eye, Database, FileText, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Rise Learner - AKU-EB Portal',
  description: 'Privacy Policy and data protection guidelines for Rise Learner (AKU-EB Academic Intelligence Portal), including Google Sign-In data protection.',
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck size={14} />
            <span>Official Legal Document</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff', letterSpacing: '-0.5px' }}>
            Privacy Policy
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', maxWidth: '650px', lineHeight: 1.6 }}>
            At <strong>Rise Learner</strong> (AKU-EB Academic Intelligence Portal), we respect your privacy and are committed to safeguarding the personal and educational data of students, teachers, and administrators.
          </p>
          <div style={{ marginTop: '1.25rem', fontSize: '0.82rem', color: '#a7f3d0', fontWeight: 600 }}>
            Last Updated: {lastUpdated}
          </div>
        </div>

        {/* Google API User Data Policy Compliance Banner */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <div style={{
            background: '#dcfce7',
            color: '#15803d',
            padding: '8px',
            borderRadius: '8px',
            flexShrink: 0,
            marginTop: '2px'
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#166534', margin: '0 0 0.35rem 0' }}>
              Google API Services User Data Policy Compliance
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151', lineHeight: 1.6 }}>
              Rise Learner&apos;s use and transfer to any other app of information received from Google APIs adheres to the{' '}
              <a 
                href="https://developers.google.com/terms/api-services-user-data-policy" 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: '#0b5e4a', fontWeight: 700, textDecoration: 'underline' }}
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. We do not use Google user data to train generalized AI models or share it with third parties.
            </p>
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
              <span style={{ color: '#0b5e4a' }}>1.</span> Information We Collect
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              We collect information that is strictly necessary to provide an authentic, personalized educational experience for students and teachers:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li>
                <strong>Account Information:</strong> When registering via email or Google Sign-In, we receive your name, email address, profile avatar picture, and assigned academic role (Student, Teacher, or Administrator).
              </li>
              <li>
                <strong>Google Authentication Data:</strong> If you sign in via Google Sign-In, we receive your Google unique ID, primary email address, verified email status, and profile picture URL. We do not access your Google Drive, Gmail, contacts, or calendar.
              </li>
              <li>
                <strong>Assessment & Quiz Activity:</strong> Student answers, test scores, completion timestamps, and integrity monitoring events (such as tab switches during active proctored assessments).
              </li>
              <li>
                <strong>Teacher Management Data:</strong> Quizzes created, classrooms created, grading feedback, and student roster enrollments.
              </li>
              <li>
                <strong>Technical Information:</strong> IP address and user-agent string stored with session tokens for account security and intrusion prevention.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>2.</span> How We Use Your Information
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              We use your data solely for educational service delivery, specifically:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li>To authenticate your identity and maintain secure login sessions via <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>mcqs_session</code> cookies.</li>
              <li>To present personalized student and teacher dashboards.</li>
              <li>To compute exam scores, generate question explanations, and evaluate Student Learning Outcome (SLO) mastery.</li>
              <li>To allow verified educators to review classroom quiz performance and release constructive feedback.</li>
              <li>To detect and prevent fraudulent access, unauthorized scraping, or abusive platform use.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>3.</span> Data Sharing & Third Parties
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              <strong>We do not sell, rent, monetize, or trade your personal information</strong> with any third-party advertisers or data brokers under any circumstances.
            </p>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7 }}>
              Data is only shared in the following limited educational contexts:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li>
                <strong>Classroom Teachers:</strong> If you are enrolled in a teacher&apos;s digital classroom, that teacher can see your submitted quiz answers and awarded marks.
              </li>
              <li>
                <strong>Cloud Infrastructure:</strong> Secure hosting and database infrastructure (PostgreSQL on dedicated VPS) operating under industry-standard data security agreements.
              </li>
              <li>
                <strong>Legal Compliance:</strong> If required by law, subpoena, or to prevent imminent fraud or cyber harm.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>4.</span> Data Security & Storage
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              We implement comprehensive technical and organizational safeguards:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li><strong>Encryption in Transit:</strong> All web traffic is encrypted using modern TLS (HTTPS) with Let&apos;s Encrypt SSL certificates.</li>
              <li><strong>Secure Session Management:</strong> Authentication tokens are stored in <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>httpOnly</code>, <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>secure</code>, and <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>sameSite: lax</code> cookies.</li>
              <li><strong>Password Hashing:</strong> Email accounts use PBKDF2 with unique cryptographic salts; plain-text passwords are never stored.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0b5e4a' }}>5.</span> Your Rights & Account Deletion
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              Every student and teacher using Rise Learner maintains full ownership of their data:
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              <li><strong>Access:</strong> You may request a copy of all personal and assessment data associated with your account.</li>
              <li><strong>Correction:</strong> You may update or correct your profile information at any time.</li>
              <li><strong>Deletion:</strong> You may request the permanent deletion of your user account, sessions, and quiz attempt history by emailing our privacy team. Upon receipt, all identifying data is purged from our production databases within 14 business days.</li>
            </ul>
          </section>

          {/* Section 6: Contact */}
          <section style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '1rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={18} style={{ color: '#0b5e4a' }} />
              <span>Contact Our Privacy Team</span>
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>
              If you have any questions about this Privacy Policy, your rights, or data handling practices, please contact us at:
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
