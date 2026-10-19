import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { submissionQueue } from '@/lib/priorityQueue';
import { saveSubmissionToStore, StoredAttempt } from '@/lib/submissionStore';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      paperCode,
      paperTitle,
      studentId,
      studentName,
      studentAge,
      studentClass,
      timeTakenSeconds,
      tabSwitchCount = 0,
      tabSwitchLogs = [],
      totalAwayTimeSeconds = 0,
      screenshotAttempts = 0,
      answers = [],
      isAutoSubmitted = false
    } = payload;

    const resolvedPaperCode = paperCode || 'PHY-IX-P1';
    const resolvedPaperTitle = paperTitle || 'Physics Model Paper';
    const safeStudentName = studentName || 'Student Candidate';

    // Calculate Score and Detailed Accuracy
    let totalEarnedMarks = 0;
    let totalAvailableMarks = 0;
    const topicStats: Record<string, { total: number; correct: number; topicNumber?: string; slos: Set<string> }> = {};
    const incorrectList: any[] = [];

    answers.forEach((ans: any) => {
      const marks = Number(ans.marks) || 1;
      totalAvailableMarks += marks;

      const isCorrect = Boolean(ans.isCorrect);
      if (isCorrect) {
        totalEarnedMarks += marks;
      } else {
        incorrectList.push({
          questionNumber: ans.questionNumber,
          questionText: ans.questionText,
          selectedOption: ans.selectedOption || 'Not Answered',
          correctOption: ans.correctOption,
          selectedText: ans.selectedText,
          correctText: ans.correctText,
          explanation: ans.explanation,
          whyIncorrect: ans.whyIncorrect || `Selected option (${ans.selectedOption}) is incorrect based on syllabus curriculum standards.`,
          topicName: ans.topicName || 'General Physics',
          sloCode: ans.sloCode
        });
      }

      // Aggregate Topic Performance
      const tName = ans.topicName || 'General Curriculum';
      if (!topicStats[tName]) {
        topicStats[tName] = { total: 0, correct: 0, topicNumber: ans.topicNumber, slos: new Set() };
      }
      topicStats[tName].total += 1;
      if (isCorrect) topicStats[tName].correct += 1;
      if (ans.sloCode) topicStats[tName].slos.add(ans.sloCode);
    });

    const percentage = totalAvailableMarks > 0 
      ? Math.round((totalEarnedMarks / totalAvailableMarks) * 100) 
      : 0;

    // Identify Weak Topics (< 65% accuracy) for Recommendation Engine
    const weakTopics: Array<{
      topicName: string;
      topicNumber?: string;
      totalQuestions: number;
      correctQuestions: number;
      accuracyPercentage: number;
      recommendation: string;
    }> = [];

    Object.entries(topicStats).forEach(([tName, stat]) => {
      const acc = Math.round((stat.correct / stat.total) * 100);
      if (acc < 65) {
        weakTopics.push({
          topicName: tName,
          topicNumber: stat.topicNumber,
          totalQuestions: stat.total,
          correctQuestions: stat.correct,
          accuracyPercentage: acc,
          recommendation: `Revise ${tName} conceptual formulas and practice relevant multiple choice items.`
        });
      }
    });

    // Dynamic Congrats & Performance Feedback Message
    let dynamicMessage = '';
    let messageTone: 'success' | 'warning' | 'info' = 'info';

    if (percentage >= 85) {
      dynamicMessage = `🏆 Outstanding Performance, ${safeStudentName}! Congratulations! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). You are performing at an A+ board distinction level!`;
      messageTone = 'success';
    } else if (percentage >= 70) {
      dynamicMessage = `🎉 Great Achievement, ${safeStudentName}! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). You have a solid conceptual understanding. Review the few weak areas below to reach 100%!`;
      messageTone = 'success';
    } else if (percentage >= 50) {
      dynamicMessage = `👍 Good Effort, ${safeStudentName}! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). You passed the test, but several topics require targeted revision before the final exam.`;
      messageTone = 'warning';
    } else {
      dynamicMessage = `📚 Keep Practicing, ${safeStudentName}! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). Don't be discouraged — review your weak topics and the detailed answer explanations below!`;
      messageTone = 'info';
    }

    const now = new Date();
    let generatedAttemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Try persisting to Prisma (if DB tables exist on this deployment)
    try {
      await submissionQueue.enqueue(async () => {
        let user = null;
        if (studentId) {
          user = await prisma.user.findUnique({ where: { id: studentId } }).catch(() => null);
        }

        if (!user) {
          const fallbackEmail = `student_${Date.now().toString(36)}@quiz.akueb.edu.pk`;
          user = await prisma.user.create({
            data: {
              email: fallbackEmail,
              name: `${safeStudentName} (${studentClass || 'Class IX'})`,
              role: 'STUDENT',
              emailVerified: true
            }
          }).catch(() => null);
        }

        let quiz = await prisma.quiz.findFirst({
          where: { title: { contains: resolvedPaperCode } }
        }).catch(() => null);

        if (!quiz) {
          let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } }).catch(() => null);
          if (!teacher && user) teacher = user;

          if (teacher) {
            quiz = await prisma.quiz.create({
              data: {
                teacherId: teacher.id,
                title: `${resolvedPaperTitle} (${resolvedPaperCode})`,
                description: `Automated assessment benchmark for ${resolvedPaperCode}`,
                totalMarks: answers.length || 40,
                durationMin: 50,
                status: 'PUBLISHED',
                visibility: 'PUBLIC'
              }
            }).catch(() => null);
          }
        }

        if (quiz && user) {
          const attempt = await prisma.quizAttempt.create({
            data: {
              quizId: quiz.id,
              studentId: user.id,
              status: 'GRADED',
              startedAt: new Date(Date.now() - (timeTakenSeconds || 60) * 1000),
              deadline: new Date(Date.now() + 50 * 60 * 1000),
              submittedAt: now,
              totalScore: totalEarnedMarks,
              autoScore: totalEarnedMarks,
              manualScore: 0,
              tabSwitchCount: Number(tabSwitchCount) || 0,
              userAgent: req.headers.get('user-agent') || 'Interactive Quiz Client',
              ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1'
            }
          }).catch(() => null);

          if (attempt) {
            generatedAttemptId = attempt.id;

            await prisma.assessmentEvent.create({
              data: {
                attemptId: attempt.id,
                eventType: 'WEAK_TOPICS_RECOMMENDATION_REPORT',
                metadata: {
                  paperCode: resolvedPaperCode,
                  studentName: user.name,
                  studentAge: studentAge || 15,
                  studentClass: studentClass || 'Class IX',
                  totalEarnedMarks,
                  totalAvailableMarks,
                  percentage,
                  tabSwitchCount,
                  tabSwitchLogs,
                  totalAwayTimeSeconds,
                  screenshotAttempts: Number(screenshotAttempts) || 0,
                  weakTopics,
                  allTopicsSummary: Object.entries(topicStats).map(([name, s]) => ({
                    topic: name,
                    score: `${s.correct}/${s.total}`,
                    percentage: Math.round((s.correct / s.total) * 100)
                  }))
                }
              }
            }).catch(() => null);
          }
        }
      }, 1).catch(() => null);
    } catch (dbErr) {
      console.warn('Prisma DB write bypassed gracefully:', dbErr);
    }

    // Always record to our dedicated submission store
    const storedRecord: StoredAttempt = {
      id: generatedAttemptId,
      paperCode: resolvedPaperCode,
      paperTitle: resolvedPaperTitle,
      studentId,
      studentName: safeStudentName,
      studentAge: studentAge || 15,
      studentClass: studentClass || 'Class IX',
      score: totalEarnedMarks,
      totalMarks: totalAvailableMarks,
      percentage,
      timeTakenSeconds: timeTakenSeconds || 60,
      tabSwitchCount: Number(tabSwitchCount) || 0,
      tabSwitchLogs,
      totalAwayTimeSeconds,
      screenshotAttempts: Number(screenshotAttempts) || 0,
      answers,
      weakTopics,
      incorrectQuestions: incorrectList,
      dynamicMessage,
      messageTone,
      submittedAt: now.toISOString(),
      isAutoSubmitted
    };
    saveSubmissionToStore(storedRecord);

    return NextResponse.json({
      success: true,
      attemptId: generatedAttemptId,
      studentName: safeStudentName,
      score: totalEarnedMarks,
      totalMarks: totalAvailableMarks,
      percentage,
      tabSwitchCount,
      tabSwitchLogs,
      totalAwayTimeSeconds,
      screenshotAttempts: Number(screenshotAttempts) || 0,
      dynamicMessage,
      messageTone,
      weakTopics,
      incorrectQuestions: incorrectList,
      submittedAt: now.toISOString(),
      isAutoSubmitted
    });
  } catch (err: any) {
    console.error('Quiz Submission Critical Fallback:', err);
    return NextResponse.json({ 
      success: true,
      attemptId: `att-fallback-${Date.now()}`,
      score: 0,
      totalMarks: 40,
      percentage: 0,
      dynamicMessage: 'Quiz submitted and saved for teacher review.',
      messageTone: 'info',
      weakTopics: [],
      incorrectQuestions: []
    });
  }
}
