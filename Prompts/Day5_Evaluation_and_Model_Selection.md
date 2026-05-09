# DAY 5 PROMPT
## Phase 5 Evaluation (4 Metrics) + Phase 6 Model Selection (HELM · Artificial Analysis · LLM Arena)

---

### CONTEXT

The system is fully built. Today you evaluate it. There is no new feature development. Day 5 is entirely dedicated to measuring the 4 Phase 5 metrics across all 10 legal test cases, completing the Phase 6 model selection analysis, and producing a completed evaluation report. All 10 test cases come from the PDF at:
`C:\Users\DELL\Desktop\Legal-Ai-Assistant\PDF\Legal_AI_Assistant_Final_Project_ABS.pdf`

---

### TASK 1 — Upload the Test Document

Before running any evaluation, ensure the source PDF is uploaded and ready in the system:

1. Open the app at `http://localhost:5173`
2. Log in with your test account
3. Navigate to Documents → Upload `Legal_AI_Assistant_Final_Project_ABS.pdf`
4. Wait for status to change to **"ready"** (indicates all chunks embedded in ChromaDB)
5. Note the document's ID from the browser or API response — you will need it

---

### TASK 2 — Build the Evaluation Script

Create this file in the backend folder. Run it with the backend running.

**File: `backend\evaluate.py`**

