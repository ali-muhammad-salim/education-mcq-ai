# Architectural Decision Records (ADRs)

**Project:** Board-Neutral AI-Powered MCQ Content Engine (v1.0)  
**Status:** All ADRs Active & Approved  

---

## Index of Architectural Decisions

- [ADR-001: Decoupling Board Knowledge from AI Model Weights](#adr-001-decoupling-board-knowledge-from-ai-model-weights)
- [ADR-002: Dual-Tier Local LLM Inference Strategy (Qwen 8B + Qwen 3B/4B)](#adr-002-dual-tier-local-llm-inference-strategy-qwen-8b--qwen-3b4b)
- [ADR-003: Unified Database Architecture (PostgreSQL 16 with pgvector)](#adr-003-unified-database-architecture-postgresql-16-with-pgvector)
- [ADR-004: Python Virtual Runtime Strategy (Python 3.11/3.12 Isolation)](#adr-004-python-virtual-runtime-strategy-python-311312-isolation)
- [ADR-005: Hardware-Constrained Execution Pipeline (8 GB VRAM Pipelining)](#adr-005-hardware-constrained-execution-pipeline-8-gb-vram-pipelining)
- [ADR-006: Provider Abstraction Layer (Hexagonal AI Interfaces)](#adr-006-provider-abstraction-layer-hexagonal-ai-interfaces)
- [ADR-007: Ethical Formulation of Study Priority vs "Zero Exam Guarantee"](#adr-007-ethical-formulation-of-study-priority-vs-zero-exam-guarantee)
- [ADR-008: Immutable Dual Provenance Linking Schema](#adr-008-immutable-dual-provenance-linking-schema)
- [ADR-009: Hybrid Document Ingestion & Mathematical Formula Parsing](#adr-009-hybrid-document-ingestion--mathematical-formula-parsing)
- [ADR-010: Asynchronous Task Dispatching via Redis & BullMQ/Celery](#adr-010-asynchronous-task-dispatching-via-redis--bullmqcelery)

---

### ADR-001: Decoupling Board Knowledge from AI Model Weights

#### Context
Educational platforms often attempt to fine-tune a monolithic language model on past papers and textbooks for a specific board. This causes severe failure modes:
1. Catastrophic forgetting across different curricula (e.g., mixing up FBISE and Cambridge O-Level conventions).
2. Impossible auditing—when an answer is incorrect, it is impossible to determine whether the model hallucinated or recalled an outdated syllabus.
3. High financial and computational retraining costs whenever a textbook edition updates.

#### Decision
We strictly enforce the principle: **Board Knowledge lives in the Database and Retrieval Layer, NOT in Model Weights.**
```
BOARD DATA + CURRICULUM DATA + TEXTBOOK DATA + PAST PAPER DATA + RETRIEVAL + LLM + VALIDATION
```
The LLM functions strictly as a stateless reasoning and synthesis engine. All domain facts, definitions, and formulas are supplied at inference time via hybrid retrieval.

#### Consequences
- **Positive:** Adding a new educational board requires only data ingestion (curriculum + books + past papers) with zero model retraining.
- **Positive:** 100% auditability: every claim can be directly cross-checked against the retrieved text chunk.
- **Trade-off:** Requires robust document chunking, indexing, and context window management.

---

### ADR-002: Dual-Tier Local LLM Inference Strategy (Qwen 8B + Qwen 3B/4B)

#### Context
The system requires advanced reasoning for question generation (understanding scientific nuances and formulating plausible distractors) while simultaneously requiring fast, low-cost verification (blind solving, format checks).

#### Decision
Implement a dual-tier model hierarchy:
1. **Primary Synthesis & Reasoning Model:** `Qwen 8B` (specifically `Qwen2.5-8B-Instruct` quantized to 4-bit `Q4_K_M` via Ollama).
2. **Verification & Blind Solver Model:** `Qwen 3B / 4B` (e.g., `Qwen2.5-3B-Instruct` or `Qwen2.5-Coder-3B`).

#### Consequences
- **Positive:** High pedagogical quality from the 8B model for generation, while the 3B/4B model provides fast, unbiased secondary verification.
- **Positive:** Both models operate fully within the local hardware parameters (4.9 GB VRAM for 8B, 2.2 GB VRAM for 3B).
- **Trade-off:** Sequential execution required when running locally to avoid VRAM exhaustion.

---

### ADR-003: Unified Database Architecture (PostgreSQL 16 with pgvector)

#### Context
The system requires relational data structures (curriculum hierarchies, board foreign keys, question-option joins), full-text search (exact formula symbols, specialized terms), and high-dimensional vector search for semantic chunk retrieval.

#### Alternatives Considered
- Separate Vector DB (Pinecone / Qdrant / Milvus) + Relational DB (PostgreSQL).
- Unified PostgreSQL with `pgvector` and `pg_trgm`.

#### Decision
Adopt **PostgreSQL 16+ with the `pgvector` extension** as the single unified data store.

#### Consequences
- **Positive:** Single ACID-compliant transactional boundary across curriculum ontology, document chunks, vectors, generated MCQs, and provenance links.
- **Positive:** Enables powerful joined queries (e.g., vector similarity constrained by `board_id`, `grade_level`, and `chapter_id` in a single SQL query).
- **Positive:** Zero synchronization drift between external vector databases and internal relational entities.
- **Positive:** Eliminates multi-database operational complexity on the local workstation.

---

### ADR-004: Python Virtual Runtime Strategy (Python 3.11/3.12 Isolation)

#### Context
The host workstation has `Python 3.14.7` installed globally. Python 3.14 is an unstable pre-release; critical scientific packages including `torch` (PyTorch with CUDA), `paddlepaddle-gpu`, `onnxruntime`, and `pydantic-core` do not distribute pre-compiled binary wheels for Windows on 3.14.

#### Decision
Provision an isolated **Python 3.11 or 3.12 virtual runtime environment** (via `winget` or standalone installer) dedicated exclusively to the AI and worker services.

#### Consequences
- **Positive:** Complete stability and immediate compatibility with standard CUDA 12.x/13.x PyTorch and PaddleOCR wheels.
- **Positive:** Prevents pollution of the system Python environment.
- **Trade-off:** Requires explicit activation or environment path specification in worker start scripts.

---

### ADR-005: Hardware-Constrained Execution Pipeline (8 GB VRAM Pipelining)

#### Context
The NVIDIA Quadro RTX 4000 Max-Q possesses 8192 MiB of VRAM. Concurrently loading `Qwen 8B` (4.9 GB), `Qwen-VL` (3.2 GB), and `PaddleOCR` (1.2 GB) exceeds available VRAM and results in immediate CUDA OOM crashes.

#### Decision
Adopt an **asynchronous, sequential pipelined execution model**:
1. Ingestion Phase: Run OCR and embeddings sequentially (unload LLM).
2. Generation Phase: Load Qwen 8B, execute batch generation, cache results.
3. Validation Phase: Swap to Qwen 3B/4B for blind solving and validation.
4. Exploit Ollama's automatic model caching with a 5-minute idle timeout (`keep_alive: 300s`).

#### Consequences
- **Positive:** 100% reliable local execution on 8 GB VRAM with zero out-of-memory crashes.
- **Trade-off:** Pipeline stages run sequentially rather than in real-time parallel streams, which is acceptable for batch question generation.

---

### ADR-006: Provider Abstraction Layer (Hexagonal AI Interfaces)

#### Context
The system must not become locked into local models or any specific cloud vendor. Local inference is required now, but cloud models (e.g., GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) may be utilized for high-throughput batching or complex visual analysis later.

#### Decision
Define abstract interfaces (`LLMProvider`, `VisionProvider`, `OCRProvider`, `EmbeddingProvider`) in the core domain layer. Concrete implementations encapsulate vendor-specific SDKs and APIs. The active provider is determined strictly via configuration settings (`.env`).

#### Consequences
- **Positive:** Cloud or alternative local models can be integrated without modifying a single database entity, validation rule, or business service.
- **Positive:** Simplifies unit testing via mock providers.

---

### ADR-007: Ethical Formulation of Study Priority vs "Zero Exam Guarantee"

#### Context
Educational AI systems that predict exam questions frequently mislead students by claiming questions are "guaranteed" or "leaked". This is unethical and legally hazardous. However, students and curriculum designers legitimately require historical frequency analysis to prioritize study time.

#### Decision
1. Implement the **Historical Frequency & Coverage Index (HFCI)** based strictly on past empirical occurrence and curriculum learning outcome distributions.
2. Hardcode prompt and output sanitation filters that reject the terms `guaranteed`, `leaked`, `100% sure`, or `exam predictor`.
3. Require every report and candidate question export to display a standardized educational disclaimer.

#### Consequences
- **Positive:** Provides high-value, evidence-grounded study prioritization while maintaining strict pedagogical integrity and zero legal liability.

---

### ADR-008: Immutable Dual Provenance Linking Schema

#### Context
In high-stakes examinations, questions with disputed keys or unclear questions cause severe user distress. Every generated question must be defensible with rigorous citations.

#### Decision
Every approved MCQ must store immutable foreign-key relationships to:
1. `mcq_textbook_evidence`: Citing exact book ID, page number, chunk ID, and verbatim sentence.
2. `mcq_past_paper_links`: Citing exact board, year, exam session, paper code, question number, and sub-part.

#### Consequences
- **Positive:** Every question in the system can instantly produce an auditable evidence card showing where the concept is taught in the textbook and where it was historically tested.

---

### ADR-009: Hybrid Document Ingestion & Mathematical Formula Parsing

#### Context
Scientific textbooks and past papers contain dense mathematical notation ($\frac{a}{b}$, $\sqrt{x}$, $\int$, $\Sigma$), chemical formulas, and tables. Standard text extraction strips formulas or turns them into garbage characters.

#### Decision
Utilize a two-tier extraction pipeline:
- **PyMuPDF (`fitz`):** For fast digital text and font metadata extraction.
- **PaddleOCR + PP-StructureV3:** For layout segmentation, converting tables into structured Markdown and formulas into KaTeX/LaTeX compatible expressions.
- **Qwen2.5-VL-3B:** As a visual fallback when diagrams contain embedded qualitative information.

#### Consequences
- **Positive:** Preserves mathematical precision essential for Physics, Chemistry, and Mathematics MCQs.
- **Trade-off:** Ingestion requires higher compute time per page compared to plain text scrapers.

---

### ADR-010: Asynchronous Task Dispatching via Redis & BullMQ/Celery

#### Context
Extracting OCR from a 300-page textbook or generating 100 validated MCQs takes several minutes to hours. These workloads cannot run synchronously inside an HTTP request cycle.

#### Decision
Offload all ingestion, embedding, generation, and validation workloads to background queues backed by **Redis** and managed by **BullMQ / Python Celery workers**.

#### Consequences
- **Positive:** The web/API layer remains fast and responsive.
- **Positive:** Jobs can be paused, retried, prioritized, and monitored with detailed progress reporting.
