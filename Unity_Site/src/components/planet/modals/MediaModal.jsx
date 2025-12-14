// src/planet/modals/MediaModal.jsx
import React, { useEffect, useState } from "react";
import "./MediaModal.css";

export default function MediaModal({ system }) {
  const {
    mediaPopup,
    setMediaPopup,
    closeMediaPopup,

    deletePlanet,
    deleteMediaFromPlanet,

    addMediaToPlanet,
    updateMediaMeta,

    toggleLike,
    toggleStar,
    reportMedia,

    openPlanetEditPopup,
  } = system;

  // -------------------- Local UI state --------------------
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [reportPopup, setReportPopup] = useState(null);

  // Media Add inputs
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewList, setPreviewList] = useState([]);
  const [addDescription, setAddDescription] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addInputTag, setAddInputTag] = useState("");
  const [addTagList, setAddTagList] = useState([]);

  // Media Edit inputs
  const [editTagInput, setEditTagInput] = useState("");
  const [editTags, setEditTags] = useState([]);
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");

  if (!mediaPopup) return null;

  const planet = mediaPopup.planet;
  const zoomIndex = mediaPopup.zoomIndex;

  const currentMedia = zoomIndex !== null ? planet.mediaList?.[zoomIndex] : null;

  // -------------------- Handlers --------------------
  const handleDeletePlanet = () => {
    if (window.confirm(`Are you sure you want to delete the planet '${planet.name}'?`)) {
      deletePlanet(planet.id);
      closeMediaPopup();
    }
  };

  const handleDeleteMedia = () => {
    if (zoomIndex === null) return;
    if (window.confirm("Are you sure you want to delete this media item?")) {
      deleteMediaFromPlanet(planet.id, zoomIndex);
    }
  };

  const handleLike = () => {
    if (zoomIndex === null) return;
    toggleLike(planet.id, zoomIndex);
  };

  const handleStar = () => {
    if (zoomIndex === null) return;
    toggleStar(planet.id, zoomIndex);
  };

  const handleOpenReport = () => {
    if (zoomIndex === null) return;
    const media = planet.mediaList[zoomIndex];
    if (media.reported) {
      alert("You can report a media item only once.");
      return;
    }
    setReportPopup({ planetId: planet.id, mediaIndex: zoomIndex });
  };

  // -------------------- Grid -> Add Modal init --------------------
  const openAddModal = () => {
    setShowAdd(true);

    setAddDescription(planet.description || "");
    setAddLocation(planet.location || "");
    setSelectedFiles([]);
    setPreviewList([]);
    setAddTagList(planet.tags ? [...planet.tags] : []);
    setAddInputTag("");
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setSelectedFiles([]);
    setPreviewList([]);
    setAddDescription("");
    setAddLocation("");
    setAddTagList([]);
    setAddInputTag("");
  };

  const handleAddFileChange = (e) => {
    const files = Array.from(e.target.files || []);

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      mediaType: file.type.startsWith("video") ? "video" : "image",
    }));

    const formatted = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      mediaType: file.type.startsWith("video") ? "video" : "image",
    }));

    setSelectedFiles((prev) => [...prev, ...formatted]);
    setPreviewList((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const handleAddTag = () => {
    const value = addInputTag.trim();
    if (!value) return;
    if (!addTagList.includes(value)) setAddTagList((prev) => [...prev, value]);
    setAddInputTag("");
  };

  const handleSaveAdd = () => {
    if (selectedFiles.length > 0) {
      const mediaItems = selectedFiles.map((f) => ({
        ...f,
        tags: [...addTagList],
        location: addLocation,
        description: addDescription,
        liked: false,
        starred: false,
        reported: false,
      }));

      addMediaToPlanet(planet.id, mediaItems);
    }

    closeAddModal();
  };

  // -------------------- Zoom -> Edit Modal init --------------------
  const openEditModal = () => {
    if (!currentMedia) return;
    setShowEdit(true);

    setEditTags(currentMedia.tags || []);
    setEditDescription(currentMedia.description || "");
    setEditLocation(currentMedia.location || "");
    setEditTagInput("");
  };

  const closeEditModal = () => {
    setShowEdit(false);
    setEditTags([]);
    setEditDescription("");
    setEditLocation("");
    setEditTagInput("");
  };

  const addEditTag = () => {
    const value = editTagInput.trim();
    if (!value) return;
    if (!editTags.includes(value)) setEditTags((prev) => [...prev, value]);
    setEditTagInput("");
  };

  const removeEditTag = (tag) => {
    setEditTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSaveEdit = () => {
    if (zoomIndex === null) return;

    updateMediaMeta(planet.id, zoomIndex, {
      tags: editTags,
      description: editDescription,
      location: editLocation,
    });

    closeEditModal();
  };

  // -------------------- Report Modal --------------------
  const ReportModal = () => {
    const [selectedReason, setSelectedReason] = useState("");
    const [customReason, setCustomReason] = useState("");

    useEffect(() => {
      if (reportPopup) {
        setSelectedReason("");
        setCustomReason("");
      }
    }, [reportPopup]);

    if (!reportPopup) return null;

    const { planetId, mediaIndex } = reportPopup;

    const reportReasons = [
      "Inappropriate content",
      "Spam or advertising",
      "Violent or hateful content",
      "Copyright infringement",
      "Personal information exposure",
      "Other",
    ];

    const handleSubmit = () => {
      if (!selectedReason) {
        alert("Please select a report reason.");
        return;
      }
      if (selectedReason === "Other" && customReason.trim() === "") {
        alert("Please enter the reason.");
        return;
      }

      const finalReason = selectedReason === "Other" ? customReason : selectedReason;

      reportMedia(planetId, mediaIndex, finalReason);
      setReportPopup(null);
    };

    return (
      <div className="report-overlay" onClick={() => setReportPopup(null)}>
        <div className="report-panel" onClick={(e) => e.stopPropagation()}>
          <h2>🚨 Report Media</h2>
          <p className="report-description">
            Please select a reason for reporting this content.
          </p>

          <div className="report-reasons">
            {reportReasons.map((reason, index) => (
              <label key={index} className="report-reason-item">
                <input
                  type="radio"
                  name="reportReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === "Other" && (
            <textarea
              className="report-custom-input"
              placeholder="Please describe the reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              maxLength={200}
            />
          )}

          <div className="report-buttons">
            <button className="report-submit-btn" onClick={handleSubmit}>
              Submit Report
            </button>
            <button className="report-cancel-btn" onClick={() => setReportPopup(null)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------------------- Main render --------------------
  return (
    <>
      <div className="media-overlay">
        {zoomIndex === null ? (
          <div className="media-grid-wrapper" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            <div className="media-close" onClick={closeMediaPopup}>
              ×
            </div>

            <div className="planet-header-controls">
              <div className="planet-title-display">{planet.name}</div>

              <div className="planet-action-buttons">
                <button
                  className="planet-btn-common planet-edit-btn"
                  onClick={() => openPlanetEditPopup(planet)}
                >
                  Edit Info
                </button>
                <button
                  className="planet-btn-common planet-delete-btn"
                  onClick={handleDeletePlanet}
                >
                  Delete Planet
                </button>
              </div>
            </div>

            <div className="media-grid">
              <button className="media-add-button" onClick={openAddModal}>
                +
              </button>

              {planet.mediaList?.map((item, idx) => (
                <div
                  key={idx}
                  className="media-thumb"
                  onClick={() => setMediaPopup({ planet, zoomIndex: idx })}
                >
                  {item.mediaType === "image" ? (
                    <img src={item.url} alt="" />
                  ) : (
                    <video src={item.url} muted />
                  )}
                </div>
              ))}
            </div>

            {planet.mediaList?.length === 0 && (
              <p className="no-media-message">No media has been added to this planet yet.</p>
            )}
          </div>
        ) : (
          <div className="media-view-panel" onClick={(e) => e.stopPropagation()}>
            <div className="zoom-content-wrapper">
              {(() => {
                const item = planet.mediaList[zoomIndex];
                return item.mediaType === "image" ? (
                  <img src={item.url} alt="" className="media-big" />
                ) : (
                  <video src={item.url} controls autoPlay className="media-big" />
                );
              })()}

              <div className="zoom-meta-tags">
                {currentMedia?.tags?.map((t, i) => (
                  <span key={i} className="zoom-tag-item">
                    #{t}
                  </span>
                ))}
              </div>

              {String(currentMedia?.location || "").trim() !== "" && (
                <div className="zoom-meta-location">📍 {currentMedia.location}</div>
              )}

              <div className="zoom-meta-description">
                {String(currentMedia?.description || "").trim() !== ""
                  ? currentMedia.description
                  : "No description available."}
              </div>
            </div>

            <button className="media-delete-button" onClick={handleDeleteMedia}>
              🗑️
            </button>
            <button className="media-edit-button" onClick={openEditModal}>
              ✏️
            </button>

            <div className="media-close" onClick={() => setMediaPopup({ planet, zoomIndex: null })}>
              ×
            </div>

            <div className="media-interaction-bar">
              <button
                className={`interaction-btn like-btn ${currentMedia?.liked ? "active" : ""}`}
                onClick={handleLike}
                title="Like"
              >
                {currentMedia?.liked ? "❤️" : "🤍"}
              </button>

              <button
                className={`interaction-btn star-btn ${currentMedia?.starred ? "active" : ""}`}
                onClick={handleStar}
                title="Favorite"
              >
                {currentMedia?.starred ? "⭐" : "☆"}
              </button>

              <button
                className={`interaction-btn report-btn ${currentMedia?.reported ? "active" : ""}`}
                onClick={handleOpenReport}
                title="Report"
              >
                🚨
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================= Add Modal ======================= */}
      {showAdd && (
        <div className="media-add-overlay" onClick={closeAddModal}>
          <div className="media-add-panel" onClick={(e) => e.stopPropagation()}>
            <h2>Add Media / Edit Info</h2>

            <button
              className="file-select-button"
              onClick={() => document.getElementById("media-add-file").click()}
            >
              Select Files
            </button>

            <input
              id="media-add-file"
              type="file"
              multiple
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={handleAddFileChange}
            />

            <div className="preview-strip">
              {previewList.map((item, i) => (
                <div key={i} className="preview-item">
                  {item.mediaType === "image" ? (
                    <img src={item.url} alt="" />
                  ) : (
                    <video src={item.url} />
                  )}
                </div>
              ))}
            </div>

            <label className="file-label">Description</label>
            <textarea
              className="media-desc-textarea"
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
            />

            <label className="file-label">Location</label>
            <input
              className="input-text"
              value={addLocation}
              onChange={(e) => setAddLocation(e.target.value)}
              placeholder="e.g. Seoul / School / Home..."
            />

            <label className="file-label">Tags</label>
            <div className="tag-input-row">
              <input
                className="input-text"
                value={addInputTag}
                placeholder="Enter tag"
                onChange={(e) => setAddInputTag(e.target.value)}
              />
              <button className="tag-add-btn" onClick={handleAddTag}>
                Add
              </button>
            </div>

            <div className="tag-preview">
              {addTagList.map((tag, i) => (
                <span key={i} className="tag-item">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="popup-buttons">
              <button className="popup-add" onClick={handleSaveAdd}>
                Save
              </button>
              <button className="popup-cancel" onClick={closeAddModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= Edit Modal ======================= */}
      {showEdit && currentMedia && (
        <div className="media-edit-overlay" onClick={closeEditModal}>
          <div className="media-edit-popup" onClick={(e) => e.stopPropagation()}>
            <h2 className="edit-title">Edit Media Info</h2>

            <div className="edit-block">
              <label className="edit-label">Tags</label>

              <div className="tag-input-box">
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  placeholder="Enter tag"
                />
                <button onClick={addEditTag}>Add</button>
              </div>

              <div className="tag-list">
                {editTags.map((tag, index) => (
                  <div key={index} className="tag-item">
                    #{tag}
                    <span className="tag-remove" onClick={() => removeEditTag(tag)}>
                      x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="edit-block">
              <label className="edit-label">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter media description"
              />
            </div>

            <div className="edit-block">
              <label className="edit-label">Edit Location</label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Enter location"
              />
            </div>

            <div className="edit-buttons">
              <button className="save-btn" onClick={handleSaveEdit}>
                Save
              </button>
              <button className="cancel-btn" onClick={closeEditModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal />
    </>
  );
}
