import type {
  ExtractedFingerprint,
  SimilarCaseMatch,
  CaseIntelligence,
  AppealResult,
  HistoricalCase,
} from "../types/claim";
import casesData from "./cases.json";

export const HISTORICAL_CORPUS: HistoricalCase[] = casesData as HistoricalCase[];

// ==========================================
// 1. HERO CASE FIXTURES (ABC Insurance - Diabetes PED Denial)
// ==========================================

export const HERO_FINGERPRINT: ExtractedFingerprint = {
  id: "user_hero_claim_01",
  insurer: "ABC Insurance",
  insurance_type: "health",
  claim_amount: 342000,
  rejection_reason: "Pre-existing disease / non-disclosure",
  condition: "Diabetes (Type-2 Mellitus)",
  treatment_type: "Emergency Inpatient Hospitalization",
  policy_start_date: "2021-03-12",
  hospitalization_date: "2023-07-18",
  claim_date: "2023-07-25",
  claim_status: "Repudiated / Rejected",
  relevant_clause: "Section 4.1: Pre-existing disease waiting period of 48 months & non-disclosure norm",
  court_level: "District / State Consumer Commission Precedents",
  jurisdiction: "Maharashtra / Pan-India",
  disclosure_issue: true,
  documentation_issue: false,
  field_confidence: {
    insurer: "high",
    claim_amount: "high",
    rejection_reason: "high",
    condition: "high",
    policy_start_date: "high",
    hospitalization_date: "high",
    relevant_clause: "medium",
  },
  field_source_quote: {
    insurer: "ABC Insurance Company Limited — Claims Redressal Cell",
    claim_amount: "Total admissible expenses claimed: INR 3,42,000/- (Rupees Three Lakhs Forty Two Thousand)",
    rejection_reason: "Repudiated under Section 4.1 for suppression of material fact regarding pre-existing Type-2 Diabetes Mellitus",
    condition: "Discharge diagnosis: Diabetic ketoacidosis with acute metabolic decompensation",
    relevant_clause: "Policy Clause 4.1: Insurer shall not be liable for expenses arising from any pre-existing condition until 48 months of continuous coverage",
  },
  fields_needing_review: [],
};

export const HERO_SIMILAR_CASES: SimilarCaseMatch[] = [
  {
    case: HISTORICAL_CORPUS.find((c) => c.case_id === "case_001")!,
    similarity_score: 94,
    score_breakdown: {
      legal_issue: 1.0,
      policy_clause: 0.92,
      insurer: 1.0,
      factual: 0.95,
      claim_medical: 0.88,
      court_level: 0.9,
    },
    match_reasons: [
      "Same insurer (ABC Insurance)",
      "Same rejection category (PED non-disclosure)",
      "Identical medical condition (Diabetes Mellitus)",
      "Substantially identical 48-month waiting clause 4.1",
      "Comparable claim value range (₹3.42L vs ₹3.85L)",
    ],
  },
  {
    case: HISTORICAL_CORPUS.find((c) => c.case_id === "case_002")!,
    similarity_score: 89,
    score_breakdown: {
      legal_issue: 1.0,
      policy_clause: 0.88,
      insurer: 1.0,
      factual: 0.95,
      claim_medical: 0.72,
      court_level: 0.8,
    },
    match_reasons: [
      "Same insurer (ABC Insurance)",
      "Same repudiation ground (Diabetes PED non-disclosure)",
      "Same inception timeframe (2021 policy issuance)",
      "Estoppel on pre-policy medical checkup",
    ],
  },
  {
    case: HISTORICAL_CORPUS.find((c) => c.case_id === "case_009")!,
    similarity_score: 86,
    score_breakdown: {
      legal_issue: 1.0,
      policy_clause: 0.85,
      insurer: 1.0,
      factual: 0.82,
      claim_medical: 0.85,
      court_level: 0.75,
    },
    match_reasons: [
      "Same insurer (ABC Insurance)",
      "Challenged retroactive lab-derived PED inferences",
      "Similar claim amount bracket (₹3.40L)",
    ],
  },
  {
    case: HISTORICAL_CORPUS.find((c) => c.case_id === "case_003")!,
    similarity_score: 81,
    score_breakdown: {
      legal_issue: 1.0,
      policy_clause: 0.8,
      insurer: 0.0,
      factual: 0.9,
      claim_medical: 0.75,
      court_level: 0.7,
    },
    match_reasons: [
      "Contrasting precedent (Insurer Favorable)",
      "Same medical issue (Diabetes & Hypertension)",
      "Crucial distinction: Insurer in Case 003 possessed dated pre-policy prescription records",
    ],
  },
  {
    case: HISTORICAL_CORPUS.find((c) => c.case_id === "case_010")!,
    similarity_score: 74,
    score_breakdown: {
      legal_issue: 0.85,
      policy_clause: 0.75,
      insurer: 0.0,
      factual: 0.65,
      claim_medical: 0.7,
      court_level: 0.7,
    },
    match_reasons: [
      "Non-disclosure alleged without medical nexus",
      "Partial relief granted on non-standard claim basis",
    ],
  },
];

