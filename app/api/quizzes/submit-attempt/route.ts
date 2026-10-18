import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { submissionQueue } from '@/lib/priorityQueue';

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
      answers = []
    } = payload;

    // Enqueue job via Priority Job Queue for high-throughput scalability
    const result = await submissionQueue.enqueue(async () => {
      // 1. Resolve or Create Student User
      let user = null;
      if (studentId) {
        user = await prisma.user.findUnique({ where: { id: studentId } });
      }

      if (!user) {
        const safeName = studentName || 'Student';
        const fallbackEmail = `student_${Date.now().toString(36)}@quiz.akueb.edu.pk`;
        user = await prisma.user.create({
          data: {
            email: fallbackEmail,
            name: `${safeName} (${studentClass || 'Class IX'})`,
            role: 'STUDENT',
            emailVerified: true
          }
        });
      }

      // 2. Resolve or Create Master Quiz Container
      const resolvedPaperCode = paperCode || 'PHY-IX-P1';
      let quiz = await prisma.quiz.findFirst({
        where: { title: { contains: resolvedPaperCode } }
      });

      if (!quiz) {
        // Ensure teacher user exists
        let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
        if (!teacher) {
          teacher = await prisma.user.create({
            data: {
              email: 'system.examiner@akueb.edu.pk',
              name: 'AKU-EB Board Examiner',
              role: 'TEACHER',
              emailVerified: true
            }
          });
        }

        quiz = await prisma.quiz.create({
          data: {
            teacherId: teacher.id,
            title: `${paperTitle || 'Model Paper'} (${resolvedPaperCode})`,
            description: `Automated assessment benchmark for ${resolvedPaperCode}`,
            totalMarks: answers.length || 40,
            durationMin: 50,
            status: 'PUBLISHED',
            visibility: 'PUBLIC'
          }
        });
      }

      // 3. Calculate Score and Detailed Accuracy
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

      // 4. Identify Weak Topics (< 65% accuracy) for Recommendation Engine
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

      // 5. Create Quiz Attempt in Database
      const startedAt = new Date(Date.now() - (timeTakenSeconds || 60) * 1000);
      const submittedAt = new Date();

      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          studentId: user.id,
          status: 'GRADED',
          startedAt,
          deadline: new Date(Date.now() + 50 * 60 * 1000),
          submittedAt,
          totalScore: totalEarnedMarks,
          autoScore: totalEarnedMarks,
          manualScore: 0,
          tabSwitchCount: Number(tabSwitchCount) || 0,
          userAgent: req.headers.get('user-agent') || 'Interactive Quiz Client',
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1'
        }
      });

      // 6. Store Comprehensive Weak Topics & Academic Integrity Analytics Event
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
      });

      // 7. Dynamic Congrats & Performance Feedback Message
      let dynamicMessage = '';
      let messageTone: 'success' | 'warning' | 'info' = 'info';

      if (percentage >= 85) {
        dynamicMessage = `🏆 Outstanding Performance, ${user.name}! Congratulations! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). You are performing at an A+ board distinction level!`;
        messageTone = 'success';
      } else if (percentage >= 70) {
        dynamicMessage = `🎉 Great Achievement, ${user.name}! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). You have a solid conceptual understanding. Review the few weak areas below to reach 100%!`;
        messageTone = 'success';
      } else if (percentage >= 50) {
        dynamicMessage = `👍 Good Effort, ${user.name}! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). You passed the test, but several topics require targeted revision before the final exam.`;
        messageTone = 'warning';
      } else {
        dynamicMessage = `📚 Keep Practicing, ${user.name}! You scored ${totalEarnedMarks}/${totalAvailableMarks} (${percentage}%). Don't be discouraged — review your weak topics and the detailed answer explanations below!`;
        messageTone = 'info';
      }

      return {
        success: true,
        attemptId: attempt.id,
        studentName: user.name,
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
        submittedAt: submittedAt.toISOString()
      };
    }, 1); // Priority 1 (High priority for exam submissions)

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Quiz Submission Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit quiz attempt' }, { status: 500 });
  }
}
