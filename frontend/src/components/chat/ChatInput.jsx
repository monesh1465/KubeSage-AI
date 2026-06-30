import { useRef, useEffect } from "react";
import { FiSend, FiCornerDownLeft } from "react-icons/fi";

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(val: string) => void} props.onChange
 * @param {() => void} props.onSend
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.loading]
 */
function ChatInput({ value, onChange, onSend, disabled, loading }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="chat-input__textarea"
          placeholder="Ask about this investigation…"
          value={value}
          rows={1}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Chat input"
        />

        {/* Send button */}
        <button
          id="chat-send-btn"
          type="button"
          className={`chat-input__send ${canSend ? "chat-input__send--active" : ""}`}
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          {loading ? (
            <span className="chat-input__send-spinner" />
          ) : (
            <FiSend className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="chat-input__hint">
        <FiCornerDownLeft className="h-3 w-3 inline mr-1 opacity-60" />
        <span>Enter to send · Shift + Enter for new line</span>
      </p>
    </div>
  );
}

export default ChatInput;
