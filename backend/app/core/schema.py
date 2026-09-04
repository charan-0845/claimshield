"""
ClaimShield core data schema.

This is the SHARED CONTRACT for the hackathon. Everyone (dataset, backend,
frontend) should treat these field names as fixed once agreed — changing
them mid-hackathon breaks three people's work at once.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class RejectionCategory(str, Enum):
    PED_NON_DISCLOSURE = "ped_non_disclosure"
    WAITING_PERIOD = "waiting_period"
    POLICY_EXCLUSION = "policy_exclusion"
    DOCUMENTATION = "documentation"
    PARTIAL_SETTLEMENT = "partial_settlement"


class CourtLevel(str, Enum):
    DISTRICT_COMMISSION = "district_commission"
    STATE_COMMISSION = "state_commission"
    NATIONAL_COMMISSION = "national_commission"
    OMBUDSMAN = "ombudsman"
    HIGH_COURT = "high_court"
    UNKNOWN = "unknown"


class Outcome(str, Enum):
    POLICYHOLDER_FAVORABLE = "policyholder_favorable"
    PARTIAL_RELIEF = "partial_relief"
    INSURER_FAVORABLE = "insurer_favorable"


class CaseFingerprint(BaseModel):
    """
    The structured representation of ANY case — whether it's the user's
    freshly-uploaded rejected claim, or a historical case in the corpus.
    Same shape for both, which is what makes similarity scoring simple.
    """
    id: str
    insurer: str
    insurance_type: str = "health"
    claim_amount: Optional[float] = None
    rejection_reason: RejectionCategory
    condition: str = Field(description="Medical condition at issue, e.g. 'diabetes'")
    treatment_type: Optional[str] = None
    policy_start_date: Optional[str] = None  # ISO date
    hospitalization_date: Optional[str] = None  # ISO date
    claim_date: Optional[str] = None
    relevant_policy_clause: Optional[str] = None
    disclosure_issue: bool = False
    documentation_issue: bool = False
    court_level: CourtLevel = CourtLevel.UNKNOWN
    jurisdiction: Optional[str] = None

    # Fields only present on HISTORICAL corpus cases (None for user's case)
    outcome: Optional[Outcome] = None
    decision_summary: Optional[str] = None
    successful_arguments: Optional[list[str]] = None
    failed_arguments: Optional[list[str]] = None
    key_evidence: Optional[list[str]] = None
    source_citation: Optional[str] = None  # e.g. "NCDRC, Consumer Case No. X, 2023"
    source_url: Optional[str] = None


class ExtractionResult(BaseModel):
    """What the extraction step returns for a user's uploaded documents."""
    fingerprint: CaseFingerprint
    extraction_confidence: str  # "high" | "medium" | "low"
    fields_needing_review: list[str] = []
    source_spans: dict[str, str] = {}  # field_name -> quoted source text


class SimilarCaseMatch(BaseModel):
    case: CaseFingerprint
    overall_score: float  # 0-1
    score_breakdown: dict[str, float]  # e.g. {"legal_issue": 0.35, ...}
    match_reasons: list[str]  # human-readable, e.g. "Same insurer", "Same denial category"


class CaseIntelligence(BaseModel):
    """The 'why did they win/lose' + evidence gap + counterargument bundle for one matched case."""
    case_id: str
    why_outcome_happened: str
    missing_evidence: list[str]
    likely_insurer_counterarguments: list[str]
    grounding_note: str  # what this is/isn't based on, e.g. "insufficient information" fallback


class CaseAssessment(BaseModel):
    verdict: str  # "potentially_challengeable" | "likely_consistent" | "insufficient_information"
    reasoning: str
    confidence: str


class ActionPlan(BaseModel):
    steps: list[str]
    appeal_letter_draft: Optional[str] = None
