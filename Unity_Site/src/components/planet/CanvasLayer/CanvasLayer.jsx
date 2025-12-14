// src/planet/CanvasLayer/CanvasLayer.jsx
import React, { useEffect, useRef } from "react";


export default function CanvasLayer({ system }) {
  // starsRef 제거됨
  const planetRef = useRef(null);
  const bgCanvasRef = useRef(null); // bgCanvas는 planetCanvas에 배경으로 복사하기 위해 유지

  const {
    containerRef,
    planetsRef,
    labelRefs,
    hoveredListPlanet,
    popupOpen,
    mediaPopup,
    isPausedRef,
  } = system;

  useEffect(() => {
    // starsCanvas 관련 변수 제거됨
    const planetCanvas = planetRef.current;
    const container = containerRef.current;

    if (!planetCanvas || !container) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);

    const bgCanvas = document.createElement("canvas");
    bgCanvasRef.current = bgCanvas;
    const bgCtx = bgCanvas.getContext("2d");

    // let stars = []; 제거됨

    function resize() {
      const { width, height } = container.getBoundingClientRect();

      // starsCanvas 제거됨
      [planetCanvas, bgCanvas].forEach((c) => {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
        c.style.width = `${width}px`;
        c.style.height = `${height}px`;
      });

      drawBackground();
      // initStars() 제거됨
    }

    // initStars 함수 제거됨

    // drawStars 함수 제거됨

    function drawBackground() {
      const w = bgCanvas.width;
      const h = bgCanvas.height;

      // 이전 단계에서 Blobs 로직이 제거되었으므로, 캔버스만 지웁니다.
      bgCtx.clearRect(0, 0, w, h);
      bgCtx.globalCompositeOperation = "source-over";
    }

    function drawPlanets() {
      const ctx = planetCanvas.getContext("2d");
      const w = planetCanvas.width;
      const h = planetCanvas.height;

      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bgCanvas, 0, 0);

      // sunGrad 로직 (유지)
      const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300 * dpr);
      sunGrad.addColorStop(0, "rgba(255,255,200,0.9)");
      sunGrad.addColorStop(0.2, "rgba(255,220,100,0.6)");
      sunGrad.addColorStop(0.6, "rgba(255,160,0,0.3)");
      sunGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "source-over";
      
      // 행성 그리기 로직 (유지)
      const lightX = cx;
      const lightY = cy;

      const tiltX = 0.1;
      const tiltY = 0.7;
      const rotation = -Math.PI / 15;

      const containerRect = containerRef.current.getBoundingClientRect();

      planetsRef.current.forEach((p, i) => {
        if (!p || isNaN(p.r) || p.r <= 0 || isNaN(p.screenX) || isNaN(p.screenY)) {
          return;
        }

        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          p.orbit * (1 - tiltX),
          p.orbit * (1 - tiltY),
          rotation,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (!isPausedRef.current) p.angle += p.speed * 16;

        const x =
          cx +
          Math.cos(p.angle) * p.orbit * (1 - tiltX) * Math.cos(rotation) -
          Math.sin(p.angle) * p.orbit * (1 - tiltY) * Math.sin(rotation);

        const y =
          cy +
          Math.cos(p.angle) * p.orbit * (1 - tiltX) * Math.sin(rotation) +
          Math.sin(p.angle) * p.orbit * (1 - tiltY) * Math.cos(rotation);

        p.canvasX = x;
        p.canvasY = y;
        p.screenX = containerRect.left + x / dpr;
        p.screenY = containerRect.top + y / dpr;

        const fillColor =
          (mediaPopup && mediaPopup.planet.id !== p.id) ||
          popupOpen ||
          (hoveredListPlanet !== null && hoveredListPlanet !== p.id)
            ? "#777"
            : p.color;

        const dx = x - lightX;
        const dy = y - lightY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const highlightX = x - (dx / dist) * p.r * 0.6;
        const highlightY = y - (dy / dist) * p.r * 0.6;

        if (isNaN(highlightX) || isNaN(highlightY) || isNaN(x) || isNaN(y) || isNaN(p.r)) {
          return;
        }

        const grad = ctx.createRadialGradient(highlightX, highlightY, 0, x, y, p.r);
        grad.addColorStop(0, "rgba(255,255,255,0.9)");
        grad.addColorStop(0.25, fillColor);
        grad.addColorStop(1, "rgba(0,0,0,0.75)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (labelRefs.current[i]) {
          const label = labelRefs.current[i];
          label.style.transform = `translate(${x / dpr - 20}px, ${y / dpr + p.r / dpr + 8}px)`;
        }
      });
    }

    let raf;
    function loop() {
      // drawStars() 제거됨
      drawPlanets();
      raf = requestAnimationFrame(loop);
    }

    resize();
    loop();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [hoveredListPlanet, popupOpen, mediaPopup]);

  return (
    <>
      {/* stars-canvas 제거됨 */}
      <canvas ref={planetRef} className="planet-canvas" />
    </>
  );
}