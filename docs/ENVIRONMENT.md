# Environment Audit & Hardware Feasibility Report

**Date of Audit:** September 18, 2026  
**System:** Local Workstation  
**Auditor:** Lead Software Architect & AI Engineer  

---

## 1. Executive Summary

A comprehensive diagnostic audit of the local development workstation was conducted to evaluate hardware capability, installed toolchains, and runtime services for the **Board-Neutral AI-Powered MCQ Content Engine**.

The host machine is equipped with an **Intel Core i7-10850H (6 cores / 12 threads)**, **32 GB DDR4 RAM**, and an **NVIDIA Quadro RTX 4000 with Max-Q Design (8 GB GDDR6 VRAM)**. This provides an excellent foundation for quantized local LLM inference, embedding generation, and high-throughput document processing. However, significant software environment configurations and runtime installations are required before pipeline execution can begin (specifically: creating an isolated Python 3.11/3.12 virtual environment, installing PostgreSQL with `pgvector`, and installing Redis).

---

## 2. Hardware Specifications

| Component | Specification | Details / Capabilities |
| :--- | :--- | :--- |
| **Operating System** | Microsoft Windows 11 Pro 64-bit | Build `10.0.26100` (Version 24H2 / 2026 release) |
| **CPU** | Intel(R) Core(TM) i7-10850H CPU @ 2.70GHz | 6 Physical Cores, 12 Logical Processors (Comet Lake architecture), up to 5.10 GHz boost |
| **System RAM** | 32 GB DDR4 | Visible: `33,321,320 KB` (~31.78 GiB). Available free physical RAM: `~20.3 GiB` |
| **Primary GPU (Discrete)**| NVIDIA Quadro RTX 4000 with Max-Q Design | TU104GL core (Turing architecture, Compute Capability 7.5), 2304 CUDA cores, 288 Tensor cores, 35W-50W TGP |
| **GPU VRAM** | 8192 MiB (8.0 GB GDDR6) | Bandwidth: 256-bit bus (~256–384 GB/s) |
| **Secondary GPU (Integrated)**| Intel(R) UHD Graphics | Shared memory controller for display offload |
| **NVIDIA Driver** | Version `597.06` | Driver Model: WDDM, Driver Version: `32.0.15.9706` |
| **Storage (System & Data)**| High-Speed SSD (C:\ drive) | Total: `476 GB`, Used: `140.2 GB`, **Free Space: 335.8 GB** |

---

## 3. Software Toolchain & Runtime Audit

| Tool / Service | Detected Status | Version / Path | Architectural Assessment |
| :--- | :--- | :--- | :--- |
| **NVIDIA Driver** | **Installed** | `597.06` | Supports CUDA runtime APIs up to **CUDA 13.2**. |
| **CUDA Toolkit (`nvcc`)** | **Not in PATH** | N/A | Host CUDA compiler not on PATH. Pre-built PyTorch/Ollama wheels bundle their own CUDA runtimes, so host `nvcc` is not strictly required for inference. |
| **Python** | **Installed** | `Python 3.14.7` (`C:\Python314\python.exe`) | **CRITICAL ACTION NEEDED:** Python 3.14 is bleeding-edge. Machine learning wheels (PyTorch, PaddleOCR, onnxruntime, tokenizers) do not currently provide stable binary wheels for Windows on 3.14. An isolated Python 3.11 or 3.12 environment must be configured. |
| **pip** | **Installed** | `26.2.1` | Up to date. |
| **Node.js** | **Installed** | `v24.21.0` (`C:\Program Files\nodejs\node.exe`) | Modern LTS/Current release. Ready for BullMQ / TypeScript tooling. |
| **npm** | **Installed** | `11.19.0` (`C:\Program Files\nodejs\npm.cmd`) | Functional. |
| **Git** | **Installed** | `2.55.0.windows.5` | Operational for version control and submodule tracking. |
| **Ollama** | **Installed** | `0.34.1` | Operational local inference server with native GPU offloading. Model library currently empty (0 models downloaded). |
| **Docker & Compose** | **Not Installed** | Not in PATH | Docker Desktop / daemon not installed on Windows host. |
| **PostgreSQL** | **Not Installed** | Not in PATH | No `psql` binary or Windows service found. Needs setup with `pgvector`. |
| **Redis** | **Not Installed** | Not in PATH | No `redis-server` or Windows service found. Needs setup for task queues. |
| **WSL (Linux Subsystem)** | **Not Installed** | WSL2 not initialized | Can be enabled if native Linux containers/services are desired. |
| **Package Managers** | **Installed** | `winget` (v1.29.280), `choco` (2.7.4) | Available for rapid automated dependency provisioning. |

