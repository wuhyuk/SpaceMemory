// src/components/planet/PlanetPreview/PlanetPreview/PlanetPreview.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./PlanetPreview.css";

export default function PlanetPreview({ x, y, media }) {
  // 1) Hooks: 항상 최상단
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const hoverRef = useRef(false);
  const [armed, setArmed] = useState(false); // (선택) UI/디버그용

  // 2) media가 null일 수 있으니 안전하게 계산
  const src = (media && (media.url || media.media)) || undefined;
  const isVideo = !!(media && media.mediaType === "video");

  // 3) 헬퍼
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.pause();
      v.currentTime = 0;
    } catch (e) {}
  };

  const onEnter = () => {
    if (!isVideo) return;

    clearTimer();
    hoverRef.current = true;
    setArmed(true);

    timerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      if (!hoverRef.current) return;

      try {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {}
    }, 300);
  };

  const onLeave = () => {
    clearTimer();
    hoverRef.current = false;
    setArmed(false);
    stopVideo();
  };

  // 4) useEffect: 조건부 호출 금지(항상 호출)
  useEffect(() => {
    clearTimer();
    hoverRef.current = false;
    setArmed(false);
    stopVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isVideo]);

  useEffect(() => {
    return () => {
      clearTimer();
      hoverRef.current = false;
      stopVideo();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 5) 모든 Hook 이후 early return
  if (!media) return null;

  // 6) 렌더 계산
  const boxW = 140;
  const boxH = 140;

  const diagonalX = 120;
  const diagonalY = -120;

  const diagEndX = x + diagonalX;
  const diagEndY = y + diagonalY;
  const diagLen = Math.sqrt(diagonalX ** 2 + diagonalY ** 2);

  const line2Length = boxW;
  const centerX = diagEndX + line2Length / 2;
  const centerY = diagEndY;

  const content = !isVideo ? (
    <img src={src} className="preview-img" alt="" loading="lazy" />
  ) : (
    <video
      ref={videoRef}
      src={src}
      className="preview-img"
      muted
      playsInline
      preload="none"
    />
  );

  return createPortal(
    <div className="preview-root">
      <div
        className="preview-line1"
        style={{
          "--x": `${x}px`,
          "--y": `${y - 1}px`,
          "--len": `${diagLen}px`,
        }}
      />

      <div
        className="preview-line2"
        style={{
          "--x": `${diagEndX}px`,
          "--y": `${diagEndY}px`,
          "--len": `${line2Length}px`,
        }}
      />

      <div
        className="preview-box-wrapper"
        style={{
          "--boxW": `${boxW}px`,
          "--boxH": `${boxH}px`,
          "--cx": `${centerX}px`,
          "--cy": `${centerY}px`,
        }}
      >
        <div className="preview-box" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          {content}
        </div>
      </div>
    </div>,
    document.body
  );
}
