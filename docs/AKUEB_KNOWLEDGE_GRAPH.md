# AKU-EB Curriculum Knowledge Graph

## Overview

The AKU-EB Curriculum Knowledge Graph serves as the foundational educational alignment layer for the MCQs platform. It is a logical overlay on top of the relational `Prisma` database and the in-memory `CurriculumStore`. It maps all educational resources (syllabi, resource guides, model papers, past papers, answer keys, e-marking notes, concept maps, pacing guides) into a strict, unified academic hierarchy.

## Academic Hierarchy

The graph follows a strict ontological hierarchy:

1. **Board**: AKU-EB
2. **Programme**: SSC / HSSC
3. **Class**: IX, X, XI, XII
4. **Subject**: Physics, Mathematics, English, etc.
5. **Syllabus Version**: e.g., 2022-2025, 2017-2021. **Note:** Different syllabus versions are strictly isolated.
6. **Topic / Chapter**: The primary structural unit within a syllabus.
7. **Subtopic**: Finer granularity within a topic.
8. **SLO (Student Learning Outcome)**: **The primary educational alignment layer.**
9. **Concept**: The underlying academic idea.
10. **Skill**: The specific capability being assessed.
11. **Command Word**: The verb used in the SLO/Question (e.g., Define, Explain, Calculate).
12. **Cognitive Level**: Knowledge (K), Understanding (U), Application (A).
13. **Examination Specification**: Weighting and marks distribution as per the board's assessment scheme.

## Source Priorities & Evidence Provenance

The system enforces strict evidence provenance via a `SourcePriority` scale (1 to 5):
*   **Priority 1 (Verified Curriculum)**: Official syllabus documents.
*   **Priority 2 (Verified Past Papers)**: Official past exams and answer keys.
*   **Priority 3 (Verified Textbooks)**: Approved board textbooks.
*   **Priority 4 (Human Expert Approved)**: Mappings created or verified by a domain expert.
*   **Priority 5 (AI Generated)**: High-confidence inferences made by AI.

**CRITICAL RULE:** AI-generated content (Priority 5) can *never* reach Priority 1-4 without explicit human verification. Mappings must never be silently overwritten. Low-confidence mappings are placed into a Human Review Queue.

## Mapping Strategies

### 1. Deterministic Mapping
Whenever explicit metadata exists (e.g., a past paper explicitly tagging "Question 4" with "SLO 3.1.2" and "Cognitive Level U" via an E-marking note or Answer Key), the mapping is strictly deterministic and assigned Priority 2.

### 2. AI-Assisted Classification
For unstructured sources (e.g., textbook paragraphs or older past papers without explicit keys), the AI pipeline attempts classification.
*   **PastPaperQuestion → SLO / Topic / Subtopic / Concept / CognitiveLevel / CommandWord**
*   **BookContent → SLO / Topic / Concept**

If the AI confidence score is below the threshold, the mapping is queued for manual review.

## Syllabus Versioning Rules

*   Syllabus versions are stored separately.
*   We **do NOT** merge different syllabus versions into one record.
*   If an old past paper belongs to an older syllabus version, that relationship is preserved explicitly via the `BoardVersion` and `CurriculumVersionId` relations.
*   When generating questions or analyzing trends, the system warns via `CurriculumVersionNote` if evidence spans incompatible versions.

## Output format
The raw topological data representing this graph is exported to `data/akueb_curriculum_map.jsonl` for downstream ingestion and analysis.
