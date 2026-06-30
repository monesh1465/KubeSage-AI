import { FiHelpCircle } from "react-icons/fi";

const DEFAULT_SUGGESTIONS = [
  { id: "q1", label: "Why is this pod failing?" },
  { id: "q2", label: "Explain this investigation." },
  { id: "q3", label: "How do I fix this issue?" },
  { id: "q4", label: "What should I do first?" },
  { id: "q5", label: "Explain FailedScheduling." },
];

/**
 * @param {object} props
 * @param {(q: string) => void} props.onSelect
 * @param {Array<{id:string,label:string}>} [props.suggestions]
 */
function SuggestedQuestions({ onSelect, suggestions = DEFAULT_SUGGESTIONS }) {
  return (
    <div className="suggested-questions">
      <p className="suggested-questions__label">
        <FiHelpCircle className="h-3 w-3" />
        Suggested questions
      </p>
      <div className="suggested-questions__grid">
        {suggestions.map((q) => (
          <button
            key={q.id}
            id={`suggestion-${q.id}`}
            type="button"
            className="suggested-questions__card"
            onClick={() => onSelect(q.label)}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SuggestedQuestions;
