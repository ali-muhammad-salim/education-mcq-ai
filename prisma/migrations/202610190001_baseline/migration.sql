-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'ASSERTION_REASON', 'STATEMENT_BASED', 'NEGATIVE_STEM', 'IMAGE_BASED', 'DIAGRAM_BASED', 'GRAPH_BASED', 'TABLE_BASED', 'EQUATION_BASED', 'NUMERICAL', 'CASE_BASED', 'PASSAGE_BASED', 'MATCHING', 'SEQUENCE', 'CLASSIFICATION', 'CRQ', 'ERQ');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TEXTBOOK', 'CURRICULUM', 'PAST_PAPER', 'APPROVED_QUESTION', 'TEACHER_CREATED', 'OTHER_VERIFIED_SOURCE');

-- CreateEnum
CREATE TYPE "ReferenceRelationship" AS ENUM ('DIRECT_CONCEPT', 'SAME_CONCEPT', 'SAME_PATTERN', 'SAME_FORMULA', 'SAME_NUMERICAL_METHOD', 'SAME_DIAGRAM_PATTERN', 'RELATED_CONCEPT', 'SEMANTICALLY_SIMILAR');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'EDITED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuizVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "AIGradingMode" AS ENUM ('OFF', 'LENIENT', 'MEDIUM', 'STRICT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADING_PENDING', 'GRADED');

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeMapping" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "internalBoardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgrammeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusVersion" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "syllabusVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topicNumber" TEXT,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtopic" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtopicNum" TEXT,

    CONSTRAINT "Subtopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLO" (
    "id" TEXT NOT NULL,
    "subtopicId" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "cognitiveLevel" TEXT,
    "isPractical" BOOLEAN NOT NULL DEFAULT false,
    "fingerprint" TEXT,
    "sourcePage" INTEGER,
    "isFormative" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(768),

    CONSTRAINT "SLO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperBlueprint" (
    "id" TEXT NOT NULL,
    "syllabusVersionId" TEXT NOT NULL,
    "paperCode" TEXT NOT NULL,
    "durationMin" INTEGER,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "sections" JSONB NOT NULL,
    "chapterWeightage" JSONB,
    "cognitiveSplit" JSONB,
    "source" TEXT NOT NULL DEFAULT 'DERIVED',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusDiffRecord" (
    "id" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusDiffRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLOMapping" (
    "id" TEXT NOT NULL,
    "sourceSloId" TEXT NOT NULL,
    "targetSloId" TEXT NOT NULL,
    "mappingType" TEXT NOT NULL DEFAULT 'EQUIVALENT',
    "confidenceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SLOMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "sloId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CommandWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveLevel" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CognitiveLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExaminationSpecification" (
    "id" TEXT NOT NULL,
    "syllabusVersionId" TEXT NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "ExaminationSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "subject" TEXT,
    "className" TEXT,
    "boardAssociation" TEXT,
    "language" TEXT,
    "edition" TEXT,
    "publicationYear" INTEGER,
    "sourceFile" TEXT,
    "sourceHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookEdition" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookPage" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imagePath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "ocrStatus" TEXT,
    "extractionStatus" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourceHash" TEXT,

    CONSTRAINT "BookPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "BookSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentChunk" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ContentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formula" (
    "id" TEXT NOT NULL,
    "latex" TEXT NOT NULL,

    CONSTRAINT "Formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equation" (
    "id" TEXT NOT NULL,
    "latex" TEXT NOT NULL,

    CONSTRAINT "Equation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagram" (
    "id" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,

    CONSTRAINT "Diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flowchart" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Flowchart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableRegion" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "TableRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookContent" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "section" TEXT,
    "embedding" vector(768),

    CONSTRAINT "BookContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookContentTopic" (
    "id" TEXT NOT NULL,
    "bookContentId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "BookContentTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookContentSubtopic" (
    "id" TEXT NOT NULL,
    "bookContentId" TEXT NOT NULL,
    "subtopicId" TEXT NOT NULL,

    CONSTRAINT "BookContentSubtopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookContentSLO" (
    "id" TEXT NOT NULL,
    "bookContentId" TEXT NOT NULL,
    "sloId" TEXT NOT NULL,

    CONSTRAINT "BookContentSLO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookContentConcept" (
    "id" TEXT NOT NULL,
    "bookContentId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,

    CONSTRAINT "BookContentConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookContentCognitiveLevel" (
    "id" TEXT NOT NULL,
    "bookContentId" TEXT NOT NULL,
    "cognitiveLevelId" TEXT NOT NULL,

    CONSTRAINT "BookContentCognitiveLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extraction" (
    "id" TEXT NOT NULL,
    "bookPageId" TEXT NOT NULL,
    "extractionEngine" TEXT NOT NULL,
    "model" TEXT,
    "modelVersion" TEXT,
    "rawOutput" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Extraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaper" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examYear" INTEGER NOT NULL,
    "examSession" TEXT,
    "examType" TEXT,
    "paperCode" TEXT,
    "fileUrl" TEXT,
    "title" TEXT NOT NULL,
    "sourceFile" TEXT,
    "sourceHash" TEXT,
    "pageCount" INTEGER,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PastPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperPage" (
    "id" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL,

    CONSTRAINT "PastPaperPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PastPaperSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestion" (
    "id" TEXT NOT NULL,
    "pastPaperId" TEXT NOT NULL,
    "section" TEXT,
    "questionNumber" TEXT NOT NULL,
    "subQuestionNumber" TEXT,
    "questionText" TEXT NOT NULL,
    "normalizedQuestionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "marks" DOUBLE PRECISION,
    "pageNumber" INTEGER,
    "sourceRegion" JSONB,
    "syllabusVersionId" TEXT,
    "topicId" TEXT,
    "subtopicId" TEXT,
    "sloId" TEXT,
    "conceptId" TEXT,
    "difficulty" TEXT,
    "numericalOrConceptual" TEXT,
    "diagramBased" BOOLEAN NOT NULL DEFAULT false,
    "imageBased" BOOLEAN NOT NULL DEFAULT false,
    "graphBased" BOOLEAN NOT NULL DEFAULT false,
    "tableBased" BOOLEAN NOT NULL DEFAULT false,
    "equationBased" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastPaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionPart" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "partIdentifier" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionTopic" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionSubtopic" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "subtopicId" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionSubtopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionSLO" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "sloId" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionSLO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionConcept" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionCommandWord" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "commandWordId" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionCommandWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionCognitiveLevel" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "cognitiveLevelId" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionCognitiveLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastPaperQuestionMedia" (
    "id" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,

    CONSTRAINT "PastPaperQuestionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "stemText" TEXT NOT NULL,
    "boardId" TEXT,
    "curriculumRelevance" DOUBLE PRECISION,
    "historicalEvidenceStrength" DOUBLE PRECISION,
    "sourceFaithfulness" DOUBLE PRECISION,
    "questionQuality" DOUBLE PRECISION,
    "difficultyConfidence" DOUBLE PRECISION,
    "boardStyleEvidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "difficulty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "orderIndex" INTEGER,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionExplanation" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "QuestionExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSolution" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "steps" JSONB NOT NULL,

    CONSTRAINT "QuestionSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionMedia" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "QuestionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTag" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionVersion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "QuestionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSource" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "region" JSONB,
    "evidenceText" TEXT NOT NULL,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPastPaperReference" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "pastPaperQuestionId" TEXT NOT NULL,
    "relationshipType" "ReferenceRelationship" NOT NULL,
    "similarityScore" DOUBLE PRECISION,
    "conceptMatch" BOOLEAN NOT NULL DEFAULT false,
    "topicMatch" BOOLEAN NOT NULL DEFAULT false,
    "patternMatch" BOOLEAN NOT NULL DEFAULT false,
    "formulaMatch" BOOLEAN NOT NULL DEFAULT false,
    "diagramMatch" BOOLEAN NOT NULL DEFAULT false,
    "numericalMethodMatch" BOOLEAN NOT NULL DEFAULT false,
    "evidenceStrength" DOUBLE PRECISION,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPastPaperReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGeneration" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "retrievedSources" JSONB,
    "inputData" JSONB NOT NULL,
    "rawOutput" TEXT NOT NULL,
    "normalizedOutput" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPrompt" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "AIPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEvaluation" (
    "id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIValidation" (
    "id" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL,

    CONSTRAINT "AIValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "originalAIOutput" JSONB,
    "finalHumanVersion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyNote" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sloId" TEXT,
    "syllabusVersionId" TEXT,
    "blocks" JSONB,
    "coverageSummary" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "staleReason" TEXT,

    CONSTRAINT "StudyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_document_pages" (
    "id" VARCHAR(36) NOT NULL,
    "document_id" VARCHAR(36) NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_path" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "orientation_angle" DOUBLE PRECISION NOT NULL,
    "ocr_status" VARCHAR(20) NOT NULL,
    "processing_time_ms" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingest_document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_documents" (
    "id" VARCHAR(36) NOT NULL,
    "document_type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_hash_sha256" VARCHAR(64) NOT NULL,
    "total_pages" INTEGER NOT NULL,
    "processing_status" VARCHAR(20) NOT NULL,
    "metadata_json" JSON,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingest_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_page_diagrams" (
    "id" VARCHAR(36) NOT NULL,
    "page_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(32) NOT NULL,
    "media_path" TEXT,
    "caption" TEXT NOT NULL,
    "detected_labels" JSON,
    "description" TEXT NOT NULL,
    "associated_concept" TEXT NOT NULL,
    "bbox_x0" DOUBLE PRECISION NOT NULL,
    "bbox_y0" DOUBLE PRECISION NOT NULL,
    "bbox_x1" DOUBLE PRECISION NOT NULL,
    "bbox_y1" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "confidence_level" VARCHAR(16) NOT NULL,
    "vision_used" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingest_page_diagrams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_page_equations" (
    "id" VARCHAR(36) NOT NULL,
    "page_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(32) NOT NULL,
    "display_form" TEXT NOT NULL,
    "latex" TEXT NOT NULL,
    "normalized_form" TEXT NOT NULL,
    "is_chemical" BOOLEAN NOT NULL,
    "chem_display" TEXT NOT NULL,
    "chem_normalized" TEXT NOT NULL,
    "chem_arrow" VARCHAR(8) NOT NULL,
    "chem_state_symbols" JSON,
    "chem_coefficients" JSON,
    "bbox_x0" DOUBLE PRECISION NOT NULL,
    "bbox_y0" DOUBLE PRECISION NOT NULL,
    "bbox_x1" DOUBLE PRECISION NOT NULL,
    "bbox_y1" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "confidence_level" VARCHAR(16) NOT NULL,
    "vision_used" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingest_page_equations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_page_questions" (
    "id" VARCHAR(36) NOT NULL,
    "page_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(32) NOT NULL,
    "question_number" VARCHAR(16) NOT NULL,
    "sub_question_number" VARCHAR(16) NOT NULL,
    "section" VARCHAR(64) NOT NULL,
    "question_type" VARCHAR(32),
    "syllabus_version_id" VARCHAR(36),
    "marks" DOUBLE PRECISION,
    "question_text" TEXT NOT NULL,
    "options" JSON,
    "answer_space_y0" DOUBLE PRECISION,
    "answer_space_y1" DOUBLE PRECISION,
    "has_diagram" BOOLEAN NOT NULL,
    "has_formula" BOOLEAN NOT NULL,
    "has_table" BOOLEAN NOT NULL,
    "bbox_x0" DOUBLE PRECISION NOT NULL,
    "bbox_y0" DOUBLE PRECISION NOT NULL,
    "bbox_x1" DOUBLE PRECISION NOT NULL,
    "bbox_y1" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "confidence_level" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingest_page_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_page_regions" (
    "id" VARCHAR(36) NOT NULL,
    "page_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(32) NOT NULL,
    "region_type" VARCHAR(32) NOT NULL,
    "bbox_x0" DOUBLE PRECISION NOT NULL,
    "bbox_y0" DOUBLE PRECISION NOT NULL,
    "bbox_x1" DOUBLE PRECISION NOT NULL,
    "bbox_y1" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "confidence_level" VARCHAR(16) NOT NULL,
    "vision_used" BOOLEAN NOT NULL,
    "reading_order" INTEGER,
    "raw_ocr" JSON,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingest_page_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_page_tables" (
    "id" VARCHAR(36) NOT NULL,
    "page_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(32) NOT NULL,
    "headers" JSON,
    "rows" JSON,
    "markdown" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "bbox_x0" DOUBLE PRECISION NOT NULL,
    "bbox_y0" DOUBLE PRECISION NOT NULL,
    "bbox_x1" DOUBLE PRECISION NOT NULL,
    "bbox_y1" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "confidence_level" VARCHAR(16) NOT NULL,
    "vision_used" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingest_page_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "boardId" TEXT,
    "classLevel" INTEGER NOT NULL,
    "session" TEXT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomMembership" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "boardId" TEXT,
    "classId" TEXT,
    "subjectId" TEXT,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMin" INTEGER,
    "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "QuizVisibility" NOT NULL DEFAULT 'PUBLIC',
    "scheduleStart" TIMESTAMP(3),
    "scheduleEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSetting" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "allowRetries" BOOLEAN NOT NULL DEFAULT false,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "randomizeOptions" BOOLEAN NOT NULL DEFAULT false,
    "immediateFeedback" BOOLEAN NOT NULL DEFAULT true,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT true,
    "resultVisibility" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "resultReleaseDate" TIMESTAMP(3),
    "manualGradingRequired" BOOLEAN NOT NULL DEFAULT false,
    "aiGradingMode" "AIGradingMode" NOT NULL DEFAULT 'MEDIUM',
    "customRubric" JSONB,
    "negativeMarking" BOOLEAN NOT NULL DEFAULT false,
    "negativeMarkValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tabMonitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tabWarningThreshold" INTEGER NOT NULL DEFAULT 2,
    "lateSubmissionAllowed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuizSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAssignment" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),

    CONSTRAINT "QuizAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "bankQuestionId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "questionData" JSONB NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "totalScore" DOUBLE PRECISION,
    "autoScore" DOUBLE PRECISION,
    "manualScore" DOUBLE PRECISION,
    "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerPayload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isAutoGraded" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "teacherComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AssessmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerGrade" (
    "id" TEXT NOT NULL,
    "quizAnswerId" TEXT NOT NULL,
    "graderId" TEXT,
    "isAiGraded" BOOLEAN NOT NULL DEFAULT false,
    "aiMode" "AIGradingMode",
    "awardedMarks" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "rubricScores" JSONB,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'FINAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CommandWordToSLO" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Board_shortCode_key" ON "Board"("shortCode");

-- CreateIndex
CREATE INDEX "Topic_syllabusVersionId_idx" ON "Topic"("syllabusVersionId");

-- CreateIndex
CREATE INDEX "Subtopic_topicId_idx" ON "Subtopic"("topicId");

-- CreateIndex
CREATE INDEX "SLO_subtopicId_idx" ON "SLO"("subtopicId");

-- CreateIndex
CREATE UNIQUE INDEX "SLO_subtopicId_code_key" ON "SLO"("subtopicId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PaperBlueprint_syllabusVersionId_paperCode_key" ON "PaperBlueprint"("syllabusVersionId", "paperCode");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusDiffRecord_fromVersionId_toVersionId_key" ON "SyllabusDiffRecord"("fromVersionId", "toVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SLOMapping_sourceSloId_targetSloId_key" ON "SLOMapping"("sourceSloId", "targetSloId");

-- CreateIndex
CREATE INDEX "Concept_sloId_idx" ON "Concept"("sloId");

-- CreateIndex
CREATE UNIQUE INDEX "CommandWord_word_key" ON "CommandWord"("word");

-- CreateIndex
CREATE UNIQUE INDEX "CognitiveLevel_level_key" ON "CognitiveLevel"("level");

-- CreateIndex
CREATE UNIQUE INDEX "BookContentTopic_bookContentId_topicId_key" ON "BookContentTopic"("bookContentId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "BookContentSubtopic_bookContentId_subtopicId_key" ON "BookContentSubtopic"("bookContentId", "subtopicId");

-- CreateIndex
CREATE UNIQUE INDEX "BookContentSLO_bookContentId_sloId_key" ON "BookContentSLO"("bookContentId", "sloId");

-- CreateIndex
CREATE UNIQUE INDEX "BookContentConcept_bookContentId_conceptId_key" ON "BookContentConcept"("bookContentId", "conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "BookContentCognitiveLevel_bookContentId_cognitiveLevelId_key" ON "BookContentCognitiveLevel"("bookContentId", "cognitiveLevelId");

-- CreateIndex
CREATE INDEX "PastPaperQuestion_pastPaperId_idx" ON "PastPaperQuestion"("pastPaperId");

-- CreateIndex
CREATE INDEX "PastPaperQuestion_questionNumber_idx" ON "PastPaperQuestion"("questionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PastPaperQuestionTopic_pastPaperQuestionId_topicId_key" ON "PastPaperQuestionTopic"("pastPaperQuestionId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "PastPaperQuestionSubtopic_pastPaperQuestionId_subtopicId_key" ON "PastPaperQuestionSubtopic"("pastPaperQuestionId", "subtopicId");

-- CreateIndex
CREATE UNIQUE INDEX "PastPaperQuestionSLO_pastPaperQuestionId_sloId_key" ON "PastPaperQuestionSLO"("pastPaperQuestionId", "sloId");

-- CreateIndex
CREATE INDEX "PastPaperQuestionConcept_conceptId_idx" ON "PastPaperQuestionConcept"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "PastPaperQuestionConcept_pastPaperQuestionId_conceptId_key" ON "PastPaperQuestionConcept"("pastPaperQuestionId", "conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "PastPaperQuestionCommandWord_pastPaperQuestionId_commandWor_key" ON "PastPaperQuestionCommandWord"("pastPaperQuestionId", "commandWordId");

-- CreateIndex
CREATE UNIQUE INDEX "PastPaperQuestionCognitiveLevel_pastPaperQuestionId_cogniti_key" ON "PastPaperQuestionCognitiveLevel"("pastPaperQuestionId", "cognitiveLevelId");

-- CreateIndex
CREATE INDEX "Question_boardId_idx" ON "Question"("boardId");

-- CreateIndex
CREATE INDEX "Question_questionType_idx" ON "Question"("questionType");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "QuestionPastPaperReference_questionId_idx" ON "QuestionPastPaperReference"("questionId");

-- CreateIndex
CREATE INDEX "QuestionPastPaperReference_pastPaperQuestionId_idx" ON "QuestionPastPaperReference"("pastPaperQuestionId");

-- CreateIndex
CREATE INDEX "StudyNote_topicId_idx" ON "StudyNote"("topicId");

-- CreateIndex
CREATE INDEX "StudyNote_sloId_idx" ON "StudyNote"("sloId");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_document_pages_document_id_page_number_key" ON "ingest_document_pages"("document_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_documents_file_hash_sha256_key" ON "ingest_documents"("file_hash_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "Classroom_teacherId_idx" ON "Classroom"("teacherId");

-- CreateIndex
CREATE INDEX "Classroom_code_idx" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "ClassroomMembership_classroomId_idx" ON "ClassroomMembership"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomMembership_studentId_idx" ON "ClassroomMembership"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomMembership_classroomId_studentId_key" ON "ClassroomMembership"("classroomId", "studentId");

-- CreateIndex
CREATE INDEX "Quiz_teacherId_idx" ON "Quiz"("teacherId");

-- CreateIndex
CREATE INDEX "Quiz_status_idx" ON "Quiz"("status");

-- CreateIndex
CREATE INDEX "Quiz_visibility_idx" ON "Quiz"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "QuizSetting_quizId_key" ON "QuizSetting"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAssignment_quizId_classroomId_key" ON "QuizAssignment"("quizId", "classroomId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizQuestion_orderIndex_idx" ON "QuizQuestion"("orderIndex");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentId_idx" ON "QuizAttempt"("studentId");

-- CreateIndex
CREATE INDEX "QuizAttempt_status_idx" ON "QuizAttempt"("status");

-- CreateIndex
CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_attemptId_questionId_key" ON "QuizAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "AssessmentEvent_attemptId_idx" ON "AssessmentEvent"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentEvent_eventType_idx" ON "AssessmentEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnswerGrade_quizAnswerId_idx" ON "AnswerGrade"("quizAnswerId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_CommandWordToSLO_AB_unique" ON "_CommandWordToSLO"("A", "B");

-- CreateIndex
CREATE INDEX "_CommandWordToSLO_B_index" ON "_CommandWordToSLO"("B");

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusVersion" ADD CONSTRAINT "SyllabusVersion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtopic" ADD CONSTRAINT "Subtopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLO" ADD CONSTRAINT "SLO_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLOMapping" ADD CONSTRAINT "SLOMapping_sourceSloId_fkey" FOREIGN KEY ("sourceSloId") REFERENCES "SLO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLOMapping" ADD CONSTRAINT "SLOMapping_targetSloId_fkey" FOREIGN KEY ("targetSloId") REFERENCES "SLO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_sloId_fkey" FOREIGN KEY ("sloId") REFERENCES "SLO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExaminationSpecification" ADD CONSTRAINT "ExaminationSpecification_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookEdition" ADD CONSTRAINT "BookEdition_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContent" ADD CONSTRAINT "BookContent_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentTopic" ADD CONSTRAINT "BookContentTopic_bookContentId_fkey" FOREIGN KEY ("bookContentId") REFERENCES "BookContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentTopic" ADD CONSTRAINT "BookContentTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentSubtopic" ADD CONSTRAINT "BookContentSubtopic_bookContentId_fkey" FOREIGN KEY ("bookContentId") REFERENCES "BookContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentSubtopic" ADD CONSTRAINT "BookContentSubtopic_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentSLO" ADD CONSTRAINT "BookContentSLO_bookContentId_fkey" FOREIGN KEY ("bookContentId") REFERENCES "BookContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentSLO" ADD CONSTRAINT "BookContentSLO_sloId_fkey" FOREIGN KEY ("sloId") REFERENCES "SLO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentConcept" ADD CONSTRAINT "BookContentConcept_bookContentId_fkey" FOREIGN KEY ("bookContentId") REFERENCES "BookContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentConcept" ADD CONSTRAINT "BookContentConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentCognitiveLevel" ADD CONSTRAINT "BookContentCognitiveLevel_bookContentId_fkey" FOREIGN KEY ("bookContentId") REFERENCES "BookContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContentCognitiveLevel" ADD CONSTRAINT "BookContentCognitiveLevel_cognitiveLevelId_fkey" FOREIGN KEY ("cognitiveLevelId") REFERENCES "CognitiveLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extraction" ADD CONSTRAINT "Extraction_bookPageId_fkey" FOREIGN KEY ("bookPageId") REFERENCES "BookPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaper" ADD CONSTRAINT "PastPaper_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaper" ADD CONSTRAINT "PastPaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestion" ADD CONSTRAINT "PastPaperQuestion_pastPaperId_fkey" FOREIGN KEY ("pastPaperId") REFERENCES "PastPaper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestion" ADD CONSTRAINT "PastPaperQuestion_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionPart" ADD CONSTRAINT "PastPaperQuestionPart_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionTopic" ADD CONSTRAINT "PastPaperQuestionTopic_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionTopic" ADD CONSTRAINT "PastPaperQuestionTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionSubtopic" ADD CONSTRAINT "PastPaperQuestionSubtopic_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionSubtopic" ADD CONSTRAINT "PastPaperQuestionSubtopic_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionSLO" ADD CONSTRAINT "PastPaperQuestionSLO_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionSLO" ADD CONSTRAINT "PastPaperQuestionSLO_sloId_fkey" FOREIGN KEY ("sloId") REFERENCES "SLO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionConcept" ADD CONSTRAINT "PastPaperQuestionConcept_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionConcept" ADD CONSTRAINT "PastPaperQuestionConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionCommandWord" ADD CONSTRAINT "PastPaperQuestionCommandWord_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionCommandWord" ADD CONSTRAINT "PastPaperQuestionCommandWord_commandWordId_fkey" FOREIGN KEY ("commandWordId") REFERENCES "CommandWord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionCognitiveLevel" ADD CONSTRAINT "PastPaperQuestionCognitiveLevel_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionCognitiveLevel" ADD CONSTRAINT "PastPaperQuestionCognitiveLevel_cognitiveLevelId_fkey" FOREIGN KEY ("cognitiveLevelId") REFERENCES "CognitiveLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestionMedia" ADD CONSTRAINT "PastPaperQuestionMedia_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionExplanation" ADD CONSTRAINT "QuestionExplanation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSolution" ADD CONSTRAINT "QuestionSolution_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionMedia" ADD CONSTRAINT "QuestionMedia_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTag" ADD CONSTRAINT "QuestionTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSource" ADD CONSTRAINT "QuestionSource_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPastPaperReference" ADD CONSTRAINT "QuestionPastPaperReference_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPastPaperReference" ADD CONSTRAINT "QuestionPastPaperReference_pastPaperQuestionId_fkey" FOREIGN KEY ("pastPaperQuestionId") REFERENCES "PastPaperQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingest_document_pages" ADD CONSTRAINT "ingest_document_pages_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ingest_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingest_page_diagrams" ADD CONSTRAINT "ingest_page_diagrams_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "ingest_document_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingest_page_equations" ADD CONSTRAINT "ingest_page_equations_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "ingest_document_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingest_page_questions" ADD CONSTRAINT "ingest_page_questions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "ingest_document_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingest_page_regions" ADD CONSTRAINT "ingest_page_regions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "ingest_document_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingest_page_tables" ADD CONSTRAINT "ingest_page_tables_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "ingest_document_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMembership" ADD CONSTRAINT "ClassroomMembership_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMembership" ADD CONSTRAINT "ClassroomMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSetting" ADD CONSTRAINT "QuizSetting_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAssignment" ADD CONSTRAINT "QuizAssignment_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAssignment" ADD CONSTRAINT "QuizAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerGrade" ADD CONSTRAINT "AnswerGrade_quizAnswerId_fkey" FOREIGN KEY ("quizAnswerId") REFERENCES "QuizAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerGrade" ADD CONSTRAINT "AnswerGrade_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommandWordToSLO" ADD CONSTRAINT "_CommandWordToSLO_A_fkey" FOREIGN KEY ("A") REFERENCES "CommandWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommandWordToSLO" ADD CONSTRAINT "_CommandWordToSLO_B_fkey" FOREIGN KEY ("B") REFERENCES "SLO"("id") ON DELETE CASCADE ON UPDATE CASCADE;
