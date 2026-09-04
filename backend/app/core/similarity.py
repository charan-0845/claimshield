"""
Hybrid-ish similarity scoring for ClaimShield MVP.

For a 15-20 case corpus at hackathon scale, real embedding search is
overkill and harder to explain to judges. This uses transparent structured
scoring per spec section 9, which has the bonus of being directly
explainable ("why is this similar?") for free.

Weights match the spec's example scoring model (section 9):
  35% legal issue similarity   -> same rejection_reason
  20% policy clause similarity -> fuzzy match on relevant_policy_clause
  15% insurer similarity       -> same insurer
  15% factual similarity       -> same condition / treatment_type
  10% claim/medical similarity -> claim amount in similar range
   5% court/jurisdiction       -> same court_level

If you have time left after 5:00 (per the hour-by-hour plan), swap the
`_clause_similarity` naive string match for a real embedding call —
everything else stays the same.
"""

from difflib import SequenceMatcher
from .schema import CaseFingerprint, SimilarCaseMatch

WEIGHTS = {
    "legal_issue": 0.35,
    "policy_clause": 0.20,
    "insurer": 0.15,
    "factual": 0.15,
    "claim_medical": 0.10,
    "court_jurisdiction": 0.05,
}


def _clause_similarity(a: str | None, b: str | None) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _claim_amount_similarity(a: float | None, b: float | None) -> float:
    if a is None or b is None:
        return 0.5  # neutral if unknown, don't punish
    if a == 0 or b == 0:
        return 0.0
    ratio = min(a, b) / max(a, b)
    return ratio  # closer amounts -> closer to 1.0


def score_case(query: CaseFingerprint, candidate: CaseFingerprint) -> SimilarCaseMatch:
    scores: dict[str, float] = {}
    reasons: list[str] = []

    # Legal issue similarity
    if query.rejection_reason is not None and query.rejection_reason == candidate.rejection_reason:
        scores["legal_issue"] = 1.0
        reasons.append(f"Same denial category ({candidate.rejection_reason.value})")
    else:
        scores["legal_issue"] = 0.0

    # Policy clause similarity
    scores["policy_clause"] = _clause_similarity(
        query.relevant_policy_clause, candidate.relevant_policy_clause
    )
    if scores["policy_clause"] > 0.6:
        reasons.append("Similar policy clause")

    # Insurer similarity
    if query.insurer.strip().lower() == candidate.insurer.strip().lower():
        scores["insurer"] = 1.0
        reasons.append("Same insurer")
    else:
        scores["insurer"] = 0.0

    # Factual similarity (condition + treatment type)
    condition_match = query.condition.strip().lower() == candidate.condition.strip().lower()
    treatment_match = (
        query.treatment_type
        and candidate.treatment_type
        and query.treatment_type.strip().lower() == candidate.treatment_type.strip().lower()
    )
    factual_score = 0.0
    if condition_match:
        factual_score += 0.7
        reasons.append(f"Same medical condition ({candidate.condition})")
    if treatment_match:
        factual_score += 0.3
    scores["factual"] = min(factual_score, 1.0)

    # Claim/medical amount similarity
    scores["claim_medical"] = _claim_amount_similarity(query.claim_amount, candidate.claim_amount)

    # Court/jurisdiction similarity
    if query.court_level == candidate.court_level:
        scores["court_jurisdiction"] = 1.0
    elif query.jurisdiction and query.jurisdiction == candidate.jurisdiction:
        scores["court_jurisdiction"] = 0.5
    else:
        scores["court_jurisdiction"] = 0.0

    overall = sum(scores[k] * WEIGHTS[k] for k in WEIGHTS)

    # Per spec: match_explanation booleans are required on every result.
    # "Never return only a percentage" — these booleans are what the frontend
    # renders in the "Why is this similar?" section.
    match_explanation = {
        "same_insurer": scores["insurer"] >= 1.0,
        "same_reason": scores["legal_issue"] == 1.0,
        "similar_clause": scores["policy_clause"] >= 0.5 or scores["legal_issue"] == 1.0,
        "similar_facts": scores["factual"] >= 0.4 and scores["claim_medical"] >= 0.5,
    }

    return SimilarCaseMatch(
        case=candidate,
        overall_score=round(overall, 4),
        score_breakdown={k: round(v, 2) for k, v in scores.items()},
        match_reasons=reasons or ["Some factual overlap, but limited direct match"],
        match_explanation=match_explanation,
    )


def find_similar_cases(
    query: CaseFingerprint, corpus: list[CaseFingerprint], top_k: int = 5
) -> list[SimilarCaseMatch]:
    matches = [score_case(query, c) for c in corpus if c.id != query.id]
    matches.sort(key=lambda m: m.overall_score, reverse=True)
    return matches[:top_k]
