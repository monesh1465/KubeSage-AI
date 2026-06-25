import { useState, useRef, useEffect } from "react";
import { FiSend, FiCpu } from "react-icons/fi";
import PageHeader from "../components/PageHeader";

const PLACEHOLDER_RESPONSES = [
  "I can help you troubleshoot Kubernetes issues. Connect a cluster and run an investigation to get started.",
  "Based on common patterns, I'd recommend checking pod events and node readiness when diagnosing scheduling failures.",
  "For ImagePullBackOff errors, verify your container registry credentials and image name/tag.",
];

function Assistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hello! I'm KubeSage AI. I can help you analyze Kubernetes cluster issues, explain error messages, and suggest remediation steps. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    window.setTimeout(() => {
      const responseIndex = Math.floor(Math.random() * PLACEHOLDER_RESPONSES.length);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: PLACEHOLDER_RESPONSES[responseIndex],
        },
      ]);
      setSending(false);
    }, 700);
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader
        title="AI Assistant"
        description="Chat with KubeSage AI about your cluster issues (UI preview — backend coming soon)"
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    message.role === "user"
                      ? "bg-[var(--color-primary)] text-white"
                      : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)]"
                  }`}
                >
                  {message.role === "user" ? (
                    <span className="text-[10px] font-semibold">You</span>
                  ) : (
                    <FiCpu className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-[var(--color-primary)] text-white"
                      : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)]">
                  <FiCpu className="h-4 w-4" />
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-secondary)]"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSend} className="border-t border-[var(--color-border)] p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder="Ask KubeSage AI about your cluster..."
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Assistant;
