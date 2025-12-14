import React, { useState } from "react";
import "./MyPassword.css";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

const MyPassword = ({ navigate, onLogout }) => {
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);

  const readJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const validatePassword = (v) => {
    if (v.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(v)) return "Include at least one uppercase letter.";
    if (!/[a-z]/.test(v)) return "Include at least one lowercase letter.";
    if (!/[0-9]/.test(v)) return "Include at least one number.";
    if (!/[!@#$%^&*]/.test(v)) return "Include at least one special character.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ newPassword: "", confirmPassword: "" });
    setMessage({ type: "", text: "" });

    const pwError = validatePassword(passwords.newPassword);
    if (pwError) {
      setErrors({ newPassword: pwError, confirmPassword: "" });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setErrors({ newPassword: "", confirmPassword: "Passwords do not match." });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/user/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `newPassword=${encodeURIComponent(passwords.newPassword)}`,
      });

      const data = await readJson(res);

      if (data && data.success) {
        // 기존 흐름 유지: 비밀번호 변경 성공 시 재로그인 유도
        sessionStorage.removeItem("mypageVerified");
        if (onLogout) onLogout();
        navigate("/");
      } else {
        setMessage({
          type: "error",
          text: (data && data.message) || "Password change failed.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Server error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mypassword-container">
      <div className="mypassword-box">
        <h2 className="mypassword-title">Change Password</h2>
        <p className="mypassword-subtitle">Please enter a new password.</p>

        <form onSubmit={handleSubmit} className="mypassword-form" noValidate>
          <div className="mypassword-input-group">
            <label>New Password *</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            />
            {errors.newPassword && <p className="mypassword-error-text">{errors.newPassword}</p>}
          </div>

          <div className="mypassword-input-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            />
            {errors.confirmPassword && (
              <p className="mypassword-error-text">{errors.confirmPassword}</p>
            )}
          </div>

          {message.text && (
            <div className={`mypassword-message mypassword-message-${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="mypassword-button-group">
            <button className="mypassword-btn mypassword-btn-primary" disabled={isLoading}>
              {isLoading ? "Updating..." : "Change Password"}
            </button>

            <button
              type="button"
              className="mypassword-btn mypassword-btn-secondary"
              onClick={() => navigate("/mypage")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyPassword;
