/**
 * ClaimShield Client-Side Similarity Engine
 * Pure TypeScript implementation of the scoring weights and logic in spec §9 and similarity.py:
 *   35% Legal issue similarity
 *   20% Policy clause similarity (Levenshtein / bigram ratio)
 *   15% Insurer similarity
 *   15% Factual similarity (condition + treatment)
 *   10% Claim amount similarity
 *    5% Court / jurisdiction level
 */

import type { ExtractedFingerprint, HistoricalCase, SimilarCaseMatch } from "../types/claim";

const WEIGHTS = {
  legal_issue: 0.35,
  policy_clause: 0.2,
  insurer: 0.15,
  factual: 0.15,
  claim_medical: 0.1,
  court_level: 0.05,
};

function stringSimilarity(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;

  // Simple token overlap / Jaccard for robust text comparison
  const tokens1 = new Set(s1.split(/\W+/).filter(Boolean));
  const tokens2 = new Set(s2.split(/\W+/).filter(Boolean));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersection++;
  });

  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? intersection / union : 0;
}

function claimAmountSimilarity(a?: number | null, b?: number | null): number {
  if (!a || !b) return 0.5; // neutral if unknown
  const minVal = Math.min(a, b);
  const maxVal = Math.max(a, b);
  if (maxVal === 0) return 0;
  return minVal / maxVal;
}

export function scoreHistoricalCase(
  query: ExtractedFingerprint,
  candidate: HistoricalCase
): SimilarCaseMatch {
  const breakdown = {
    legal_issue: 0,
    policy_clause: 0,
    insurer: 0,
    factual: 0,
    claim_medical: 0,
    court_level: 0,
  };
  const reasons: string[] = [];

  // 1. Legal Issue Similarity (35%)
  const qReason = (query.rejection_reason || "").toLowerCase();
  const cReason = (candidate.denial_reason || candidate.issue || "").toLowerCase();

  const isPED = qReason.includes("ped") || qReason.includes("pre-existing") || qReason.includes("disclosure");
  const cPED = cReason.includes("ped") || cReason.includes("pre-existing") || cReason.includes("disclosure");

  const isWaiting = qReason.includes("waiting");
  const cWaiting = cReason.includes("waiting");

  const isExclusion = qReason.includes("exclusion");
  const cExclusion = cReason.includes("exclusion");

  if ((isPED && cPED) || (isWaiting && cWaiting) || (isExclusion && cExclusion)) {
    breakdown.legal_issue = 1.0;
    reasons.push(`Same denial category (${candidate.denial_reason || candidate.issue})`);
  } else {
    breakdown.legal_issue = stringSimilarity(qReason, cReason);
  }

  // 2. Policy Clause Similarity (20%)
  breakdown.policy_clause = stringSimilarity(query.relevant_clause, candidate.policy_clause);
  if (breakdown.policy_clause > 0.4) {
    reasons.push("Substantially similar policy clause structure");
  }

  // 3. Insurer Similarity (15%)
  const qInsurer = (query.insurer || "").toLowerCase().trim();
  const cInsurer = (candidate.insurer || "").toLowerCase().trim();
  if (qInsurer && cInsurer && (qInsurer.includes(cInsurer) || cInsurer.includes(qInsurer))) {
    breakdown.insurer = 1.0;
    reasons.push(`Same insurer (${candidate.insurer})`);
  } else {
    breakdown.insurer = 0.0;
  }

  // 4. Factual Similarity (Condition + Treatment) (15%)
  const qCond = (query.condition || "").toLowerCase().trim();
  const cFacts = `${candidate.issue} ${candidate.facts}`.toLowerCase();
  let factualScore = 0;
  if (qCond && cFacts.includes(qCond)) {
    factualScore += 0.7;
    reasons.push(`Matching medical condition (${query.condition})`);
  } else {
    factualScore += stringSimilarity(qCond, candidate.facts) * 0.5;
  }
  if (query.treatment_type && cFacts.includes(query.treatment_type.toLowerCase())) {
    factualScore += 0.3;
  }
  breakdown.factual = Math.min(1.0, factualScore);

  // 5. Claim / Medical Amount Similarity (10%)
  breakdown.claim_medical = claimAmountSimilarity(query.claim_amount, candidate.claim_amount);
  if (breakdown.claim_medical > 0.75) {
    reasons.push("Comparable claim amount bracket");
  }

  // 6. Court Level / Jurisdiction (5%)
  if (query.court_level && candidate.court.toLowerCase().includes(query.court_level.toLowerCase())) {
    breakdown.court_level = 1.0;
  } else if (query.jurisdiction && candidate.jurisdiction.toLowerCase().includes(query.jurisdiction.toLowerCase())) {
    breakdown.court_level = 0.5;
  } else {
    breakdown.court_level = 0.2;
  }

  // Compute Overall Weighted Score
  const rawScore =
    breakdown.legal_issue * WEIGHTS.legal_issue +
    breakdown.policy_clause * WEIGHTS.policy_clause +
    breakdown.insurer * WEIGHTS.insurer +
    breakdown.factual * WEIGHTS.factual +
    breakdown.claim_medical * WEIGHTS.claim_medical +
    breakdown.court_level * WEIGHTS.court_level;

  const similarity_score = Math.round(rawScore * 100);

  return {
    case: candidate,
    similarity_score: Math.max(25, Math.min(99, similarity_score)),
    score_breakdown: {
      legal_issue: Number(breakdown.legal_issue.toFixed(2)),
      policy_clause: Number(breakdown.policy_clause.toFixed(2)),
      insurer: Number(breakdown.insurer.toFixed(2)),
      factual: Number(breakdown.factual.toFixed(2)),
      claim_medical: Number(breakdown.claim_medical.toFixed(2)),
      court_level: Number(breakdown.court_level.toFixed(2)),
    },
    match_reasons: reasons.length > 0 ? reasons : ["General health insurance dispute precedent"],
  };
}

export function rankCorpus(
  query: ExtractedFingerprint,
  corpus: HistoricalCase[],
  topK = 5
): SimilarCaseMatch[] {
  const matches = corpus.map((c) => scoreHistoricalCase(query, c));
  matches.sort((a, b) => b.similarity_score - a.similarity_score);
  return matches.slice(0, topK);
}
