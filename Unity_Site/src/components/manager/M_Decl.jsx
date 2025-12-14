import React, { useEffect, useMemo, useState } from "react";
import "./M_Decl.css";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;

function M_Decl({ onUserDataChange }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | NEW | PROCESSED
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("LATEST"); // LATEST | OLDEST | PLANET

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [processingId, setProcessingId] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  // Admin planet preview modal state
  const [planetPreviewOpen, setPlanetPreviewOpen] = useState(false);
  const [planetPreviewLoading, setPlanetPreviewLoading] = useState(false);
  const [planetPreviewError, setPlanetPreviewError] = useState("");
  const [planetPreview, setPlanetPreview] = useState(null); // { planet, media }

  const fetchReports = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/admin/reports`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Server response error");

      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error("Failed to fetch report list:", e);
      setError("An error occurred while loading the report list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, sortKey, pageSize]);

  const getCategory = (reason = "") => {
    const r = reason.toLowerCase();
    if (r.includes("욕설") || r.includes("비방") || r.includes("모욕"))
      return { key: "abuse", label: "Abuse / Harassment" };
    if (r.includes("이미지") || r.includes("사진") || r.includes("영상") || r.includes("동영상"))
      return { key: "image", label: "Inappropriate Media" };
    if (r.includes("스팸") || r.includes("광고"))
      return { key: "spam", label: "Spam / Advertisement" };
    return { key: "etc", label: "Other" };
  };

  const getStatusLabel = (status) => {
    if (status === "processed") return "Processed";
    if (status === "new") return "New";
    return status || "-";
  };

  const filteredReports = useMemo(() => {
    let list = [...reports];

    if (statusFilter === "NEW") list = list.filter((r) => r.status === "new");
    else if (statusFilter === "PROCESSED") list = list.filter((r) => r.status === "processed");

    if (search.trim() !== "") {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const planetName = (r.planetName || "").toLowerCase();
        const reporter = (r.reporterNickname || "").toLowerCase();
        const reported = (r.reportedNickname || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        return planetName.includes(q) || reporter.includes(q) || reported.includes(q) || reason.includes(q);
      });
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case "OLDEST":
          return (a.id || 0) - (b.id || 0);
        case "PLANET":
          return (a.planetId || 0) - (b.planetId || 0);
        case "LATEST":
        default:
          return (b.id || 0) - (a.id || 0);
      }
    });

    return list;
  }, [reports, statusFilter, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil((filteredReports.length || 1) / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedReports = filteredReports.slice(startIndex, startIndex + pageSize);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  // Admin-only planet preview
  const openAdminPlanetPreview = async (planetId) => {
    setPlanetPreviewOpen(true);
    setPlanetPreviewLoading(true);
    setPlanetPreviewError("");
    setPlanetPreview(null);

    try {
      const res = await fetch(
        `${API_BASE}/admin/planets/detail?planetId=${encodeURIComponent(planetId)}`
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.success !== true) {
        throw new Error((data && data.message) || "Failed to load planet data.");
      }

      setPlanetPreview({ planet: data.planet, media: data.media || [] });
    } catch (e) {
      console.error("Admin planet preview failed:", e);
      setPlanetPreviewError(e.message || "Failed to load preview.");
    } finally {
      setPlanetPreviewLoading(false);
    }
  };

  const closeAdminPlanetPreview = () => {
    setPlanetPreviewOpen(false);
    setPlanetPreview(null);
    setPlanetPreviewError("");
    setPlanetPreviewLoading(false);
  };

  const handleViewPlanet = (planetId, planetDeleted) => {
    if (!planetId) return;

    if (planetDeleted) {
      openAdminPlanetPreview(planetId);
      return;
    }

    window.open(`${CONTEXT_PATH}/planet/${planetId}`, "_blank");
  };

  const openActionModal = (report) => setActionTarget(report);
  const closeActionModal = () => setActionTarget(null);

  const resolveOnly = async (reportId) => {
    try {
      setProcessingId(reportId);

      const res = await fetch(`${API_BASE}/admin/reports/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ id: String(reportId) }).toString(),
      });

      if (!res.ok) throw new Error("Server response error");

      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "processed" } : r)));

      if (typeof onUserDataChange === "function") onUserDataChange();

      closeActionModal();
    } catch (e) {
      console.error("Failed to process report:", e);
      alert("An error occurred while processing the report.");
    } finally {
      setProcessingId(null);
    }
  };

  const deleteAndResolve = async (reportId, planetId) => {
    try {
      setProcessingId(reportId);

      const res = await fetch(`${API_BASE}/admin/reports/delete-planet`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ id: String(reportId), planetId: String(planetId) }).toString(),
      });

      if (!res.ok) throw new Error("Server response error");

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: "processed", planetDeleted: true } : r))
      );

      if (typeof onUserDataChange === "function") onUserDataChange();

      closeActionModal();
    } catch (e) {
      console.error("Failed to delete planet:", e);
      alert("An error occurred while deleting the planet.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleActionFromModal = (type) => {
    if (!actionTarget) return;

    if (type === "RESOLVE") {
      resolveOnly(actionTarget.id);
    } else if (type === "DELETE_AND_RESOLVE") {
      const ok = window.confirm(
        "Are you sure you want to delete this planet?\nThe planet will be marked as deleted and the report will be processed."
      );
      if (!ok) return;
      deleteAndResolve(actionTarget.id, actionTarget.planetId);
    }
  };

  return (
    <div className="m-decl-container">
      <h2>Reported Content Management</h2>

      <div className="m-user-controls m-decl-controls">
        <input
          type="text"
          className="m-user-search-input"
          placeholder="Search by planet / reporter / reported user / reason"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="m-user-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="NEW">New Only</option>
          <option value="PROCESSED">Processed Only</option>
        </select>

        <select className="m-user-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="LATEST">Latest First</option>
          <option value="OLDEST">Oldest First</option>
          <option value="PLANET">Planet ID</option>
        </select>

        <select className="m-user-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {loading && <div className="m-decl-message">Loading...</div>}
      {error && <div className="m-decl-message m-decl-error">{error}</div>}

      <div className="m-decl-scroll">
        {pagedReports.length === 0 ? (
          <div className="m-decl-empty">No reports to display.</div>
        ) : (
          pagedReports.map((r) => {
            const category = getCategory(r.reason || "");
            return (
              <div className="m-decl-box" key={r.id}>
                <div className="m-decl-header-row">
                  <h3>
                    {r.planetName || "Untitled Content"}
                    {r.planetDeleted && <span className="m-decl-deleted-label"> (Deleted)</span>}
                  </h3>
                  <span className={`m-decl-tag m-decl-tag-${category.key}`}>{category.label}</span>
                </div>

                <p>
                  Reporter: {r.reporterNickname || "Anonymous"}
                  {r.reporterUserId ? ` (ID: ${r.reporterUserId})` : ""}
                </p>
                <p>
                  Reported User: {r.reportedNickname || "-"}
                  {r.reportedUserId ? ` (ID: ${r.reportedUserId})` : ""}
                </p>
                <p>Planet ID: {r.planetId}</p>
                <p>Reason: {r.reason || "-"}</p>
                <p>Status: {getStatusLabel(r.status)}</p>

                <div className="m-decl-actions">
                  <button
                    onClick={() => handleViewPlanet(r.planetId, r.planetDeleted)}
                    className="m-decl-btn m-decl-btn-view"
                  >
                    View Planet
                  </button>

                  <button
                    onClick={() => openActionModal(r)}
                    className="m-decl-btn m-decl-btn-resolve"
                    disabled={processingId === r.id}
                  >
                    Take Action
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="m-user-pagination m-decl-pagination">
        <button className="m-user-page-btn" onClick={handlePrevPage} disabled={safePage <= 1}>
          ‹
        </button>
        <span className="m-user-page-info">
          Page {safePage} / {totalPages} (Total {filteredReports.length})
        </span>
        <button className="m-user-page-btn" onClick={handleNextPage} disabled={safePage >= totalPages}>
          ›
        </button>
      </div>

      {actionTarget && (
        <div className="m-decl-modal-overlay" onClick={closeActionModal}>
          <div className="m-decl-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Process Report</h3>
            <p><strong>Report ID:</strong> {actionTarget.id}</p>
            <p><strong>Planet:</strong> {actionTarget.planetName || `#${actionTarget.planetId}`}</p>
            <p>
              <strong>Reporter:</strong> {actionTarget.reporterNickname || "Anonymous"}
              {actionTarget.reporterUserId ? ` (ID: ${actionTarget.reporterUserId})` : ""}
            </p>
            <p>
              <strong>Reported User:</strong> {actionTarget.reportedNickname || "-"}
              {actionTarget.reportedUserId ? ` (ID: ${actionTarget.reportedUserId})` : ""}
            </p>
            <p><strong>Reason:</strong> {actionTarget.reason || "-"}</p>

            <div className="m-decl-modal-buttons">
              <button
                className="m-decl-btn m-decl-btn-resolve"
                onClick={() => handleActionFromModal("RESOLVE")}
                disabled={processingId === actionTarget.id}
              >
                Resolve Only
              </button>
              <button
                className="m-decl-btn m-decl-btn-delete"
                onClick={() => handleActionFromModal("DELETE_AND_RESOLVE")}
                disabled={processingId === actionTarget.id}
              >
                Delete Content
              </button>
            </div>

            <div className="m-decl-modal-footer">
              <button onClick={closeActionModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {planetPreviewOpen && (
        <div className="m-decl-modal-overlay" onClick={closeAdminPlanetPreview}>
          <div className="m-decl-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Admin Planet Preview</h3>

            {planetPreviewLoading && <p>Loading...</p>}
            {planetPreviewError && <p style={{ color: "salmon" }}>{planetPreviewError}</p>}

            {!planetPreviewLoading && !planetPreviewError && planetPreview && (
              <>
                <p><strong>Planet ID:</strong> {planetPreview.planet.id}</p>
                <p><strong>Name:</strong> {planetPreview.planet.name}</p>
                <p><strong>Deleted:</strong> {planetPreview.planet.isDeleted ? "Yes" : "No"}</p>
                <p>
                  <strong>Owner:</strong> {planetPreview.planet.ownerNickname}
                  {" "} (ID: {planetPreview.planet.ownerUserId})
                </p>

                <hr />

                <p><strong>Media ({planetPreview.media.length})</strong></p>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  {planetPreview.media.map((m) => (
                    <div key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: 13, opacity: 0.9 }}>
                        #{m.id} / {m.type} / {m.isDeleted ? "Deleted" : "Active"}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{m.createdAt}</div>
                      <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{m.description || ""}</div>
                      <div style={{ fontSize: 12, wordBreak: "break-all", opacity: 0.85, marginTop: 4 }}>
                        {m.url}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="m-decl-modal-footer">
              <button onClick={closeAdminPlanetPreview}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default M_Decl;
