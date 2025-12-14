// src/components/background/SpaceBackground.jsx
import React, { useEffect, useRef } from "react";
import "./SpaceBackground.css";

/**
 * ✅ interactive 옵션
 * - interactive=true (기본): 큰 별 클릭/툴팁/워프 사용
 * - interactive=false: 배경만 표시(클릭/툴팁/워프 비활성화)
 *
 * ✅ Big star positions are persisted in localStorage (normalized coords).
 * ✅ Shift + Drag: reposition big stars and persist.
 */
export default function SpaceBackground({ navigate, interactive = true }) {
  const spaceRef = useRef(null);
  const sceneRef = useRef(null);
  const smallLayerRef = useRef(null);
  const bigLayerRef = useRef(null);
  const tooltipRef = useRef(null);
  const warpLayerRef = useRef(null);
  const zoomLayerRef = useRef(null);

  const emitterTimerRef = useRef(null);
  const emitterEndTimerRef = useRef(null);

  const STORAGE_KEY = "ms_space_bigstar_positions_v1";

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // ---------- deterministic RNG (for initial placement only) ----------
  const hashStringToUint32 = (str) => {
    // FNV-1a 32-bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };

  const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const readStoredPositions = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (!parsed.stars || typeof parsed.stars !== "object") return null;
      return parsed.stars;
    } catch {
      return null;
    }
  };

  const writeStoredPositions = (starsObj) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, stars: starsObj })
      );
    } catch {
      // ignore storage errors
    }
  };

  // ===== Tooltip =====
  const showTooltip = (x, y, html) => {
    if (!interactive) return;

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
      tip.style.left = clamp(x, 8, maxLeft) + "px";
      tip.style.top = clamp(y, 8, maxTop) + "px";
    });
  };

  const hideTooltip = () => {
    const tip = tooltipRef.current;
    if (!tip) return;
    tip.classList.remove("show");
  };

  // ===== Warp Effect =====
  const startWarp = () => {
    if (!interactive) return;
    const warpLayer = warpLayerRef.current;
    if (!warpLayer) return;
    warpLayer.classList.add("warp-on");
  };

  const stopWarp = () => {
    const warpLayer = warpLayerRef.current;
    if (!warpLayer) return;
    warpLayer.classList.remove("warp-on");
  };

  // ===== Zoom animation + navigation =====
  const zoomFromStar = (starEl, path) => {
    if (!interactive) return;

    const zoomLayer = zoomLayerRef.current;
    if (!zoomLayer || !starEl) return;

    const rect = starEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // ✅ 큰 별 자체 줌 애니메이션 트리거
    starEl.classList.add("zooming");
    setTimeout(() => starEl.classList.remove("zooming"), 1600);

    // ✅ 버스트
    const burst = document.createElement("div");
    burst.className = "zoom-burst";
    burst.style.left = cx + "px";
    burst.style.top = cy + "px";
    zoomLayer.appendChild(burst);
    setTimeout(() => burst.remove(), 800);

    // 줌 레이어
    zoomLayer.style.transformOrigin = `${cx}px ${cy}px`;
    zoomLayer.classList.add("zoom-in");

    startWarp();

    setTimeout(() => {
      if (navigate && path) navigate(path);
      setTimeout(() => {
        zoomLayer.classList.remove("zoom-in");
        stopWarp();
      }, 800);
    }, 800);
  };

  // ===== fixed big-star positions (create missing only) =====
  const getOrCreateBigStarPositions = (configs, W, H, marginPx, minDistPx) => {
    const stored = readStoredPositions();
    const starsObj = stored ? { ...stored } : {};

    const missing = configs.filter((c) => !starsObj[c.path]);
    if (missing.length === 0) return starsObj;

    const seedBase = hashStringToUint32(
      "MemorySpace::BigStars::v1::" + configs.map((c) => c.path).join("|")
    );
    const rand = mulberry32(seedBase);

    const existing = [];
    for (const cfg of configs) {
      const p = starsObj[cfg.path];
      if (p && typeof p.rx === "number" && typeof p.ry === "number") {
        existing.push({ rx: p.rx, ry: p.ry });
      }
    }

    const isFarNorm = (rx, ry, arr, minDistPxLocal) => {
      const usableW = Math.max(1, W - marginPx * 2);
      const usableH = Math.max(1, H - marginPx * 2);
      const x = marginPx + rx * usableW;
      const y = marginPx + ry * usableH;

      for (const p of arr) {
        const px = marginPx + p.rx * usableW;
        const py = marginPx + p.ry * usableH;
        if (Math.hypot(x - px, y - py) < minDistPxLocal) return false;
      }
      return true;
    };

    const low = 0.15;
    const high = 0.85;

    const placed = [...existing];
    for (const cfg of missing) {
      let rx = 0.5;
      let ry = 0.5;
      let tries = 0;

      let localMinDist = minDistPx;

      while (tries++ < 800) {
        rx = low + rand() * (high - low);
        ry = low + rand() * (high - low);

        if (isFarNorm(rx, ry, placed, localMinDist)) break;

        if (tries === 300) localMinDist = Math.max(160, Math.floor(minDistPx * 0.75));
        if (tries === 500) localMinDist = Math.max(120, Math.floor(minDistPx * 0.6));
      }

      starsObj[cfg.path] = { rx, ry };
      placed.push({ rx, ry });
    }

    writeStoredPositions(starsObj);
    return starsObj;
  };

  // ===== Shift+Drag reposition & persist =====
  const attachDragHandlers = (starEl, cfg, margin, getViewport) => {
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onPointerDown = (e) => {
      if (!interactive) return;
      // ✅ Shift를 누른 경우에만 드래그 모드
      if (!e.shiftKey) return;

      e.preventDefault();
      e.stopPropagation();
      hideTooltip();

      dragging = true;
      moved = false;

      const left = parseFloat(starEl.style.left || "0");
      const top = parseFloat(starEl.style.top || "0");

      startLeft = left;
      startTop = top;
      startX = e.clientX;
      startY = e.clientY;

      starEl.classList.add("dragging");
      starEl.setPointerCapture?.(e.pointerId);

      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp, { passive: false });
      window.addEventListener("pointercancel", onPointerUp, { passive: false });
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      e.preventDefault();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.hypot(dx, dy) > 3) moved = true;

      const { W, H } = getViewport();
      const minX = margin;
      const maxX = Math.max(margin, W - margin);
      const minY = margin;
      const maxY = Math.max(margin, H - margin);

      const newLeft = clamp(startLeft + dx, minX, maxX);
      const newTop = clamp(startTop + dy, minY, maxY);

      starEl.style.left = newLeft + "px";
      starEl.style.top = newTop + "px";
    };

    const onPointerUp = (e) => {
      if (!dragging) return;
      e.preventDefault();

      dragging = false;
      starEl.classList.remove("dragging");

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      // 드래그로 실제 이동이 있었으면 위치 저장
      if (moved) {
        const { W, H } = getViewport();
        const usableW = Math.max(1, W - margin * 2);
        const usableH = Math.max(1, H - margin * 2);

        const leftPx = parseFloat(starEl.style.left || "0");
        const topPx = parseFloat(starEl.style.top || "0");

        const rx = clamp((leftPx - margin) / usableW, 0, 1);
        const ry = clamp((topPx - margin) / usableH, 0, 1);

        const stored = readStoredPositions() || {};
        stored[cfg.path] = { rx, ry };
        writeStoredPositions(stored);
      }
    };

    starEl.addEventListener("pointerdown", onPointerDown);
  };

  // ===== star generation =====
  const generateStars = () => {
    const spaceEl = spaceRef.current;
    const smallLayer = smallLayerRef.current;
    const bigLayer = bigLayerRef.current;
    if (!spaceEl || !smallLayer || !bigLayer) return;

    smallLayer.textContent = "";
    bigLayer.textContent = "";
    hideTooltip();

    const W = spaceEl.clientWidth || window.innerWidth;
    const H = spaceEl.clientHeight || window.innerHeight;

    const starConfigs = [
      {
        title: "Introduction",
        desc: "This star contains an introduction to this site.",
        path: "/introduction",
      },
      {
        title: "Tutorial",
        desc: "Here, you can find the tutorial for this site.",
        path: "/tutorial",
      },
      {
        title: "Example",
        desc: "This star shows examples of how to use it.",
        path: "/example",
      },
      {
        title: "Inquiries",
        desc: "This star is for inquiries.",
        path: "/inquiries",
      },
    ];

    // 배치 파라미터
    const margin = 140;
    const BIG_MIN_DIST = 280;

    const getViewport = () => {
      const el = spaceRef.current;
      return {
        W: el?.clientWidth || window.innerWidth,
        H: el?.clientHeight || window.innerHeight,
      };
    };

    if (interactive) {
      const positions = getOrCreateBigStarPositions(
        starConfigs,
        W,
        H,
        margin,
        BIG_MIN_DIST
      );

      const placeX = (rx) => {
        const usable = Math.max(1, W - margin * 2);
        return clamp(margin + rx * usable, margin, Math.max(margin, W - margin));
      };
      const placeY = (ry) => {
        const usable = Math.max(1, H - margin * 2);
        return clamp(margin + ry * usable, margin, Math.max(margin, H - margin));
      };

      for (const cfg of starConfigs) {
        const p = positions[cfg.path] || { rx: 0.5, ry: 0.5 };
        const x = placeX(p.rx);
        const y = placeY(p.ry);

        const s = document.createElement("div");
        s.className = "big-star";
        s.style.left = x + "px";
        s.style.top = y + "px";

        // tooltip uses CSS classes
        const tipHtml = `<div class="tip-title">${cfg.title}</div><div class="tip-desc">${cfg.desc}</div>`;

        s.addEventListener("mouseenter", (e) => {
          showTooltip(e.clientX + 12, e.clientY + 12, tipHtml);
        });
        s.addEventListener("mousemove", (e) => {
          showTooltip(e.clientX + 12, e.clientY + 12, tipHtml);
        });
        s.addEventListener("mouseleave", hideTooltip);

        // ✅ Shift+Drag 저장 기능 (클릭 기능과 공존)
        attachDragHandlers(s, cfg, margin, getViewport);

        // 클릭 이동(드래그 중에는 pointerdown에서 stopPropagation하므로 클릭이 발생하지 않음)
        s.addEventListener("click", (e) => {
          // Shift 누른 채 클릭은 “편집” 의도가 강하므로 이동 막기
          if (e.shiftKey) return;
          zoomFromStar(s, cfg.path);
        });

        bigLayer.appendChild(s);
      }
    }

    // 작은 별 생성
    const SMALL_COUNT = 240;
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
      s.style.animationDelay = (Math.random() * 2.8).toFixed(2) + "s";

      smallLayer.appendChild(s);
    }
  };

  useEffect(() => {
    generateStars();

    const handleResize = () => generateStars();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (emitterTimerRef.current) clearInterval(emitterTimerRef.current);
      if (emitterEndTimerRef.current) clearTimeout(emitterEndTimerRef.current);
    };
  }, [interactive]);

  return (
    <div
      ref={spaceRef}
      className={`space ${interactive ? "" : "non-interactive"}`}
      aria-hidden="true"
    >
      <div ref={sceneRef} className="scene">
        <div className="nebula" />
        <div ref={smallLayerRef} className="layer small-layer" />
        <div ref={bigLayerRef} className="layer big-layer" />
      </div>

      <div ref={warpLayerRef} className="warp-layer" />
      <div ref={zoomLayerRef} className="zoom-layer" />
      <div ref={tooltipRef} className="tooltip" />
    </div>
  );
}
