// src/components/main/Main.jsx
import React, { useState, useCallback, useEffect } from "react";
import "./Main.css";

import Header from "../header/Header";
import Login from "../signIn/Login";
import SignUp from "../signUp/SignUp";
import SpaceBackground from "../background/SpaceBackground";
import StarBackground from "../star/StarBackground";
import M_Main from "../manager/M_Main";
import Introduction from "../etcView/Introduction";
import Tutorial from "../etcView/Tutorial";
import Example from "../etcView/Example";
import Inquiries from "../etcView/Inquiries";
import MyPage from "../myPage/MyPage";
import MyPassword from "../myPage/MyPassword";
import MyPageVerify from "../myPage/MyPageVerify"; // ✅ 추가
import MapPage from "../map/MapPage";
import SpaceContainer from "../planet/SpaceContainer/SpaceContainer";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

const stripContextPath = (pathname) => {
  if (!pathname.startsWith(CONTEXT_PATH)) return pathname || "/";
  let stripped = pathname.slice(CONTEXT_PATH.length);
  if (stripped === "" || stripped === "/" || stripped === "/index.html") {
    return "/";
  }
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
};

const ManagerPage = ({ nickname, onLogout }) => {
  return <M_Main nickname={nickname} onLogout={onLogout} />;
};

// ✅ auth/me 응답이 JSON wrapper({ success, data:{...} }) 형태일 수도 있고,
// ✅ 응답 앞뒤에 BOM/불필요 문자열이 섞일 수도 있어 안전하게 파싱합니다.
const sanitizeJsonText = (text) => {
  if (text == null) return "";
  let t = String(text).replace(/^\uFEFF/, "").trim(); // BOM 제거

  const firstBrace = t.indexOf("{");
  const lastBrace = t.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    t = t.slice(firstBrace, lastBrace + 1);
  }
  return t;
};

const safeParseJson = (text) => {
  try {
    return JSON.parse(sanitizeJsonText(text));
  } catch {
    return null;
  }
};

const unwrapAuthPayload = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  if (raw.data && typeof raw.data === "object") return raw.data;
  return raw;
};

