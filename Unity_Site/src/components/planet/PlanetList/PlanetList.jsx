// src/planet/PlanetList/PlanetList.jsx
import React, { useRef, useState } from "react";
import "./PlanetList.css";
import PlanetPreview from "../PlanetPreview/PlanetPreview";

export default function PlanetList({ system }) {
  const {
    planetList,
    hoveredListPlanet,
    setHoveredListPlanet,
    popupOpen,
    mediaPopup,
    setMediaPopup,
    setPopupOpen,
    setInputName,
    setInputFile,
    setInputTag,
    setTags,
    isPausedRef,
  } = system;

  const itemRefs = useRef([]);

  // ✅ [ADD] 별 1개당 행성 최대 7개일 때 + 버튼 숨김 + 안내 모달
  const MAX_PLANETS_PER_STAR = 7;
  const canAddPlanet = planetList.length < MAX_PLANETS_PER_STAR;
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  return (
    <>
      {planetList.length === 0 && canAddPlanet && (
        <button
          className="add-planet-button"
          onClick={() => {
            setPopupOpen(true);
            setTags([]);
            setInputName("");
            setInputFile([]);
            setInputTag("");
            isPausedRef.current = true;
          }}
        >
          Add Planet
        </button>
      )}

      {planetList.length > 0 && (
        <div className="planet-list">
          {planetList.map((p, idx) => {
            // ★ [기존] 표시할 미디어 결정 로직
            const previewFile =
              p.previewFiles && p.previewFiles.length > 0 ? p.previewFiles[0] : null;

            const normalMedia =
              p.mediaList && p.mediaList.length > 0 ? p.mediaList[0] : null;

            const displayMedia = previewFile || normalMedia;

            const validMedia =
              displayMedia && (displayMedia.mediaType || displayMedia.media || displayMedia.url)
                ? displayMedia
                : null;

            const canPreview =
              hoveredListPlanet === p.id &&
              !popupOpen &&
              !mediaPopup &&
              validMedia &&
              typeof p.screenX === "number" &&
              typeof p.screenY === "number";

            return (
              <React.Fragment key={`planet-${p.id}`}>
                {canPreview && <PlanetPreview x={p.screenX} y={p.screenY} media={validMedia} />}

                <div
                  className="planet-list-item"
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onMouseEnter={() => {
                    if (!popupOpen && !mediaPopup) {
                      setHoveredListPlanet(p.id);
                      isPausedRef.current = true;
                    }
                  }}
                  onMouseLeave={() => {
                    if (!mediaPopup) {
                      setHoveredListPlanet(null);
                      isPausedRef.current = false;
                    }
                  }}
                  onClick={() => {
                    setMediaPopup({ planet: p, zoomIndex: null });
                    isPausedRef.current = true;
                  }}
                >
                  {p.name}
                </div>
              </React.Fragment>
            );
          })}

          {/* ✅ [기존 유지 + 조건만 추가] 7개 미만일 때만 + 버튼 표시 */}
          {canAddPlanet && (
            <button
              className="small-add-button"
              onClick={() => {
                setPopupOpen(true);
                setTags([]);
                setInputName("");
                setInputFile([]);
                setInputTag("");
                isPausedRef.current = true;
              }}
            >
              +
            </button>
          )}

          {/* ✅ [ADD] 7개 도달 시 안내 문구 + 모달 오픈 버튼 */}
          {!canAddPlanet && (
            <button
              type="button"
              className="small-add-button"
              onClick={() => setLimitModalOpen(true)}
            >
              x
            </button>
          )}
        </div>
      )}

      {/* ✅ [ADD] alert 대신 모달 */}
      {limitModalOpen && (
        <div
          className="popup-overlay"
          onClick={() => setLimitModalOpen(false)}
        >
          <div
            className="popup-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0" }}>Planet Creation Limit</h3>

            <div className="warning-box" style={{ marginBottom: "14px" }}>
              This star already has the maximum of {MAX_PLANETS_PER_STAR} planets, so no more can be created.
              <br />
              If needed, please delete an existing planet and then try again.
            </div>

            <div className="popup-buttons">
              <button
                type="button"
                className="popup-close"
                onClick={() => setLimitModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
