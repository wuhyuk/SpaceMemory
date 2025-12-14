// src/components/signIn/Login.jsx
import React, { useState, useEffect } from "react";
import "./Login.css";
import AccountRestrictionModal from "./AccountRestrictionModal";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

// JSON 앞뒤에 다른 로그/문자가 섞여도 JSON 구간만 잘라 파싱
const extractJsonObject = (text) => {
  if (text == null) return null;
  let t = String(text).replace(/^\uFEFF/, "").trim(); // BOM 제거
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return t.slice(first, last + 1);
};

const safeJson = async (res) => {
  const rawText = await res.text();
  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    console.error("Login non-json (no braces):", rawText);
    return null;
  }
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Login non-json (parse fail):", { rawText, jsonText, error: e });
    return null;
  }
};

const Login = ({ isOpen, onClose, navigate, onLoginSuccess }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const [idError, setIdError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");

  // 제한(정지/차단) 모달
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [restrictionInfo, setRestrictionInfo] = useState({
    status: null,
    message: "",
    penaltyEndAt: null,
    reason: null,
  });

  useEffect(() => {
    if (!isOpen) {
      setId("");
      setPassword("");
      setIdError("");
      setPasswordError("");
      setFormError("");
      setRestrictionOpen(false);
      setRestrictionInfo({ status: null, message: "", penaltyEndAt: null, reason: null });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIdError("");
    setPasswordError("");
    setFormError("");

    const trimmedId = id.trim();
    const trimmedPw = password.trim();

    let hasError = false;
    if (!trimmedId) {
      setIdError("Please enter your ID.");
      hasError = true;
    }
    if (!trimmedPw) {
      setPasswordError("Please enter your password.");
      hasError = true;
    }
    if (hasError) return;

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
        },
        body: new URLSearchParams({ id: trimmedId, password: trimmedPw }).toString(),
      });

      // ✅ status 코드와 관계없이 바디를 파싱해야 함
      const data = await safeJson(response);

      if (!data) {
        setFormError("Server returned an invalid response. Please try again.");
        return;
      }

      if (data.success) {
        if (onLoginSuccess) onLoginSuccess(data);
        setId("");
        setPassword("");
        onClose();
        return;
      }

      // 실패 케이스
      const code = data.code || null;
      const details = (data.details && typeof data.details === "object") ? data.details : {};

      if (code === "SUSPENDED" || code === "BANNED") {
        setRestrictionInfo({
          status: code,
          message: data.message || "This account is restricted and cannot sign in.",
          penaltyEndAt: details.penaltyEndAt ?? null,
          reason: details.reason ?? null,
        });
        setRestrictionOpen(true);
        return;
      }

      setPasswordError(data.message || "Invalid ID or password.");
    } catch (err) {
      console.error("로그인 요청 실패:", err);
      setFormError("A server error occurred. Please try again.");
    }
  };

  const handleSignupClick = (e) => {
    e.preventDefault();
    onClose();
    if (navigate) navigate("/signup");
  };

  return (
    <>
      <div className="modal-overlay scrollable" onClick={onClose}>
        <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={onClose}>×</button>

          <h2>Sign In</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-id">ID</label>
              <input
                type="text"
                id="login-id"
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  if (idError) setIdError("");
                }}
                placeholder="Enter your ID"
              />
              {idError && <div className="field-error">{idError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                  if (formError) setFormError("");
                }}
                placeholder="Enter your password"
              />
              {passwordError && <div className="field-error">{passwordError}</div>}
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <button type="submit" className="login-button">Login</button>
          </form>

          <p className="signup-link">
            Don't have an account?{" "}
            <a href="#" onClick={handleSignupClick}>Sign up</a>
          </p>
        </div>
      </div>

      <AccountRestrictionModal
        isOpen={restrictionOpen}
        onClose={() => setRestrictionOpen(false)}
        status={restrictionInfo.status}
        message={restrictionInfo.message}
        penaltyEndAt={restrictionInfo.penaltyEndAt}
        reason={restrictionInfo.reason}
      />
    </>
  );
};

export default Login;
