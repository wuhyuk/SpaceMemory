// src/components/myPage/MyPageVerify.jsx
import React, { useState } from "react";
import "./MyPage.css";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

const extractJsonObject = (text) => {
  if (text == null) return null;
  let t = String(text).replace(/^\uFEFF/, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return t.slice(first, last + 1);
};

const safeJson = async (res, tag) => {
  const rawText = await res.text();
  const jsonText = extractJsonObject(rawText);

  if (!jsonText) {
    console.error(`${tag} non-json (no braces):`, rawText);
    return null;
  }
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error(`${tag} non-json (parse fail):`, { rawText, jsonText, error: e });
    return null;
  }
};

const MyPageVerify = ({ navigate }) => {
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setVerifyError("");
    setIsLoading(true);

    if (!verifyPassword.trim()) {
      setVerifyError("Please enter your password.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/user/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `password=${encodeURIComponent(verifyPassword)}`,
      });

      const data = await safeJson(res, "VerifyPassword");
      if (!data) {
        setVerifyError("Server returned an invalid response.");
        return;
      }

      const verifiedRaw = data?.data?.verified ?? null;
      const verifiedBool = verifiedRaw === true || verifiedRaw === "true";

      if (data.success && verifiedBool) {
        sessionStorage.setItem("mypageVerified", "true");
        if (navigate) navigate("/mypage");
      } else {
        setVerifyError(data.message || "Password does not match.");
      }
    } catch (err) {
      console.error("verify-password error:", err);
      setVerifyError("Server error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mypage-container">
      <div className="mypage-verify-box">
        <h2 className="mypage-title">Password Verification</h2>
        <p className="mypage-subtitle">
          For your security, please re-enter your password to continue.
        </p>

        <form onSubmit={handleVerifyPassword} className="mypage-verify-form">
          <div className="mypage-input-group">
            <label htmlFor="verifyPassword">Password</label>
            <input
              type="password"
              id="verifyPassword"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            {verifyError && <p className="mypage-error-text">{verifyError}</p>}
          </div>

          <button type="submit" className="mypage-btn mypage-btn-primary" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MyPageVerify;
