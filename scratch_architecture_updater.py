import re

with open('docs/ARCHITECTURE.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Replacements
content = content.replace('AI-Powered MCQ Content Engine (v1.0)', 'AI-Powered Educational Content Engine (v1.0)')
content = content.replace('DB_MCQs[("generated_mcqs & options")]', 'DB_Questions[("generated_questions, options & notes")]')
content = content.replace('DB_Provenance[("mcq_provenance & evidence_links")]', 'DB_Provenance[("question_provenance & evidence_links")]')

content = content.replace('ContextPacker --> Generator["MCQ Generator (Qwen 8B / Cloud LLM)"]', 'ContextPacker --> Generator["Content Generator (Notes, MCQs, Subjective)"]')
content = content.replace('Generator --> RawMCQ["Raw Structured MCQ (JSON + LaTeX)"]', 'Generator --> RawOutput["Raw Structured Content (JSON + LaTeX)"]')

content = content.replace('RawMCQ --> Val1["Stage 1: Syntax & LaTeX Validator"]', 'RawOutput --> Val1["Stage 1: Syntax & Format Validator"]')
content = content.replace('subgraph Generation_Validation["4. AI Generation & Multi-Stage Validation"]', 'subgraph Generation_Validation["4. AI Generation (Notes, MCQs, Subjective) & Multi-Stage Validation"]')

# ERD
erd_old = '''    TOPICS ||--o{ GENERATED_MCQS : targets
    LEARNING_OUTCOMES ||--o{ GENERATED_MCQS : aligns_with
    GENERATED_MCQS ||--o{ MCQ_OPTIONS : contains
    GENERATED_MCQS ||--o{ MCQ_VALIDATIONS : verified_by
    GENERATED_MCQS ||--o{ MCQ_TEXTBOOK_EVIDENCE : grounded_in
    GENERATED_MCQS ||--o{ MCQ_PAST_PAPER_LINKS : referenced_by

    DOCUMENT_CHUNKS ||--o{ MCQ_TEXTBOOK_EVIDENCE : cites
    PAST_PAPER_QUESTIONS ||--o{ MCQ_PAST_PAPER_LINKS : references'''

erd_new = '''    TOPICS ||--o{ GENERATED_QUESTIONS : targets
    TOPICS ||--o{ STUDY_NOTES : generates
    LEARNING_OUTCOMES ||--o{ GENERATED_QUESTIONS : aligns_with
    GENERATED_QUESTIONS ||--o{ QUESTION_OPTIONS : contains
    GENERATED_QUESTIONS ||--o{ QUESTION_VALIDATIONS : verified_by
    GENERATED_QUESTIONS ||--o{ QUESTION_TEXTBOOK_EVIDENCE : grounded_in
    GENERATED_QUESTIONS ||--o{ QUESTION_PAST_PAPER_LINKS : referenced_by

    DOCUMENT_CHUNKS ||--o{ QUESTION_TEXTBOOK_EVIDENCE : cites
    DOCUMENT_CHUNKS ||--o{ STUDY_NOTES : summarizes
    PAST_PAPER_QUESTIONS ||--o{ QUESTION_PAST_PAPER_LINKS : references'''

content = content.replace(erd_old, erd_new)

# Table Names
content = content.replace('4. **Question & Provenance Cluster:** Generated MCQs, Options, Validation Logs, Evidence Links, and Priority Metrics.', '4. **Question & Provenance Cluster:** Generated Questions (MCQs, Short/Long), Study Notes, Options, Validation Logs, Evidence Links, and Priority Metrics.')

ddl_old = '''#### D. Generated Questions & Provenance Graph
```sql
CREATE TABLE generated_mcqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    learning_outcome_id UUID NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
    
    question_type VARCHAR(50) NOT NULL,     -- 'STANDARD_4_OPT', 'ASSERTION_REASON', 'EQUATION_BASED', 'FIGURE_BASED'
    stem TEXT NOT NULL,                     -- Question prompt formatted in Markdown & LaTeX
    context_hint TEXT,
    difficulty_level VARCHAR(20) NOT NULL,  -- 'EASY', 'MEDIUM', 'HARD'
    cognitive_level VARCHAR(50) NOT NULL,   -- 'Knowledge', 'Understanding', 'Application'
    
    diagram_asset_path TEXT,
    is_equation_heavy BOOLEAN DEFAULT FALSE,
    
    validation_status VARCHAR(50) DEFAULT 'PENDING_VALIDATION', -- 'APPROVED', 'REJECTED', 'QUARANTINE'
    quality_score NUMERIC(3,2),             -- Score 0.00 to 1.00 assigned by validation gauntlet
    rejection_reason TEXT,
    
    generated_by_model VARCHAR(100) NOT NULL,
    generation_prompt_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options for each MCQ
CREATE TABLE mcq_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcq_id UUID NOT NULL REFERENCES generated_mcqs(id) ON DELETE CASCADE,
    option_label CHAR(1) NOT NULL,          -- 'A', 'B', 'C', 'D'
    option_text TEXT NOT NULL,              -- Markdown / LaTeX content
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    explanation TEXT NOT NULL,              -- Pedagogical reason why this option is correct/incorrect
    misconception_tag VARCHAR(255),         -- Description of the underlying cognitive trap
    UNIQUE(mcq_id, option_label)
);

-- Automated Validation Audit Trail
CREATE TABLE mcq_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcq_id UUID NOT NULL REFERENCES generated_mcqs(id) ON DELETE CASCADE,
    validator_stage VARCHAR(100) NOT NULL,  -- 'SYNTAX_CHECK', 'BLIND_SOLVER', 'DISTRACTOR_AUDIT', 'GROUNDING_CHECK'
    validator_model VARCHAR(100) NOT NULL,
    passed BOOLEAN NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance Link 1: Source Textbook Evidence
CREATE TABLE mcq_textbook_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcq_id UUID NOT NULL REFERENCES generated_mcqs(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE RESTRICT,
    relevance_score NUMERIC(4,3) NOT NULL,
    verbatim_quote TEXT NOT NULL,           -- Exact sentence/formula justifying the correct answer
    page_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance Link 2: Historical Past-Paper Precedents
CREATE TABLE mcq_past_paper_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcq_id UUID NOT NULL REFERENCES generated_mcqs(id) ON DELETE CASCADE,
    past_paper_question_id UUID NOT NULL REFERENCES past_paper_questions(id) ON DELETE CASCADE,
    similarity_score NUMERIC(4,3) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL, -- 'IDENTICAL_CONCEPT', 'NUMERICAL_VARIANT', 'PARAPHRASED_STEM'
    created_at TIMESTAMPTZ DEFAULT NOW()
);'''

ddl_new = '''#### D. Generated Content (Notes & Questions) & Provenance Graph
```sql
CREATE TABLE study_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,                  -- Markdown formatted summary preserving LaTeX and layouts
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generated_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    learning_outcome_id UUID NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
    
    question_type VARCHAR(50) NOT NULL,     -- 'MCQ', 'SHORT_DESCRIPTIVE', 'NUMERICAL', 'LONG_DESCRIPTIVE'
    stem TEXT NOT NULL,                     -- Question prompt formatted in Markdown & LaTeX
    context_hint TEXT,
    difficulty_level VARCHAR(20) NOT NULL,  -- 'EASY', 'MEDIUM', 'HARD'
    cognitive_level VARCHAR(50) NOT NULL,   -- 'Knowledge', 'Understanding', 'Application'
    
    diagram_asset_path TEXT,
    is_equation_heavy BOOLEAN DEFAULT FALSE,
    
    validation_status VARCHAR(50) DEFAULT 'PENDING_VALIDATION', -- 'APPROVED', 'REJECTED', 'QUARANTINE'
    quality_score NUMERIC(3,2),             -- Score 0.00 to 1.00 assigned by validation gauntlet
    rejection_reason TEXT,
    
    generated_by_model VARCHAR(100) NOT NULL,
    generation_prompt_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options (Required for MCQs)
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
    option_label CHAR(1) NOT NULL,          -- 'A', 'B', 'C', 'D'
    option_text TEXT NOT NULL,              -- Markdown / LaTeX content
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    explanation TEXT NOT NULL,              -- Pedagogical reason why this option is correct/incorrect
    misconception_tag VARCHAR(255),         -- Description of the underlying cognitive trap
    UNIQUE(question_id, option_label)
);

-- Automated Validation Audit Trail
CREATE TABLE question_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
    validator_stage VARCHAR(100) NOT NULL,  -- 'SYNTAX_CHECK', 'BLIND_SOLVER', 'QUALITY_AUDIT', 'GROUNDING_CHECK'
    validator_model VARCHAR(100) NOT NULL,
    passed BOOLEAN NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance Link 1: Source Textbook Evidence
CREATE TABLE question_textbook_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE RESTRICT,
    relevance_score NUMERIC(4,3) NOT NULL,
    verbatim_quote TEXT NOT NULL,           -- Exact sentence/formula justifying the correct answer/note
    page_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance Link 2: Historical Past-Paper Precedents
CREATE TABLE question_past_paper_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
    past_paper_question_id UUID NOT NULL REFERENCES past_paper_questions(id) ON DELETE CASCADE,
    similarity_score NUMERIC(4,3) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL, -- 'IDENTICAL_CONCEPT', 'NUMERICAL_VARIANT', 'PARAPHRASED_STEM'
    created_at TIMESTAMPTZ DEFAULT NOW()
);'''

content = content.replace(ddl_old, ddl_new)

with open('docs/ARCHITECTURE.md', 'w', encoding='utf-8') as f:
    f.write(content)

print('Update successful.')