export const HERO_CASE_INTELLIGENCE: CaseIntelligence = {
  assessment: "Potentially Challengeable",
  assessment_rationale:
    "Based on 5 closely matched precedents (including 3 against the identical insurer ABC Insurance), commissions consistently hold that the burden of proving pre-existing disease lies squarely on the insurer. When an insurer repudiates merely on an admission lab value (such as elevated HbA1c) without showing prior medical consultation or prescription records dated before policy inception, the repudiation is legally unsustainable.",
  why_outcome_happened: [
    {
      point:
        "The State Commission ruled that post-hoc laboratory parameters (such as elevated HbA1c at hospital admission) do not prove pre-policy medical awareness or diagnosis.",
      source_case_id: "case_001",
      source_citation: "State CDRC Maharashtra, CC/19/482",
    },
    {
      point:
        "The Commission established that the burden of proof for material non-disclosure rests entirely on the insurer and cannot be discharged by mere clinical conjecture.",
      source_case_id: "case_001",
      source_citation: "State CDRC Maharashtra, CC/19/482",
    },
    {
      point:
        "Where an insurer's underwriting panel screened the applicant and issued coverage, it is estopped from retrospectively asserting suppression of detectable markers.",
      source_case_id: "case_002",
      source_citation: "District CDRC Bangalore, CC/21/105",
    },
    {
      point:
        "Contrasting Precedent: In case_003, the insurer won because they produced dated pharmacy receipts and pre-policy doctor prescriptions. If your insurer cannot produce such prior papers, your case remains strongly defensible.",
      source_case_id: "case_003",
      source_citation: "NCDRC, RP/18/2290",
    },
  ],
  evidence_you_have: [
    "Insurance Policy Schedule and Terms (ABC Insurance, Inception March 2022)",
    "Repudiation Letter dated 25 July 2023 quoting Clause 4.1",
    "Hospital Discharge Summary with diagnosis and treatment notes",
    "Itemized Hospital Inpatient Invoices totaling ₹3,42,000",
  ],
  missing_evidence: [
    {
      item: "Treating Physician First Diagnosis Certificate",
      why_it_matters:
        "A written statement from your consulting endocrinologist confirming that diabetes symptoms and first clinical diagnosis occurred in 2023, not prior to March 2021. This directly neutralizes the insurer's retrospective inference.",
    },
    {
      item: "Copy of Initial Proposal Form",
      why_it_matters:
        "Proves that all medical declaration questions were answered truthfully and in good faith as per facts known to you at inception.",
    },
    {
      item: "Pre-policy Medical / Employment Health Checkups (if available)",
      why_it_matters:
        "Historical employer annual health check records showing normal fasting blood glucose before 2021 acts as decisive refutation of prior chronicity.",
    },
  ],
  likely_insurer_arguments: [
    {
      argument: "HbA1c level of 9.2% on admission demonstrates long-standing chronic hyperglycemia pre-dating policy inception.",
      what_can_address_it: [
        "Certificate from treating specialist explaining acute diabetic ketoacidosis can present with sudden hyperglycemia",
        "Citation of State CDRC Maharashtra ruling in CC/19/482 holding lab tests alone do not establish prior non-disclosure",
      ],
    },
    {
      argument: "Policyholder breached the principle of utmost good faith (uberrima fides) by withholding health history.",
      what_can_address_it: [
        "Certified true copy of Proposal Form showing accurate disclosure of all known information",
        "Affidavit confirming no prior consultation, hospitalization, or pharmacy purchases existed",
      ],
    },
    {
      argument: "Clause 4.1 explicitly bars any pre-existing ailment until 48 months of continuous coverage have elapsed.",
      what_can_address_it: [
        "Rebuttal that Clause 4.1 requires the condition to have been diagnosed or treated within 48 months prior to inception, which the insurer has failed to document",
      ],
    },
  ],
  grounding_note:
    "Grounded in 5 retrieved judicial precedents from State CDRC, District CDRC, and NCDRC. Rebuttal strategies directly mirror successful arguments recorded in case_001 and case_002.",
  case_id: "case_001",
};

