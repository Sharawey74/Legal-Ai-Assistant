<div align="center">

# ⚖️ LexIntelligence: Legal AI Assistant

**Dual-Model RAG Platform for Intelligent Legal Document Analysis**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=flat-square&logo=databricks&logoColor=white)](https://www.trychroma.com/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain&logoColor=white)](https://langchain.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE)
</div>

## 🧭 Overview
 
LexIntelligence is an enterprise-grade legal research assistant that combines **Retrieval-Augmented Generation (RAG)** with a **dual-model LLM architecture** to turn static legal documents into an interactive, queryable knowledge base.
 
Upload a contract or statute — the system parses, chunks, and semantically indexes it. When you ask a question, the platform retrieves the most relevant passages via vector similarity search and feeds them to a language model, which generates a grounded, cited answer. No hallucinations. No guesswork. Every claim is traceable to a specific document and page.
 
---
 
## 🔬 How RAG Works Here
 
> **RAG (Retrieval-Augmented Generation)** prevents AI hallucination by grounding every response in your actual documents rather than the model's training memory.
 
```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              INDEXING PIPELINE                              │
└──────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────┐
        │   PDF Files  │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ Text Extract │
        │   (PyPDF)    │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   Chunking   │
        │ Sliding Win. │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ Embeddings   │
        │ BGE / HF     │
        └──────┬───────┘
               │
               ▼
┌───────────────────────────────────────┐
│         ChromaDB Vector Store         │
│     Local Persistent Semantic DB      │
└───────────────────────────────────────┘



┌──────────────────────────────────────────────────────────────────────────────┐
│                               QUERY PIPELINE                                │
└──────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────┐
        │ User Query   │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ Query Embed  │
        │ Vectorization│
        └──────┬───────┘
               │
               ▼
        ┌──────────────────────────────┐
        │ Vector Similarity Retrieval  │
        │        Top-K Search          │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Relevant Context Chunks      │
        │ + Metadata (Page / Source)   │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Prompt Construction          │
        │ Context + User Question      │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ LLM Inference                │
        │ OpenRouter / Local Model     │
        └──────────────┬───────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FINAL CITED RESPONSE                              │
│                                                                              │
│  Answer + Citations                                                         │
│  [Source: contract.pdf | Page: 12 | Chunk: 4]                               │
└──────────────────────────────────────────────────────────────────────────────┘
```──────────────────────────────────────────────────────┘
```
 
**Why this matters for legal work:** The model never invents case law or fabricates clauses. Every assertion is retrieved from your uploaded corpus and referenced back to its origin.
 
---
 
## 🧠 Dual-Model Architecture
 
LexIntelligence routes queries intelligently between two LLMs based on task complexity:
 
| Mode | Model | Best For |
|---|---|---|
| ⚡ **Standard** | Fast OSS model via OpenRouter | Clause lookup, definitions, simple Q&A |
| 🧠 **Deep Reasoning** | Zhipu GLM 4.5 Air | Contradictory clause analysis, multi-doc comparison, legal risk assessment |
 
Toggle between modes via the **Brain Icon** in the chat input. In reasoning mode, the model's live chain-of-thought streams to the screen inside a collapsible indigo block — so you can follow the logic, not just the conclusion.
 
---
 
## ✨ Key Features
 
| Feature | Description |
|---|---|
| 📄 **Contract Abstraction** | Extract clauses, liabilities, and compliance rules from any uploaded legal document |
| 🔖 **Page-Level Citations** | Every AI assertion is traceable — `[Doc: filename, Page: N]` — click to view the source excerpt |
| 🧠 **Dual-Model Routing** | Manually switch between a fast model and a deep-reasoning model per query |
| ⚡ **High Concurrency** | FastAPI async architecture handles simultaneous uploads, embeddings, and SSE chat streams without blocking |
| 📁 **Multi-Document Context** | Select multiple documents per session; the RAG pipeline searches across all of them simultaneously |
| 🔒 **Local-First Privacy** | All vectors stored in `/chroma_store` on your machine — no document text sent to third parties during indexing |
| 🗂 **Session History** | Full audit trail of every research session with document context preserved |
 
---
 
## 🏗 Tech Stack
 
### ◈ Backend
 
| Technology | Role |
|---|---|
| ![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=flat-square&logo=python&logoColor=white) | Core runtime |
| ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | Async REST API + Server-Sent Events (SSE) for real-time response streaming |
| ![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain&logoColor=white) | RAG pipeline orchestration — document chunking, retrieval chain, prompt management |
| ![OpenRouter](https://img.shields.io/badge/OpenRouter-6366F1?style=flat-square&logo=openai&logoColor=white) | Unified API gateway routing queries to the correct LLM based on mode |
| ![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=flat-square&logo=databricks&logoColor=white) | Persistent local vector store — stores and queries document embeddings |
| ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white) | Session & document metadata persistence via SQLAlchemy ORM |
| ![HuggingFace](https://img.shields.io/badge/BAAI/bge--base--en--v1.5-FFD21E?style=flat-square&logo=huggingface&logoColor=black) | Sentence embedding model — converts text chunks and queries into semantic vectors |
 
### ◈ Frontend
 
| Technology | Role |
|---|---|
| ![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB) | Component-based UI framework |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) | End-to-end type safety across all API contracts and state |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) | Lightning-fast HMR build tooling |
| ![TailwindCSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | Utility-first styling with dark theme design system |
| ![react-markdown](https://img.shields.io/badge/react--markdown-083344?style=flat-square&logo=markdown&logoColor=white) | Parses and renders streamed AI responses with live `<think>` block interception via custom regex chunking |
 
---
 
## 🚀 Getting Started
 
### Prerequisites
 
- **Node.js** v18+
- **Python** 3.10+
- An active [OpenRouter](https://openrouter.ai/) API key
### 1 — Clone
 
```bash
git clone <your-repository-url>
cd Legal-Ai-Assistant
```
 
### 2 — Configure Environment
 
```bash
cd backend
cp ../.env.example .env
# Open .env and add your OpenRouter API key
```
 
### 3 — Backend
 
```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
 
### 4 — Frontend
 
```bash
cd frontend
npm install
```
 
---
 
## 💻 Running the App
 
**One command (Windows):**
```powershell
.\start.ps1
```
 
**Manual (any OS):**
```bash
# Terminal 1 — API server
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
 
# Terminal 2 — UI dev server
cd frontend && npm run dev
```
 
---
 
## 📋 Usage Workflow
 
```
Step 1 — Upload
  └─ Go to Document Library → drag & drop PDFs
  └─ Wait for status: Processing → ✅ Ready
  └─ Backend parses, chunks, embeds, and stores vectors in ChromaDB
 
Step 2 — Build Context
  └─ Open Case Research → select documents in the Active Context panel
  └─ The RAG pipeline will scope its search to your selected files only
 
Step 3 — Ask
  └─ Type your legal question in the chat input (Ctrl+Enter to send)
  └─ Receive a structured, cited response grounded in your documents
 
Step 4 — Deep Reasoning (optional)
  └─ Click the 🧠 Brain icon to switch to GLM 4.5 Air reasoning model
  └─ The model streams its chain-of-thought live before delivering the final answer
 
Step 5 — Audit
  └─ Review all past sessions under History with full document context preserved
```
 
---
 
## 🔐 Security
 
- **API keys** live in `.env` only — never committed (`.gitignore` pre-configured to block it)
- **PDF files** and the `Prompts/` directory are explicitly git-ignored to prevent corpus leaks
- **Vector data** is stored locally in `/chroma_store` — document text is never sent to third parties during the indexing phase
---
 
<div align="center">
*Built for speed, accuracy, and rigorous legal research.*
 
⚖️
 
</div>
