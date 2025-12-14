import React, { useEffect, useMemo, useState } from "react";
import "./M_User.css";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

function M_User({ reloadKey }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // search / filter / sort
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("ID_DESC");

  // pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // detail & status modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: "",
    penaltyDays: "",
  });
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/admin/users`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [reloadKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, regionFilter, sortKey, pageSize]);

  // region options
  const regionOptions = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      const region = (u.liveIn || "").trim();
      if (region) set.add(region);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [users]);

  // status label
  const getStatusLabel = (user) => {
    const status = user.status || "ACTIVE";
    const penaltyEndAt = user.penaltyEndAt;

    if (status === "SUSPENDED") {
      if (!penaltyEndAt) return "Suspended (No end date)";

      const now = Date.now();
      const end = new Date(penaltyEndAt).getTime();
      const diffMs = end - now;

      if (diffMs <= 0) {
        return "Suspended (Expired)";
      }

      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return `Suspended (${diffDays} day(s) left)`;
    }

    if (status === "BANNED") {
      return "Banned";
    }

    return "Active";
  };

  // filtered users
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (search.trim() !== "") {
      const q = search.trim().toLowerCase();
      list = list.filter((u) => {
        const nickname = (u.nickname || "").toLowerCase();
        const username = (u.username || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return nickname.includes(q) || username.includes(q) || email.includes(q);
      });
    }

    if (roleFilter !== "ALL") {
      list = list.filter((u) => (u.role || "") === roleFilter);
    }

    if (regionFilter !== "ALL") {
      list = list.filter((u) => (u.liveIn || "") === regionFilter);
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case "NAME_ASC": {
          const an = (a.nickname || a.username || "").toLowerCase();
          const bn = (b.nickname || b.username || "").toLowerCase();
          return an.localeCompare(bn);
        }
        case "POST_DESC":
          return (b.postCount || 0) - (a.postCount || 0);
        case "REPORT_DESC":
          return (b.reportCount || 0) - (a.reportCount || 0);
        case "ID_ASC":
          return (a.id || 0) - (b.id || 0);
        case "ID_DESC":
        default:
          return (b.id || 0) - (a.id || 0);
      }
    });

    return list;
  }, [users, search, roleFilter, regionFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil((filteredUsers.length || 1) / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const handleOpenDetail = (user) => {
    setSelectedUser(user);
    setStatusForm({ status: user.status || "ACTIVE", penaltyDays: "" });
  };

  const handleCloseDetail = () => {
    setSelectedUser(null);
    setStatusForm({ status: "", penaltyDays: "" });
  };

  const handleStatusFormChange = (field, value) => {
    setStatusForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;

    const newStatus = statusForm.status || "ACTIVE";
    let penaltyDaysParam = "";

    if (newStatus === "SUSPENDED") {
      const d = parseInt(statusForm.penaltyDays, 10);
      if (Number.isNaN(d) || d <= 0) {
        alert("Please enter a valid suspension period (1 day or more).");
        return;
      }
      penaltyDaysParam = String(d);
    }

    setUpdatingUserId(selectedUser.id);

    try {
      const params = new URLSearchParams();
      params.append("userId", String(selectedUser.id));
      params.append("status", newStatus);
      if (penaltyDaysParam) params.append("penaltyDays", penaltyDaysParam);

      const res = await fetch(`${API_BASE}/admin/users/status`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: params.toString(),
      });

      const rawText = await res.text();
      if (!res.ok) throw new Error("Server response error");

      const data = JSON.parse(rawText);
      if (!data.success) throw new Error(data.message || "Failed to update status");

      const updatedUser = data.user || {
        id: selectedUser.id,
        status: newStatus,
        penaltyEndAt: data.penaltyEndAt || null,
      };

      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
      );
      setSelectedUser((prev) =>
        prev && prev.id === updatedUser.id ? { ...prev, ...updatedUser } : prev
      );

      alert("User status has been updated.");
    } catch (e) {
      console.error("Failed to update user status:", e);
      alert("An error occurred while updating the user status.\n" + e.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="m-user-container">
      <h2>User List</h2>

      <div className="m-user-controls">
        <input
          type="text"
          className="m-user-search-input"
          placeholder="Search by nickname / ID / email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="m-user-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="ALL">All Roles</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <select className="m-user-select" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
          <option value="ALL">All Regions</option>
          {regionOptions.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>

        <select className="m-user-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="ID_DESC">Newest First (ID ↓)</option>
          <option value="ID_ASC">Oldest First (ID ↑)</option>
          <option value="NAME_ASC">Name (A–Z)</option>
          <option value="POST_DESC">Most Posts</option>
          <option value="REPORT_DESC">Most Reports</option>
        </select>

        <select className="m-user-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {loading && <div className="m-user-message">Loading...</div>}
      {error && <div className="m-user-message m-user-error">{error}</div>}

      <table className="m-user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nickname</th>
            <th>Username</th>
            <th>Email</th>
            <th>Region</th>
            <th>Role</th>
            <th>Status</th>
            <th>Posts</th>
            <th>Reports</th>
            <th>Manage</th>
          </tr>
        </thead>
        <tbody>
          {pagedUsers.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: "center" }}>
                No users match the criteria.
              </td>
            </tr>
          ) : (
            pagedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.nickname}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.liveIn}</td>
                <td>{user.role}</td>
                <td className={
                  user.status === "ACTIVE"
                    ? "m-user-status-active"
                    : user.status === "SUSPENDED"
                    ? "m-user-status-suspended"
                    : "m-user-status-banned"
                }>
                  {getStatusLabel(user)}
                </td>
                <td>{user.postCount}</td>
                <td>{user.reportCount ?? 0}</td>
                <td>
                  <button className="m-user-detail-btn" onClick={() => handleOpenDetail(user)}>
                    Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="m-user-pagination">
        <button className="m-user-page-btn" onClick={handlePrevPage} disabled={safePage <= 1}>‹</button>
        <span className="m-user-page-info">
          Page {safePage} / {totalPages} (Total {filteredUsers.length})
        </span>
        <button className="m-user-page-btn" onClick={handleNextPage} disabled={safePage >= totalPages}>›</button>
      </div>

      {selectedUser && (
        <div className="m-user-modal-overlay" onClick={handleCloseDetail}>
          <div className="m-user-modal" onClick={(e) => e.stopPropagation()}>
            <h3>User Details</h3>

            <div className="m-user-modal-content">
              <p><strong>ID:</strong> {selectedUser.id}</p>
              <p><strong>Username:</strong> {selectedUser.username}</p>
              <p><strong>Nickname:</strong> {selectedUser.nickname}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Region:</strong> {selectedUser.liveIn || "-"}</p>
              <p><strong>Role:</strong> {selectedUser.role}</p>
              <p><strong>Current Status:</strong> {getStatusLabel(selectedUser)}</p>
              <p><strong>Posts:</strong> {selectedUser.postCount}</p>
              <p><strong>Reports:</strong> {selectedUser.reportCount ?? 0}</p>
              <p><strong>Last Login:</strong> {selectedUser.lastLoginTime || "-"}</p>

              <hr style={{ margin: "12px 0", borderColor: "#3a4552" }} />

              <p><strong>Set New Status</strong></p>
              <p>
                <select
                  className="m-user-select"
                  value={statusForm.status || "ACTIVE"}
                  onChange={(e) => handleStatusFormChange("status", e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="BANNED">Banned</option>
                </select>
              </p>

              {statusForm.status === "SUSPENDED" && (
                <p>
                  <input
                    type="number"
                    min={1}
                    className="m-user-search-input"
                    placeholder="Enter suspension period (days)"
                    value={statusForm.penaltyDays}
                    onChange={(e) => handleStatusFormChange("penaltyDays", e.target.value)}
                  />
                </p>
              )}
            </div>

            <div className="m-user-modal-actions">
              <button
                className="m-user-status-btn"
                onClick={handleUpdateStatus}
                disabled={updatingUserId === selectedUser.id}
              >
                {updatingUserId === selectedUser.id ? "Updating..." : "Update Status"}
              </button>

              <button className="m-user-detail-btn" onClick={handleCloseDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default M_User;
