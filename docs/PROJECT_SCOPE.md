# Project Scope: AI-Powered MCQ Content Engine (Version 1.0)

**Project Codename:** Board-Neutral MCQ Content Engine & Knowledge Graph  
**Document Status:** Approved Architecture Target  
**Scope Boundary:** Core Engine & Knowledge Store (Backend/Data/AI Pipeline Only)  

---

## 1. System Vision & Core Objective

The **Board-Neutral MCQ Content Engine** is an enterprise-grade, curriculum-agnostic educational AI system engineered to ingest diverse educational curricula, ingest textbooks and historical past papers, extract and map concept dependencies, generate rigorously validated multiple-choice questions (MCQs), and maintain mathematical and source provenance across all data points.

### The Fundamental Architectural Axiom

> **Board Knowledge must never be embedded permanently into model weights.**  
> The system operates on an explicit separation between intelligence and domain knowledge:  
> `BOARD DATA + CURRICULUM DATA + TEXTBOOK DATA + PAST PAPER DATA + RETRIEVAL + LLM + MULTI-STAGE VALIDATION = VERIFIED EDUCATIONAL ASSETS`

The engine does not rely on a monolithic LLM that "knows" physics or biology for a specific examination board. Instead, every board's curriculum, syllabus learning outcomes, textbook paragraphs, diagrammatic figures, and past paper question histories are ingested into a structured, relational, and vector knowledge graph. The AI serves as an analytical, synthesis, and transformation agent governed strictly by retrieved ground truth.

---

## 2. In-Scope vs. Out-of-Scope (Version 1.0)

To guarantee software excellence, architectural integrity, and rapid delivery of core value, Version 1.0 is strictly constrained to the AI ingestion, generation, validation, and database subsystems.

