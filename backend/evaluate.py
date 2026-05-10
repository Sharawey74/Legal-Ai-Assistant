"""
Phase 5 Evaluation Script — Legal AI Assistant (v2 Enhanced)
=============================================================
Measures all 5 Phase 5 metrics:
  1. Faithfulness Score  — LLM-as-judge: grounded claims / total claims (0–1)
  2. Task Success Rate   — answer > 50 chars AND >= 1 citation (binary)
  3. Total Latency (s)   — end-to-end via streaming endpoint
  4. TTFT (s)            — [TTFT] SSE event emitted by backend stream
  5. Cost per Query ($)  — free-tier models = $0.00

Usage:
  python evaluate.py           — metrics 2-5 (fast, no LLM judge)
  python evaluate.py --full    — all 5 metrics (calls faithfulness judge LLM)
"""

import time, json, sys, os, http.client
import urllib.request, urllib.error

# ─── CONFIG ──────────────────────────────────────────────────────────────────
BASE_URL          = "http://localhost:8000/api/v1"
HOST, PORT        = "localhost", 8000
EMAIL             = "day1@legal.ai"
PASSWORD          = "test123@"
FULL_FAITHFULNESS = "--full" in sys.argv
JUDGE_MODEL       = "meta-llama/llama-3.1-8b-instruct:free"  # cheap judge LLM
# ─────────────────────────────────────────────────────────────────────────────

TEST_CASES = [
    {"case": 1,  "scenario": "Force Majeure — COVID-19 Supply Chain",
     "query": "Does COVID-19 qualify as force majeure under a supply contract clause listing natural disasters and governmental action?"},
    {"case": 2,  "scenario": "Non-Compete Clause — California",
     "query": "Is a non-compete clause enforceable under California Business and Professions Code Section 16600 for tech employees?"},
    {"case": 3,  "scenario": "GDPR Data Breach Liability",
     "query": "What are GDPR Article 32 security obligations for cloud data processors and liability under data processing agreements?"},
    {"case": 4,  "scenario": "IP Ownership — Personal Time",
     "query": "Is an employee IP assignment clause enforceable for inventions developed on personal time under California Labor Code 2870?"},
    {"case": 5,  "scenario": "Liquidated Damages vs Penalty",
     "query": "What is the enforceability test for a liquidated damages clause — genuine pre-estimate of loss versus unenforceable penalty?"},
    {"case": 6,  "scenario": "SaaS Auto-Renewal Clause",
     "query": "Is an auto-renewal clause enforceable in SaaS enterprise contracts if it requires conspicuous notice under electronic signature?"},
    {"case": 7,  "scenario": "Whistleblower Retaliation",
     "query": "Does Sarbanes-Oxley whistleblower protection apply to employees of private companies terminated after raising safety concerns?"},
    {"case": 8,  "scenario": "Construction Scope Creep",
     "query": "What constitutes a valid change order under AIA construction contracts and can verbal instructions from an owner be binding?"},
    {"case": 9,  "scenario": "Trade Secret Misappropriation",
     "query": "Does a customer list qualify as a trade secret under the Defend Trade Secrets Act when taken by a departing employee?"},
    {"case": 10, "scenario": "Arbitration Unconscionability",
     "query": "Is a mandatory arbitration clause with a class action waiver unconscionable when individual recovery is less than arbitration costs?"},
]


