// src/planet/modals/PlanetModal.jsx
import React, { useEffect, useRef, useState } from "react";
import "./PlanetModal.css";

export default function PlanetModal({ system }) {
  const {
    // add
    popupOpen,
    closeAddPopup,
    inputName,
    setInputName,
    inputFile,
    setInputFile,
    handleFileChange,
    fileInputRef,
    addPlanet,

    // edit
    planetEditPopup,
    closePlanetEditPopup,
    updatePlanet,
  } = system;

  // ---------- Add ----------
  const [addErrorMessage, setAddErrorMessage] = useState("");

  useEffect(() => {
    if (popupOpen) setAddErrorMessage("");
  }, [popupOpen]);

  const handleRemoveAddFile = (indexToRemove) => {
    const updatedFiles = inputFile.filter((_, idx) => idx !== indexToRemove);
    setInputFile(updatedFiles);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAddErrorMessage("");
  };

  const handleCreatePlanet = () => {
    if (!inputName.trim() || inputFile.length === 0) {
      setAddErrorMessage("Name or thumbnail is missing");
      return;
    }
    if (inputFile.length > 1) {
      setAddErrorMessage("Only one thumbnail is allowed");
      return;
    }
    const success = addPlanet(inputName, inputFile);
    if (success) closeAddPopup();
  };

  // ---------- Edit ----------
  const planet = planetEditPopup?.planet || null;
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const editFileInputRef = useRef(null);

  useEffect(() => {
    if (!planetEditPopup || !planet) return;
    setEditName(planet.name || "");
    setPreviewUrl(planet.preview || "");
    setEditFile(null);
  }, [planetEditPopup, planet]);

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSavePlanetEdit = () => {
    if (!editName.trim()) {
      alert("Please enter a planet name.");
      return;
    }
    updatePlanet(planet.id, editName, editFile);
    closePlanetEditPopup();
  };

  // ---------- Render ----------
  if (popupOpen) {
    return (
      <div className="popup-overlay" onClick={closeAddPopup}>
        <div className="popup-panel" onClick={(e) => e.stopPropagation()}>
          <h2 style={{ marginBottom: "6px" }}>Add Planet</h2>

          <input
            className="input-text"
            placeholder="Planet Name"
            value={inputName}
            onChange={(e) => {
              setInputName(e.target.value);
              setAddErrorMessage("");
            }}
          />

          <div className="file-select-area">
            <button
              className="file-select-button"
              onClick={() => fileInputRef.current.click()}
            >
              Select File
            </button>

            <input
              type="file"
              multiple
              accept="image/*,video/*"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={(e) => {
                handleFileChange(e);
                setAddErrorMessage("");
              }}
            />

            {inputFile.length > 1 && (
              <div className="warning-box">⚠️ Only one thumbnail is allowed</div>
            )}
          </div>

          <div className="preview-strip">
            {inputFile.map((m, i) => (
              <div key={i} className="preview-item">
                <div
                  className="preview-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAddFile(i);
                  }}
                >
                  ×
                </div>
                {m.mediaType === "image" ? <img src={m.url} alt="" /> : <video src={m.url} muted />}
              </div>
            ))}
          </div>

          {addErrorMessage && (
            <div className="error-message-box">⛔ {addErrorMessage}</div>
          )}

          <div className="popup-buttons">
            <button className="popup-add" onClick={handleCreatePlanet}>Create</button>
            <button className="popup-close" onClick={closeAddPopup}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (planetEditPopup && planet) {
    return (
      <div className="planet-edit-overlay" onClick={closePlanetEditPopup}>
        <div className="planet-edit-panel" onClick={(e) => e.stopPropagation()}>
          <h3>Edit Planet Info</h3>

          <div className="edit-input-group">
            <label className="edit-label">Planet Name</label>
            <input
              className="edit-input-text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter planet name"
            />
          </div>

          <div className="edit-input-group">
            <label className="edit-label">Change Thumbnail</label>

            <div className="edit-thumbnail-preview">
              {previewUrl ? <img src={previewUrl} alt="Thumbnail Preview" /> : <div className="no-preview-text">No Image</div>}
            </div>

            <button className="edit-file-btn" onClick={() => editFileInputRef.current.click()}>
              Select File
            </button>

            <input
              type="file"
              ref={editFileInputRef}
              style={{ display: "none" }}
              accept="image/*,video/*"
              onChange={handleThumbnailChange}
            />
          </div>

          <div className="edit-actions">
            <button className="edit-cancel-btn" onClick={closePlanetEditPopup}>Cancel</button>
            <button className="edit-save-btn" onClick={handleSavePlanetEdit}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