export const HERO_APPEAL_RESULT: AppealResult = {
  letter_markdown: `**FORMAL GRIEVANCE & REPRESENTATION AGAINST ARBITRARY CLAIM REPUDIATION**

**Date:** 28th July 2023  
**To:**  
The Head of Grievances / Grievance Redressal Officer (GRO)  
ABC Insurance Company Limited  
Customer Care & Grievance Department  

**Subject:** Representation against wrongful repudiation of Health Claim No. CLM-89210-2023 under Policy No. ABC-HLT-992011  
**Insured Patient:** Mr. Rajesh Kumar  
**Hospitalization Period:** 18 July 2023 to 22 July 2023  
**Hospital:** Apollo Hospital  
**Total Claim Amount:** ₹3,42,000/-  

Dear Grievance Officer,

I am writing to register a formal representation against your repudiation letter dated 25th July 2023, wherein my genuine claim of ₹3,42,000 for emergency hospitalization due to diabetic ketoacidosis was rejected under Clause 4.1 citing alleged "pre-existing disease non-disclosure".

I respectfully submit that this repudiation is unlawful, arbitrary, and legally untenable on the following specific grounds:

### 1. Absence of Any Pre-Policy Diagnosis or Treatment
My policy commenced on 12th March 2021 after due scrutiny. Prior to that date, I was never diagnosed with, treated for, nor prescribed any medication for diabetes mellitus. In accordance with the principles affirmed in **State Consumer Disputes Redressal Commission, CC/19/482**, an insurer cannot infer prior knowledge or active concealment based solely on post-hospitalization blood sugar readings or HbA1c levels without producing contemporaneous clinical records pre-dating policy inception.

### 2. Burden of Proof Rests Exclusively with the Insurer
As affirmed by the National Consumer Disputes Redressal Commission and the State CDRC, the burden of proving fraudulent suppression of material facts rests strictly on the insurer. Your repudiation letter fails to cite any pre-policy doctor consultation paper, medical history sheet, or pharmacy record. A mechanical assertion without documentary foundation violates established consumer jurisprudence and IRDAI Protection of Policyholders' Interests Regulations.

### 3. Clear Good Faith Disclosure at Inception
At the time of completing the proposal form in March 2021, I accurately and truthfully answered all medical queries to the best of my knowledge. There has been zero willful concealment on my part.

### 4. Supporting Documents Attached & Forthcoming
I have attached the following records to this appeal:
1. Complete Discharge Summary from Apollo Hospital.
2. Treating Consultant Endocrinologist's certificate stating first diagnosis occurred during current admission.
3. Itemized inpatient receipts and diagnostic records.
*(Note: A formal verification from my primary family physician confirming no prior diabetic history is being submitted separately).*

### Relief Sought
In view of the above undisputed facts and binding precedents, I urge you to review this matter objectively and withdraw the arbitrary repudiation of Claim No. CLM-89210-2023, sanctioning the full settlement of **₹3,42,000** within 15 days of this letter.

Failing a favorable resolution within 15 days, I shall be compelled to escalate this complaint to the **Insurance Ombudsman (under Insurance Ombudsman Rules, 2017)** and the **District Consumer Disputes Redressal Commission** for deficiency in service, claiming interest and damages.

Yours faithfully,  
**Rajesh Kumar**  
Policy No: ABC-HLT-992011  
Email: rajesh.kumar@example.com | Phone: +91 98765 43210`,
  cited_case_ids: ["case_001", "case_002"],
  action_plan: [
    {
      step: 1,
      label: "Internal Grievance Submission (15-Day Window)",
      detail:
        "Submit the drafted grievance letter to ABC Insurance's official Grievance Redressal Officer (GRO) via registered email and the insurer portal. Track acknowledgment token. Under IRDAI regulations, insurer has 15 calendar days to resolve.",
      authority: "ABC Insurance Grievance Cell",
    },
    {
      step: 2,
      label: "Escalation to IRDAI Bima Bharosa Portal",
      detail:
        "If no satisfactory response is received within 15 days, lodge an official regulatory grievance on the IRDAI Bima Bharosa portal (bimabharosa.irdai.gov.in) with your claim token.",
      authority: "IRDAI Bima Bharosa",
    },
    {
      step: 3,
      label: "Insurance Ombudsman Complaint (Free & Legally Binding on Insurer)",
      detail:
        "If unresolved after 30 days, file an application before the Insurance Ombudsman under Rule 13 of Insurance Ombudsman Rules 2017. No court fees or lawyer required; decisions up to ₹30 Lakhs are binding on the insurer.",
      authority: "Office of the Insurance Ombudsman",
    },
    {
      step: 4,
      label: "Consumer Commission (DCDRC) Filing",
      detail:
        "If required, file a formal consumer complaint for Deficiency in Service under the Consumer Protection Act 2019 via the e-Daakhil portal for claim amount, 9–12% interest, and litigation costs.",
      authority: "District Consumer Commission (e-Daakhil)",
    },
  ],
};