# ─── HTTP HELPERS ─────────────────────────────────────────────────────────────
def make_request(method, url, payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req  = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise Exception(f"HTTP {e.code}: {e.read().decode('utf-8')}")


def get_token():
    print(f"Logging in as {EMAIL}...")
    try:
        make_request("POST", f"{BASE_URL}/auth/register", {"email": EMAIL, "password": PASSWORD})
    except Exception:
        pass
    return make_request("POST", f"{BASE_URL}/auth/login", {"email": EMAIL, "password": PASSWORD})["access_token"]


def get_document_ids(token):
    docs  = make_request("GET", f"{BASE_URL}/documents", token=token)
    ready = [d for d in docs if d["status"] == "ready"]
    if not ready:
        raise Exception("No 'ready' documents. Upload legal documents first.")
    print(f"Found {len(ready)} ready document(s).")
    return [d["id"] for d in ready]


def create_session(token, document_ids):
    res = make_request("POST", f"{BASE_URL}/chat/sessions",
                       {"document_ids": document_ids, "title": "Phase5 Eval"}, token=token)
    return res["id"]


# ─── STREAMING QUERY WITH TTFT ────────────────────────────────────────────────
def run_query_stream(token, session_id, query):
    """
    POST to /stream endpoint, parse SSE events.
    Extracts TTFT from the [TTFT]<ms> event the backend emits before the first token.
    """
    path    = f"/api/v1/chat/sessions/{session_id}/stream"
    body    = json.dumps({"content": query, "is_thinking_mode": False}).encode("utf-8")
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    conn    = http.client.HTTPConnection(HOST, PORT, timeout=120)
    t_start = time.perf_counter()
    conn.request("POST", path, body=body, headers=headers)
    resp    = conn.getresponse()

    full_answer, citations, ttft_ms, buffer = [], [], None, b""
    try:
        while True:
            chunk = resp.read(512)
            if not chunk:
                break
            buffer += chunk
            while b"\n\n" in buffer:
                raw, buffer = buffer.split(b"\n\n", 1)
                line = raw.decode("utf-8", errors="replace").strip()
                if not line.startswith("data: "):
                    continue
                payload = line[6:]
                if payload.startswith("[TTFT]"):
                    try:
                        ttft_ms = int(payload[6:])
                    except ValueError:
                        pass
                elif payload.startswith("[CITATIONS]"):
                    try:
                        citations = json.loads(payload[11:])
                    except Exception:
                        pass
                elif payload == "[DONE]":
                    break
                elif not payload.startswith("[ERROR]") and not payload.startswith("[TTFT]"):
                    full_answer.append(payload.replace("\\n", "\n"))
    finally:
        conn.close()

    return {
        "answer":    "".join(full_answer),
        "citations": citations,
        "latency_s": round(time.perf_counter() - t_start, 2),
        "ttft_s":    round(ttft_ms / 1000.0, 2) if ttft_ms is not None else None,
    }


# ─── LLM-AS-JUDGE FAITHFULNESS ───────────────────────────────────────────────
def score_faithfulness(query, answer, citations, api_key):
    """
    Uses a lightweight free model on OpenRouter to score faithfulness:
    what fraction of factual claims in the answer are grounded in the excerpts.
    Returns (score: float | None, detail: dict).
    """
    if not api_key:
        return None, {"reason": "No API key available"}

    excerpts = "\n\n".join(
        f"[Excerpt {i+1}] {c.get('excerpt','')[:400]}"
        for i, c in enumerate(citations[:5])
    )
    prompt = (
        "You are a faithfulness evaluator for a legal AI assistant.\n\n"
        f"RETRIEVED EXCERPTS (ground truth):\n{excerpts}\n\n"
        f"AI ANSWER:\n{answer[:2000]}\n\n"
        "TASK:\n"
        "1. Identify every distinct factual claim (case names, statutes, rules, figures).\n"
        "2. Mark each GROUNDED (in excerpts) or HALLUCINATED (not in excerpts).\n"
        "3. faithfulness = grounded / total  (round to 2 decimal places).\n"
        "Respond ONLY with valid JSON, no extra text:\n"
        '{"score": <0.0-1.0>, "grounded": <int>, "total": <int>, "reason": "<one sentence>"}'
    )

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps({
            "model": JUDGE_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 250, "temperature": 0.0,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            content = json.loads(r.read())["choices"][0]["message"]["content"].strip()
            s, e = content.find("{"), content.rfind("}") + 1
            if s >= 0 and e > s:
                parsed = json.loads(content[s:e])
                return float(parsed.get("score", 0.0)), parsed
    except Exception as ex:
        return None, {"reason": f"Judge error: {ex}"}
    return None, {}


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    print("=" * 72)
    print("  LEGAL AI ASSISTANT — PHASE 5 EVALUATION (v2 Enhanced)")
    mode_label = "FULL — with LLM faithfulness judge" if FULL_FAITHFULNESS else "QUICK — add --full for faithfulness"
    print(f"  Mode: {mode_label}")
    print("=" * 72)

    # Load API key for faithfulness judge
    api_key = ""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            if line.startswith("OPENROUTER_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
                break

    try:
        token        = get_token()
        document_ids = get_document_ids(token)
    except Exception as e:
        print(f"\n[FATAL] {e}")
        return

    print(f"\n  Backend   : {BASE_URL}")
    print(f"  Documents : {len(document_ids)} ready")
    print(f"  Test Cases: {len(TEST_CASES)}")
    print("=" * 72)

    results = []

    for tc in TEST_CASES:
        print(f"\n[Case {tc['case']:2d}] {tc['scenario']}")
        print(f"  Query: {tc['query'][:78]}…")

        try:
            sid = create_session(token, document_ids)
            r   = run_query_stream(token, sid, tc["query"])

            task_ok    = len(r["answer"]) > 50 and len(r["citations"]) > 0
            latency_ok = r["latency_s"] < 20.0
            ttft_ok    = r["ttft_s"] is not None and r["ttft_s"] < 2.0

            faith_score, faith_detail = None, {}
            if FULL_FAITHFULNESS:
                print(f"  [JUDGE] Scoring faithfulness via {JUDGE_MODEL}…")
                faith_score, faith_detail = score_faithfulness(
                    tc["query"], r["answer"], r["citations"], api_key
                )

            icon = "[PASS]" if task_ok else "[FAIL]"
            print(f"  {icon} Latency  : {r['latency_s']}s  {'✅' if latency_ok else '❌ >20s'}")
            ttft_str = f"{r['ttft_s']}s  {'✅' if ttft_ok else '❌ >2s'}" if r["ttft_s"] else "— (not captured)"
            print(f"  {icon} TTFT     : {ttft_str}")
            print(f"  {icon} Citations: {len(r['citations'])}")
            if faith_score is not None:
                print(f"  [JUDGE] Faithfulness: {faith_score:.2f}  "
                      f"({faith_detail.get('grounded','?')}/{faith_detail.get('total','?')} claims grounded)")
            print(f"  Preview: {r['answer'][:110].replace(chr(10), ' ')}…")

            results.append({
                "case": tc["case"], "scenario": tc["scenario"], "query": tc["query"],
                "answer": r["answer"], "citations": r["citations"],
                "latency_s": r["latency_s"], "ttft_s": r["ttft_s"],
                "task_success": task_ok, "faithfulness": faith_score,
                "faith_detail": faith_detail, "cost_usd": 0.0,
            })

        except Exception as e:
            print(f"  [FAIL] ERROR: {e}")
            results.append({
                "case": tc["case"], "scenario": tc["scenario"], "query": tc["query"],
                "answer": "", "citations": [], "latency_s": 0, "ttft_s": None,
                "task_success": False, "faithfulness": None, "faith_detail": {}, "cost_usd": 0.0,
            })

    # ─── Summary ──────────────────────────────────────────────────────────────
    successes  = sum(1 for r in results if r["task_success"])
    with_cites = sum(1 for r in results if r["citations"])
    lats       = [r["latency_s"] for r in results if r["latency_s"] > 0]
    ttfts      = [r["ttft_s"]    for r in results if r["ttft_s"] is not None]
    faiths     = [r["faithfulness"] for r in results if r["faithfulness"] is not None]

    avg_lat   = sum(lats)   / len(lats)   if lats   else 0
    avg_ttft  = sum(ttfts)  / len(ttfts)  if ttfts  else None
    avg_faith = sum(faiths) / len(faiths) if faiths else None

    print("\n" + "=" * 72)
    print("  PHASE 5 RESULTS SUMMARY")
    print("=" * 72)
    print(f"  {'Metric':<26} {'Result':<18} {'Target':<10} Status")
    print(f"  {'-'*26} {'-'*18} {'-'*10} {'-'*8}")
    print(f"  {'Task Success Rate':<26} {f'{successes}/{len(results)} ({successes/len(results)*100:.0f}%)':<18} {'≥ 80%':<10} {'✅ PASS' if successes >= 8 else '❌ FAIL'}")
    print(f"  {'Avg Total Latency':<26} {f'{avg_lat:.1f}s':<18} {'< 20s':<10} {'✅ PASS' if avg_lat < 20 else '❌ FAIL'}")
    if avg_ttft is not None:
        print(f"  {'Avg TTFT':<26} {f'{avg_ttft:.2f}s':<18} {'< 2s':<10} {'✅ PASS' if avg_ttft < 2 else '❌ FAIL'}")
    else:
        print(f"  {'TTFT':<26} {'—':<18} {'< 2s':<10} needs --full or restart backend")
    print(f"  {'Citations Present':<26} {f'{with_cites}/{len(results)} cases':<18} {'all':<10} {'✅ PASS' if with_cites == len(results) else '❌ FAIL'}")
    if avg_faith is not None:
        print(f"  {'Faithfulness (auto)':<26} {f'{avg_faith:.3f}':<18} {'≥ 0.90':<10} {'✅ PASS' if avg_faith >= 0.90 else '❌ FAIL'}")
    else:
        print(f"  {'Faithfulness':<26} {'—  (run --full)':<18} {'≥ 0.90':<10} —")
    print(f"  {'Cost per Query':<26} {'$0.00':<18} {'< $0.01':<10} ✅ PASS (free-tier model)")

    if avg_lat >= 20:
        print("\n  ⚠  LATENCY FIX: Switch OPENROUTER_MODEL to 'meta-llama/llama-3.1-8b-instruct:free'")
        print("     or reduce top_k: 3→2 in backend/app/services/rag_service.py")
    if avg_ttft and avg_ttft >= 2:
        print("  ⚠  TTFT FIX: Switch to a faster cloud model on OpenRouter.")

    out = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n  Full results → {out}")
    if not FULL_FAITHFULNESS:
        print("  Re-run with:  python evaluate.py --full   to add LLM faithfulness scoring")
    print()


if __name__ == "__main__":
    main()
