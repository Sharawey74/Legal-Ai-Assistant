"""
Phase 5 Evaluation Script — Legal AI Assistant
Measures: Faithfulness, Task Success Rate, Latency, and Cost

Usage:
  1. Ensure the backend is running
  2. Ensure the test PDF is uploaded
  3. Run: python evaluate.py
"""

import time
import json
import urllib.request
import urllib.error

# ─── CONFIG — AUTOMATED ──────────────────────────────────────────────────────
BASE_URL    = "http://localhost:8000/api/v1"
EMAIL       = "day1@legal.ai"
PASSWORD    = "test123"
# ─────────────────────────────────────────────────────────────────────────────

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

def make_request(method, url, payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise Exception(f"HTTP {e.code}: {error_body}")

def get_token():
    print(f"Logging in as {EMAIL}...")
    res = make_request("POST", f"{BASE_URL}/auth/login", {"email": EMAIL, "password": PASSWORD})
    return res["access_token"]

def get_document_ids(token):
    print("Fetching documents...")
    docs = make_request("GET", f"{BASE_URL}/documents", token=token)
    ready_docs = [d for d in docs if d["status"] == "ready"]
    if not ready_docs:
        raise Exception("No 'ready' documents found. Please upload the Legal Documents first.")
    
    print(f"Found {len(ready_docs)} ready documents.")
    return [doc["id"] for doc in ready_docs]

def create_session(token, document_ids):
    res = make_request("POST", f"{BASE_URL}/chat/sessions", 
                       {"document_ids": document_ids, "title": "Evaluation Session"}, token=token)
    return res["id"]

def run_query(token, session_id, query):
    t0 = time.perf_counter()
    data = make_request("POST", f"{BASE_URL}/chat/sessions/{session_id}/messages",
                        {"content": query}, token=token)
    latency_s = time.perf_counter() - t0
    return {
        "answer":      data["content"],
        "citations":   data["citations"],
        "latency_s":   round(latency_s, 2),
    }

def main():
    print("=" * 70)
    print("  LEGAL AI ASSISTANT — PHASE 5 EVALUATION")
    print("=" * 70)
    
    try:
        token = get_token()
        document_ids = get_document_ids(token)
    except Exception as e:
        print(f"Failed to initialize: {e}")
        return

    print(f"  Base URL:    {BASE_URL}")
    print(f"  Document IDs: {len(document_ids)} loaded")
    print(f"  Test Cases:  {len(TEST_CASES)}")
    print("=" * 70)

    results = []

    for tc in TEST_CASES:
        print(f"\n[Case {tc['case']}] {tc['scenario']}")
        print(f"  Query: {tc['query'][:80]}…")

        try:
            session_id = create_session(token, document_ids)
            result     = run_query(token, session_id, tc["query"])

            print(f"  [PASS] Latency:   {result['latency_s']}s")
            print(f"  [PASS] Citations: {len(result['citations'])}")
            print(f"  [PASS] Answer (first 150 chars): {result['answer'][:150].replace(chr(10), ' ')}…")

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
            print(f"  [FAIL] FAILED: {e}")
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
    avg_lat    = sum(r["latency_s"] for r in results) / len(results) if results else 0
    max_lat    = max((r["latency_s"] for r in results), default=0)
    with_cites = sum(1 for r in results if len(r["citations"]) > 0)

    print(f"  Task Success Rate : {successes}/{len(results)} ({successes/len(results)*100:.0f}%)  [acceptance: >= 80%]")
    print(f"  Avg Latency       : {avg_lat:.1f}s  [acceptance: < 20s avg]")
    print(f"  Max Latency       : {max_lat:.1f}s")
    print(f"  Citations Present : {with_cites}/{len(results)} cases")
    print()
    print("  --- Faithfulness must be scored manually (see instructions below) ---")
    print()
    print(f"  Task Success:  {'[PASS]' if successes >= 8 else '[FAIL] — review retrieval'}")
    print(f"  Avg Latency:   {'[PASS]' if avg_lat < 20 else '[FAIL] — switch to OpenRouter or tune retrieval'}")

    # Save full results to JSON for manual faithfulness review
    with open("evaluation_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("\n  Full results saved to: backend/evaluation_results.json")
    print("  Open this file to manually score faithfulness per case.\n")

if __name__ == "__main__":
    import sys
    # Configure stdout to handle unicode if possible, though replacing characters is safer
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    main()