```
+-----------------------------------------------------------------------------------------+
|                                    SYSTEM BOUNDARY                                      |
+-----------------------------------------------------------------------------------------+
| [IN-SCOPE (Version 1.0)]                                                                |
| - Multi-Board & Curriculum Hierarchy Management                                        |
| - Document Ingestion (PDF/Scanned Page Parser, OCR, Layout Segmentation)                |
| - Knowledge Graph & Concept Hierarchy Extraction (Chapters, Topics, SLOs)              |
| - Historical Past-Paper Question Ingestion & Exact Tagging (Year, Paper, Q#)            |
| - Cross-Analysis of Textbooks vs Historical Past Papers                                 |
| - MCQ Generation Engine (Textual, LaTeX/Math, Diagram/Visual, Assertion-Reasoning)      |
| - Multi-Stage Automated Validation Pipeline (Syntax, Single Key, Distractors, Grounding) |
| - Bidirectional Provenance Linking (MCQ -> Textbook Chunk + Past Paper History)        |
| - Evidence-Based Study Priority Analytics (Historical Frequency Index)                  |
| - Ethical Compliance Guardrails ("Zero Exam Guarantee" Enforcement)                    |
| - AI Provider Abstraction Layer (Local Quantized Models + Cloud LLMs)                   |
| - Relational + Vector Database Schema (PostgreSQL + pgvector)                           |
+-----------------------------------------------------------------------------------------+
| [OUT-OF-SCOPE (Deferred to Subsequent Versions)]                                        |
|  * Student Facing Web Portal / Mobile Apps                                              |
|  * Teacher / Administrative Interactive Web Dashboard                                   |
|  * Student & Teacher Authentication / RBAC / Sessions                                   |
|  * Revision Notes & Study Summary Generator                                             |
|  * Adaptive Student Recommendation Engine                                               |
|  * Public Blog, Marketing, or SEO Landing Pages                                         |
|  * Payment Gateways, Subscription Billing, or E-Commerce Checkout                       |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Core Functional Requirements (The 16 Pillars)

### Pillar 1: Multi-Board Entity Management
- The system must model educational boards as first-class, independent entities (e.g., Federal Board FBISE, Cambridge Assessment International Education CAIE, Punjab Curriculum and Textbook Board PCTB, CBSE, Edexcel).
- No board-specific assumptions, grading schemes, or exam structures may be hardcoded into application business logic.

### Pillar 2: Curriculum & Syllabus Ingestion
- Ingest and store formal curriculum frameworks, subject specifications, and Student Learning Outcomes (SLOs).
- Model cognitive domains (Knowledge / Recall, Understanding / Comprehension, Application & Problem Solving).

### Pillar 3: Multi-Book Cataloging
- Support multiple textbooks per subject, grade, and board (e.g., primary national textbook, approved supplementary publishers).
- Support edition tracking, publication dates, and author/publisher metadata.

### Pillar 4: Document Ingestion (Digital PDFs & Scanned Page Images)
- Extract text, mathematical equations, layout structures, and embedded visual figures from clean digital PDFs and scanned paper artifacts.
- High-fidelity optical character recognition (OCR) and layout segmentation for tables, formulas, and diagrams.

### Pillar 5: Historical Past-Paper Ingestion
- Ingest past examination papers across multiple years, exam sessions (e.g., Annual, Supplementary, May/June, Oct/Nov), and paper variants.
- Deconstruct examination papers into individual question units with corresponding sub-parts and marks allocations.

### Pillar 6: Textbook Material Deep Analysis
- Semantically segment textbook content into self-contained conceptual chunks.
- Extract domain terminology, formal definitions, governing equations, scientific laws, and illustrative examples.

### Pillar 7: Past Paper Deconstruction & Classification
- Categorize historical questions by:
  - Associated curriculum topic / Student Learning Outcome (SLO)
  - Question style (Direct recall, calculation, graph interpretation, conceptual differentiation)
  - Cognitive tier (Bloom's Taxonomy / Board Taxonomy)
  - Historical marks weighting

### Pillar 8: Concept Dependency & Relationship Graph
- Construct a directed concept graph capturing:
  - `Parent-Child` relationships (Subject -> Unit -> Chapter -> Topic -> Subtopic -> Micro-concept)
  - `Prerequisite` links (e.g., "Newton's Second Law" requires "Vector Resolution")
  - `Cross-Topic` associations (e.g., "Photosynthesis" links to "Light Electromagnetic Spectrum")

### Pillar 9: High-Quality MCQ Generation
- Generate pedagogically rigorous multiple-choice questions aligned with specific curriculum learning outcomes.
- Distractors must represent plausible student misconceptions, common algebraic errors, or related conceptual confusions—never arbitrary or absurd choices.

### Pillar 10: Diverse MCQ Formats
The engine must natively support:
1. **Single-Stem Standard Multiple Choice (4 Options):** 1 definitive key, 3 plausible distractors.
2. **Mathematical & Chemical Equation MCQs:** Full $\LaTeX$ formulation for stems and options.
3. **Visual / Graphical MCQs:** Questions referencing charts, circuit schematics, biological diagrams, or geometric figures.
4. **Assertion & Reason MCQs:** Evaluating validity of two interdependent propositions.
5. **Multiple True-False / Combination Statements:** (e.g., "Which of the statements I, II, and III are correct?").

### Pillar 11: Multi-Stage Automated Validation Pipeline
Every generated question must pass an automated validation gauntlet:
- **Format Verification:** Valid JSON schema, valid LaTeX strings, compliant option count.
- **Single-Key Verification:** Solved by a blinded secondary LLM solver to prove that exactly one option is indisputably correct.
- **Distractor Analysis:** Check for linguistic clues, option length uniformity, absence of negative stems ("None of the above" / "All of the above").
- **Factual & Source Grounding:** Verification that every claim in the stem and correct option is directly substantiated by retrieved source text.

### Pillar 12: Dual Provenance & Evidence Linking
Every validated MCQ must store immutable references to:
1. **Source Textbook Evidence:** Specific textbook ID, edition, chapter, section, page number, and exact text chunk / figure ID.
2. **Historical Past-Paper Precedents:** Link to past questions that tested the identical concept, testing style, or algebraic principle.

### Pillar 13: Exact Historical Citation
- The system must record the precise provenance of every past-paper reference:
  - Board Name (e.g., `FBISE`)
  - Exam Year (e.g., `2024`)
  - Session (e.g., `Annual-I` / `Summer`)
  - Paper Code / Subject Code (e.g., `PHY-01`)
  - Question Number and Sub-Part (e.g., `Section A, Q1(vii)`)

### Pillar 14: Cross-Comparative Textbook vs Past Paper Analysis
- Perform comparative gap analysis between newly introduced textbooks and historical past papers:
  - Identify newly introduced concepts that have never appeared in past papers.
  - Identify retired/removed concepts that frequently appeared in historical exams.
  - Detect shifts in emphasis or changes in terminology.

### Pillar 15: Evidence-Based Study Priority Analytics
- Calculate an algorithmic **Historical Frequency & Coverage Index (HFCI)**:
  - Identifies high-yield concepts based on mathematical recurrence in past papers, foundational prerequisite weight, and curriculum emphasis.
  - Surfaces candidate questions and high-priority study topics with empirical justification.

### Pillar 16: Ethical Safeguards & "Zero Exam Guarantee" Compliance
- **Strict Prohibition:** The system must NEVER state, imply, or suggest that any generated question or analyzed topic is "guaranteed," "leaked," or "certain" to appear on a future examination.
- **Standardized Nomenclature:** All analytical outputs must use neutral academic terminology:
  - Allowed: *"High Historical Frequency Topic"*, *"Core Syllabus Learning Outcome"*, *"Frequent Historical Precedent (Appeared in 4 of last 6 years)"*.
  - Disallowed: *"Guaranteed Question"*, *"Predicted Exam Leak"*, *"100% Sure Question"*.
- Every analytical report and candidate question export must append a persistent educational disclaimer.

---

## 4. User Persona & System Operator in Version 1.0

In Version 1.0, the primary users of the system are:
1. **Curriculum & Content Engineer (Human-in-the-Loop):** Runs ingestion pipelines, inspects extracted concept graphs, reviews flagged questions, and approves question banks.
2. **AI System / API Consumer:** Asynchronous workers, test runners, and scriptable CLI/REST interfaces that trigger generation batches and query analytical indexes.

---

## 5. Success Criteria for Version 1.0 Delivery

1. **Board Agnosticism:** Successfully ingest and model at least two distinct educational boards (e.g., a national board and an international board) without altering a single line of application source code.
2. **Zero Hallucination Generation:** 100% of generated and approved MCQs possess verifiable textbook chunk linkages.
3. **Exact Lineage Traceability:** Any generated question can be queried to display its source textbook page citation and matching past paper occurrences (Year + Question Number).
4. **Resilient Local Execution:** Capability to run complete OCR, embedding, generation, and validation pipelines within the local workstation's 8 GB VRAM budget.
5. **Provider Agnosticism:** Ability to switch between local Qwen inference and cloud APIs (OpenAI/Gemini/Anthropic) seamlessly via interface contracts.
