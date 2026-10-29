# PHASE ZERO: SYSTEM ARCHITECTURE AUDIT & EXTENSION PLAN
**Educational Resource Hub & Secure Assessment Platform (Version 2.0)**
*Date: October 2026 | Antigravity Full-Stack Architecture Audit*

---

## 1. Executive Summary & Repository Status

A full structural inspection of the codebase has been completed. The existing platform possesses:
- **Next.js 16.3.8 (App Router)** and **React 19.3.0** with TypeScript.
- **PostgreSQL 16 + pgvector** accessed via **Prisma ORM 5.10.2** (`postgresql://postgres:postgres@localhost:5432/mcqs`).
- A populated curriculum and past-paper database containing:
  - **Board**: Aga Khan University Examination Board (`AKU-EB`) [Active].
  - **Programmes**: Secondary School Certificate (`SSC`) and Higher Secondary School Certificate (`HSSC`).
  - **Academic Classes**: `Class IX` (Grade 9, level 9), `Class X` (Grade 10, level 10), `Class XI` (Grade 11, level 11), `Class XII` (Grade 12, level 12).
  - **Subjects**: Physics, Chemistry, Biology, Mathematics, English Compulsory, Urdu, Islamiyat, Pakistan Studies, Computer Science, and Humanities.
  - **Live Past & Model Papers**: Fully ingested and verified papers including `PHY-IX-2025-P1` (40 MCQs with images and verified answer keys), `PHY-IX-2025-P2` (11 CRQs), `PHY-IX-P1` (40 MCQs), `PHY-IX-P2` (12 CRQs), `PHY-X-P1` (40 MCQs), `PHY-X-P2` (10 CRQs).
  - **KaTeX** integration (`katex`, `@types/katex`, `components/LatexRenderer.tsx`) for mathematical notation.
  - **Python backend services** in `services/`: Ingestion pipeline, Gemini AI extraction client, syllabus parser, RAG embeddings generator, and OCR with vision fallback.

---

## 2. Inventory of Reusable Components

| Component / Service | File Location | Purpose & Reuse Strategy |
| :--- | :--- | :--- |
| **Prisma Academic Hierarchy** | `prisma/schema.prisma` | Reuse `Board`, `Programme`, `AcademicClass`, `Subject`, `SyllabusVersion`, `Topic`, `Subtopic`, `SLO` as source of truth. |
| **Question Bank Models** | `prisma/schema.prisma` | Reuse `Question`, `QuestionOption`, `QuestionExplanation`, `QuestionSolution`, `PastPaperQuestion`, `QuestionPastPaperReference`. |
| **LaTeX & Math Renderer** | `components/LatexRenderer.tsx` | Render math equations, physics symbols, and chemistry formulas on teacher and student views. |
| **Navigation & Breadcrumbs** | `components/Breadcrumbs.tsx`, `components/Navbar.tsx` | Universal breadcrumbs and board/class dropdown navigation. |
| **Gemini AI Client** | `services/inference/gemini_client.py` | Server-side LLM inference for quiz generation and written-answer grading. |
| **Paper Viewer Engine** | `app/past-papers/[id]/PaperViewerClient.tsx` | Split-view examination paper viewer with PDF reference and interactive questions. |

---

## 3. Gap Analysis (Missing Components to Implement)

1. **Phase 1 (Resource Hub Navigation)**:
   - Update Homepage (`app/page.tsx`): Prominent Board header -> Class selector (IX, X, XI, XII) -> Stacked Subject Cards ("one column, multiple rows") with chapter counts and resource badges.
   - Update Subject Archive (`app/subjects/[classSlug]/[subjectSlug]/page.tsx`): Implement the authentic dark directory archive container (`#23272e`) matching user reference screenshot with the 12 categorized resource sections.
2. **Phase 2 & 11 (Database & Auth Foundation)**:
   - Database models for `User`, `Role`, `Classroom`, `ClassroomMembership`, `Quiz`, `QuizQuestion`, `QuizSetting`, `QuizAttempt`, `QuizAnswer`, `AssessmentEvent`, `AnswerGrade`, and `LearningResource`.
   - Next.js server-side session authentication with email/password and Google OAuth.
3. **Phase 3 (Dashboards)**:
   - Student Dashboard (`/dashboard/student`): assigned quizzes, scores, performance by SLO/chapter, incorrect answer review.
   - Teacher Dashboard (`/dashboard/teacher`): quiz management, classroom management, submissions, manual grading queue.
   - Admin Dashboard (`/admin`): academic configuration, users, audit logs, system health.
4. **Phase 4 & 5 (Unified Quiz Builder & Rich Content Editor)**:
   - Unified Google Forms-inspired quiz builder with inline settings, question reordering, and multi-source addition (Manual, Question Bank, Gemini AI Generation, Import, Duplicate).
   - Rich-content Modal Editor: LaTeX equation builder, chemistry formula composer, searchable symbol picker, drawing canvas (pen/shapes/eraser), and flowchart/diagram creator.
5. **Phase 6 & 7 (Assessment Engine & Integrity)**:
   - Timed student quiz interface with server-side authoritative deadline.
   - Autosave with versioning and reload recovery.
   - Anti-cheating tab-switch detection with configurable warning threshold (default > 2 events).
6. **Phase 8 (Grading & Feedback)**:
   - Deterministic auto-grading for objective questions.
   - AI-assisted written-answer grading (Lenient, Medium, Strict, Custom).
   - Teacher manual grading queue with provisional result blocking.
7. **Phase 10 (External Integrations)**:
   - Typesense search indexing service.
   - Cloudflare R2 file storage adapter with presigned URLs.
   - Sentry APM, PostHog product analytics, Google Analytics, and Resend transactional email.
   - GitHub Actions CI/CD workflows.

---

## 4. Phased Implementation Roadmap

```mermaid
graph TD
    P0[Phase 0: Audit & Architecture] --> P1[Phase 1: Educational Resource Hub & Hierarchy]
    P1 --> P2[Phase 2: Database Schema & Auth Foundation]
    P2 --> P3[Phase 3: Unified Quiz Builder & Question Bank]
    P3 --> P4[Phase 4: Mathematical, Chemistry & Diagram Editor]
    P4 --> P5[Phase 5: Classrooms, Enrollment & Academic Selectors]
    P5 --> P6[Phase 6: Timed Assessment Engine & Anti-Cheating]
    P6 --> P7[Phase 7: Deterministic & AI Grading Engine]
    P7 --> P8[Phase 8: Student, Teacher & Admin Dashboards]
    P8 --> P9[Phase 9: External Integrations R2, Typesense, Sentry, Resend]
    P9 --> P10[Phase 10: Production Hardening, CI/CD & Verification]
```

---

## 5. Security & Migration Guarantees
- **Zero Data Loss**: No drop-table or destructive migrations against active database records.
- **Server-Side Authorization**: Every API verifies user ownership and role on the server; client-provided roles or IDs are never trusted.
- **Answer Key Isolation**: Correct answers and grading rubrics are strictly withheld from student browser payloads until official result release.
- **Key Hygiene**: Gemini API keys, Cloudflare R2 secrets, Resend tokens, and database credentials remain strictly in server environment variables.
