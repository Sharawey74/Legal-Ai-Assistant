# ⚖️ LexIntelligence: Legal AI Assistant

<p align="center">
  <em>A high-concurrency, dual-model RAG (Retrieval-Augmented Generation) platform designed for intelligent legal document analysis, contract abstraction, and case research.</em>
</p>

---

## 📖 Project Overview

LexIntelligence bridges the gap between raw legal documents and actionable insights. By leveraging state-of-the-art vector embeddings and a dynamic dual-model LLM architecture, the platform allows legal professionals to upload vast amounts of legal PDFs and query them in real-time. 

### ✨ Core Objectives
- **Instant Contract Abstraction:** Extract clauses, liabilities, and compliance rules instantly.
- **Accurate Citations:** Every AI assertion is backed by a specific page-level citation `[Doc: filename, Page: N]`.
- **Dual-Model "Thinking" Mode:** Route simple tasks through a fast model (GPT-OSS) and complex logical deductions through a deeply analytical reasoning model (Zhipu GLM 4.5 Air) via a seamless UI toggle.
- **High Concurrency:** Built on FastAPI to handle simultaneous uploads, embedding generations, and Server-Sent Event (SSE) chat streams without blocking.

---

## 🛠 Technologies & Tools

### Backend Infrastructure
- **Framework:** `FastAPI` (Python)
- **AI/LLM Routing:** `LangChain`, `OpenRouter API`
- **Vector Database:** `ChromaDB` (Local Persistent Storage)
- **Relational Database:** `SQLite` with `SQLAlchemy` ORM (Session tracking)
- **Embeddings:** `BAAI/bge-base-en-v1.5`

### Frontend Architecture
- **Framework:** `React 18` (TypeScript)
- **Build Tool:** `Vite`
- **Styling:** `Tailwind CSS v4`
- **Markdown & Streaming:** `react-markdown` with custom regex chunking for real-time `<think>` block interception.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- An active [OpenRouter](https://openrouter.ai/) account.

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd Legal-Ai-Assistant
```

### 2. Environment Configuration
Navigate to the `backend` directory and create a `.env` file from the provided example:
```bash
cd backend
cp ../.env.example .env
```
Open the `.env` file and securely add your OpenRouter API keys. *Note: Sensitive files are explicitly ignored in `.gitignore` to prevent secret leaks.*

### 3. Backend Setup
Create a virtual environment and install dependencies:
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 4. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

---

## 💻 Usage Instructions

### Starting the Servers
For Windows users, we have provided a seamless startup script that launches both the backend API and frontend UI concurrently:
```powershell
.\start.ps1
```
Alternatively, you can run them manually:
- **Backend:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Frontend:** `cd frontend && npm run dev`

### Using the Application
1. **Upload Documents:** Navigate to the **Document Library** (sidebar) and upload your legal PDFs. The backend will parse, chunk, and embed the text into ChromaDB. Wait for the status to change from `Processing` to `Ready`.
2. **Start a Session:** Go to **Case Research**, select the documents you want to interrogate from the "Active Context" drawer, and type your question.
3. **Toggle Thinking Mode:** For deep reasoning (e.g., comparing contradictory clauses), click the **Brain Icon** next to the chat input to engage the GLM 4.5 Air reasoning model. The AI's logical process will stream live to your screen inside an indigo blockquote.
4. **Review Citations:** Click any citation badge (e.g., `[Doc: Contract.pdf, Page: 4]`) within the chat to instantly pull up the source excerpt in the right-hand panel.

---

## 🛡️ Security & Privacy
- **API Keys:** Never commit your `.env` file. The repository's `.gitignore` is pre-configured to block `.env`, `PDF/`, and `Prompts/` directories.
- **Local Vectors:** ChromaDB stores all document vectors locally inside `/chroma_store`. No sensitive legal document text is sent to third parties during the indexing phase.

---
*Built for speed, accuracy, and rigorous legal research.* ⚖️
