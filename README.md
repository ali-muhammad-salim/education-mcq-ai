# Board-Neutral Educational AI MCQ Platform (Content Engine v1.0)

[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal%20%2F%20Clean-blue.svg)](docs/ARCHITECTURE.md)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-teal.svg)](docs/ARCHITECTURE.md#2-core-domain-data-model-postgresql--pgvector)
[![AI Runtimes](https://img.shields.io/badge/AI%20Inference-Local%20(Ollama%20Qwen)%20%2F%20Cloud%20Agnostic-orange.svg)](docs/ARCHITECTURE.md#9-ai-provider-abstraction-layer-hexagonal-interfaces)
[![Hardware](https://img.shields.io/badge/Workstation-RTX%204000%20Max--Q%20(8GB)-green.svg)](docs/ENVIRONMENT.md)

---

## 1. Project Overview

The **Board-Neutral Educational AI MCQ Platform** is an enterprise-grade AI system engineered to ingest multiple educational curricula, process textbooks and historical past examination papers, construct concept dependency graphs, generate mathematically rigorous multiple-choice questions (MCQs), and execute multi-stage validation.

### What Version 1.0 Builds
Version 1.0 focuses **exclusively on the AI Content Engine and Database**.
- Multi-board and curriculum ontology management (FBISE, Cambridge CAIE, Punjab Board, CBSE, etc.).
- Document parsing for clean digital PDFs and scanned past papers (OCR + Layout Analysis + LaTeX extraction).
- Historical past-paper question cataloging with exact citations (Year, Session, Paper Code, Question Number).
- Dual-provenance question generation (linking each MCQ to textbook evidence and historical past-paper precedents).
- Five-stage automated validation pipeline (Syntax, Blind Solver, Distractor Quality, Grounding, and Syllabus Alignment).
- Evidence-based Study Priority Analytics (Historical Frequency Index without misleading guarantees).

### What Version 1.0 Does NOT Build (Deferred to Future Versions)
- Student web portal & mobile apps
- Teacher / administrative management dashboards
- Authentication & RBAC systems
- Study notes & summary generator
- Adaptive student recommendation engine
- Public blogs & SEO pages
- Payment & e-commerce systems

---

## 2. Fundamental Architectural Principle

> **Board Knowledge must never be embedded permanently into AI model weights.**  
> The system operates on an explicit separation between intelligence and domain knowledge:  
> `BOARD DATA + CURRICULUM DATA + TEXTBOOK DATA + PAST PAPER DATA + RETRIEVAL + LLM + VALIDATION`

The engine does not rely on a monolithic LLM that "knows" physics or biology for a specific board. Instead, every board's curriculum, syllabus learning outcomes, textbook paragraphs, and past paper histories reside in an auditable relational and vector knowledge graph. The AI acts purely as an analytical and generative agent grounded strictly by retrieved facts.

---

## 3. Workstation Environment Summary

A detailed diagnostic audit of the development workstation has been recorded in [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md):

- **OS:** Windows 11 Pro 64-bit (Build `26100`)
- **CPU:** Intel Core i7-10850H (6 Cores / 12 Logical Processors @ 2.70 GHz)
- **RAM:** 32 GB DDR4 (~20.3 GB Free)
- **GPU:** NVIDIA Quadro RTX 4000 with Max-Q Design (8 GB GDDR6 VRAM, Turing TU104)
- **NVIDIA Driver:** 597.06 (CUDA 13.2 Driver API support)
- **Inference Runtime:** Ollama v0.34.1 installed
- **Node.js & npm:** Node.js v24.21.0 / npm 11.19.0
- **Python:** Python 3.14.7 installed *(Note: Requires Python 3.11/3.12 virtual environment for PyTorch/PaddleOCR compatibility)*
- **Database & Queue Services:** PostgreSQL 16 (`pgvector`) and Redis to be provisioned in Phase 2.

### Local AI Model Feasibility
Due to the 8 GB VRAM budget, models run in an **asynchronous sequential pipeline**:
- **Primary Generator:** `Qwen 8B` quantized (`Q4_K_M`, ~4.9 GB VRAM footprint).
- **Secondary Solver / Validator:** `Qwen 3B / 4B` (`Q4_K_M`, ~2.2 GB VRAM footprint).
- **Visual Fallback:** `Qwen2.5-VL-3B` (~3.2 GB VRAM footprint).
- **Layout & OCR:** `PaddleOCR` + `PP-StructureV3` (Run on GPU or offloaded to 12-thread Intel i7 CPU).

---

## 4. Documentation Index

The system's complete architectural and design blueprints are documented in the [`docs/`](docs/) directory:

| Document | Description |
| :--- | :--- |
| **[`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)** | Complete hardware audit, VRAM budget allocation, installed runtimes, and environment remediation steps. |
| **[`docs/PROJECT_SCOPE.md`](docs/PROJECT_SCOPE.md)** | Comprehensive scope definition, in-scope vs out-of-scope boundaries, the 16 core pillars, and ethical guardrails. |
| **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** | Full technical architecture: PostgreSQL + pgvector DDL schema, hybrid RAG engine, 5-stage validation gauntlet, provenance graph, and AI provider interfaces. |
| **[`docs/DECISIONS.md`](docs/DECISIONS.md)** | 10 Architectural Decision Records (ADRs) detailing core technical choices and trade-off rationales. |

---

## 5. Development Roadmap & Implementation Phases

```
+---------------------------------------------------------------------------------------+
| PHASE 1: Discovery & Architecture (COMPLETED)                                         |
| - Audit hardware, drivers, and runtime availability                                   |
| - Formulate Project Scope, Architecture Specs, and ADRs                               |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| PHASE 2: Environment Provisioning & Database Foundation (NEXT)                        |
| - Provision Python 3.11/3.12 isolated virtual environment                             |
| - Provision PostgreSQL 16 with pgvector and Redis                                     |
| - Apply relational DDL migrations (Ontology, Documents, Chunks, Past Papers, MCQs)    |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| PHASE 3: Ingestion Engine & Document Processing                                       |
| - Implement Document Ingestion Workers (PyMuPDF, PaddleOCR, PP-StructureV3)           |
| - Mathematical formula extraction ($...$ LaTeX) & Layout Segmentation                 |
| - Semantic hierarchical chunking and dense vector embedding generation                |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| PHASE 4: Past Paper Catalog & Concept Graph Mapping                                  |
| - Catalog past-paper questions with exact Year, Session, Paper, Q# metadata           |
| - Build concept hierarchy and prerequisite relationship graph                         |
| - Ingest Student Learning Outcomes (SLOs) and cognitive domains                       |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| PHASE 5: MCQ Generation & 5-Stage Validation Gauntlet                                 |
| - Implement Hybrid Retrieval (Vector HNSW + Sparse tsvector + Graph filter)           |
| - Implement MCQ Generator with Misconception-Driven Distractors                       |
| - Implement The Gatekeeper (Syntax, Blind Solver, Distractor Audit, Grounding Check)   |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| PHASE 6: Provenance Linking & Study Priority Analytics                                |
| - Establish immutable foreign key linkages (Textbook Chunk + Past Paper Precedent)    |
| - Implement Historical Frequency & Coverage Index (HFCI)                              |
| - Enforce ethical "Zero Exam Guarantee" disclaimers and reporting APIs                |
+---------------------------------------------------------------------------------------+
```

---

## 6. Execution Instructions

In accordance with architectural guidelines, **no large model weights have been downloaded and no application code has been written yet**.

To proceed to Phase 2 (Environment Provisioning & Database Implementation), review and approve the architectural documentation:
1. Review [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)
2. Review [`docs/PROJECT_SCOPE.md`](docs/PROJECT_SCOPE.md)
3. Review [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
4. Review [`docs/DECISIONS.md`](docs/DECISIONS.md)
