import React, { useEffect, useState } from "react";
import "./M_Main.css";
import M_Header from "./M_Header";
import M_User from "./M_User";
import M_Decl from "./M_Decl";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

function M_Main({ nickname, onLogout }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    storage: { used: 0, total: 0 },
    regions: {},
  });

  const [userReloadKey, setUserReloadKey] = useState(0);

  const triggerUserReload = () => {
    setUserReloadKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/stats`);
        if (!res.ok) throw new Error("stats error");
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("Failed to fetch admin statistics:", e);
      }
    };
    fetchStats();
  }, []);

  // Convert bytes to GB
  const toGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <div className="m-container">
      <M_Header nickname={nickname} onLogout={onLogout} />

      <div className="m-content-wrapper">
        
        {/* Admin Dashboard */}
        <div className="m-dashboard">

          <div className="m-box">
            <h2>Total Users</h2>
            <p>{stats.totalUsers}</p>
          </div>

          <div className="m-box">
            <h2>Storage Usage</h2>
            <p>
              Used: {toGB(stats.storage.used)} GB / Total {toGB(stats.storage.total)} GB
            </p>
          </div>

          <div className="m-box">
            <h2>Regional Distribution</h2>
            <ul>
              {Object.keys(stats.regions).map((region) => (
                <li key={region}>
                  {region}: {stats.regions[region]}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* User List */}
        <M_User reloadKey={userReloadKey} />

        {/* Reported Content */}
        <M_Decl onUserDataChange={triggerUserReload} />
      </div>
    </div>
  );
}

export default M_Main;
