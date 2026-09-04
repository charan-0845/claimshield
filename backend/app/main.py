"""
ClaimShield backend — hackathon MVP.

Run with: uvicorn app.main:app --reload --port 8000

Endpoints map directly to the demo flow:
  POST /extract          -> upload text, get case fingerprint
  POST /similar-cases     -> fingerprint in, ranked matches out
  POST /case-intelligence -> why won/lost + evidence gap + counterarguments for one match
  POST /appeal            -> generate the grievance letter
  GET  /corpus            -> debug: dump the loaded case corpus
"""

import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.schema import CaseFingerprint, SimilarCaseMatch, CaseIntelligence
from app.core.similarity import find_similar_cases
from app.core import prompts
from anthropic import Anthropic

app = FastAPI(title="ClaimShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for hackathon, tighten later
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

DATA_PATH = Path(__file__).parent / "data" / "cases.json"


def load_corpus() -> list[CaseFingerprint]:
    raw = json.loads(DATA_PATH.read_text())
    return [CaseFingerprint(**c) for c in raw]


CORPUS = load_corpus()


def call_claude_json(system: str, user: str) -> dict:
    """Call Claude and parse the response as JSON, stripping any accidental fences."""
    resp = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text")
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


# ---------- /extract ----------

class ExtractRequest(BaseModel):
    policy_text: str
    rejection_text: str
    additional_text: str = ""


@app.post("/extract")
def extract(req: ExtractRequest):
    user_prompt = prompts.EXTRACTION_USER_TEMPLATE.format(
        policy_text=req.policy_text,
        rejection_text=req.rejection_text,
        additional_text=req.additional_text or "(none provided)",
    )
    try:
        result = call_claude_json(prompts.EXTRACTION_SYSTEM_PROMPT, user_prompt)
    except (json.JSONDecodeError, IndexError) as e:
        raise HTTPException(500, f"Extraction failed to parse: {e}")
    return result


# ---------- /similar-cases ----------

class SimilarCasesRequest(BaseModel):
    fingerprint: CaseFingerprint
    top_k: int = 5


@app.post("/similar-cases", response_model=list[SimilarCaseMatch])
def similar_cases(req: SimilarCasesRequest):
    return find_similar_cases(req.fingerprint, CORPUS, top_k=req.top_k)


# ---------- /case-intelligence ----------

class CaseIntelligenceRequest(BaseModel):
    user_fingerprint: CaseFingerprint
    matched_case_id: str


@app.post("/case-intelligence", response_model=CaseIntelligence)
def case_intelligence(req: CaseIntelligenceRequest):
    matched = next((c for c in CORPUS if c.id == req.matched_case_id), None)
    if not matched:
        raise HTTPException(404, "Case not found in corpus")

    user_prompt = prompts.CASE_INTELLIGENCE_USER_TEMPLATE.format(
        user_fingerprint_json=req.user_fingerprint.model_dump_json(indent=2),
        matched_case_json=matched.model_dump_json(indent=2),
        case_id=matched.id,
    )
    result = call_claude_json(prompts.CASE_INTELLIGENCE_SYSTEM_PROMPT, user_prompt)
    return result


# ---------- /appeal ----------

class AppealRequest(BaseModel):
    user_fingerprint: CaseFingerprint
    precedent_case_ids: list[str]
    missing_evidence: list[str] = []


@app.post("/appeal")
def generate_appeal(req: AppealRequest):
    precedents = [c for c in CORPUS if c.id in req.precedent_case_ids]
    user_prompt = prompts.APPEAL_USER_TEMPLATE.format(
        user_fingerprint_json=req.user_fingerprint.model_dump_json(indent=2),
        precedent_cases_json=json.dumps([p.model_dump() for p in precedents], indent=2),
        missing_evidence_json=json.dumps(req.missing_evidence),
    )
    resp = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=prompts.APPEAL_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    letter = "".join(b.text for b in resp.content if b.type == "text")
    return {"appeal_letter": letter}


# ---------- debug ----------

@app.get("/corpus")
def get_corpus():
    return CORPUS
