import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import SuggestedQuestions from "../components/chat/SuggestedQuestions";
import { FiCpu } from "react-icons/fi";
import { sendAssistantMessage } from "../services/assistantService";

// ── Constants ─────────────────────────────────────────────────────────────── //

const WELCOME_ID = "assistant-welcome";

const SUGGESTIONS = [
  { id: "s1", label: "What is Kubernetes?" },
  { id: "s2", label: "Explain Pods and Deployments." },
  { id: "s3", label: "How does Kubernetes scheduling work?" },
  { id: "s4", label: "What is Docker?" },
  { id: "s5", label: "Explain Helm." },
  { id: "s6", label: "What is Terraform?" },
  { id: "s7", label: "How does Ingress work?" },
];

// ── Helpers ───────────────────────────────────────────────────────────────── //

function formatTimestamp(date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function makeWelcomeMessage() {
  return {
    id: WELCOME_ID,
    role: "assistant",
    content: `Hello! I'm KubeSage AI.\n\nI can help you with:\n- Kubernetes concepts\n- Docker and Linux\n- Cloud and DevOps\n- Troubleshooting guidance\n- Best practices and architecture questions\n\nAsk me anything.`,
    timestamp: formatTimestamp(new Date()),
  };
}

// ── Main Page ─────────────────────────────────────────────────────────────── //

function AIAssistant() {
  const [messages, setMessages] = useState([makeWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages / loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const dispatchMessage = useCallback(
    async (text) => {
      const question = (text ?? input).trim();
      if (!question || loading) return;

      const userMsg = {
        id: `user-${Date.now()}`,
        role: "user",
        content: question,
        timestamp: formatTimestamp(new Date()),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        // Build history from all messages except the static welcome card
        const history = messages.filter((m) => m.id !== WELCOME_ID);

        const result = await sendAssistantMessage({
          message: question,
          history: [...history, userMsg],
        });

        const assistantMsg = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          timestamp: formatTimestamp(new Date()),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const detail =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to reach KubeSage AI. Please try again.";
        setError(detail);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages]
  );

  const handleSend = useCallback(() => dispatchMessage(input), [input, dispatchMessage]);
  const handleSuggestion = useCallback((label) => dispatchMessage(label), [dispatchMessage]);

  const isOnlyWelcome = messages.length === 1 && messages[0].id === WELCOME_ID;

  return (
    <div className="chat-page">
      {/* ── Header ── */}
      <div className="chat-header">
        <div className="chat-header__badge">
          <div className="chat-header__badge-icon">
            <FiCpu className="h-4 w-4 text-white" />
          </div>
          <div className="chat-header__badge-pulse" />
        </div>

        <div className="chat-header__info">
          <h1 className="chat-header__title">KubeSage AI Assistant</h1>
          <div className="chat-header__meta">
            <span className="chat-header__meta-item" style={{ opacity: 0.65 }}>
              Kubernetes · Docker · Linux · Cloud · DevOps
            </span>
          </div>
        </div>

        <div className="chat-header__status">
          <span className="chat-header__status-dot" />
          AI Ready
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="chat-body">
        {/* Suggestions — only shown before first exchange */}
        {isOnlyWelcome && !loading && (
          <SuggestedQuestions suggestions={SUGGESTIONS} onSelect={handleSuggestion} />
        )}

        {/* Message list */}
        <div className="chat-messages">
          {messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isAssistant = msg.role === "assistant";
            const isWelcome = msg.id === WELCOME_ID;

            return (
              <div key={msg.id} className="flex flex-col gap-1.5">
                <ChatMessage
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
                {/* Inline follow-up chips after last assistant response */}
                {isLast && isAssistant && !isWelcome && !loading && (
                  <div className="flex flex-wrap gap-2 mt-1 mb-2 ml-[2.5rem]">
                    {["Give me an example.", "Show me the commands.", "Explain more."].map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        className="suggested-questions__card text-[11px] py-1 px-3"
                        onClick={() => handleSuggestion(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && <ChatMessage role="assistant" content="" isLoading />}

          {/* Error message */}
          {error && !loading && (
            <ChatMessage
              role="assistant"
              content={`Sorry, I encountered an error: ${error}`}
              timestamp={formatTimestamp(new Date())}
            />
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={loading}
        loading={loading}
      />
    </div>
  );
}

export default AIAssistant;