const Main = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const initialPath = stripContextPath(window.location.pathname || "/");
  const [currentPage, setCurrentPage] = useState(initialPath);

  const isMapPage = currentPage === "/map";

  const handleOpenLogin = () => setIsLoginModalOpen(true);
  const handleCloseLogin = () => setIsLoginModalOpen(false);

  const navigate = useCallback((path, options = {}) => {
    const logicalPath = path.startsWith("/") ? path : `/${path}`;
    const fullPath =
      logicalPath === "/"
        ? `${CONTEXT_PATH}/index.html`
        : `${CONTEXT_PATH}${logicalPath}`;

    window.history.pushState({}, "", fullPath);
    setCurrentPage(logicalPath);

    if (options.openLogin) setIsLoginModalOpen(true);
    else setIsLoginModalOpen(false);
  }, []);

  const handleLoginSuccess = (payload) => {
    const d =
      payload && payload.data && typeof payload.data === "object"
        ? payload.data
        : payload;

    const displayName = d?.nickname || d?.userId || d?.username || "";
    const adminFlag = d?.role === "ADMIN";

    setIsLoggedIn(true);
    setNickname(displayName);
    setIsAdmin(adminFlag);

    if (adminFlag) {
      navigate("/manager");
    } else {
      navigate("/");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      console.error("로그아웃 요청 실패:", e);
    } finally {
      setIsLoggedIn(false);
      setNickname("");
      setIsAdmin(false);
      setIsLoginModalOpen(false);

      // ✅ 마이페이지 재인증 상태도 정리(옵션 B 구조에서 안전)
      sessionStorage.removeItem("mypageVerified");

      const logicalPath = "/";
      const fullPath = `${CONTEXT_PATH}/index.html`;
      window.history.pushState({}, "", fullPath);
      setCurrentPage(logicalPath);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const logicalPathNow = stripContextPath(window.location.pathname || "/");

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const rawText = await res.text();
        const rawJson = safeParseJson(rawText);

        if (!rawJson) {
          console.error("auth/me non-json:", rawText);

          setIsLoggedIn(false);
          setNickname("");
          setIsAdmin(false);

          // ✅ 보호 라우트 목록 확장: mypage 관련도 직접 진입 차단
          if (
            logicalPathNow === "/manager" ||
            logicalPathNow === "/map" ||
            logicalPathNow === "/my-space" ||
            logicalPathNow === "/mypage" ||
            logicalPathNow === "/mypage-verify" ||
            logicalPathNow === "/mypassword"
          ) {
            const fullPath = `${CONTEXT_PATH}/index.html`;
            window.history.replaceState({}, "", fullPath);
            setCurrentPage("/");
          } else {
            setCurrentPage(logicalPathNow);
          }
          return;
        }

        const data = unwrapAuthPayload(rawJson);

        if (data && data.loggedIn) {
          const adminFlag = data.role === "ADMIN";

          setIsLoggedIn(true);
          setNickname(data.nickname || data.userId || data.username || "");
          setIsAdmin(adminFlag);

          // 권한 체크: manager는 admin만
          if (logicalPathNow === "/manager" && !adminFlag) {
            const fullPath = `${CONTEXT_PATH}/index.html`;
            window.history.replaceState({}, "", fullPath);
            setCurrentPage("/");
          } else {
            setCurrentPage(logicalPathNow);
          }
        } else {
          setIsLoggedIn(false);
          setNickname("");
          setIsAdmin(false);

          // ✅ 보호 라우트 목록 확장
          if (
            logicalPathNow === "/manager" ||
            logicalPathNow === "/map" ||
            logicalPathNow === "/my-space" ||
            logicalPathNow === "/mypage" ||
            logicalPathNow === "/mypage-verify" ||
            logicalPathNow === "/mypassword"
          ) {
            const fullPath = `${CONTEXT_PATH}/index.html`;
            window.history.replaceState({}, "", fullPath);
            setCurrentPage("/");
          } else {
            setCurrentPage(logicalPathNow);
          }
        }
      } catch (e) {
        console.error("로그인 상태 확인 실패:", e);
        setIsLoggedIn(false);
        setNickname("");
        setIsAdmin(false);

        // ✅ 보호 라우트 목록 확장
        if (
          logicalPathNow === "/manager" ||
          logicalPathNow === "/map" ||
          logicalPathNow === "/my-space" ||
          logicalPathNow === "/mypage" ||
          logicalPathNow === "/mypage-verify" ||
          logicalPathNow === "/mypassword"
        ) {
          const fullPath = `${CONTEXT_PATH}/index.html`;
          window.history.replaceState({}, "", fullPath);
          setCurrentPage("/");
        } else {
          setCurrentPage(logicalPathNow);
        }
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const pathname = stripContextPath(window.location.pathname);

      // ✅ 보호 라우트 목록 확장
      if (
        (pathname === "/manager" && !isAdmin) ||
        (pathname === "/map" && !isLoggedIn) ||
        (pathname === "/my-space" && !isLoggedIn) ||
        (pathname === "/mypage" && !isLoggedIn) ||
        (pathname === "/mypage-verify" && !isLoggedIn) ||
        (pathname === "/mypassword" && !isLoggedIn)
      ) {
        const fullPath = `${CONTEXT_PATH}/index.html`;
        window.history.replaceState({}, "", fullPath);
        setCurrentPage("/");
      } else {
        setCurrentPage(pathname);
      }

      setIsLoginModalOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAdmin, isLoggedIn]);

  const renderContent = () => {
    /* ===============================
      1) 동적 라우팅: /star/:id → SpaceContainer
      =============================== */
    if (currentPage.startsWith("/star/")) {
      if (!isLoggedIn) {
        navigate("/");
        return null;
      }

      const starId = currentPage.split("/")[2];

      return (
        <main className="main-wrapper">
          <SpaceContainer starId={starId} />
        </main>
      );
    }

    /* ===============================
      2) 기존 정적 라우팅 처리
      =============================== */
    switch (currentPage) {
      case "/signup":
        return <SignUp navigate={navigate} />;

      case "/my-space":
        if (!isLoggedIn) {
          navigate("/");
          return null;
        }
        return (
          <main className="main-wrapper">
            <StarBackground navigate={navigate} />
          </main>
        );

      case "/manager":
        return <ManagerPage nickname={nickname} onLogout={handleLogout} />;

      case "/map":
        if (!isLoggedIn) {
          navigate("/");
          return null;
        }
        return <MapPage />;

      case "/introduction":
        return <Introduction navigate={navigate} onLoginClick={handleOpenLogin} isLoggedIn={isLoggedIn} />;
      case "/tutorial":
        return <Tutorial />;
      case "/example":
        return <Example />;
      case "/inquiries":
        return <Inquiries />;

      // ✅ 옵션 B: 비밀번호 검증 페이지 라우트 추가
      case "/mypage-verify":
        if (!isLoggedIn) {
          navigate("/");
          return null;
        }
        return <MyPageVerify navigate={navigate} />;

      case "/mypage":
        if (!isLoggedIn) {
          navigate("/");
          return null;
        }
        return (
          <MyPage
            navigate={navigate}
            onLogout={handleLogout}
            isLoggedIn={isLoggedIn}
            nickname={nickname}
          />
        );

      case "/mypassword":
        if (!isLoggedIn) {
          navigate("/");
          return null;
        }
        return <MyPassword navigate={navigate} onLogout={handleLogout} />;

      case "/":
        return (
          <main className="main-wrapper">
            <SpaceBackground navigate={navigate} />
          </main>
        );

      default:
        return (
          <main className="main-wrapper">
            <SpaceBackground navigate={navigate} />
          </main>
        );
    }
  };

  return (
    <div className="app-root">
      {currentPage !== "/manager" && (
        <Header
          onLoginClick={handleOpenLogin}
          navigate={navigate}
          isLoggedIn={isLoggedIn}
          nickname={nickname}
          onLogout={handleLogout}
          isMapPage={isMapPage}
        />
      )}

      {renderContent()}

      <Login
        isOpen={isLoginModalOpen}
        onClose={handleCloseLogin}
        navigate={navigate}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default Main;