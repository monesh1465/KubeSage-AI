import React, { useState } from "react";
import { FiCpu, FiUser, FiCopy, FiCheck } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Typing dots ───────────────────────────────────────────────────────────── //

function TypingDots() {
  return (
    <div className="chat-typing">
      <span className="chat-typing__dot" style={{ animationDelay: "0ms" }} />
      <span className="chat-typing__dot" style={{ animationDelay: "160ms" }} />
      <span className="chat-typing__dot" style={{ animationDelay: "320ms" }} />
    </div>
  );
}

// ── Code block with copy button ───────────────────────────────────────────── //

function CodeBlock({ isBlock, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  // command prefixes to upgrade inline code to block code
  const commandPrefixes = [
    "kubectl",
    "docker",
    "helm",
    "terraform",
    "sudo",
    "systemctl",
    "cat",
    "grep",
    "ps",
    "ls",
    "cd",
    "curl",
    "wget"
  ];

  const isCommand = commandPrefixes.some((prefix) => {
    const trimmed = code.trim();
    return (
      trimmed === prefix ||
      trimmed.startsWith(prefix + " ") ||
      trimmed.startsWith(prefix + "\n")
    );
  });

  const shouldRenderAsBlock = isBlock || isCommand;

  if (!shouldRenderAsBlock) {
    return (
      <code className="chat-code-inline" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract language label from className (e.g. "language-bash" → "bash")
  const lang = className?.replace("language-", "") || "bash";

  return (
    <div className="chat-codeblock">
      <div className="chat-codeblock__header">
        <span className="chat-codeblock__lang">{lang}</span>
        <button
          type="button"
          className="chat-codeblock__copy"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <FiCheck className="h-3 w-3 text-[var(--color-success)]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <FiCopy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="chat-codeblock__pre">
        <code className="chat-codeblock__code" {...props}>
          {code}
        </code>
      </pre>
    </div>
  );
}

// ── Markdown renderer components ──────────────────────────────────────────── //

const MD_COMPONENTS = {
  pre: ({ children }) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { isBlock: true });
    }
    return <pre>{children}</pre>;
  },
  code: CodeBlock,
  // Conversational paragraph spacing
  p: ({ children }) => <p className="chat-md-p">{children}</p>,
  ul: ({ children }) => <ul className="chat-md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="chat-md-ol">{children}</ol>,
  li: ({ children }) => <li className="chat-md-li">{children}</li>,
  // Suppress heavy headers — use bold-like styling instead
  h1: ({ children }) => <p className="chat-md-heading">{children}</p>,
  h2: ({ children }) => <p className="chat-md-heading">{children}</p>,
  h3: ({ children }) => <p className="chat-md-subheading">{children}</p>,
  h4: ({ children }) => <p className="chat-md-subheading">{children}</p>,
  strong: ({ children }) => <strong className="chat-md-strong">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="chat-md-blockquote">{children}</blockquote>
  ),
  hr: () => <hr className="chat-md-hr" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="chat-md-link"
    >
      {children}
    </a>
  ),
};

// ── Technical Terms Auto-Highlighter ──────────────────────────────────────── //

const EXACT_WORDS = [
  "minikube",
  "default",
  "OOMKilled",
  "ContainerCannotRun",
  "CreateContainerConfigError",
  "CreateContainerError",
  "InvalidImageName",
  "ImageInspectError",
  "ErrImagePull",
  "ImagePullBackOff",
  "CrashLoopBackOff",
  "RunContainerError",
  "FailedScheduling",
  "FailedMount",
  "ReplicaMismatch",
  "NotReady",
  "ContainerCreating",
  "PodPending",
  "PodRunning",
  "kubectl",
  "kubelet",
  "kube-apiserver",
  "kube-scheduler",
  "kube-proxy",
  "kube-controller-manager",
  "etcd"
];

const EXCLUDED_HYPHENATED = new Set([
  "time-consuming", "one-shot", "context-aware", "non-interactive",
  "built-in", "out-of-scope", "follow-up", "long-term", "short-term",
  "high-risk", "first-ever", "production-grade", "real-time", "set-up"
]);

const EXCLUDED_TECH_NAMES = new Set([
  "devops", "opentelemetry", "kubernetes", "docker", "linux", "aws", "gcp", "azure",
  "terraform", "helm", "prometheus", "grafana", "ci/cd", "cicd", "git", "github", "gitlab"
]);

const IMAGE_PATTERN = `(?!https?|http)[a-zA-Z0-9_-]+:[a-zA-Z0-9_.-]*[a-zA-Z_.-][a-zA-Z0-9_.-]*`;
const HYPHENATED_PATTERN = `[a-zA-Z0-9]+-[a-zA-Z0-9-]+`;
const EXACT_WORDS_PATTERN = `(?:${EXACT_WORDS.join("|")})`;
const UPPER_CAMEL_PATTERN = `[A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*`;
const LOWER_CAMEL_PATTERN = `[a-z]+[A-Z][a-zA-Z0-9]*`;

const COMBINED_REGEX = new RegExp(
  `\\b(${IMAGE_PATTERN}|${HYPHENATED_PATTERN}|${EXACT_WORDS_PATTERN}|${UPPER_CAMEL_PATTERN}|${LOWER_CAMEL_PATTERN})\\b`,
  "g"
);

function replaceTermsInText(text) {
  return text.replace(COMBINED_REGEX, (match) => {
    const lowerMatch = match.toLowerCase();
    if (EXCLUDED_HYPHENATED.has(lowerMatch) || EXCLUDED_TECH_NAMES.has(lowerMatch)) {
      return match;
    }
    return `\`${match}\``;
  });
}

function highlightTechnicalTerms(text) {
  if (!text) return "";
  const fencedParts = text.split(/(```[\s\S]*?```)/g);
  return fencedParts.map((part) => {
    if (part.startsWith("```")) {
      return part;
    }
    const inlineParts = part.split(/(`[^`]+`)/g);
    return inlineParts.map((subPart) => {
      if (subPart.startsWith("`")) {
        return subPart;
      }
      return replaceTermsInText(subPart);
    }).join("");
  }).join("");
}

// ── ChatMessage ───────────────────────────────────────────────────────────── //

/**
 * @param {object} props
 * @param {"assistant"|"user"} props.role
 * @param {string} props.content
 * @param {string} [props.timestamp]
 * @param {boolean} [props.isLoading] - show typing animation instead of content
 */
function ChatMessage({ role, content, timestamp, isLoading }) {
  const isAssistant = role === "assistant";

  return (
    <div className={`chat-message ${isAssistant ? "chat-message--assistant" : "chat-message--user"}`}>
      {/* Avatar */}
      {isAssistant && (
        <div className="chat-message__avatar chat-message__avatar--assistant">
          <FiCpu className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`chat-message__bubble ${
          isAssistant ? "chat-message__bubble--assistant" : "chat-message__bubble--user"
        }`}
      >
        {isLoading ? (
          <TypingDots />
        ) : isAssistant ? (
          /* Render assistant messages as markdown */
          <div className="chat-md-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MD_COMPONENTS}
            >
              {highlightTechnicalTerms(content)}
            </ReactMarkdown>
          </div>
        ) : (
          /* User messages are plain text (pre-wrap for newlines) */
          <p className="chat-message__text">{content}</p>
        )}

        {timestamp && !isLoading && (
          <span className="chat-message__time">{timestamp}</span>
        )}
      </div>

      {/* User avatar */}
      {!isAssistant && (
        <div className="chat-message__avatar chat-message__avatar--user">
          <FiUser className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
