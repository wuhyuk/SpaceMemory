// src/components/SignUp.jsx
import React, { useState } from "react";
import "./SignUp.css";
import BlackHole from "../blackHelo/BlackHole";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

const SignUp = ({ navigate }) => {
  const [form, setForm] = useState({
    id: "",
    password: "",
    name: "",
    emailId: "",
    emailDomain: "",
    region: "",
  });

  const [errors, setErrors] = useState({
    id: "",
    password: "",
    name: "",
    emailId: "",
    emailDomain: "",
    region: "",
    form: "",
  });

  const domainOptions = [
    "ENTER MANUALLY",
    "gmail.com",
    "naver.com",
    "daum.net",
    "hanmail.net",
    "kakao.com",
  ];

  // ✅ 지역 표기는 “출력만” 영어로 변경(값 자체는 기존 region 그대로 보내도 됨)
  const regionOptions = [
    { value: "서울", label: "Seoul" },
    { value: "경기도", label: "Gyeonggi-do" },
    { value: "인천", label: "Incheon" },
    { value: "강원도", label: "Gangwon-do" },
    { value: "충청북도", label: "Chungcheongbuk-do" },
    { value: "충청남도", label: "Chungcheongnam-do" },
    { value: "경상북도", label: "Gyeongsangbuk-do" },
    { value: "경상남도", label: "Gyeongsangnam-do" },
    { value: "전라북도", label: "Jeollabuk-do" },
    { value: "전라남도", label: "Jeollanam-do" },
    { value: "제주도", label: "Jeju-do" },
  ];

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "", form: "" }));
  };

  const handleDomainChange = (e) => {
    const selectedDomain = e.target.value;
    if (selectedDomain === "ENTER MANUALLY") {
      handleChange("emailDomain", "");
    } else {
      handleChange("emailDomain", selectedDomain);
    }
  };

  const validators = {
    id: (v) => {
      const value = v.trim();
      if (!value) return "Please enter your username.";
      if (value.length < 4 || value.length > 20) return "Username must be 4–20 characters.";
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Username can only contain letters, numbers, and underscore (_).";
      return "";
    },
    password: (v) => {
      const value = v;
      if (!value.trim()) return "Please enter your password.";
      if (value.length < 8 || value.length > 64) return "Password must be 8–64 characters.";
      if (!/[A-Z]/.test(value)) return "Password must include at least one uppercase letter.";
      if (!/[a-z]/.test(value)) return "Password must include at least one lowercase letter.";
      if (!/[0-9]/.test(value)) return "Password must include at least one number.";
      if (!/[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(value))
        return "Password must include at least one special character.";
      return "";
    },
    name: (v) => {
      const value = v.trim();
      if (!value) return "Please enter your nickname.";
      if (value.length < 2 || value.length > 20) return "Nickname must be 2–20 characters.";
      return "";
    },
    emailId: (v) => {
      const value = v.trim();
      if (!value) return "Please enter your email ID.";
      if (!/^[a-zA-Z0-9._%+-]+$/.test(value)) return "Email ID contains invalid characters.";
      return "";
    },
    emailDomain: (v) => {
      const value = v.trim();
      if (!value) return "Please enter your email domain.";
      if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Please enter a valid domain (e.g., gmail.com).";
      return "";
    },
    region: (v) => {
      if (!v) return "Please select your region.";
      return "";
    },
  };

  const validateAll = () => {
    const next = { id: "", password: "", name: "", emailId: "", emailDomain: "", region: "", form: "" };

    next.id = validators.id(form.id);
    next.password = validators.password(form.password);
    next.name = validators.name(form.name);
    next.emailId = validators.emailId(form.emailId);
    next.emailDomain = validators.emailDomain(form.emailDomain);
    next.region = validators.region(form.region);

    const hasError = Object.keys(next).some((k) => k !== "form" && next[k]);
    setErrors(next);
    return !hasError;
  };

  // ✅ 서버 메시지에서 “중복”을 필드별로 매핑
  const applyDuplicateMapping = (msg) => {
    const next = { ...errors, form: msg };

    const lower = (msg || "").toLowerCase();

    // MySQL: Duplicate entry '...' for key 'users.username'
    const isDuplicate = lower.includes("duplicate") || lower.includes("already");
    if (!isDuplicate) return next;

    // username / id
    if (
      lower.includes("users.username") ||
      lower.includes("username") ||
      (lower.includes("id") && lower.includes("exist"))
    ) {
      next.id = "This username is already taken.";
      next.form = "";
      return next;
    }

    // email
    if (lower.includes("users.email") || lower.includes("email")) {
      next.emailId = "This email is already registered.";
      next.form = "";
      return next;
    }

    // nickname
    if (lower.includes("users.nickname") || lower.includes("nickname")) {
      next.name = "This nickname is already taken.";
      next.form = "";
      return next;
    }

    // 애매하면 폼 하단에만 표시
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, form: "" }));

    const ok = validateAll();
    if (!ok) return;

    const fullEmail = `${form.emailId.trim()}@${form.emailDomain.trim()}`;

    try {
      const response = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({
          id: form.id.trim(),
          password: form.password,
          name: form.name.trim(),
          email: fullEmail,
          region: form.region,
        }).toString(),
      });

      if (!response.ok) throw new Error("Server error");

      const data = await response.json();

      if (data.success) {
        alert("Sign up complete. Please log in.");
        if (navigate) navigate("/", { openLogin: true });
      } else {
        const msg = data.message || "Sign up failed. Please try again.";
        setErrors(applyDuplicateMapping(msg));
      }
    } catch (err) {
      console.error("Sign up request failed:", err);
      setErrors((prev) => ({
        ...prev,
        form: "Server error occurred. Please try again later.",
      }));
    }
  };

  const inputFields = [
    { key: "id", label: "ID", type: "text", placeholder: "Please enter your username" },
    { key: "password", label: "PASSWORD", type: "password", placeholder: "Please enter your password" },
    { key: "name", label: "NICKNAME", type: "text", placeholder: "Please enter your nickname" },
  ];

  return (
    <div className="signup-page-root scrollable">
      <BlackHole />

      <div className="signup-page-container">
        <div className="signup-form-box">
          <h2>Sign Up</h2>

          <form onSubmit={handleSubmit} noValidate>
            {inputFields.map(({ key, label, type, placeholder }) => (
              <div className="form-group" key={key}>
                <label htmlFor={`signup-${key}`}>{label}</label>
                <input
                  type={type}
                  id={`signup-${key}`}
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                />
                {errors[key] && <div className="field-error">{errors[key]}</div>}
              </div>
            ))}

            <div className="form-group">
              <label>EMAIL</label>
              <div className="email-input-group">
                <input
                  type="text"
                  id="signup-email-id"
                  value={form.emailId}
                  onChange={(e) => handleChange("emailId", e.target.value)}
                  placeholder="Email ID"
                  className="email-id-input"
                />

                <span className="at-symbol">@</span>

                <input
                  type="text"
                  id="signup-email-domain-input"
                  value={form.emailDomain}
                  onChange={(e) => handleChange("emailDomain", e.target.value)}
                  placeholder="Input domain"
                  disabled={
                    domainOptions.includes(form.emailDomain) &&
                    form.emailDomain !== "ENTER MANUALLY"
                  }
                  className="email-domain-input"
                />

                <select
                  id="signup-email-domain-select"
                  onChange={handleDomainChange}
                  value={
                    domainOptions.includes(form.emailDomain)
                      ? form.emailDomain
                      : "ENTER MANUALLY"
                  }
                  className="email-domain-select"
                >
                  {domainOptions.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>

              {(errors.emailId || errors.emailDomain) && (
                <div className="field-error">
                  {errors.emailId || errors.emailDomain}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="signup-region">REGION YOU LIVE IN</label>
              <select
                id="signup-region"
                value={form.region}
                onChange={(e) => handleChange("region", e.target.value)}
              >
                <option value="">SELECT REGION</option>
                {regionOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.region && <div className="field-error">{errors.region}</div>}
            </div>

            {errors.form && <div className="form-error">{errors.form}</div>}

            <button type="submit" className="signup-button">
              Create account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