```python
"""
Phase 5 Evaluation Script — Legal AI Assistant
Measures: Faithfulness, Task Success Rate, Latency, and Cost

Usage:
  1. Start the backend: uvicorn app.main:app --port 8000
  2. Register/login and get a JWT token
  3. Upload the test PDF and note the document_id
  4. Update TOKEN and DOCUMENT_ID below
  5. Run: python evaluate.py
"""

import time
import json
import requests

# ─── CONFIG — UPDATE THESE VALUES ───────────────────────────────────────────
BASE_URL    = "http://localhost:8000/api/v1"
TOKEN       = "PASTE_YOUR_JWT_TOKEN_HERE"
DOCUMENT_ID = "PASTE_YOUR_DOCUMENT_ID_HERE"
# ─────────────────────────────────────────────────────────────────────────────

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# 10 test cases from the capstone PDF — one query per legal scenario
TEST_CASES = [
    {
        "case": 1,
        "scenario": "Force Majeure — COVID-19 Supply Chain",
        "query": "Does COVID-19 qualify as force majeure under a supply contract clause listing natural disasters and governmental action?"
    },
    {
        "case": 2,
        "scenario": "Non-Compete Clause — California",
        "query": "Is a non-compete clause enforceable under California Business and Professions Code Section 16600 for tech employees?"
    },
    {
        "case": 3,
        "scenario": "GDPR Data Breach Liability",
        "query": "What are GDPR Article 32 security obligations for cloud data processors and liability under data processing agreements?"
    },
    {
        "case": 4,
        "scenario": "IP Ownership — Personal Time",
        "query": "Is an employee IP assignment clause enforceable for inventions developed on personal time under California Labor Code 2870?"
    },
    {
        "case": 5,
        "scenario": "Liquidated Damages vs Penalty",
        "query": "What is the enforceability test for a liquidated damages clause — genuine pre-estimate of loss versus unenforceable penalty?"
    },
    {
        "case": 6,
        "scenario": "SaaS Auto-Renewal Clause",
        "query": "Is an auto-renewal clause enforceable in SaaS enterprise contracts if it requires conspicuous notice under electronic signature?"
    },
    {
        "case": 7,
        "scenario": "Whistleblower Retaliation",
        "query": "Does Sarbanes-Oxley whistleblower protection apply to employees of private companies terminated after raising safety concerns?"
    },
    {
        "case": 8,
        "scenario": "Construction Scope Creep",
        "query": "What constitutes a valid change order under AIA construction contracts and can verbal instructions from an owner be binding?"
    },
    {
        "case": 9,
        "scenario": "Trade Secret Misappropriation",
        "query": "Does a customer list qualify as a trade secret under the Defend Trade Secrets Act when taken by a departing employee?"
    },
    {
        "case": 10,
        "scenario": "Arbitration Unconscionability",
        "query": "Is a mandatory arbitration clause with a class action waiver unconscionable when individual recovery is less than arbitration costs?"
    },
]


def create_session(document_id: str) -> str:
    r = requests.post(f"{BASE_URL}/chat/sessions",
                      json={"document_ids": [document_id], "title": "Evaluation"},
                      headers=HEADERS)
    r.raise_for_status()
    return r.json()["id"]


def run_query(session_id: str, query: str) -> dict:
    t0 = time.perf_counter()
    r = requests.post(
        f"{BASE_URL}/chat/sessions/{session_id}/messages",
        json={"content": query},
        headers=HEADERS,
    )
    latency_s = time.perf_counter() - t0
    r.raise_for_status()
    data = r.json()
    return {
        "answer":      data["content"],
        "citations":   data["citations"],
        "latency_s":   round(latency_s, 2),
    }


def main():
    print("=" * 70)
    print("  LEGAL AI ASSISTANT — PHASE 5 EVALUATION")
    print("=" * 70)
    print(f"  Base URL:    {BASE_URL}")
    print(f"  Document ID: {DOCUMENT_ID}")
    print(f"  Test Cases:  {len(TEST_CASES)}")
    print("=" * 70)

    results = []

    for tc in TEST_CASES:
        print(f"\n[Case {tc['case']}] {tc['scenario']}")
        print(f"  Query: {tc['query'][:80]}…")

        try:
            session_id = create_session(DOCUMENT_ID)
            result     = run_query(session_id, tc["query"])

            print(f"  ✓ Latency:   {result['latency_s']}s")
            print(f"  ✓ Citations: {len(result['citations'])}")
            print(f"  ✓ Answer (first 150 chars): {result['answer'][:150]}…")

            results.append({
                "case":      tc["case"],
                "scenario":  tc["scenario"],
                "query":     tc["query"],
                "answer":    result["answer"],
                "citations": result["citations"],
                "latency_s": result["latency_s"],
                "task_success": len(result["answer"]) > 50 and len(result["citations"]) > 0,
            })

        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            results.append({
                "case": tc["case"], "scenario": tc["scenario"],
                "query": tc["query"], "answer": "", "citations": [],
                "latency_s": 0, "task_success": False,
            })

    # ─── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  EVALUATION SUMMARY")
    print("=" * 70)

    successes  = sum(1 for r in results if r["task_success"])
    avg_lat    = sum(r["latency_s"] for r in results) / len(results)
    max_lat    = max(r["latency_s"] for r in results)
    with_cites = sum(1 for r in results if len(r["citations"]) > 0)

    print(f"  Task Success Rate : {successes}/{len(results)} ({successes/len(results)*100:.0f}%)  [acceptance: ≥ 80%]")
    print(f"  Avg Latency       : {avg_lat:.1f}s  [acceptance: < 20s avg]")
    print(f"  Max Latency       : {max_lat:.1f}s")
    print(f"  Citations Present : {with_cites}/{len(results)} cases")
    print()
    print("  ─── Faithfulness must be scored manually (see instructions below) ───")
    print()
    print(f"  Task Success:  {'✅ PASS' if successes >= 8 else '❌ FAIL — review retrieval'}")
    print(f"  Avg Latency:   {'✅ PASS' if avg_lat < 20 else '❌ FAIL — switch to OpenRouter or tune retrieval'}")

    # Save full results to JSON for manual faithfulness review
    with open("evaluation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\n  Full results saved to: backend/evaluation_results.json")
    print("  Open this file to manually score faithfulness per case.\n")


if __name__ == "__main__":
    main()
```

Run the script:
```bash
cd C:\Users\DELL\Desktop\Legal-Ai-Assistant\backend
python evaluate.py
```

---

### TASK 3 — Manual Faithfulness Scoring

After `evaluate.py` runs, open `backend\evaluation_results.json`. For each of the 10 cases:

1. Read the `answer` field
2. Read the `citations` array — these are the chunks the system retrieved
3. Go through every **factual claim** in the answer (legal conclusions, article references, clause details, numerical thresholds)
4. For each claim, find its supporting text in one of the citations
5. Mark: `grounded` (found in citations) or `hallucinated` (not in citations)
6. Record in the table below

**Faithfulness Scoring Table** — fill this in manually:

```
Case | Grounded Claims | Total Claims | Faithfulness | Pass? (≥0.90)
-----|-----------------|--------------|--------------|---------------
  1  |                 |              |              |
  2  |                 |              |              |
  3  |                 |              |              |
  4  |                 |              |              |
  5  |                 |              |              |
  6  |                 |              |              |
  7  |                 |              |              |
  8  |                 |              |              |
  9  |                 |              |              |
 10  |                 |              |              |
─────────────────────────────────────────────────────
 AVG |                 |              |              |  ≥ 0.90 ?
```

