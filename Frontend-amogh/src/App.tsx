import React, { useState } from "react";
import type { ScreenStep } from "./components/Header";
import { Header } from "./components/Header";
import { UploadScreen } from "./components/screens/UploadScreen";
import { FingerprintScreen } from "./components/screens/FingerprintScreen";
import { SimilarCasesScreen } from "./components/screens/SimilarCasesScreen";
import { CaseDetailScreen } from "./components/screens/CaseDetailScreen";
import { AppealScreen } from "./components/screens/AppealScreen";

import type {
  ExtractedFingerprint,
  SimilarCaseMatch,
  CaseIntelligence,
  AppealResult,
} from "./types/claim";

import {
  extractClaim,
  findSimilarCases,
  getCaseIntelligence,
  generateAppeal,
} from "./services/api";

import {
  HERO_FINGERPRINT,
  HERO_SIMILAR_CASES,
  HERO_CASE_INTELLIGENCE,
  HERO_APPEAL_RESULT,
  INSUFFICIENT_INFO_FINGERPRINT,
  INSUFFICIENT_INFO_SIMILAR_CASES,
  INSUFFICIENT_INFO_CASE_INTELLIGENCE,
  INSUFFICIENT_INFO_APPEAL_RESULT,
} from "./data/demoFixtures";

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ScreenStep>("upload");

  // Core State
  const [fingerprint, setFingerprint] = useState<ExtractedFingerprint | null>(null);
  const [similarMatches, setSimilarMatches] = useState<SimilarCaseMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<SimilarCaseMatch | null>(null);
  const [caseIntelligence, setCaseIntelligence] = useState<CaseIntelligence | null>(null);
  const [appealResult, setAppealResult] = useState<AppealResult | null>(null);

  // Loading indicator states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  // Allowed Navigation Check
  const canNavigateTo = (step: ScreenStep): boolean => {
    if (step === "upload") return true;
    if (step === "fingerprint") return !!fingerprint;
    if (step === "similar") return similarMatches.length > 0;
    if (step === "detail") return !!selectedMatch && !!caseIntelligence;
    if (step === "appeal") return !!appealResult;
    return false;
  };

  // Reset Workflow
  const handleReset = () => {
    setCurrentStep("upload");
    setFingerprint(null);
    setSimilarMatches([]);
    setSelectedMatch(null);
    setCaseIntelligence(null);
    setAppealResult(null);
  };

  // ==========================================
  // ACTION 1: Run Extraction from User Text
  // ==========================================
  const handleAnalyze = async (policyText: string, rejectionText: string) => {
    setIsLoading(true);
    setLoadingMessage("Extracting structured facts and source spans from rejection letter...");
    try {
      const extracted = await extractClaim(policyText, rejectionText);
      setFingerprint(extracted);
      setCurrentStep("fingerprint");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // ==========================================
  // ACTION 2: Instant Hero Demo Pre-fill
  // ==========================================
  const handleLoadHeroDemo = () => {
    setFingerprint({ ...HERO_FINGERPRINT });
    setSimilarMatches([...HERO_SIMILAR_CASES]);
    setSelectedMatch(HERO_SIMILAR_CASES[0]);
    setCaseIntelligence({ ...HERO_CASE_INTELLIGENCE });
    setAppealResult({ ...HERO_APPEAL_RESULT });
    setCurrentStep("fingerprint");
  };

  // ==========================================
  // ACTION 3: Insufficient Info Demo (Judge Q1)
  // ==========================================
  const handleLoadInsufficientDemo = () => {
    setFingerprint({ ...INSUFFICIENT_INFO_FINGERPRINT });
    setSimilarMatches([...INSUFFICIENT_INFO_SIMILAR_CASES]);
    setSelectedMatch(INSUFFICIENT_INFO_SIMILAR_CASES[0]);
    setCaseIntelligence({ ...INSUFFICIENT_INFO_CASE_INTELLIGENCE });
    setAppealResult({ ...INSUFFICIENT_INFO_APPEAL_RESULT });
    setCurrentStep("fingerprint");
  };

  // ==========================================
  // ACTION 4: Search Similar Cases
  // ==========================================
  const handleConfirmFingerprint = async (confirmedFp: ExtractedFingerprint) => {
    setFingerprint(confirmedFp);
    setIsLoading(true);
    setLoadingMessage("Ranking case corpus via hybrid precedent similarity engine...");
    try {
      const matches = await findSimilarCases(confirmedFp);
      setSimilarMatches(matches);
      if (matches.length > 0) {
        setSelectedMatch(matches[0]);
      }
      setCurrentStep("similar");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // ==========================================
  // ACTION 5: Select Case & Fetch Intelligence
  // ==========================================
  const handleSelectCase = async (match: SimilarCaseMatch) => {
    if (!fingerprint) return;
    setSelectedMatch(match);
    setIsLoading(true);
    setLoadingMessage("Synthesizing judicial reasoning, evidence gaps, and counterarguments...");
    try {
      const intel = await getCaseIntelligence(fingerprint, match.case.case_id);
      setCaseIntelligence(intel);
      setCurrentStep("detail");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // ==========================================
  // ACTION 6: Generate Grounded Appeal
  // ==========================================
  const handleProceedToAppeal = async () => {
    if (!fingerprint || !selectedMatch) return;
    setIsLoading(true);
    setLoadingMessage("Drafting evidence-backed grievance letter & statutory escalation roadmap...");
    try {
      const missing = caseIntelligence?.missing_evidence.map((m) => m.item) || [];
      const appeal = await generateAppeal(
        fingerprint,
        [selectedMatch.case.case_id],
        missing
      );
      setAppealResult(appeal);
      setCurrentStep("appeal");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="app-container">
      <Header
        currentStep={currentStep}
        onStepClick={(step) => setCurrentStep(step)}
        canNavigateTo={canNavigateTo}
        onReset={handleReset}
      />

      {/* Global Loading Overlay (Prevents judges thinking UI is frozen) */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner" />
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--cyan)" }}>
            {loadingMessage || "Processing Insurance Intelligence..."}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Consulting legal corpus and structured decision rules
          </div>
        </div>
      )}

      {/* Screen Router */}
      {!isLoading && (
        <main>
          {currentStep === "upload" && (
            <UploadScreen
              onAnalyze={handleAnalyze}
              onLoadHeroDemo={handleLoadHeroDemo}
              onLoadInsufficientDemo={handleLoadInsufficientDemo}
              isLoading={isLoading}
            />
          )}

          {currentStep === "fingerprint" && fingerprint && (
            <FingerprintScreen
              initialFingerprint={fingerprint}
              onConfirmFingerprint={handleConfirmFingerprint}
              onBack={() => setCurrentStep("upload")}
              isLoading={isLoading}
            />
          )}

          {currentStep === "similar" && fingerprint && (
            <SimilarCasesScreen
              fingerprint={fingerprint}
              matches={similarMatches}
              onSelectCase={handleSelectCase}
              onBack={() => setCurrentStep("fingerprint")}
            />
          )}

          {currentStep === "detail" &&
            fingerprint &&
            selectedMatch &&
            caseIntelligence && (
              <CaseDetailScreen
                userFingerprint={fingerprint}
                selectedMatch={selectedMatch}
                intelligence={caseIntelligence}
                onProceedToAppeal={handleProceedToAppeal}
                onBack={() => setCurrentStep("similar")}
              />
            )}

          {currentStep === "appeal" &&
            fingerprint &&
            appealResult && (
              <AppealScreen
                appealResult={appealResult}
                fingerprint={fingerprint}
                onRestart={handleReset}
                onBack={() => setCurrentStep("detail")}
              />
            )}
        </main>
      )}
    </div>
  );
};

export default App;
