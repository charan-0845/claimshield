"""
ClaimShield backend — hackathon MVP.

Run with: uvicorn app.main:app --reload --port 8000

Docs: http://localhost:8000/docs

Endpoints map directly to the demo flow:
  POST /extract          -> upload text, get case fingerprint
  POST /similar-cases    -> fingerprint in, ranked matches out
  POST /case-intelligence -> why won/lost + evidence gap + counterarguments for one match
  POST /appeal           -> generate the grievance letter + action plan
  GET  /corpus           -> debug: dump the loaded case corpus
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI

from app.core.schema import (
    CaseFingerprint,
    CaseIntelligence,
    ErrorResponse,
    RejectionCategory,
    SimilarCaseMatch,
)
from app.core.similarity import find_similar_cases
from app.core import prompts

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("claimshield")

# Load .env file if present (local dev)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

FEATHERLESS_API_KEY = os.environ.get("FEATHERLESS_API_KEY", "")
if not FEATHERLESS_API_KEY:
    logger.warning(
        "FEATHERLESS_API_KEY is not set. LLM endpoints will fail. "
        "Set it in .env (copy from .env.example) and get a key at https://featherless.ai/"
    )

# Featherless is OpenAI-compatible — just point to their base URL
client = OpenAI(
    api_key=FEATHERLESS_API_KEY or "no-key-set",
    base_url="https://api.featherless.ai/v1",
)
# Best open model for structured JSON extraction tasks
MODEL = "unsloth/Llama-3.3-70B-Instruct"

DATA_PATH = Path(__file__).parent / "data" / "cases.json"

# case_id of Person A's designated "insufficient information" example.
# Update to match the real case_id before the demo.
INSUFFICIENT_INFO_CASE_ID = "case_007"

# ---------------------------------------------------------------------------
# Corpus loading
# ---------------------------------------------------------------------------

def load_corpus() -> list[CaseFingerprint]:
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return [CaseFingerprint(**c) for c in raw]


CORPUS = load_corpus()
CORPUS_INDEX: dict[str, CaseFingerprint] = {c.id: c for c in CORPUS}
logger.info(f"Loaded {len(CORPUS)} cases from corpus.")

# ---------------------------------------------------------------------------
# App + CORS
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ClaimShield API",
    description=(
        "Health insurance claim analysis backend. "
        "Extracts claim facts, finds similar cases, explains outcomes, and drafts appeals."
    ),
    version="1.0.0",
)

# CORS — open for hackathon local dev (Person C running on any port/device)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten after demo
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """
    Global exception handler for Pydantic validation errors.
    Reshapes default FastAPI 422 errors into Person C's agreed error contract:
    {"error": "validation_failed", "message": "<human readable message>"}
    """
    errors = exc.errors()
    messages = []
    for err in errors:
        loc_parts = [str(l) for l in err.get("loc", []) if l != "body"]
        loc = " -> ".join(loc_parts)
        msg = err.get("msg", "Invalid value")
        messages.append(f"{loc}: {msg}" if loc else msg)
    human_message = "; ".join(messages) or "Validation failed for input data."
    return JSONResponse(
        status_code=422,
        content={"error": "validation_failed", "message": human_message},
    )

# ---------------------------------------------------------------------------
# LLM helper
# ---------------------------------------------------------------------------

def call_llm_json(system: str, user: str) -> dict:
    """
    Call Featherless (OpenAI-compatible) and parse the response as JSON.
    Raises json.JSONDecodeError if parsing fails — callers must handle this.
    """
    resp = client.chat.completions.create(
        model=MODEL,
        max_tokens=2000,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    text = resp.choices[0].message.content or ""
    text = text.strip()
    # Strip ```json ... ``` fences if the model disobeys instructions
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


# ---------------------------------------------------------------------------
# Rejection reason normalizer
# ---------------------------------------------------------------------------
# Maps LLM free-text onto the 5 allowed enum values.
# The prompt instructs the LLM to use the enum directly, but we normalize
# defensively server-side — this is the #1 silent failure point per spec.

_REASON_KEYWORD_MAP = {
    "pre-existing": RejectionCategory.PED_NON_DISCLOSURE,
    "pre existing": RejectionCategory.PED_NON_DISCLOSURE,
    "preexisting": RejectionCategory.PED_NON_DISCLOSURE,
    "non-disclosure": RejectionCategory.PED_NON_DISCLOSURE,
    "nondisclosure": RejectionCategory.PED_NON_DISCLOSURE,
    "concealment": RejectionCategory.PED_NON_DISCLOSURE,
    " ped ": RejectionCategory.PED_NON_DISCLOSURE,
    "waiting period": RejectionCategory.WAITING_PERIOD,
    "wait period": RejectionCategory.WAITING_PERIOD,
    "moratorium": RejectionCategory.WAITING_PERIOD,
    "exclusion": RejectionCategory.POLICY_EXCLUSION,
    "excluded": RejectionCategory.POLICY_EXCLUSION,
    "not covered": RejectionCategory.POLICY_EXCLUSION,
    "not payable": RejectionCategory.POLICY_EXCLUSION,
    "cosmetic": RejectionCategory.POLICY_EXCLUSION,
    "document": RejectionCategory.DOCUMENTATION,
    "incomplete": RejectionCategory.DOCUMENTATION,
    "missing": RejectionCategory.DOCUMENTATION,
    "partial settlement": RejectionCategory.PARTIAL_SETTLEMENT,
    "sub-limit": RejectionCategory.PARTIAL_SETTLEMENT,
    "sublimit": RejectionCategory.PARTIAL_SETTLEMENT,
    "co-payment": RejectionCategory.PARTIAL_SETTLEMENT,
    "copayment": RejectionCategory.PARTIAL_SETTLEMENT,
    "deductible": RejectionCategory.PARTIAL_SETTLEMENT,
}

_VALID_REASONS = {r.value for r in RejectionCategory}


def _normalize_rejection_reason(raw: Optional[str]) -> Optional[str]:
    """
    Normalize LLM output to one of the 5 enum values.
    Returns None if no mapping found — caller leaves field as null.
    Never returns an unknown string.
    """
    if raw is None:
        return None
    if raw in _VALID_REASONS:
        return raw
    lower = raw.lower()
    for keyword, canonical in _REASON_KEYWORD_MAP.items():
        if keyword in lower:
            return canonical.value
    logger.warning(f"Could not normalize rejection_reason '{raw}' — setting to null")
    return None


def _normalize_claim_status(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    lower = raw.lower()
    if "partial" in lower:
        return "partial"
    if any(w in lower for w in ("reject", "denied", "declined", "repudiat")):
        return "rejected"
    return None


# ---------------------------------------------------------------------------
# Standard error responses (Person C's agreed error shape)
# ---------------------------------------------------------------------------

def _err(status: int, slug: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": slug, "message": message},
    )


# ---------------------------------------------------------------------------
# Endpoint: /extract
# ---------------------------------------------------------------------------

class ExtractRequest(BaseModel):
    policy_text: str = ""
    rejection_text: str
    additional_text: str = ""


@app.post(
    "/extract",
    responses={
        200: {"description": "Case fingerprint extracted successfully"},
        422: {"model": ErrorResponse, "description": "LLM parse failure or schema error"},
        500: {"model": ErrorResponse, "description": "LLM unreachable or unexpected error"},
    },
    summary="Extract Case Fingerprint from rejection letter",
    tags=["Core"],
)
def extract(req: ExtractRequest):
    """
    Extract structured Case Fingerprint fields from a rejection letter.

    - rejection_reason is normalized server-side onto the 5 enum values.
    - Missing fields are returned as null (never hallucinated).
    - Malformed LLM output returns HTTP 422 with a clear error shape for Person C.
    """
    user_prompt = prompts.EXTRACTION_USER_TEMPLATE.format(
        policy_text=req.policy_text or "(not provided)",
        rejection_text=req.rejection_text,
        additional_text=req.additional_text or "(none provided)",
    )

    try:
        result = call_llm_json(prompts.EXTRACTION_SYSTEM_PROMPT, user_prompt)
    except json.JSONDecodeError:
        logger.warning("/extract — JSON parse failed")
        return _err(
            422,
            "extraction_failed",
            "Could not parse structured data from the document. "
            "Try re-uploading or check the file is readable.",
        )
    except Exception as e:
        logger.error(f"/extract — LLM call failed: {e}")
        return _err(500, "llm_unavailable", "Could not reach the AI service. Please try again.")

    # Server-side normalization — never trust LLM to hit the enum exactly
    fp = result.get("fingerprint", {})
    fp["rejection_reason"] = _normalize_rejection_reason(fp.get("rejection_reason"))
    fp["claim_status"] = _normalize_claim_status(fp.get("claim_status"))

    # Clamp claim_amount to numeric
    raw_amount = fp.get("claim_amount")
    if raw_amount is not None:
        try:
            fp["claim_amount"] = float(
                str(raw_amount).replace(",", "").replace("₹", "").replace("Rs.", "").strip()
            )
        except (ValueError, TypeError):
            fp["claim_amount"] = None

    # Ensure extraction_confidence is present
    result["fingerprint"] = fp
    if "extraction_confidence" not in result:
        result["extraction_confidence"] = "low"

    return result


# ---------------------------------------------------------------------------
# Endpoint: /similar-cases
# ---------------------------------------------------------------------------

class SimilarCasesRequest(BaseModel):
    fingerprint: CaseFingerprint
    top_k: int = 5


@app.post(
    "/similar-cases",
    response_model=list[SimilarCaseMatch],
    responses={
        500: {"model": ErrorResponse, "description": "Corpus unavailable or scoring error"},
    },
    summary="Find similar historical cases for a Case Fingerprint",
    tags=["Core"],
)
def similar_cases(req: SimilarCasesRequest):
    """
    Return ranked matches from the case corpus for the given fingerprint.

    - Pure algorithmic scoring — no LLM call, cannot fail from bad AI output.
    - Every match includes match_explanation booleans (never a bare score).
    - Returns up to top_k matches (default 5).
    """
    if not CORPUS:
        return _err(500, "corpus_unavailable", "Case corpus could not be loaded.")

    try:
        return find_similar_cases(req.fingerprint, CORPUS, top_k=req.top_k)
    except Exception as e:
        logger.error(f"/similar-cases — scoring error: {e}")
        return _err(500, "similarity_error", "An error occurred while finding similar cases.")


# ---------------------------------------------------------------------------
# Endpoint: /case-intelligence
# ---------------------------------------------------------------------------

class CaseIntelligenceRequest(BaseModel):
    user_fingerprint: CaseFingerprint
    matched_case_id: str


@app.post(
    "/case-intelligence",
    response_model=CaseIntelligence,
    responses={
        404: {"model": ErrorResponse, "description": "case_id not found in corpus"},
        422: {"model": ErrorResponse, "description": "LLM parse failure"},
        500: {"model": ErrorResponse, "description": "LLM unreachable or unexpected error"},
    },
    summary="Explain why a case won/lost and identify evidence gaps",
    tags=["Core"],
)
def case_intelligence(req: CaseIntelligenceRequest):
    """
    Given a matched_case_id, explain why it won/lost, what evidence mattered,
    and what evidence the user's case is missing.

    The designated "insufficient information" case (case_007 by default) returns
    an honest response without forcing a confident-sounding LLM answer.
    This is the live answer to Judge Q1.
    """
    matched = CORPUS_INDEX.get(req.matched_case_id)
    if not matched:
        return _err(404, "case_not_found", f"No case with id '{req.matched_case_id}' found.")

    # --- Insufficient information case: return honest response, no LLM call ---
    if matched.insufficient_information or req.matched_case_id == INSUFFICIENT_INFO_CASE_ID:
        logger.info(f"Returning insufficient-information response for {req.matched_case_id}")
        return CaseIntelligence(
            case_id=req.matched_case_id,
            outcome=matched.outcome.value if matched.outcome else "unknown",
            why_outcome_happened=(
                "⚠️ Insufficient information: The records for this case are incomplete. "
                "The available documents do not provide enough detail to reliably explain "
                "which arguments or evidence were decisive. Using this case as a strong "
                "precedent for your appeal would not be appropriate."
            ),
            successful_arguments=[
                "Case records are incomplete — arguments cannot be reliably assessed."
            ],
            evidence_that_mattered=[
                "Case records are incomplete — evidence details are not fully available."
            ],
            missing_evidence=[
                "Unable to determine evidence gaps due to incomplete case records. "
                "Consider reviewing other matched cases with more complete documentation."
            ],
            likely_insurer_counterarguments=[
                "Cannot reliably predict insurer counterarguments from incomplete records."
            ],
            grounding_note="insufficient_information — this case was flagged as having incomplete records.",
        )

    # --- Normal case: grounded LLM analysis ---
    user_prompt = prompts.CASE_INTELLIGENCE_USER_TEMPLATE.format(
        user_fingerprint_json=req.user_fingerprint.model_dump_json(indent=2),
        matched_case_json=matched.model_dump_json(indent=2),
        case_id=matched.id,
    )

    try:
        result = call_llm_json(prompts.CASE_INTELLIGENCE_SYSTEM_PROMPT, user_prompt)
    except json.JSONDecodeError:
        logger.warning(f"/case-intelligence — JSON parse failed for {req.matched_case_id}")
        return _err(
            422,
            "intelligence_error",
            "Could not parse case intelligence from the AI response. Please try again.",
        )
    except Exception as e:
        logger.error(f"/case-intelligence — LLM call failed: {e}")
        return _err(500, "llm_unavailable", "Could not reach the AI service. Please try again.")

    # Ensure required list fields exist and case_id is correct
    for list_field in [
        "successful_arguments",
        "evidence_that_mattered",
        "missing_evidence",
        "likely_insurer_counterarguments",
    ]:
        if not isinstance(result.get(list_field), list):
            result[list_field] = []

    result["case_id"] = req.matched_case_id
    if "outcome" not in result or not result["outcome"]:
        result["outcome"] = matched.outcome.value if matched.outcome else "unknown"
    if "grounding_note" not in result:
        result["grounding_note"] = f"Analysis grounded on {req.matched_case_id} case record."

    try:
        return CaseIntelligence(**result)
    except Exception as e:
        logger.error(f"/case-intelligence — validation error: {e}")
        return _err(
            422,
            "intelligence_error",
            "AI response did not match expected schema. Please try again.",
        )


# ---------------------------------------------------------------------------
# Endpoint: /appeal
# ---------------------------------------------------------------------------

class AppealRequest(BaseModel):
    user_fingerprint: CaseFingerprint
    precedent_case_ids: list[str]
    missing_evidence: list[str] = []


@app.post(
    "/appeal",
    responses={
        200: {"description": "Appeal letter and action plan generated"},
        404: {"model": ErrorResponse, "description": "A precedent case_id not found"},
        422: {"model": ErrorResponse, "description": "LLM parse failure"},
        500: {"model": ErrorResponse, "description": "Unexpected error"},
    },
    summary="Generate grievance appeal letter and action plan",
    tags=["Core"],
)
def generate_appeal(req: AppealRequest):
    """
    Generate an evidence-backed appeal letter and next-action plan.

    - Citations must trace to case source_citation or regulation_sources in the corpus.
    - Falls back to a template-fill letter if the LLM fails (so Person C always has
      something to render on the appeal screen).
    """
    precedents = [CORPUS_INDEX[cid] for cid in req.precedent_case_ids if cid in CORPUS_INDEX]
    missing_ids = [cid for cid in req.precedent_case_ids if cid not in CORPUS_INDEX]
    if missing_ids:
        return _err(404, "case_not_found", f"Precedent case(s) not found: {missing_ids}")

    user_prompt = prompts.APPEAL_USER_TEMPLATE.format(
        user_fingerprint_json=req.user_fingerprint.model_dump_json(indent=2),
        precedent_cases_json=json.dumps([p.model_dump() for p in precedents], indent=2),
        missing_evidence_json=json.dumps(req.missing_evidence),
    )

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            max_tokens=1500,
            messages=[
                {"role": "system", "content": prompts.APPEAL_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        letter = resp.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"/appeal — LLM call failed: {e}")
        # Fallback: template-fill so Person C has something to render
        return _appeal_template_fallback(req, precedents)

    # Build action plan and citations from the corpus data (grounded, not invented)
    # Filter out any synthetic / illustrative placeholders so they never leak into user outputs
    raw_citations = []
    for p in precedents:
        if p.source_citation:
            raw_citations.append(p.source_citation)
        raw_citations.extend(p.regulation_sources or [])

    clean_citations = [c for c in raw_citations if not _is_synthetic_citation(c)]

    action_plan = [
        "Submit this appeal letter to the insurer's Grievance Redressal Officer (GRO) "
        "by registered post and/or email. Retain proof of submission.",
        "If no response or unsatisfactory response within 15 days, escalate to the "
        "Insurance Ombudsman at https://bimabharosa.irdai.gov.in/.",
        "File a complaint on the IRDAI Bima Bharosa portal if the ombudsman route "
        "is not applicable to your case.",
        "If the ombudsman ruling is unfavorable, consider the consumer forum route "
        "under the Consumer Protection Act 2019.",
        "Keep copies of all correspondence with timestamps.",
    ]

    return {
        "appeal_letter": letter,
        "action_plan": action_plan,
        "citations_used": list(dict.fromkeys(clean_citations)),  # deduplicate, preserve order
    }


def _is_synthetic_citation(text: Optional[str]) -> bool:
    if not text:
        return True
    lower = text.lower()
    return "illustrative" in lower or "synthetic" in lower


def _appeal_template_fallback(req: AppealRequest, precedents: list[CaseFingerprint]) -> dict:
    """
    Template-fill appeal letter when LLM call fails.
    Per spec fallback guidance — better to render something than nothing on the appeal screen.
    All citations grounded on corpus data only.
    """
    fp = req.user_fingerprint
    insurer = fp.insurer or "the insurer"
    condition = fp.condition or "the medical condition"
    amount = f"₹{fp.claim_amount:,.0f}" if fp.claim_amount else "the claimed amount"
    reason = fp.rejection_reason.value if fp.rejection_reason else "the stated reason"
    valid_precedent_refs = [
        p.source_citation for p in precedents
        if p.source_citation and not _is_synthetic_citation(p.source_citation)
    ]
    precedent_refs = ", ".join(valid_precedent_refs) or "relevant IRDAI regulations and provisions"

    letter = f"""To,
