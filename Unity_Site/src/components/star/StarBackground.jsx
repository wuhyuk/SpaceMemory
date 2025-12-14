// src/components/star/StarBackground.jsx
import React, { useEffect, useRef, useState } from "react";
import "../background/SpaceBackground.css";
import "./StarSidebar.css";

const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`;
const MAX_STAR_NAME_LENGTH = 15;
const MAX_STARS = 12;

const USER_STAR_POS_KEY = "ms_userstar_positions_v1";
const STARBG_EDITMODE_KEY = "ms_starbg_editmode_v1";
const STARBG_ANIM_KEY = "ms_starbg_anim_v1";

const COLLISION_RADIUS = 120;

export default function StarBackground({ navigate }) {
  const spaceRef = useRef(null);
  const sceneRef = useRef(null);
  const smallLayerRef = useRef(null);
  const bigLayerRef = useRef(null);
  const tooltipRef = useRef(null);
  const warpLayerRef = useRef(null);
  const zoomLayerRef = useRef(null);

  const resizeTimerRef = useRef(null);

  const [userStars, setUserStars] = useState([]);

  // 생성 모달
  const [isCreating, setIsCreating] = useState(false);
  const [newStarName, setNewStarName] = useState("");

  // 관리(수정/삭제) 모달
  const [selectedStar, setSelectedStar] = useState(null);
  const [isManaging, setIsManaging] = useState(false);
  const [editName, setEditName] = useState("");

  // 편집 모드(드래그 허용)
  const [editMode, setEditMode] = useState(() => {
    try {
      return localStorage.getItem(STARBG_EDITMODE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // 애니메이션 토글
  const [animationsOn, setAnimationsOn] = useState(() => {
    try {
      return localStorage.getItem(STARBG_ANIM_KEY) !== "0"; // default ON
    } catch {
      return true;
    }
  });

  // ===== utils =====
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const safeMargin = (W, H) => {
    const m = Math.floor(Math.min(W, H) * 0.18);
    return clamp(m, 90, 180);
  };

  // ===== localStorage positions =====
  const readPositions = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_STAR_POS_KEY)) || {};
    } catch {
      return {};
    }
  };

  const writePositions = (obj) => {
    try {
      localStorage.setItem(USER_STAR_POS_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  };

  // ✅ 고아 위치 데이터 제거
  const cleanupOrphanPositions = (stars) => {
    const stored = readPositions();
    const valid = new Set((stars || []).map((s) => String(s.id)));
    let changed = false;

    Object.keys(stored).forEach((k) => {
      if (!valid.has(k)) {
        delete stored[k];
        changed = true;
      }
    });

    if (changed) writePositions(stored);
  };

  // ===== tooltip =====
  const showTooltip = (x, y, html) => {
    const tip = tooltipRef.current;
    const spaceEl = spaceRef.current;
    if (!tip || !spaceEl) return;

    tip.innerHTML = html;
    tip.classList.add("show");

    requestAnimationFrame(() => {
      const W = spaceEl.clientWidth || window.innerWidth;
      const H = spaceEl.clientHeight || window.innerHeight;
      const maxLeft = W - (tip.offsetWidth || 0) - 8;
      const maxTop = H - (tip.offsetHeight || 0) - 8;
      tip.style.left = clamp(x + 16, 8, maxLeft) + "px";
      tip.style.top = clamp(y - 12, 8, maxTop) + "px";
    });
  };

  const hideTooltip = () => {
    tooltipRef.current?.classList.remove("show");
  };

  // ===== sidebar safe area =====
  const getSidebarNoGoLeft = () => {
    const sidebar = document.querySelector(".star-sidebar");
    if (!sidebar) return 0;
    const r = sidebar.getBoundingClientRect();
    return Math.max(0, r.right + 24); // sidebar right + gap
  };

  // ===== warp streak emitter =====
  const emitWarpStreaks = (durationMs = 1700) => {
    if (!animationsOn) return;

    const spaceEl = spaceRef.current;
    const warpLayer = warpLayerRef.current;
    if (!spaceEl || !warpLayer) return;

    warpLayer.textContent = "";

    const W = spaceEl.clientWidth || window.innerWidth;
    const H = spaceEl.clientHeight || window.innerHeight;
    const cx = W / 2;
    const cy = H / 2;

    const Rmin = Math.min(W, H) * 0.12;
    const band = Math.min(W, H) * 0.08;
    const OVERSHOOT = 220;

    const distanceToEdgeFrom = (angleRad, x0, y0) => {
      const dx = Math.cos(angleRad);
      const dy = Math.sin(angleRad);
      const tVals = [];

      if (dx !== 0) {
        const tx1 = (0 - x0) / dx;
        if (tx1 > 0) tVals.push(tx1);
        const tx2 = (W - x0) / dx;
        if (tx2 > 0) tVals.push(tx2);
      }
      if (dy !== 0) {
        const ty1 = (0 - y0) / dy;
        if (ty1 > 0) tVals.push(ty1);
        const ty2 = (H - y0) / dy;
        if (ty2 > 0) tVals.push(ty2);
      }

      const t = Math.min(...tVals);
      return Number.isFinite(t) ? t : Math.hypot(W, H);
    };

    const EMIT_BATCH = 20;
    const EMIT_EVERY_MS = 140;

    const emitBatch = () => {
      for (let i = 0; i < EMIT_BATCH; i++) {
        const span = document.createElement("span");
        span.className = "streak";

        const angleDeg = Math.random() * 360;
        const angleRad = (angleDeg * Math.PI) / 180;

        const rStart = Rmin + Math.random() * band;
        const x0 = cx + Math.cos(angleRad) * rStart;
        const y0 = cy + Math.sin(angleRad) * rStart;

        const reach = distanceToEdgeFrom(angleRad, x0, y0) + OVERSHOOT;
        const dur = 1200 + Math.random() * 800;
        const delay = Math.random() * 80;

        span.style.setProperty("--angle", angleDeg + "deg");
        span.style.setProperty("--len", reach.toFixed(2) + "px");
        span.style.setProperty("--dur", Math.round(dur) + "ms");
        span.style.setProperty("--delay", Math.round(delay) + "ms");

        span.style.left = x0 + "px";
        span.style.top = y0 + "px";

        warpLayer.appendChild(span);
        setTimeout(() => span.remove(), Math.round(delay + dur + 80));
      }
    };

    emitBatch();
    const t = setInterval(emitBatch, EMIT_EVERY_MS);
    setTimeout(() => clearInterval(t), durationMs);
  };

  // ===== click animation: center 이동 -> warp -> zooming -> navigate =====
  const zoomFromStar = (starEl, star) => {
    if (editMode) return;
    if (!navigate) return;

    if (!animationsOn) {
      navigate(`/star/${star.id}`);
      return;
    }

    const spaceEl = spaceRef.current;
    const zoomLayer = zoomLayerRef.current;
    if (!spaceEl) {
      navigate(`/star/${star.id}`);
      return;
    }

    const sRect = starEl.getBoundingClientRect();
    const pRect = spaceEl.getBoundingClientRect();

    const sx = sRect.left - pRect.left + sRect.width / 2;
    const sy = sRect.top - pRect.top + sRect.height / 2;

    const cx = pRect.width / 2;
    const cy = pRect.height / 2;

    const dx = cx - sx;
    const dy = cy - sy;

    // 1) 중앙으로 이동
    starEl.style.setProperty("--mx", `${dx}px`);
    starEl.style.setProperty("--my", `${dy}px`);
    starEl.style.transition = "transform 0.8s ease-out";
    starEl.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;

    // 배경 줌
    sceneRef.current?.classList.add("scene-zooming");

    // 2) 워프 + 버스트 + zooming
    setTimeout(() => {
      emitWarpStreaks(1700);

      if (zoomLayer) {
        const burst = document.createElement("div");
        burst.className = "zoom-burst";
        burst.style.left = cx + "px";
        burst.style.top = cy + "px";
        zoomLayer.appendChild(burst);
        setTimeout(() => burst.remove(), 800);
      }

      starEl.classList.add("zooming");

      // 3) 이동
      setTimeout(() => {
        navigate(`/star/${star.id}`);

        // 정리(복귀 대비)
        setTimeout(() => {
          starEl.classList.remove("zooming");
          sceneRef.current?.classList.remove("scene-zooming");
          starEl.style.transition = "";
          starEl.style.transform = "";
          starEl.style.setProperty("--mx", "0px");
          starEl.style.setProperty("--my", "0px");
          if (warpLayerRef.current) warpLayerRef.current.textContent = "";
        }, 800);
      }, 800);
    }, 800);
  };

  // ===== API: list =====
  const fetchUserStars = async () => {
    try {
      const response = await fetch(`${API_BASE}/star/list`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setUserStars(data.stars || []);
        cleanupOrphanPositions(data.stars || []);
      } else {
        setUserStars([]);
      }
    } catch (error) {
      console.error("Failed to fetch user stars:", error);
      setUserStars([]);
    }
  };

  // ===== ✅ 기존 로직: create/update/delete =====
  const handleCreateStar = async () => {
    const trimmedName = newStarName.trim();

    if (!trimmedName) {
      alert("Please enter a star name.");
      return;
    }

    if (trimmedName.length > MAX_STAR_NAME_LENGTH) {
      alert(`Star names must be within ${MAX_STAR_NAME_LENGTH} characters.`);
      return;
    }

    if (userStars.length >= MAX_STARS) {
      alert(`You can create up to ${MAX_STARS}stars.`);
      setIsCreating(false);
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("name", trimmedName);

      const response = await fetch(`${API_BASE}/star/create`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setNewStarName("");
        setIsCreating(false);
        fetchUserStars();
      } else {
        alert(data.message || "Failed to create star.");
      }
    } catch (error) {
      console.error("Failed to create star:", error);
      alert("Server connection error");
    }
  };

  const handleUpdateStar = async () => {
    if (!selectedStar) return;

    const trimmedName = editName.trim();

    if (!trimmedName) {
      alert("Please enter a star name.");
      return;
    }

    if (trimmedName.length > MAX_STAR_NAME_LENGTH) {
      alert(`Star names must be within ${MAX_STAR_NAME_LENGTH} characters.`);
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("starId", selectedStar.id);
      formData.append("name", trimmedName);

      const response = await fetch(`${API_BASE}/star/update`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setIsManaging(false);
        setSelectedStar(null);
        fetchUserStars();
      } else {
        alert(data.message || "Failed to rename star.");
      }
    } catch (error) {
      console.error("Failed to update star:", error);
      alert("Server connection error");
    }
  };

  const handleDeleteStar = async () => {
    if (!selectedStar) return;

    if (!window.confirm(`Are you sure you want to delete '${selectedStar.name}'?`)) {
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("starId", selectedStar.id);

      const response = await fetch(`${API_BASE}/star/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        // ✅ 삭제 즉시 localStorage 위치도 제거(고아 방지)
        const stored = readPositions();
        delete stored[String(selectedStar.id)];
        writePositions(stored);

        setIsManaging(false);
        setSelectedStar(null);
        fetchUserStars();
      } else {
        alert(data.message || "Failed to delete star.");
      }
    } catch (error) {
      console.error("Failed to delete star:", error);
      alert("Server connection error");
    }
  };

  // ===== collision push (sidebar safe bounds 반영) =====
  const pushAwayOthers = (dragEl, domList, bounds) => {
    const r1 = dragEl.getBoundingClientRect();
    const cx1 = r1.left + r1.width / 2;
    const cy1 = r1.top + r1.height / 2;

    domList.forEach(({ el }) => {
      if (el === dragEl) return;

      const r2 = el.getBoundingClientRect();
      const cx2 = r2.left + r2.width / 2;
      const cy2 = r2.top + r2.height / 2;

      const dist = Math.hypot(cx1 - cx2, cy1 - cy2);
      if (dist >= COLLISION_RADIUS) return;

      const push = (COLLISION_RADIUS - dist) / 2;
      const angle = Math.atan2(cy2 - cy1, cx2 - cx1);

      const nextL = parseFloat(el.style.left) + Math.cos(angle) * push;
      const nextT = parseFloat(el.style.top) + Math.sin(angle) * push;

      el.style.left = clamp(nextL, bounds.minX, bounds.maxX) + "px";
      el.style.top = clamp(nextT, bounds.minY, bounds.maxY) + "px";
    });
  };

  // ===== star generation =====
  const generateStars = () => {
    const space = spaceRef.current;
    const smallLayer = smallLayerRef.current;
    const bigLayer = bigLayerRef.current;
    if (!space || !smallLayer || !bigLayer) return;

    hideTooltip();

    const W = space.clientWidth || window.innerWidth;
    const H = space.clientHeight || window.innerHeight;
    const MARGIN = safeMargin(W, H);

    // ✅ 사이드바 금지구역 반영
    const sidebarNoGoLeft = getSidebarNoGoLeft();
    const minX = Math.max(MARGIN, sidebarNoGoLeft + 24);
    const maxX = Math.max(minX, W - MARGIN);
    const minY = MARGIN;
    const maxY = Math.max(minY, H - MARGIN);
    const bounds = { minX, maxX, minY, maxY };

    smallLayer.textContent = "";
    bigLayer.textContent = "";

    // small stars
    const SMALL_COUNT = animationsOn ? 240 : 160;
    for (let i = 0; i < SMALL_COUNT; i++) {
      const s = document.createElement("div");
      s.className = "small-star";

      const size = 1 + Math.random() * 2.2;
      const opacity = 0.25 + Math.random() * 0.6;

      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.left = Math.random() * W + "px";
      s.style.top = Math.random() * H + "px";
      s.style.opacity = opacity;

      if (animationsOn) s.style.animationDelay = (Math.random() * 2.8).toFixed(2) + "s";
      else s.style.animation = "none";

      smallLayer.appendChild(s);
    }

    // big stars
    const stored = readPositions();
    const domList = [];

    const usableW = Math.max(1, maxX - minX);
    const usableH = Math.max(1, maxY - minY);

    let storedDirty = false;

    userStars.forEach((star) => {
      const key = String(star.id);

      let rx = stored[key]?.rx;
      let ry = stored[key]?.ry;

      if (typeof rx !== "number" || typeof ry !== "number") {
        rx = Math.random();
        ry = Math.random();
        stored[key] = { rx, ry };
        storedDirty = true;
      }

      const x = clamp(minX + rx * usableW, minX, maxX);
      const y = clamp(minY + ry * usableH, minY, maxY);

      const el = document.createElement("div");
      el.className = "big-star";
      el.style.left = x + "px";
      el.style.top = y + "px";

      const html = `<div class="tip-title">${star.name}</div><div class="tip-desc">Click to view memory</div>`;
      el.onmouseenter = (e) => showTooltip(e.clientX, e.clientY, html);
      el.onmousemove = (e) => showTooltip(e.clientX, e.clientY, html);
      el.onmouseleave = hideTooltip;

      // click
      el.addEventListener("click", (e) => {
        if (editMode || e.shiftKey) return;
        zoomFromStar(el, star);
      });

      // drag (editMode OR shift)
      el.onpointerdown = (e) => {
        if (!editMode && !e.shiftKey) return;

        e.preventDefault();
        e.stopPropagation();
        hideTooltip();
        el.classList.add("dragging");

        const startX = e.clientX;
        const startY = e.clientY;
        const startL = parseFloat(el.style.left);
        const startT = parseFloat(el.style.top);

        let moved = false;

        const move = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          if (Math.hypot(dx, dy) > 2) moved = true;

          const nx = clamp(startL + dx, minX, maxX);
          const ny = clamp(startT + dy, minY, maxY);

          el.style.left = nx + "px";
          el.style.top = ny + "px";

          pushAwayOthers(el, domList, bounds);
        };

        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);

          el.classList.remove("dragging");
          if (!moved) return;

          const saveFromEl = (id, domEl) => {
            const l = parseFloat(domEl.style.left);
            const t = parseFloat(domEl.style.top);
            const nrx = clamp((l - minX) / usableW, 0, 1);
            const nry = clamp((t - minY) / usableH, 0, 1);
            stored[String(id)] = { rx: nrx, ry: nry };
          };

          saveFromEl(star.id, el);
          domList.forEach(({ id, el: other }) => saveFromEl(id, other));
          writePositions(stored);
        };

        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", up, { passive: false });
      };

      bigLayer.appendChild(el);
      domList.push({ id: star.id, el });
    });

    if (storedDirty) writePositions(stored);
  };

  // ===== toggles =====
  const toggleEditMode = () => {
    setEditMode((v) => {
      const next = !v;
      try {
        localStorage.setItem(STARBG_EDITMODE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const toggleAnimations = () => {
    setAnimationsOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(STARBG_ANIM_KEY, next ? "1" : "0");
      } catch {}
      if (!next && warpLayerRef.current) warpLayerRef.current.textContent = "";
      return next;
    });
  };

  // ===== modal open =====
  const openManage = (star) => {
    setSelectedStar(star);
    setEditName(star.name);
    setIsManaging(true);
  };

  // ===== effects =====
  useEffect(() => {
    fetchUserStars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    generateStars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStars, editMode, animationsOn]);

  useEffect(() => {
    const onResize = () => {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        generateStars();
      }, 200);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStars, editMode, animationsOn]);

  return (
    <div ref={spaceRef} className="space">
      <div ref={sceneRef} className="scene">
        <div className="nebula" />
        <div ref={smallLayerRef} className="layer small-layer" />
        <div ref={bigLayerRef} className="layer big-layer" />
      </div>

      <div ref={warpLayerRef} className="warp-layer" />
      <div ref={zoomLayerRef} className="zoom-layer" />
      <div ref={tooltipRef} className="tooltip" />

      {/* sidebar */}
      <div className="star-sidebar">
        <h3 className="star-sidebar-title">
          My Stars ({userStars.length}/{MAX_STARS})
        </h3>

        <div className="sidebar-controls">
          <button
            className={`sb-toggle ${editMode ? "on" : ""}`}
            onClick={toggleEditMode}
            type="button"
          >
            {editMode ? "Edit Mode: ON" : "Edit Mode: OFF"}
          </button>

          <button
            className={`sb-toggle ${animationsOn ? "on" : ""}`}
            onClick={toggleAnimations}
            type="button"
          >
            {animationsOn ? "Animations: ON" : "Animations: OFF"}
          </button>
        </div>

        <div className="star-list">
          {userStars.map((s) => (
            <button
              key={s.id}
              className="star-item"
              onClick={() => openManage(s)}
              type="button"
              title={s.name}
            >
              ⭐ {s.name}
            </button>
          ))}
        </div>

        {/* ✅ + 버튼을 사이드바 하단(리스트 아래)로 이동 */}
        <div className="sb-footer">
          <button
            className="sb-add"
            type="button"
            onClick={() => setIsCreating(true)}
            disabled={userStars.length >= MAX_STARS}
            title={
              userStars.length >= MAX_STARS
                ? `You can create up to ${MAX_STARS} stars.`
                : "Create New Star"
            }
          >
            <span className="sb-add-icon">+</span>
            <span className="sb-add-text">Add Star</span>
          </button>
        </div>
      </div>

      {/* create modal */}
      {isCreating && (
        <div className="star-modal-overlay" onClick={() => setIsCreating(false)}>
          <div className="star-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Star</h2>

            <input
              type="text"
              placeholder="Enter star name"
              value={newStarName}
              onChange={(e) => setNewStarName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateStar();
              }}
              maxLength={MAX_STAR_NAME_LENGTH}
            />

            <p className="char-count">
              {newStarName.length}/{MAX_STAR_NAME_LENGTH}
            </p>

            <div className="modal-actions">
              <button className="confirm-button" onClick={handleCreateStar} type="button">
                Confirm
              </button>
              <button className="cancel-button" onClick={() => setIsCreating(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* manage modal */}
      {isManaging && selectedStar && (
        <div className="star-modal-overlay" onClick={() => setIsManaging(false)}>
          <div className="star-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Manage Star</h2>

            <input
              type="text"
              placeholder="Enter new name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdateStar();
              }}
              maxLength={MAX_STAR_NAME_LENGTH}
            />

            <p className="char-count">
              {editName.length}/{MAX_STAR_NAME_LENGTH}
            </p>

            <div className="modal-actions">
              <button className="confirm-button" onClick={handleUpdateStar} type="button">
                Rename
              </button>
              <button className="delete-button" onClick={handleDeleteStar} type="button">
                Delete
              </button>
              <button className="cancel-button" onClick={() => setIsManaging(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
