import React, { useState } from "react";
import {
  Upload,
  Zap,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface UploadScreenProps {
  onAnalyze: (policyText: string, rejectionText: string) => void;
  onLoadHeroDemo: () => void;
  onLoadInsufficientDemo: () => void;
  isLoading: boolean;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onAnalyze,
  onLoadHeroDemo,
  onLoadInsufficientDemo,
  isLoading,
}) => {
  const [rejectionText, setRejectionText] = useState("");
  const [policyText, setPolicyText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionText.trim()) return;
    onAnalyze(policyText, rejectionText);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Intro Banner with Demo Presets */}
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
              <Upload size={14} /> Claim Ingestion &amp; Dispute Analysis
            </div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text)" }}>
              Analyze My Insurance Rejection
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.92rem",
                marginTop: "4px",
                maxWidth: "650px",
              }}
            >
              Paste your repudiation letter and policy clauses to extract a structured case fingerprint, compare against consumer court precedents, and identify missing evidence.
            </p>
          </div>

          {/* Demo Pre-fill Controls — identical neutral style, differentiated by icon+label only */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="eyebrow">Instant Demo Presets (Zero Live Typing)</div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
              <button
                type="button"
                className="btn-hero-demo"
                onClick={onLoadHeroDemo}
                title="Loads ABC Insurance diabetes PED denial with precedent analysis"
              >
                <Zap size={14} />
                <span>Pre-fill Hero Case (PED Denial)</span>
              </button>

              <button
                type="button"
                className="btn-warning-demo"
                onClick={onLoadInsufficientDemo}
                title="Demonstrates system safety when documents are incomplete"
              >
                <HelpCircle size={14} />
                <span>Load Insufficient-Info Case (Judge Q1)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="glass-card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Rejection Letter (Required) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="rejectionInput">
              * Claim Rejection / Repudiation Letter
            </label>
            <textarea
              id="rejectionInput"
              className="form-textarea"
              style={{ height: "240px" }}
              placeholder={`Paste text from insurer rejection letter...\nExample: 'We refer to your claim CLM-89210 under Policy ABC-992011. On reviewing hospital records showing HbA1c 9.2%, the claim is repudiated under Clause 4.1 for non-disclosure of pre-existing Diabetes Mellitus...'`}
              value={rejectionText}
              onChange={(e) => setRejectionText(e.target.value)}
              required
            />
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
              The system extracts denial category, dates, claimed amount, and quoted clauses.
            </div>
          </div>

          {/* Policy Document (Optional) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="policyInput">
              Policy Terms / Exclusion Clauses (Optional)
            </label>
            <textarea
              id="policyInput"
              className="form-textarea"
              style={{ height: "240px" }}
              placeholder={`Paste relevant clauses from your policy document...\nExample: 'Section 4.1: Pre-Existing Diseases: Benefits will not be available for any condition or complication arising therefrom until 48 months of continuous coverage have elapsed...'`}
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
            />
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
              Helps compare wording against standard IRDAI guidelines and court interpretations.
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <CheckCircle2 size={15} />
            <span>Documents are processed in memory and matched against verified legal corpus.</span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !rejectionText.trim()}
          >
            {isLoading ? (
              <>
                <div
                  className="spinner"
                  style={{ width: "16px", height: "16px", borderWidth: "2px" }}
                />
                <span>Extracting Case Fingerprint...</span>
              </>
            ) : (
              <>
                <span>Extract Case Fingerprint</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