---

## 4. Hardware Feasibility & Local AI Workload Analysis

### 4.1. VRAM Budget Allocation (8 GB Quadro RTX 4000 Max-Q)

With 8 GB of GDDR6 VRAM, running multiple large models simultaneously will trigger Out-Of-Memory (OOM) errors. However, by adhering to **quantized weights** and a **pipelined/sequential execution model**, the workstation can execute the entire generation and validation lifecycle locally.

```
+-----------------------------------------------------------------------------------+
|                           8192 MiB TOTAL VRAM BUDGET                              |
+-----------------------------------------------------------------------------------+
| Scenario A: Generation Phase                                                      |
| [ OS/Display Overhead: ~600 MB ] [ Qwen 8B Q4_K_M: ~4,900 MB ] [ KV Cache: ~2.5 GB ]
+-----------------------------------------------------------------------------------+
| Scenario B: Visual / Diagram Extraction Phase                                     |
| [ OS/Display Overhead: ~600 MB ] [ Qwen2.5-VL-3B / 2B: ~3,200 MB ] [ Free: ~4.3 GB ]
+-----------------------------------------------------------------------------------+
| Scenario C: Ingestion & Document Embedding Phase                                  |
| [ OS/Display Overhead: ~600 MB ] [ PaddleOCR + BGE Embedder: ~1.8 GB ] [ Free: ~5.7 GB ]
+-----------------------------------------------------------------------------------+
```

#### Detailed Model Fit Analysis

| Target Component | Model / Tool | Precision / Quant | Memory Footprint | Feasibility on This Host |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Reasoning & MCQ Gen** | `Qwen 8B` (e.g. Qwen2.5-8B-Instruct) | 4-bit (`Q4_K_M` GGUF) | ~4.9 GB VRAM + ~1.5 GB KV cache (4k ctx) | **100% Feasible locally** via Ollama / llama.cpp GPU offload. |
| **Fast Fallback & Question Solver** | `Qwen 3B / 4B` | 4-bit (`Q4_K_M`) or 8-bit (`Q8_0`) | ~2.2 GB – 3.8 GB VRAM | **100% Feasible locally**. Ultra-fast generation (>45 tokens/s). |
| **Visual / Diagram Analyzer** | `Qwen2.5-VL-3B` / `Qwen-VL-2B` | 4-bit / 8-bit | ~2.5 GB – 3.5 GB VRAM | **100% Feasible locally** for chart/diagram OCR fallback. |
| **Document OCR & Layout** | `PaddleOCR` + `PP-StructureV3` | FP16 / INT8 | ~1.2 GB VRAM or CPU (6c/12t) | **100% Feasible**. Can run on GPU or offload to Intel i7 CPU. |
| **Vector Embeddings** | `bge-small-en-v1.5` or `bge-base` | FP32 / ONNX | ~300 MB – 800 MB | **100% Feasible** on CPU or GPU. |
| **Local Model Training** | `Qwen 4B` with QLoRA + Unsloth | 4-bit base + LoRA rank 16 | ~7.2 GB – 7.8 GB VRAM | **Marginal / Tight** (requires gradient checkpointing, batch size 1, offload optimizer states to 32GB system RAM). High-rank 8B fine-tuning will require cloud compute. |

### 4.2. Concurrency Constraint
- **Do not load Qwen 8B and Qwen-VL simultaneously into VRAM.**
- **Strategy:** Leverage Ollama's automatic model lifecycle manager with `keep_alive: 300s` or a sequential worker pipeline where documents are OCR'd and embedded first, followed by batched MCQ generation.

---

## 5. Environment Remediation Roadmap

To prepare the environment for Phase 2 (Database & Ingestion Engine), the following actions are planned:

1. **Python Virtual Environment (Python 3.11 / 3.12):**
   - Install Python 3.11 or 3.12 via `winget` or create a isolated environment using `uv` to ensure 100% binary wheel compatibility with PyTorch, CUDA 12.x/13.x wheels, PaddleOCR, and ONNX Runtime.
2. **PostgreSQL 16+ with `pgvector`:**
   - Install PostgreSQL 16 via installer/winget and build/install the `pgvector` extension for dense embedding storage, or configure a Docker container.
3. **Redis 7+:**
   - Install Redis for Windows (via native port or Docker/WSL) to power asynchronous document ingestion jobs and BullMQ task dispatching.
4. **Local Model Caching:**
   - Use the pre-installed Ollama runtime (`v0.34.1`) to pull the approved target weights (`qwen2.5:7b-instruct-q4_K_M` and `qwen2.5:3b`) once architectural sign-off is granted.
