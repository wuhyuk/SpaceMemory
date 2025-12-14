import React from "react";
import "./M_Header.css";

function M_Header({ onLogout }) {
  const handleLogoutClick = () => {
    if (onLogout) onLogout();
  };

  return (
    <header className="m-header">
      <div className="m-logo">Manager</div>
      <button className="m-logout" onClick={handleLogoutClick}>
        Log Out
      </button>
    </header>
  );
}

export default M_Header;