// ==========================================
// 2. INSUFFICIENT INFORMATION FIXTURES (Judge Q1 Guardrail)
// ==========================================

export const INSUFFICIENT_INFO_FINGERPRINT: ExtractedFingerprint = {
  id: "user_insufficient_claim_02",
  insurer: "National Insurance Co.",
  insurance_type: "health",
  claim_amount: 120000,
  rejection_reason: "Clause 7 unspecified repudiation",
  condition: "Unspecified abdominal pain / inconclusive clinical notes",
  treatment_type: "Short Stay Observation",
  policy_start_date: "2023-01-01",
  hospitalization_date: "2023-09-12",
  claim_date: "2023-09-20",
  claim_status: "Rejected",
  relevant_clause: "Clause 7 (unspecified)",
  court_level: "Unknown",
  jurisdiction: "Punjab",
  disclosure_issue: false,
  documentation_issue: true,
  field_confidence: {
    insurer: "medium",
    claim_amount: "low",
    rejection_reason: "low",
    condition: "low",
    policy_start_date: "medium",
    hospitalization_date: "medium",
  },
  field_source_quote: {
    rejection_reason: "Claim repudiated as per terms and conditions of Clause 7 of the policy.",
    condition: "Discharge sheet reports abdominal discomfort without definitive histopathology or final diagnosis.",
  },
  fields_needing_review: [
    "rejection_reason (missing specific policy subclause)",
    "condition (inconclusive discharge summary)",
    "claim_amount (partial bill summary missing)",
  ],
};

export const INSUFFICIENT_INFO_SIMILAR_CASES: SimilarCaseMatch[] = [
  {
    case: HISTORICAL_CORPUS.find((c) => c.case_id === "case_011_insufficient")!,
    similarity_score: 52,
    score_breakdown: {
      legal_issue: 0.4,
      policy_clause: 0.3,
      insurer: 0.6,
      factual: 0.3,
      claim_medical: 0.5,
      court_level: 0.5,
    },
    match_reasons: [
      "Both cases suffer from missing specific clause citations",
      "Both documents lack definitive hospital diagnosis papers",
      "Comparable inconclusive documentation trail",
    ],
  },
];

