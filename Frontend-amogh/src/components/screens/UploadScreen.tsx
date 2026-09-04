import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
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

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

async function extractPdfText(file: File): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n\n").trim();
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onAnalyze,
  onLoadHeroDemo,
  onLoadInsufficientDemo,
  isLoading,
}) => {
  const [rejectionText, setRejectionText] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [rejectionFileName, setRejectionFileName] = useState("");
  const [policyFileName, setPolicyFileName] = useState("");
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const handlePdfChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setText: React.Dispatch<React.SetStateAction<string>>,
    setFileName: React.Dispatch<React.SetStateAction<string>>,
    required: boolean
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPdfError("");
    if (file.type !== "application/pdf") {
      setPdfError("Please select a PDF file.");
      return;
    }
    setIsReadingPdf(true);
    try {
      const text = await extractPdfText(file);
      if (!text) {
        throw new Error("No selectable text was found. Scanned PDFs need OCR before upload.");
      }
      setText(text);
      setFileName(file.name);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Could not read this PDF.");
      if (required) setText("");
    } finally {
      setIsReadingPdf(false);
    }
  };

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
            <label className="form-input" htmlFor="rejectionInput" style={{ display: "flex", alignItems: "center", gap: "10px", height: "48px", cursor: "pointer" }}>
              <Upload size={17} />
              <span>{rejectionFileName || "Choose rejection letter PDF"}</span>
            </label>
            <input id="rejectionInput" type="file" accept="application/pdf,.pdf" onChange={(event) => handlePdfChange(event, setRejectionText, setRejectionFileName, true)} required={!rejectionText} style={{ display: "none" }} />
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
              Required PDF. Text is extracted in your browser before analysis.
            </div>
          </div>

          {/* Policy Document (Optional) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="policyInput">
              Policy Terms / Exclusion Clauses (Optional)
            </label>
            <label className="form-input" htmlFor="policyInput" style={{ display: "flex", alignItems: "center", gap: "10px", height: "48px", cursor: "pointer" }}>
              <Upload size={17} />
              <span>{policyFileName || "Choose policy PDF (optional)"}</span>
            </label>
            <input id="policyInput" type="file" accept="application/pdf,.pdf" onChange={(event) => handlePdfChange(event, setPolicyText, setPolicyFileName, false)} style={{ display: "none" }} />
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
              Optional PDF. Helps compare wording against policy clauses.
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
            <span>{isReadingPdf ? "Reading PDF text..." : "Documents are processed in memory."}</span>
          </div>

          {pdfError && <div style={{ color: "var(--unfavorable)", fontSize: "0.82rem", width: "100%" }}>{pdfError}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || isReadingPdf || !rejectionText.trim()}
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