**Formula:** `Faithfulness = total_grounded / total_claims` across all 10 cases combined.

**What counts as a claim:** Any sentence asserting a legal fact, a standard, a threshold, a statute name, or a legal conclusion. Do not count the disclaimer sentence.

---

### TASK 4 — Complete the Full Phase 5 Results Table

Combine the script output with your manual faithfulness scores. Fill this table completely — this goes directly into your project report.

```
┌────┬──────────────────────────┬─────────────┬──────────┬────────────┬──────────┬──────────┐
│ #  │ Scenario                 │ Faithfulness│ Success? │ Latency(s) │ Citations│ Cost($)  │
│    │                          │ (≥ 0.90)    │ (✓/✗)    │ (< 20s)    │ (≥ 1)    │ (< $0.01)│
├────┼──────────────────────────┼─────────────┼──────────┼────────────┼──────────┼──────────┤
│  1 │ Force Majeure            │             │          │            │          │  $0.00   │
│  2 │ Non-Compete CA           │             │          │            │          │  $0.00   │
│  3 │ GDPR Breach              │             │          │            │          │  $0.00   │
│  4 │ IP Ownership             │             │          │            │          │  $0.00   │
│  5 │ Liquidated Damages       │             │          │            │          │  $0.00   │
│  6 │ SaaS Auto-Renewal        │             │          │            │          │  $0.00   │
│  7 │ Whistleblower            │             │          │            │          │  $0.00   │
│  8 │ Construction Scope       │             │          │            │          │  $0.00   │
│  9 │ Trade Secrets            │             │          │            │          │  $0.00   │
│ 10 │ Arbitration              │             │          │            │          │  $0.00   │
├────┼──────────────────────────┼─────────────┼──────────┼────────────┼──────────┼──────────┤
│AVG │ RESULT                   │  ≥ 0.90?    │ ≥ 8/10?  │ < 20s?     │ All ≥ 1? │  $0.00   │
│    │ ACCEPTANCE               │  ✅ / ❌     │ ✅ / ❌   │  ✅ / ❌    │  ✅ / ❌  │   ✅     │
└────┴──────────────────────────┴─────────────┴──────────┴────────────┴──────────┴──────────┘

Cost note: OpenRouter free-tier models (openai/gpt-oss-120b) = $0.00 per query.
           Document this explicitly in the report.
```

---

### TASK 5 — Phase 6: HELM Benchmark Analysis

**URL:** `https://crfm.stanford.edu/helm/`

Steps:
1. Navigate to the HELM leaderboard
2. Filter by scenario: **LegalBench**
3. Record `exact_match` and `F1` scores for these models in the table below
4. Also check: **BoolQ**, **NarrativeQA** — record scores for the same models

```
HELM RESULTS TABLE
──────────────────────────────────────────────────────────────────
Model                    │ LegalBench     │ BoolQ   │ NarrativeQA
                         │ Exact Match F1 │ Acc.    │ F1
─────────────────────────┼────────────────┼─────────┼────────────
GPT-4o                   │              │        │           │
Gemini 1.5 Pro           │              │        │           │
Mistral-Large            │              │        │           │
Mistral-7B-Instruct      │              │        │           │
──────────────────────────────────────────────────────────────────
→ Highest LegalBench F1: _______________________
→ Selected for this project: ___________________  (must also pass cost/latency)
```

---

### TASK 6 — Phase 6: Artificial Analysis — Cost and Speed

**URL:** `https://artificialanalysis.ai`

For each candidate model, record the following. All values must be within the acceptance range for the model to qualify for legal AI use:

```
ARTIFICIAL ANALYSIS RESULTS TABLE
──────────────────────────────────────────────────────────────────────────────────────
Model                │ Quality │ Tokens  │ Context  │ Cost/1M  │ TTFT  │ Passes
                     │ Index   │ /sec    │ Window   │ Input($) │ (s)   │ All?
                     │ (>70)   │ (>50)   │ (>32K)   │ (<$10)   │ (<2s) │
─────────────────────┼─────────┼─────────┼──────────┼──────────┼───────┼────────
GPT-4o               │         │         │          │          │       │
Gemini 1.5 Pro       │         │         │          │          │       │
Mistral-7B (free)    │         │         │          │          │       │
DeepSeek-V3          │         │         │          │          │       │
openai/gpt-oss-120b  │         │         │          │          │       │
──────────────────────────────────────────────────────────────────────────────────────

→ Models passing ALL 5 criteria: _________________________________
→ Best balance of quality + cost: ________________________________
```