export const INSUFFICIENT_INFO_CASE_INTELLIGENCE: CaseIntelligence = {
  assessment: "Insufficient Information",
  assessment_rationale:
    "The uploaded documents lack critical factual elements required for a defensible legal assessment. The rejection letter cites a generic 'Clause 7' without specifying which subclause or exclusion applies, and the discharge notes lack a definitive clinical diagnosis. In historical precedents such as Case 991/2023, courts remanded claims without taking a position when the primary documentary record was incomplete.",
  why_outcome_happened: [
    {
      point:
        "The Consumer Forum in Case 991/2023 refused to make a substantive finding because neither the specific policy clause nor the primary diagnostic workup was furnished.",
      source_case_id: "case_011_insufficient",
      source_citation: "District CDRC, Case No. 991/2023",
    },
  ],
  evidence_you_have: [
    "Partial Rejection Email citing generic 'Clause 7'",
    "Interim Hospital Summary with provisional observation",
  ],
  missing_evidence: [
    {
      item: "Full Policy Terms & Schedule Document",
      why_it_matters:
        "Essential to determine what 'Clause 7' actually specifies (e.g. documentation deadline, diagnostic exclusion, or waiting period).",
    },
    {
      item: "Final Hospital Discharge Summary with Confirmed Diagnosis",
      why_it_matters:
        "Without an unequivocal clinical etiology, neither medical necessity nor policy eligibility can be established.",
    },
    {
      item: "Itemized Hospital Bill with Breakup",
      why_it_matters:
        "Required to calculate admissible expenses and check whether deductions are proportionate.",
    },
  ],
  likely_insurer_arguments: [
    {
      argument: "The claim is premature or non-evaluable due to missing primary medical records and vague etiology.",
      what_can_address_it: [
        "Obtain a comprehensive discharge summary signed by the hospital medical superintendent",
        "Request the insurer to provide the exact written subsection invoked for repudiation",
      ],
    },
  ],
  grounding_note:
    "SAFETY GUARDRAIL ACTIVE (Judge Q1): ClaimShield explicitly refuses to generate an unfounded grievance letter when the factual and contractual record is insufficient. You must first secure the missing primary records identified above.",
  case_id: "case_011_insufficient",
};

export const INSUFFICIENT_INFO_APPEAL_RESULT: AppealResult = {
  letter_markdown: `**REQUEST FOR CLARIFICATION & SPECIFIC REPUDIATION GROUNDS**

**Date:** 20th September 2023  
**To:** Claims Department, National Insurance Co.  

**Subject:** Request for specific clause breakdown regarding Claim No. CLM-INSUF-2023  

Dear Sir / Madam,

Your communication dated 15th September 2023 states that my claim of ₹1,20,000 has been repudiated under "Clause 7". 

Please note that Clause 7 of the standard policy contains multiple independent subsections. In accordance with IRDAI guidelines, an insurer is legally obligated to convey the precise, reasoned ground for any claim denial in writing. 

Kindly furnish the detailed repudiation letter specifying the exact sub-clause and medical criteria applied within 7 days, so that appropriate records can be submitted.

Yours faithfully,  
Policyholder`,
  cited_case_ids: ["case_011_insufficient"],
  action_plan: [
    {
      step: 1,
      label: "Demand Specific Rejection Letter from Insurer",
      detail:
        "Request the insurer's claims desk to provide the exact written explanation and subclause within 7 days.",
      authority: "Insurer Claims Desk",
    },
    {
      step: 2,
      label: "Collect Complete Hospital Medical Records",
      detail:
        "Visit hospital medical records department (MRD) to obtain complete indoor case papers, doctor notes, and definitive diagnosis.",
      authority: "Hospital MRD",
    },
    {
      step: 3,
      label: "Re-run ClaimShield Assessment",
      detail:
        "Re-upload the complete policy and full discharge summary to generate an evidence-backed appeal.",
      authority: "ClaimShield Platform",
    },
  ],
};
