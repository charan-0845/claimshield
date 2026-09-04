/**
 * ClaimShield Core Data Types & Contract
 * Aligned with spec Section 25 and Person B's backend schema.
 */

export type OutcomeCategory =
  | "Policyholder favorable"
  | "Insurer favorable"
  | "Partial relief"
  | "Complaint dismissed"
  | "Claim remanded"
  | "Settlement"
  | "Appeal pending"
  | "Appeal allowed"
  | "Appeal dismissed"
  | "Unknown";

export type OutcomeBucket = "favorable" | "partial" | "unfavorable";

export interface HistoricalCase {
  case_id: string;
  case_title: string;
  court: string;
  jurisdiction: string;
  case_number: string;
  date: string;
  insurer: string;
  insurance_type: "health";
  claim_amount?: number;
  issue: string;
  denial_reason: string;
  policy_clause: string;
  facts: string;
  policyholder_argument: string;
  insurer_argument: string;
  court_reasoning: string;
  decision: string;
  outcome_category: OutcomeCategory;
  relief: string;
  case_status: string;
  source_url: string;
  source_document?: string;
  source_page_or_paragraph?: string;
  // Supplemental fields from schema
  successful_arguments?: string[];
  failed_arguments?: string[];
  key_evidence?: string[];
  source_citation?: string;
}

export interface ExtractedFingerprint {
  id?: string;
  offline?: boolean;
  insurer: string;
  insurance_type: "health";
  claim_amount: number;
  rejection_reason: string;
  condition: string;
  treatment_type?: string;
  policy_start_date: string;
  hospitalization_date: string;
  claim_date?: string;
  claim_status: string;
  relevant_clause?: string;
  court_level?: string;
  jurisdiction?: string;
  disclosure_issue?: boolean;
  documentation_issue?: boolean;
  // Per-field metadata for confidence pills and source quotes
  field_confidence?: Record<string, "high" | "medium" | "low">;
  field_source_quote?: Record<string, string>;
  fields_needing_review?: string[];
}

export interface SimilarCaseMatch {
  case: HistoricalCase;
  similarity_score: number; // 0–100
  score_breakdown: {
    legal_issue: number;
    policy_clause: number;
    insurer: number;
    factual: number;
    claim_medical: number;
    court_level: number;
  };
  match_reasons: string[]; // ["Same insurer", "Same denial category (PED)"]
}

export type AssessmentLabel =
  | "Potentially Strong"
  | "Potentially Challengeable"
  | "Likely Consistent With Policy"
  | "Insufficient Information";

export interface CaseIntelligence {
  assessment: AssessmentLabel;
  assessment_rationale: string; // Grounded citation, never a % probability
  why_outcome_happened: { point: string; source_case_id: string; source_citation?: string }[];
  evidence_you_have: string[];
  missing_evidence: { item: string; why_it_matters: string }[];
  likely_insurer_arguments: { argument: string; what_can_address_it: string[] }[];
  grounding_note: string; // e.g. "Based on retrieved cases" or insufficiency note
  case_id?: string;
}

export interface AppealResult {
  letter_markdown: string;
  cited_case_ids: string[]; // Subset of retrieved cases, never invented
  action_plan: { step: number; label: string; detail: string; authority?: string }[];
}

/**
 * Outcome Bucket Mapping according to spec Section 10 & plan tokens.
 */
export function getOutcomeBucket(outcome: string): {
  bucket: OutcomeBucket;
  label: string;
  colorVar: string;
  badgeClass: string;
} {
  const norm = (outcome || "").toLowerCase();

  if (
    norm.includes("policyholder favorable") ||
    norm.includes("appeal allowed") ||
    norm.includes("settlement")
  ) {
    return {
      bucket: "favorable",
      label: outcome || "Policyholder Favorable",
      colorVar: "var(--favorable)",
      badgeClass: "badge-favorable",
    };
  }

  if (
    norm.includes("insurer favorable") ||
    norm.includes("complaint dismissed") ||
    norm.includes("appeal dismissed")
  ) {
    return {
      bucket: "unfavorable",
      label: outcome || "Insurer Favorable",
      colorVar: "var(--unfavorable)",
      badgeClass: "badge-unfavorable",
    };
  }

  // Partial relief, remanded, appeal pending, unknown
  return {
    bucket: "partial",
    label: outcome || "Partial Relief / Uncertain",
    colorVar: "var(--partial)",
    badgeClass: "badge-partial",
  };
}