---

### TASK 7 — Phase 6: LLM Arena Evaluation

**URL:** `https://lmarena.ai`

**Step 1 — Leaderboard (record from the site):**

```
LLM ARENA LEADERBOARD TABLE
──────────────────────────────────────────────────────────────────
Model                    │ Overall Elo │ Instruction │ Hard Prompts
                         │             │ Following   │ Rank
                         │             │ Elo         │
─────────────────────────┼─────────────┼─────────────┼────────────
GPT-4o                   │             │             │
Gemini 1.5 Pro           │             │             │
Mistral-7B-Instruct      │             │             │
DeepSeek-V3              │             │             │
──────────────────────────────────────────────────────────────────
```

**Step 2 — Personal Battle Test (run 5 times in Arena battle mode):**

Use these 5 queries in Arena's blind A/B comparison. Vote for the better legal answer each time:

```
Battle 1: "Does COVID-19 qualify as force majeure under a clause listing natural disasters?"
Battle 2: "Is a non-compete clause enforceable under California Business and Professions Code §16600?"
Battle 3: "What is the standard for liquidated damages versus an unenforceable penalty clause?"
Battle 4: "Does the Defend Trade Secrets Act protect customer lists taken by a departing employee?"
Battle 5: "Is a mandatory arbitration class action waiver unconscionable for small-value consumer claims?"
```

Record which model won each battle:
```
Battle 1 winner: _______    Battle 2 winner: _______    Battle 3 winner: _______
Battle 4 winner: _______    Battle 5 winner: _______

My preferred model across 5 legal battles: _______________________
```

---

### TASK 8 — Phase 6: Final Model Selection

Complete this decision table by combining data from HELM, Artificial Analysis, and LLM Arena. Check each box that passes its acceptance threshold.

```
FINAL MODEL SELECTION TABLE
═══════════════════════════════════════════════════════════════════════════════════
Criteria             │ Source              │ Threshold │ Chosen Model   │ Pass?
─────────────────────┼─────────────────────┼───────────┼────────────────┼────────
LegalBench F1        │ HELM                │ Highest   │                │
BoolQ Accuracy       │ HELM                │ Highest   │                │
Quality Index        │ Artificial Analysis │ > 70       │                │
Output Speed         │ Artificial Analysis │ > 50 tok/s │                │
Context Window       │ Artificial Analysis │ > 32K      │                │
Cost per 1M Input    │ Artificial Analysis │ < $10      │                │
Time to First Token  │ Artificial Analysis │ < 2s       │                │
Overall Elo          │ LLM Arena           │ Highest    │                │
Battle Win Rate      │ LLM Arena           │ > 3/5      │                │
═══════════════════════════════════════════════════════════════════════════════════
FINAL SELECTED MODEL: ___________________________________
═══════════════════════════════════════════════════════════════════════════════════

Justification (write 2–3 sentences):
This project uses [MODEL] because _____________________________________________
________________________________________________________________________
[MODEL] was preferred over [ALTERNATIVE] because _____________________________
________________________________________________________________________
```

---

### DAY 5 END-OF-DAY VERIFICATION CHECKLIST

**Phase 5 — Metrics:**
- [ ] `evaluate.py` ran to completion without errors
- [ ] `evaluation_results.json` contains 10 non-empty answer entries
- [ ] Task Success Rate result recorded: ___/10 — passes ≥ 8/10 acceptance? ✅/❌
- [ ] Average Latency recorded: ___s — passes < 20s acceptance? ✅/❌
- [ ] Faithfulness manually scored for all 10 cases — average ≥ 0.90? ✅/❌
- [ ] All 10 cases returned at least 1 citation ✅/❌
- [ ] Cost per query documented ($0.00 for free-tier OpenRouter) ✅

**Phase 6 — Model Selection:**
- [ ] HELM LegalBench scores recorded for ≥ 3 models
- [ ] Artificial Analysis table completed with all 5 criteria for ≥ 3 models
- [ ] LLM Arena Elo scores recorded for ≥ 3 models
- [ ] 5 personal battle comparisons completed and winner recorded
- [ ] Final Model Selection Table completed with justification written
- [ ] All results entered into the project evaluation report

---
*End of Phase 1 Daily Prompts — Legal AI Assistant*
*5 Days · No Docker · SQLite + ChromaDB · HuggingFace Embeddings · LangChain LCEL*
*Primary LLM: openai/gpt-oss-120b via OpenRouter (free) · Optional: Ollama llama3.2:3b*
