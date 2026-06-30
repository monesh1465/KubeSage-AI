import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import ChatHeader from "../components/chat/ChatHeader";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import SuggestedQuestions from "../components/chat/SuggestedQuestions";
import { FiCpu, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { getInvestigationById } from "../services/investigationService";
import { getLatestAIAnalysis } from "../services/aiService";
import { sendChatMessage } from "../services/chatService";
import { buildInvestigationContext } from "../utils/buildInvestigationContext";

// ── Helpers ───────────────────────────────────────────────────────────────── //

function formatTimestamp(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function makeWelcomeMessage() {
  return {
    id: "welcome",
    role: "assistant",
    content: `Hello! I'm KubeSage AI.\n\nI can help you:\n- Understand findings\n- Explain errors\n- Recommend steps\n- Explain commands`,
    timestamp: formatTimestamp(new Date()),
  };
}

// ── Context loading skeleton ──────────────────────────────────────────────── //

function ContextLoadingState() {
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-state__icon">
        <FiRefreshCw className="h-6 w-6 text-[var(--color-primary)] animate-spin" />
      </div>
      <p className="chat-empty-state__title">Loading Investigation Context…</p>
      <p className="chat-empty-state__subtitle">
        Fetching investigation data to enable context-aware responses.
      </p>
    </div>
  );
}

// ── Context error state ───────────────────────────────────────────────────── //

function ContextErrorState({ onRetry }) {
  return (
    <div className="chat-empty-state">
      <div
        className="chat-empty-state__icon"
        style={{ background: "color-mix(in srgb, var(--color-danger) 10%, var(--color-card))" }}
      >
        <FiAlertTriangle className="h-6 w-6 text-[var(--color-danger)]" />
      </div>
      <p className="chat-empty-state__title">Unable to load investigation context.</p>
      <p className="chat-empty-state__subtitle">
        The investigation data could not be fetched. AI responses will be limited.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <FiRefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────── //

function InvestigationChat() {
  const { id: investigationId } = useParams();

  // ── Investigation context state ──────────────────────────────────────────
  const [investigationCtx, setInvestigationCtx] = useState(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctxError, setCtxError] = useState(false);

  // ── Chat state ───────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([makeWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // ── Load investigation context once on mount ─────────────────────────────
  const loadContext = useCallback(async () => {
    if (!investigationId) {
      setCtxLoading(false);
      setCtxError(true);
      return;
    }
    setCtxLoading(true);
    setCtxError(false);
    try {
      const [investigation, aiAnalysis] = await Promise.allSettled([
        getInvestigationById(investigationId),
        getLatestAIAnalysis(investigationId),
      ]);

      const inv = investigation.status === "fulfilled" ? investigation.value : null;
      const ai = aiAnalysis.status === "fulfilled" ? aiAnalysis.value : null;

      if (!inv) {
        setCtxError(true);
        setCtxLoading(false);
        return;
      }

      const ctx = buildInvestigationContext(inv, ai);
      setInvestigationCtx(ctx);
    } catch (err) {
      console.error("Failed to load investigation context:", err);
      setCtxError(true);
    } finally {
      setCtxLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Suggestions & Welcome Message state ──────────────────────────────────
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (ctxLoading) return;

    const isHealthy = investigationCtx && (
      investigationCtx.status === "Healthy" ||
      !investigationCtx.findings ||
      investigationCtx.findings.length === 0
    );

    if (isHealthy) {
      // Set healthy welcome message if no user messages sent yet
      const healthyWelcome = `Cluster Status: Healthy\n\nNo issues were detected.\n\nAsk me about:\n- Cluster health\n- Best practices\n- Monitoring\n- Optimization\n- Kubernetes concepts`;

      setMessages((prev) => {
        if (prev.length <= 1) {
          return [{
            id: "welcome",
            role: "assistant",
            content: healthyWelcome,
            timestamp: formatTimestamp(new Date()),
          }];
        }
        return prev;
      });

      // Set healthy suggested questions
      setSuggestions([
        { id: "q1", label: "Why is it healthy?" },
        { id: "q2", label: "Explain investigation" },
        { id: "q3", label: "Health checks" },
        { id: "q4", label: "Best practices" },
        { id: "q5", label: "Monitoring tips" },
        { id: "q6", label: "Improve reliability" },
        { id: "q7", label: "Prevent issues" },
        { id: "q8", label: "Cluster optimization" }
      ]);
    } else {
      // Set unhealthy welcome message if no user messages sent yet
      const unhealthyWelcome = `Hello! I'm KubeSage AI.\n\nI can help you:\n- Understand findings\n- Explain errors\n- Recommend steps\n- Explain commands`;

      setMessages((prev) => {
        if (prev.length <= 1) {
          return [{
            id: "welcome",
            role: "assistant",
            content: unhealthyWelcome,
            timestamp: formatTimestamp(new Date()),
          }];
        }
        return prev;
      });

      // Set dynamic unhealthy suggested questions
      const baseQuestions = [
        { id: "q1", label: "Why is this pod failing?" },
        { id: "q2", label: "Explain this investigation." },
        { id: "q3", label: "How do I fix this issue?" },
        { id: "q4", label: "What should I do first?" },
      ];

      let explainType = "FailedScheduling"; // default fallback

      if (investigationCtx?.findings && investigationCtx.findings.length > 0) {
        const highIssues = investigationCtx.findings.filter((i) => i.severity === "High");
        const mediumIssues = investigationCtx.findings.filter((i) => i.severity === "Medium");
        const lowIssues = investigationCtx.findings.filter((i) => i.severity === "Low");

        let chosenIssue = null;
        if (highIssues.length > 0) {
          chosenIssue = highIssues[0];
        } else if (mediumIssues.length > 0) {
          chosenIssue = mediumIssues[0];
        } else if (lowIssues.length > 0) {
          chosenIssue = lowIssues[0];
        } else {
          chosenIssue = investigationCtx.findings[0];
        }

        if (chosenIssue && chosenIssue.type) {
          explainType = chosenIssue.type;
        }
      }

      setSuggestions([
        ...baseQuestions,
        { id: "q5", label: `Explain ${explainType}.` }
      ]);
    }
  }, [investigationCtx, ctxLoading]);

  // ── Send message → real API call ─────────────────────────────────────────
  const dispatchMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: formatTimestamp(new Date()),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        // Snapshot history before this message is added
        const historySnapshot = messagesRef.current;

        const data = await sendChatMessage({
          message: trimmed,
          investigationCtx: investigationCtx || {},
          history: historySnapshot,
        });

        const assistantMsg = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply || "No response received from the AI model.",
          timestamp: formatTimestamp(new Date()),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMsg = err?.response?.data?.detail || err?.message || "AI service is unavailable.";
        const errorMsg = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `**Error:** ${errMsg}\n\nEnsure Ollama is running and the model is available.`,
          timestamp: formatTimestamp(new Date()),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [loading, investigationCtx]
  );

  const handleSend = useCallback(() => {
    dispatchMessage(input);
  }, [input, dispatchMessage]);

  const handleSuggestionSelect = useCallback(
    (question) => {
      dispatchMessage(question);
    },
    [dispatchMessage]
  );

  // ── Derived display values ────────────────────────────────────────────────
  const displayClusterName = investigationCtx?.clusterName;
  const showSuggestions = !ctxLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chat-page">
      {/* Header */}
      <ChatHeader
        investigationId={investigationId}
        clusterName={displayClusterName}
      />

      {/* Body */}
      <div className="chat-body" ref={chatContainerRef}>
        {/* Context loading state — shown in body before chat starts */}
        {ctxLoading && <ContextLoadingState />}

        {/* Context error — non-fatal, chat still works in degraded mode */}
        {!ctxLoading && ctxError && <ContextErrorState onRetry={loadContext} />}

        {/* Suggested questions */}
        {showSuggestions && !ctxError && (
          <SuggestedQuestions onSelect={handleSuggestionSelect} suggestions={suggestions} />
        )}

        {/* Message list */}
        <div className="chat-messages">
          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            const isAssistant = msg.role === "assistant";
            const isWelcome = msg.id === "welcome";

            return (
              <div key={msg.id} className="flex flex-col gap-1.5">
                <ChatMessage
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
                {isLastMessage && isAssistant && !isWelcome && !loading && (
                  <div className="flex flex-wrap gap-2 mt-1 mb-2 ml-[2.5rem]">
                    {[
                      "How do I fix this issue?",
                      "Explain this error.",
                      "Show diagnostic commands.",
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="suggested-questions__card text-[11px] py-1 px-3"
                        onClick={() => handleSuggestionSelect(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator while waiting for AI response */}
          {loading && <ChatMessage role="assistant" content="" isLoading />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — disabled while context is loading */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={loading || ctxLoading}
        loading={loading}
      />
    </div>
  );
}

export default InvestigationChat;
