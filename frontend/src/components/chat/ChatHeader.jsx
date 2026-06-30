import { FiArrowLeft, FiCpu, FiServer, FiHash } from "react-icons/fi";
import { Link } from "react-router-dom";

function ChatHeader({ investigationId, clusterName }) {
  const invLabel = investigationId
    ? `INV-${String(investigationId).padStart(5, "0")}`
    : "—";

  return (
    <div className="chat-header">
      {/* Back navigation */}
      <Link
        to={investigationId ? `/investigations/${investigationId}` : "/investigations"}
        className="chat-header__back"
        aria-label="Back to investigation"
      >
        <FiArrowLeft className="h-4 w-4" />
      </Link>

      {/* AI badge */}
      <div className="chat-header__badge">
        <div className="chat-header__badge-icon">
          <FiCpu className="h-4 w-4 text-white" />
        </div>
        <div className="chat-header__badge-pulse" />
      </div>

      {/* Title & meta */}
      <div className="chat-header__info">
        <h1 className="chat-header__title">KubeSage AI Assistant</h1>
        <div className="chat-header__meta">
          <span className="chat-header__meta-item">
            <FiHash className="h-3 w-3" />
            {invLabel}
          </span>
          {clusterName && (
            <>
              <span className="chat-header__meta-dot">·</span>
              <span className="chat-header__meta-item">
                <FiServer className="h-3 w-3" />
                {clusterName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Live status pill */}
      <div className="chat-header__status">
        <span className="chat-header__status-dot" />
        AI Ready
      </div>
    </div>
  );
}

export default ChatHeader;
