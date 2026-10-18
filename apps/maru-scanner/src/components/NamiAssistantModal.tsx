import React, { useState } from "react";
import { ScannedPage } from "../types";
import { askNamiAboutScan, NamiResponse } from "../utils/namiAi";

interface NamiAssistantModalProps {
  page: ScannedPage;
  onClose: () => void;
}

export const NamiAssistantModal: React.FC<NamiAssistantModalProps> = ({ page, onClose }) => {
  const [prompt, setPrompt] = useState<string>("Please read this scan and solve/answer the worksheet questions on this page.");
  const [pin, setPin] = useState<string>(() => localStorage.getItem("nami_gate_pin") || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<NamiResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showPinInput, setShowPinInput] = useState<boolean>(false);

  const handleAsk = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    const activeImage = page.processedUrl || page.previewUrl;

    const res = await askNamiAboutScan({
      prompt: textToSend,
      imageBase64: activeImage,
      imageName: page.fileName || `page-${page.pageNumber}.jpg`,
      ocrText: page.ocrText,
      pin,
    });

    setResponse(res);
    setIsLoading(false);

    if (res.error && res.error.includes("PIN")) {
      setShowPinInput(true);
    }
  };

  const handleSavePin = (newPin: string) => {
    setPin(newPin);
    localStorage.setItem("nami_gate_pin", newPin);
  };

  const handleCopy = () => {
    if (!response?.text) return;
    navigator.clipboard.writeText(response.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="nami-modal-overlay" onClick={onClose}>
      <div className="nami-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="nami-modal-header">
          <div className="nami-title-wrap">
            <span className="nami-avatar">💚</span>
            <div>
              <h3 className="nami-title">Ask Nami About This Scan</h3>
              <p className="nami-sub">
                Page #{page.pageNumber} ({page.precrop || "Full"} @ {page.dpi} DPI)
              </p>
            </div>
          </div>
          <div className="nami-header-actions">
            <button
              className="pin-toggle-btn"
              onClick={() => setShowPinInput(!showPinInput)}
              title="Configure Nanami Gate PIN"
            >
              🔑 {pin ? "PIN Set" : "Gate PIN"}
            </button>
            <button className="icon-btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* PIN Drawer if needed */}
        {showPinInput && (
          <div className="pin-config-bar">
            <span>Access PIN:</span>
            <input
              type="password"
              value={pin}
              onChange={(e) => handleSavePin(e.target.value)}
              placeholder="Enter PIN if required"
              className="pin-input"
            />
          </div>
        )}

        {/* Preset Prompt Pills */}
        <div className="nami-presets-row">
          <button
            className="preset-chip"
            onClick={() => {
              const p = "Please read this scan and solve/answer the worksheet questions on this page.";
              setPrompt(p);
              handleAsk(p);
            }}
            disabled={isLoading}
          >
            📝 Answer Worksheet
          </button>
          <button
            className="preset-chip"
            onClick={() => {
              const p = "Explain what this document or diagram shows, and summarize the key concepts.";
              setPrompt(p);
              handleAsk(p);
            }}
            disabled={isLoading}
          >
            💡 Explain Diagram / Content
          </button>
          <button
            className="preset-chip"
            onClick={() => {
              const p = "Transcribe the handwritten or typed text accurately, correcting any errors.";
              setPrompt(p);
              handleAsk(p);
            }}
            disabled={isLoading}
          >
            ✍️ Transcribe & Proofread
          </button>
        </div>

        {/* Prompt Input Form */}
        <div className="nami-input-section">
          <textarea
            className="nami-prompt-textarea"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Nami anything about this scan..."
            disabled={isLoading}
          />
          <button
            className="nami-submit-btn"
            onClick={() => handleAsk()}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? "Thinking... ⏳" : "Ask Nami ⚡"}
          </button>
        </div>

        {/* Response Area */}
        <div className="nami-response-container">
          {isLoading && (
            <div className="nami-loading-state">
              <div className="pulse-spinner" />
              <span>Nami is reading your scan and preparing the answer...</span>
            </div>
          )}

          {response && (
            <div className={`nami-answer-card ${response.ok ? "success" : "error"}`}>
              <div className="answer-card-header">
                <span className="nami-badge">
                  {response.ok ? "💚 Nami's Answer" : "⚠️ Error"}
                </span>
                {response.ok && (
                  <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy}>
                    {copied ? "✓ Copied!" : "📋 Copy Solution"}
                  </button>
                )}
              </div>

              <div className="answer-text-body">
                {response.ok ? (
                  <pre className="nami-markdown-pre">{response.text}</pre>
                ) : (
                  <p className="nami-error-p">{response.error}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