The Grievance Redressal Officer,
{insurer},

Subject: Formal Grievance — Rejection of Health Insurance Claim for {condition}

Dear Sir/Madam,

I write to formally contest the rejection of my health insurance claim of {amount} \
for treatment of {condition}, rejected on the grounds of {reason}.

I submit that this rejection is improper and not in accordance with the terms of my policy \
or applicable IRDAI regulations. I request a thorough and impartial review of my claim.

I draw your attention to the following precedent(s) adjudicated under comparable circumstances: \
{precedent_refs}. I respectfully request that the principles applied in those matters be \
considered in the review of my claim.

I request settlement of my claim in full within 15 days of receipt of this letter. Should this \
grievance not be resolved satisfactorily, I reserve the right to escalate to the Insurance \
Ombudsman under the Insurance Ombudsman Rules 2017, and/or file a complaint on the IRDAI \
Bima Bharosa portal.

I am prepared to provide any additional documentation required.

Yours faithfully,
[Policyholder Name]
[Policy Number]
[Date of writing]
[Contact details]"""

    raw_citations = []
    for p in precedents:
        if p.source_citation:
            raw_citations.append(p.source_citation)
        raw_citations.extend(p.regulation_sources or [])

    clean_citations = [c for c in raw_citations if not _is_synthetic_citation(c)]

    action_plan = [
        "Submit this letter to the insurer's Grievance Redressal Officer by registered post/email.",
        "Retain courier receipt or email timestamp as proof of submission.",
        "If no satisfactory response within 15 days, file with the Insurance Ombudsman: "
        "https://bimabharosa.irdai.gov.in/",
        "Escalate to IRDAI Bima Bharosa portal if ombudsman jurisdiction doesn't apply.",
        "Keep all correspondence and timestamps organized for the ombudsman/forum proceedings.",
    ]

    return {
        "appeal_letter": letter,
        "action_plan": action_plan,
        "citations_used": list(dict.fromkeys(clean_citations)),
    }


# ---------------------------------------------------------------------------
# Health check + debug
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "ClaimShield API",
        "version": "1.0.0",
        "corpus_cases": len(CORPUS),
        "docs": "/docs",
    }


@app.get("/corpus", tags=["Debug"])
def get_corpus():
    """Debug endpoint — dump the loaded case corpus."""
    return CORPUS
