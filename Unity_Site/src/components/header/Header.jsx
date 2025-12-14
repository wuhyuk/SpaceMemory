import React, { useState } from "react";
import "./Header.css";

function Header({
  onLoginClick,
  navigate,
  isLoggedIn,
  nickname,
  onMySpaceClick,
  onLogout,
  isMapPage,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogoClick = () => {
    if (navigate) navigate("/");
    setIsMenuOpen(false);
  };

  const handleSignupClick = () => {
    if (navigate) navigate("/signup");
    setIsMenuOpen(false);
  };

  const handleMySpaceClick = () => {
    if (onMySpaceClick) {
      onMySpaceClick();
    } else if (navigate) {
      navigate("/my-space");
    }
    setIsMenuOpen(false);
  };

  const handleSignInClick = () => {
    if (navigate) navigate("/");
    if (onLoginClick) onLoginClick();
    setIsMenuOpen(false);
  };

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // 🔹 지도 메뉴 클릭 핸들러 (로그인/비로그인 체크)
  const handleMapClick = () => {
    if (!isLoggedIn) {
      if (onLoginClick) onLoginClick();
    } else {
      if (navigate) navigate("/map");
    }
    closeMenu();
  };
  
  // 🔹 Home 메뉴 클릭 핸들러
  const handleHomeClick = () => {
    if (navigate) navigate("/");
    closeMenu();
  };
  
  // 🔹 My Page 메뉴 클릭 핸들러
  const handleMyPageClick = () => {
    if (!isLoggedIn) {
      // 비로그인 시 로그인 창 띄우기
      if (onLoginClick) onLoginClick();
    } else {
      // 로그인 시 마이페이지로 이동
      if (navigate) navigate("/mypage");
    }
    closeMenu();
  };
  
  // 🔹 현재 지도 페이지 상태에 따라 클릭 핸들러와 텍스트 결정
  const menuClickHandler = isMapPage ? handleHomeClick : handleMapClick;
  const menuText = isMapPage ? "Home" : "World Map";
  const menuIcon = isMapPage ? "🏠" : "🗺️";

  const logoSrc = `${process.env.PUBLIC_URL}/logo.png`;

  return (
    <>
      <header className="header">
        <div className="header-inner">
          {/* LOGO */}
          <div className="logo" onClick={handleLogoClick}>
            <img src={logoSrc} alt="logo" className="logo-icon" />
            <span>Memory Space</span>
          </div>

          {/* RIGHT AREA: Auth Buttons + Hamburger */}
          <div className="right-nav">
            <div className="auth-buttons">
              {isLoggedIn ? (
                <>
                  <span className="welcome-text">
                    Welcome : {nickname || "User"}
                  </span>
                  <button className="myspace-btn" onClick={handleMySpaceClick}>
                    My Space
                  </button>
                  <button className="logout-btn" onClick={handleLogoutClick}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button className="login-btn" onClick={handleSignInClick}>
                    Sign In
                  </button>
                  <button className="signup-btn" onClick={handleSignupClick}>
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* 🔹 햄버거 아이콘 버튼 */}
            <button className="hamburger-btn" onClick={toggleMenu}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 🔹 사이드바 오버레이 (배경 어둡게) */}
      <div 
        className={`sidebar-overlay ${isMenuOpen ? "visible" : ""}`} 
        onClick={closeMenu}
      />

      {/* 🔹 슬라이드 사이드바 메뉴 */}
      <div className={`sidebar-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Menu</span>
          <button className="close-btn" onClick={closeMenu}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          {/* 🔹 World Map / Home 토글 메뉴 */}
          <div className="menu-item" onClick={menuClickHandler}>
            <span className="menu-icon">{menuIcon}</span>
            <span className="menu-text">{menuText}</span>
          </div>
          
          {/* 🔹 My Page 메뉴 */}
          <div className="menu-item" onClick={handleMyPageClick}>
            <span className="menu-icon">👤</span>
            <span className="menu-text">My Page</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;