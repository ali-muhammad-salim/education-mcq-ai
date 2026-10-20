import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes('_test')) throw new Error('Use a dedicated test database.');
describe.skipIf(!url)('Teacher and student workflows', () => {
  const suffix = randomUUID();
  let db: PrismaClient, teacherId: string, studentId: string, outsiderId: string, quizId: string, classroomId: string;
  const tokens: Record<string, string> = {};
  function request(path: string, who: string, body?: unknown) { return new NextRequest('http://localhost' + path, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: 'Bearer ' + tokens[who], 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    db = new PrismaClient({ datasources: { db: { url } } });
    const { sessionTokenHash } = await import('@/lib/auth');
    for (const [key, role] of [['teacher','TEACHER'],['student','STUDENT'],['outsider','TEACHER']] as const) {
      const user = await db.user.create({ data: { email: key + '-' + suffix + '@example.test', name: key, role } });
      if (key === 'teacher') teacherId = user.id; else if (key === 'student') studentId = user.id; else outsiderId = user.id;
      tokens[key] = randomUUID(); await db.userSession.create({ data: { userId: user.id, token: sessionTokenHash(tokens[key]), expiresAt: new Date(Date.now() + 600000) } });
    }
  });
  afterAll(async () => {
    if (!db) return;
    if (studentId) await db.quizAttempt.deleteMany({ where: { studentId } });
    if (quizId) { await db.quizAttempt.deleteMany({ where: { quizId } }); await db.quiz.delete({ where: { id: quizId } }); }
    if (classroomId) await db.classroom.delete({ where: { id: classroomId } });
    const ids = [teacherId, studentId, outsiderId].filter(Boolean);
    await db.durableJob.deleteMany({ where: { ownerId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await db.authChallenge.deleteMany({ where: { name: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    const boards = await db.board.findMany({ where: { shortCode: 'TEST-' + suffix }, include: { programmes: { include: { academicClasses: true } } } });
    for (const board of boards) { const programmes = board.programmes.map(p => p.id), classes = board.programmes.flatMap(p => p.academicClasses.map(c => c.id)); await db.subject.deleteMany({ where: { classId: { in: classes } } }); await db.academicClass.deleteMany({ where: { id: { in: classes } } }); await db.programme.deleteMany({ where: { id: { in: programmes } } }); await db.board.delete({ where: { id: board.id } }); }
    await db.$disconnect(); const { default: shared } = await import('@/lib/prisma'); await shared.$disconnect();
  });
  it('preserves academic metadata and withholds results when immediate feedback is disabled', async () => {
    const { POST } = await import('@/app/api/quizzes/route');
    const response = await POST(request('/api/quizzes','teacher',{ title:'Workflow exam', boardId:'TEST-' + suffix, classLevel:10, subject:'Chemistry', visibility:'PRIVATE', status:'PUBLISHED', settings:{ immediateFeedback:false }, questions:[{ questionType:'SHORT_ANSWER', stemText:'Explain the observation.', marks:3, unit:'mol', pastPaperRef:'Source reference' }] }));
    expect(response.status).toBe(200); const data = await response.json(); quizId = data.quizId;
    const { GET } = await import('@/app/api/quizzes/[id]/route');
    const loaded = await (await GET(request('/api/quizzes/' + quizId + '?mode=edit','teacher'), { params:Promise.resolve({ id:quizId }) })).json();
    expect(loaded.quiz.classLevel).toBe(10); expect(loaded.quiz.subject).toBe('Chemistry'); expect(loaded.quiz.questions[0].unit).toBe('mol'); expect(loaded.quiz.settings.resultVisibility).toBe('MANUAL_RELEASE');
    const { startAttempt } = await import('@/services/assessment/service');
    await expect(startAttempt(quizId,{ id:studentId,email:'student@example.test',name:'Student',role:'STUDENT' })).rejects.toThrow();
  });
  it('assigns private work, enrolls once, denies another teacher and supports grading and release', async () => {
    const { POST:create } = await import('@/app/api/classrooms/route');
    const created = await (await create(request('/api/classrooms','teacher',{ name:'Workflow class',gradeLevel:10 }))).json(); classroomId=created.classroom.id;
    const { PATCH } = await import('@/app/api/classrooms/[id]/route'); const ctx={ params:Promise.resolve({id:classroomId}) };
    expect((await PATCH(request('/api/classrooms/' + classroomId,'outsider',{action:'ASSIGN',quizId}),ctx)).status).toBe(403);
    expect((await PATCH(request('/api/classrooms/' + classroomId,'teacher',{action:'ASSIGN',quizId}),ctx)).status).toBe(200);
    const { POST:join } = await import('@/app/api/classrooms/join/route');
    expect((await join(request('/api/classrooms/join','student',{code:created.classroom.code}))).status).toBe(200);
    expect((await (await join(request('/api/classrooms/join','student',{code:created.classroom.code}))).json()).alreadyMember).toBe(true);
    const service = await import('@/services/assessment/service'), student={ id:studentId,email:'student@example.test',name:'Student',role:'STUDENT' as const };
    const attempt=await service.startAttempt(quizId,student); const question=attempt.questions[0];
    await service.saveAnswer(quizId,student,{attemptId:attempt.id,questionId:question.id,version:0,answerPayload:{textAnswer:'My explanation'}}); await service.submitAttempt(quizId,student,attempt.id);
    await expect(service.getResults(quizId,student,attempt.id)).rejects.toThrow();
    const teacher={id:teacherId,email:'teacher@example.test',name:'Teacher',role:'TEACHER' as const}; const review=await service.getResults(quizId,teacher,attempt.id);
    expect(review.canGrade).toBe(true); expect(review.questions[0].quizAnswerId).toBeTruthy();
    const { POST:grade }=await import('@/app/api/quizzes/[id]/grade/route');
    expect((await grade(request('/api/quizzes/' + quizId + '/grade','teacher',{quizAnswerId:review.questions[0].quizAnswerId,awardedMarks:2,feedback:'Good explanation'}),{params:Promise.resolve({id:quizId})})).status).toBe(200);
    const { POST:release }=await import('@/app/api/quizzes/[id]/release/route'); await release(request('/api/quizzes/' + quizId + '/release','teacher',{showCorrectAnswers:false}),{params:Promise.resolve({id:quizId})});
    const result=await service.getResults(quizId,student,attempt.id); expect(result.score).toBe(2); expect(result.canViewCorrectAnswers).toBe(false); expect(result.questions[0].teacherComment).toBe('Good explanation');
    const { GET:dashboard }=await import('@/app/api/dashboard/teacher/route'); const dashboardData=await (await dashboard(request('/api/dashboard/teacher','teacher'))).json(); expect(dashboardData.recentSubmissions[0].attemptId).toBe(attempt.id); expect(dashboardData.recentSubmissions[0].studentName).toBe('student');
    await PATCH(request('/api/classrooms/' + classroomId,'teacher',{action:'MEMBERSHIP',studentId,status:'REMOVED'}),ctx);
    expect((await join(request('/api/classrooms/join','student',{code:created.classroom.code}))).status).toBe(403);
  });
  it('starts only the requested practice questions and rejects unavailable selections', async () => {
    const service = await import('@/services/assessment/service');
    const student = { id:studentId, email:'student@example.test', name:'Student', role:'STUDENT' as const };
    const attempt = await service.startAttempt('PHY-IX-P1-SET-1-2',student);
    expect(attempt.questions).toHaveLength(2);
    expect(JSON.stringify(attempt.questions)).not.toContain('isCorrect');
    await expect(service.startAttempt('PHY-IX-P1-SET-99',student)).rejects.toThrow();
  });
  it('enforces sharing ownership, release policy and future-attempt timers without changing saved attempts', async () => {
    const { GET, POST } = await import('@/app/api/quizzes/[id]/release/route');
    const ctx = {params:Promise.resolve({id:quizId})}, path='/api/quizzes/'+quizId+'/release';
    expect((await GET(request(path,'outsider'),ctx)).status).toBe(403);
    expect((await POST(request(path,'outsider',{durationMin:2}),ctx)).status).toBe(403);
    expect((await POST(request(path,'teacher',{resultVisibility:'SCHEDULED'}),ctx)).status).toBe(400);
    expect((await POST(request(path,'teacher',{durationMin:0}),ctx)).status).toBe(400);
    expect((await POST(request(path,'teacher',{scheduleStart:'2030-01-02T00:00:00Z',scheduleEnd:'2030-01-01T00:00:00Z'}),ctx)).status).toBe(400);
    const student={id:studentId,email:'student@example.test',name:'Student',role:'STUDENT' as const};
    const service=await import('@/services/assessment/service');
    await POST(request(path,'teacher',{resultVisibility:'IMMEDIATE',showCorrectAnswers:true,durationMin:7,visibility:'UNLISTED',maxAttempts:3,allowRetries:true,randomizeQuestions:true,randomizeOptions:true}),ctx);
    const review=await service.getResults(quizId,student);expect(review.canViewCorrectAnswers).toBe(true);expect(review.questions[0].answerFeedback).toContain('full marks');
    const teacher={id:teacherId,email:'teacher@example.test',name:'Teacher',role:'TEACHER' as const};
    const attempt=await service.startAttempt(quizId,teacher);
    expect(new Date(attempt.deadline).getTime()-new Date(attempt.startedAt).getTime()).toBe(7*60000);
    await POST(request(path,'teacher',{resultVisibility:'MANUAL_RELEASE',showCorrectAnswers:false,durationMin:2}),ctx);
    await expect(service.getResults(quizId,student)).rejects.toThrow('not been released');
    const recovered=await service.recoverAttempt(quizId,teacher);expect(recovered.attempt?.deadline).toEqual(attempt.deadline);
    const loaded=await (await GET(request(path,'teacher'),ctx)).json();expect(loaded.quiz.durationMin).toBe(2);expect(loaded.quiz.settings.maxAttempts).toBe(3);
    await POST(request(path,'teacher',{resultVisibility:'SCHEDULED',releaseAt:new Date(Date.now()+60000).toISOString()}),ctx);
    await expect(service.getResults(quizId,student)).rejects.toThrow('not been released');
    await POST(request(path,'teacher',{durationMin:3}),ctx);
    const stillHeld=await (await GET(request(path,'teacher'),ctx)).json();expect(stillHeld.quiz.settings.resultVisibility).toBe('SCHEDULED');
    await expect(service.getResults(quizId,student)).rejects.toThrow('not been released');
    await POST(request(path,'teacher',{resultVisibility:'IMMEDIATE',showCorrectAnswers:false}),ctx);
    const hidden=await service.getResults(quizId,student);expect(hidden.score).toBe(2);expect(hidden.questions[0]).not.toHaveProperty('answerFeedback');expect(hidden.questions[0]).not.toHaveProperty('explanation');
  });
  it('uses purpose-bound single-use password reset tokens and revokes existing sessions', async () => {
    const email = 'student-' + suffix + '@example.test', token = 'a'.repeat(64);
    await db.authChallenge.create({ data: { identifier: 'reset:' + email, codeHash: createHash('sha256').update(token).digest('hex'), name: studentId, expiresAt: new Date(Date.now() + 60000) } });
    const { POST } = await import('@/app/api/auth/recovery/route');
    const body = { action:'RESET', email, token, password:'A-test-only-password-1234' };
    expect((await POST(request('/api/auth/recovery','student',body))).status).toBe(200);
    expect(await db.userSession.count({ where: { userId: studentId } })).toBe(0);
    expect((await POST(request('/api/auth/recovery','student',body))).status).toBe(400);
    const { verifyPassword } = await import('@/lib/passwords');
    expect(await verifyPassword(body.password, (await db.user.findUniqueOrThrow({ where: { id: studentId } })).passwordHash!)).toBe(true);
  });
});
