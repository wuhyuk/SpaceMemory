// src/components/signIn/AccountRestrictionModal.jsx
import React from "react";
import "./Login.css";

/**
 * Account restriction modal (SUSPENDED / BANNED)
 *
 * props:
 * - isOpen: boolean
 * - onClose: function
 * - status: "SUSPENDED" | "BANNED"
 * - message: string
 * - penaltyEndAt: string | null (ISO: 2025-12-31T00:00:00)
 * - reason: string | null
 */
const AccountRestrictionModal = ({
  isOpen,
  onClose,
  status,
  message,
  penaltyEndAt,
  reason,
}) => {
  if (!isOpen) return null;

  // -----------------------------
  // 날짜 포맷 (ISO → 사람이 읽기 좋게)
  // -----------------------------
  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const [date, time] = isoString.split("T");
    if (!time) return isoString;

    return `${date} ${time.slice(0, 5)}`;
  };

  const title =
    status === "BANNED" ? "Account Banned" : "Account Suspended";

  const untilText =
    status === "SUSPENDED" && penaltyEndAt
      ? `Suspension ends: ${formatDateTime(penaltyEndAt)}`
      : "";

  const reasonText = reason ? `Reason: ${reason}` : "";

  return (
    <div className="restriction-overlay" onClick={onClose}>
      {/* 내부 클릭 시 닫히지 않도록 */}
      <div
        className="restriction-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="restriction-title">{title}</h3>

        <div className="restriction-body">
          <p className="restriction-message">
            {message || "This account is restricted and cannot sign in."}
          </p>

          {reasonText && (
            <p className="restriction-reason">{reasonText}</p>
          )}

          {untilText && (
            <p className="restriction-until">{untilText}</p>
          )}

          {status === "BANNED" && !untilText && (
            <p className="restriction-until">
              This account is permanently restricted.
            </p>
          )}
        </div>

        <button className="restriction-confirm" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

export default AccountRestrictionModal;
