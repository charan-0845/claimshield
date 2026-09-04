import React from "react";
import type {
  SimilarCaseMatch,
  ExtractedFingerprint,
  CaseIntelligence,
} from "../../types/claim";
import { getOutcomeBucket } from "../../types/claim";
import {
  Scale,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Info,
  ShieldCheck,
} from "lucide-react";

interface CaseDetailScreenProps {
  userFingerprint: ExtractedFingerprint;
  selectedMatch: SimilarCaseMatch;
  intelligence: CaseIntelligence;
  onProceedToAppeal: () => void;
  onBack: () => void;
}

export const CaseDetailScreen: React.FC<CaseDetailScreenProps> = ({
  userFingerprint,
  selectedMatch,
  intelligence,
  onProceedToAppeal,
  onBack,
}) => {
  const isInsufficient = intelligence.assessment === "Insufficient Information";
  const outcomeBucket = getOutcomeBucket(selectedMatch.case.outcome_category);

  const assessmentClass = isInsufficient
    ? "insufficient"
    : intelligence.assessment === "Potentially Strong"
    ? "strong"
    : intelligence.assessment === "Likely Consistent With Policy"
    ? "consistent"
    : "challengeable";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Assessment Header Banner */}
      <div className="glass-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div
              className="eyebrow"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <BookOpen size={14} /> Comparative Dispute Intelligence
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
                marginBottom: "8px",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)" }}>
                Case Analysis vs {selectedMatch.case.case_number}
              </h2>

              {/* Assessment Pill — dot+label inside neutral pill, never a % probability */}
              <div className={`assessment-pill ${assessmentClass}`}>
                <ShieldCheck size={14} />
                <span>{intelligence.assessment}</span>
              </div>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: "850px", lineHeight: "1.6" }}>
              {intelligence.assessment_rationale}
            </p>
          </div>

          <button className="btn-primary" onClick={onProceedToAppeal}>
            <span>Generate Grounded Appeal</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Safety Disclaimer */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}
        >
          <Info size={13} style={{ flexShrink: 0 }} />
          <span>
            <strong>Decision Support Only:</strong> This assessment evaluates factual and legal alignment with historical tribunal judgments. It does not provide legal advice or guarantee future judicial outcomes.
          </span>
        </div>
      </div>

      {/* Side-by-Side Fact Comparison */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "20px",
        }}
      >
        {/* User's Claim Facts */}
        <div className="glass-card">
          <div
            className="eyebrow"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <FileCheck size={16} /> Your Uploaded Claim Facts
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>INSURER</span>
              <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{userFingerprint.insurer}</span>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>CLAIM AMOUNT</span>
                <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  ₹{userFingerprint.claim_amount?.toLocaleString("en-IN")}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>STATUS</span>
                {/* Claim status is outcome-meaning: use unfavorable color */}
                <span style={{ fontWeight: 700, color: "var(--unfavorable)" }}>
                  {userFingerprint.claim_status}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>REJECTION REASON</span>
              <span style={{ fontWeight: 600 }}>{userFingerprint.rejection_reason}</span>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>CONDITION &amp; TREATMENT</span>
              <span>
                {userFingerprint.condition}
                {userFingerprint.treatment_type ? ` (${userFingerprint.treatment_type})` : ""}
              </span>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>INVOKED POLICY CLAUSE</span>
              <span style={{ fontSize: "0.86rem", color: "var(--text-muted)" }}>
                {userFingerprint.relevant_clause || "Standard exclusionary clause"}
              </span>
            </div>
          </div>
        </div>

        {/* Matched Precedent — no colored card border; outcome badge inside is the color signal */}
        <div className="glass-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              className="eyebrow"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Scale size={16} /> Matched Precedent Record
            </div>
            <span className={outcomeBucket.badgeClass}>
              {selectedMatch.case.outcome_category}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>CASE TITLE &amp; CITATION</span>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>{selectedMatch.case.case_title}</span>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                {selectedMatch.case.source_citation || selectedMatch.case.case_number}
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>FORUM &amp; JURISDICTION</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {selectedMatch.case.court} ({selectedMatch.case.jurisdiction})
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>RELIEF AWARDED</span>
                {/* Relief amount is outcome-meaning: favorable color is appropriate */}
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--favorable)" }}>
                  {selectedMatch.case.relief || "Claim allowed"}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>CORE DISPUTE ISSUE</span>
              <span style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>{selectedMatch.case.facts}</span>
            </div>

            {selectedMatch.case.source_url && (
              <div style={{ marginTop: "4px" }}>
                <a
                  href={selectedMatch.case.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    textDecoration: "none",
                  }}
                >
                  <span>View Primary Order Copy</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Why Outcome Happened */}
      <div className="glass-card">
        <div
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Scale size={18} />
          <span>Why Did Similar Cases Win or Lose? (Judicial Reasoning)</span>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
          Key judicial principles established in referenced tribunal records:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {intelligence.why_outcome_happened.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                background: "var(--bg)",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <CheckCircle
                size={16}
                style={{ color: "var(--text-muted)", marginTop: "3px", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.92rem", lineHeight: "1.5" }}>{item.point}</div>
                <div
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "6px",
                  }}
                >
                  Source Precedent: {item.source_citation || item.source_case_id}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Gap Detector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Evidence you have */}
        <div className="glass-card">
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Section heading icon: outcome-neutral. Favorable color communicates "have" meaning. */}
            <CheckCircle size={16} style={{ color: "var(--favorable)" }} />
            <span>Evidence In Your Record</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {intelligence.evidence_you_have.map((doc, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  background: "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.88rem",
                }}
              >
                <FileCheck size={14} style={{ color: "var(--favorable)", flexShrink: 0 }} />
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Missing evidence */}
        <div className="glass-card">
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Partial color communicates "missing/warning" meaning */}
            <AlertTriangle size={16} style={{ color: "var(--partial)" }} />
            <span>Missing / Critical Evidence to Procure</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {intelligence.missing_evidence.map((gap, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 14px",
                  background: "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--text)",
                    marginBottom: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--partial)",
                      flexShrink: 0,
                    }}
                  />
                  {gap.item}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {gap.why_it_matters}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Likely Insurer Counterarguments */}
      <div className="glass-card">
        <div
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {/* Unfavorable icon: color communicates "insurer defense" meaning */}
          <ShieldAlert size={18} style={{ color: "var(--unfavorable)" }} />
          <span>Likely Insurer Defense Arguments &amp; How to Rebut</span>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
          Anticipate the insurer's formal legal resistance based on historical dispute patterns:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {intelligence.likely_insurer_arguments.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--bg)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Defense Arg {idx + 1}: "{item.argument}"
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                REBUTTAL EVIDENCE / STRATEGY:
              </div>

              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {item.what_can_address_it.map((ans, aidx) => (
                  <li key={aidx} style={{ fontSize: "0.86rem", color: "var(--text-muted)" }}>
                    {ans}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Grounding Note — neutral info bar */}
      <div className="disclaimer-bar">
        <BookOpen size={15} style={{ flexShrink: 0 }} />
        <span>{intelligence.grounding_note}</span>
      </div>

      {/* Navigation Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Similar Cases
        </button>

        <button className="btn-primary" onClick={onProceedToAppeal}>
          <span>Draft Formal Grievance &amp; Action Plan →</span>
        </button>
      </div>
    </div>
  );
};
