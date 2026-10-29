/**
 * Resend Email Transactional Service
 *
 * Sends transactional notifications:
 * - Student assessment assigned
 * - Results released with score and RAG explanation review link
 * - Password reset & verification
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM?.trim();

  if (apiKey && fromEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        signal: AbortSignal.timeout(15000),
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: payload.to,
          subject: payload.subject,
          html: payload.html
        })
      });
      const data = await res.json();
      return { success: res.ok, messageId: data.id };
    } catch {
      console.error('Transactional email delivery failed.');
    }
  }

  return { success: false };
}

export async function sendQuizAssignedEmail(toEmail: string, studentName: string, quizTitle: string, quizUrl: string) {
  return sendTransactionalEmail({
    to: toEmail,
    subject: `New Assessment Assigned: ${quizTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2>Hello ${studentName},</h2>
        <p>A new assessment has been assigned to you on the AKU-EB Educational Assessment Platform:</p>
        <h3 style="color: #4f46e5;">${quizTitle}</h3>
        <p>Please log in and complete your assessment before the authoritative server deadline.</p>
        <a href="${quizUrl}" style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">Start Assessment</a>
      </div>
    `
  });
}

export async function sendResultsReleasedEmail(toEmail: string, studentName: string, quizTitle: string, score: number, maxMarks: number, resultsUrl: string) {
  const percentage = Math.round((score / maxMarks) * 100);
  return sendTransactionalEmail({
    to: toEmail,
    subject: `Results Released: ${quizTitle} (${percentage}%)`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2>Hello ${studentName},</h2>
        <p>Your results for <strong>${quizTitle}</strong> have been published:</p>
        <div style="padding: 15px; background: #f8fafc; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0; font-size: 18px;"><strong>Score:</strong> ${score} / ${maxMarks} (${percentage}%)</p>
        </div>
        <p>Click below to inspect question-by-question explanations grounded in verified curriculum syllabi.</p>
        <a href="${resultsUrl}" style="display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px;">Review Results & Explanations</a>
      </div>
    `
  });
}
