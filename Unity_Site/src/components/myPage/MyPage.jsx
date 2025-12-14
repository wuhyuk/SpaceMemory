// src/components/myPage/MyPage.jsx
import React, { useState, useEffect } from "react";
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

const MyPage = ({ navigate, onLogout }) => {
  const [userInfo, setUserInfo] = useState({
    username: "",
    nickname: "",
    email: "",
    liveIn: "",
  });

  const [editInfo, setEditInfo] = useState({
    nickname: "",
    email: "",
    liveIn: "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ✅ 옵션 B: MyPage는 "진입 전에" 검증이 끝나 있어야 함
  useEffect(() => {
    const verified = sessionStorage.getItem("mypageVerified");
    if (verified !== "true") {
      if (navigate) navigate("/mypage-verify");
      return;
    }
    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/info`, { method: "GET" });
      const data = await safeJson(res, "GetUserInfo");

      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to load user information.");
      }

      const d = data.data || {};
      setUserInfo({
        username: d.username || "",
        nickname: d.nickname || "",
        email: d.email || "",
        liveIn: d.liveIn || "",
      });
      setEditInfo({
        nickname: d.nickname || "",
        email: d.email || "",
        liveIn: d.liveIn || "",
      });
    } catch (error) {
      console.error("Failed to load user information:", error);
      setMessage({ type: "error", text: "Failed to load user information." });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setIsLoading(true);

    if (!editInfo.nickname || !editInfo.email) {
      setMessage({ type: "error", text: "Please fill in required fields." });
      setIsLoading(false);
      return;
    }

    try {
      const body =
        `nickname=${encodeURIComponent(editInfo.nickname)}` +
        `&email=${encodeURIComponent(editInfo.email)}` +
        `&liveIn=${encodeURIComponent(editInfo.liveIn || "")}`;

      const res = await fetch(`${API_BASE}/user/update`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = await safeJson(res, "UpdateUser");

      if (data && data.success) {
        setMessage({ type: "success", text: "Your profile has been updated." });
        setUserInfo((prev) => ({ ...prev, ...editInfo }));
      } else {
        setMessage({ type: "error", text: data?.message || "Update failed." });
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      setMessage({ type: "error", text: "A server error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch(`${API_BASE}/user/delete`, { method: "POST" });
      const data = await safeJson(res, "DeleteUser");

      if (data && data.success) {
        sessionStorage.removeItem("mypageVerified");
        if (onLogout) onLogout();
        if (navigate) navigate("/");
      } else {
        setMessage({ type: "error", text: data?.message || "Account deletion failed." });
      }
    } catch (error) {
      console.error("Account deletion failed:", error);
      setMessage({ type: "error", text: "A server error occurred." });
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleChangePassword = () => {
    if (navigate) navigate("/mypassword");
  };

  return (
    <div className="mypage-container">
      <div className="mypage-content-box">
        <div className="mypage-header">
          <h2 className="mypage-title">My Page</h2>
          <button className="mypage-change-password-btn" onClick={handleChangePassword}>
            Change Password
          </button>
        </div>

        <form onSubmit={handleUpdateProfile} className="mypage-form">
          <div className="mypage-input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={userInfo.username}
              disabled
              className="mypage-input-disabled"
            />
          </div>

          <div className="mypage-input-group">
            <label htmlFor="nickname">Nickname *</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={editInfo.nickname}
              onChange={handleInputChange}
              placeholder="Enter your nickname"
              disabled={isLoading}
            />
          </div>

          <div className="mypage-input-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={editInfo.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div className="mypage-input-group">
            <label htmlFor="liveIn">Location</label>
            <input
              type="text"
              id="liveIn"
              name="liveIn"
              value={editInfo.liveIn}
              onChange={handleInputChange}
              placeholder="Enter your location (optional)"
              disabled={isLoading}
            />
          </div>

          {message.text && (
            <div
              className={`mypage-message ${
                message.type === "success" ? "mypage-message-success" : "mypage-message-error"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mypage-button-group">
            <button type="submit" className="mypage-btn mypage-btn-primary" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Profile"}
            </button>

            <button
              type="button"
              className="mypage-btn mypage-btn-danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={isLoading}
            >
              Delete Account
            </button>
          </div>
        </form>
      </div>

      {showDeleteModal && (
        <div className="mypage-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="mypage-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="mypage-modal-title">Delete Account</h3>
            <p className="mypage-modal-text">
              Are you sure you want to delete your account?
              <br />
              This action cannot be undone.
            </p>

            <div className="mypage-modal-button-group">
              <button
                className="mypage-btn mypage-btn-danger"
                onClick={handleDeleteAccount}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>

              <button
                className="mypage-btn mypage-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
