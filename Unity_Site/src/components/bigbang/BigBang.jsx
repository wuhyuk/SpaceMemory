// src/components/background/BigBangCanvas.jsx
import React, { useRef, useEffect } from "react";

const BigBangCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    let viewW = window.innerWidth;
    let viewH = window.innerHeight;

    const resize = () => {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = viewW * dpr;
      canvas.height = viewH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // 타임라인
    const CONVERGE_DURATION = 2800;
    const EXPLOSION_DURATION = 2200;
    const FILL_DURATION = 3500;
    const TOTAL_DURATION =
      CONVERGE_DURATION + EXPLOSION_DURATION + FILL_DURATION + 1000;

    let startTime = performance.now();
    let lastTime = startTime;

    let phase = "converge";
    let phaseStart = startTime;

    // 수렴용 streak
    let convergeStreaks = [];
    // 폭발 먼지
    let ringParticles = [];

    let animationId;

    const COLOR_PALETTE = [
      [255, 230, 190],
      [255, 210, 160],
      [255, 190, 220],
      [200, 190, 255],
      [185, 215, 255],
      [190, 255, 230],
    ];

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

    // ---------------- 생성 함수들 ----------------

    // 밖에서 안으로 빨려 들어가는 빛줄기
    const createConvergeStreaks = () => {
      const count = 260;
      const cx = viewW / 2;
      const cy = viewH / 2;
      const maxLen = Math.max(viewW, viewH) * 0.9;

      convergeStreaks = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const len = maxLen * (0.4 + Math.random() * 0.6);

        const delay = Math.random() * 0.4; // 시작 시점 랜덤
        const durationFactor = 0.4 + Math.random() * 0.4;

        const baseColor =
          COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

        convergeStreaks.push({
          cx,
          cy,
          angle,
          len,
          delay,
          durationFactor,
          color: { r: baseColor[0], g: baseColor[1], b: baseColor[2] },
        });
      }
    };

    // 폭발 먼지: 각 파티클은 각자 다른 maxRadius를 가지는 "구름"
    const createRingParticles = () => {
      const cx = viewW / 2;
      const cy = viewH / 2;

      const count = 900; // 먼지 많이
      const maxR = Math.max(viewW, viewH) * 0.75; // 최대로 퍼질 거리

      ringParticles = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;

        // 0~1에서 뽑되, 안쪽에 더 많이 몰리도록 분포 조정
        const rFactor = Math.random() ** 1.8;
        const maxRadius = maxR * rFactor;

        const baseColor =
          COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

        ringParticles.push({
          angle,
          maxRadius,
          life: EXPLOSION_DURATION * 1.15,
          age: 0,
          size: 1.4 + Math.random() * 2.6,
          color: { r: baseColor[0], g: baseColor[1], b: baseColor[2] },
        });
      }
    };

    createConvergeStreaks();

    // ---------------- 각 단계 드로잉 ----------------

    // 1) 수렴 단계: 밖에서 안으로 빨려 들어가는 빛줄기
    const drawConvergePhase = (progress) => {
      const cx = viewW / 2;
      const cy = viewH / 2;

      ctx.clearRect(0, 0, viewW, viewH);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, viewW, viewH);

      convergeStreaks.forEach((s) => {
        const local =
          (progress - s.delay) / Math.max(0.001, s.durationFactor);
        if (local <= 0 || local >= 1.0) return;

        const t = clamp01(local);
        const tEase = t * t * (3 - 2 * t); // smoothstep

        // 처음에 길고 → 점점 짧아짐 = 빨려 들어오는 느낌
        const scaleX = 1 - tEase;
        const lenNow = s.len * scaleX;

        let opacity;
        if (tEase < 0.3) {
          opacity = tEase / 0.3; // 0 → 1
        } else {
          opacity = 1 - (tEase - 0.3) / 0.7; // 1 → 0
        }
        opacity = Math.max(0, Math.min(1, opacity));

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(s.angle);

        ctx.shadowColor = "rgba(255,255,255,0.9)";
        ctx.shadowBlur = 10;

        ctx.fillStyle = `rgba(${s.color.r},${s.color.g},${s.color.b},${opacity})`;
        ctx.fillRect(0, -0.7, lenNow, 1.4);

        ctx.restore();
        ctx.shadowBlur = 0;
      });

      // 중앙 작은 코어 점 (진짜 점 느낌)
      const ease = 1 - (1 - progress) * (1 - progress);
      const coreRadius = 0.8 + ease * 1.2; // 0.8~2px 정도

      const coreGrad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        coreRadius * 3
      );
      coreGrad.addColorStop(0, "rgba(255,255,255,1)");
      coreGrad.addColorStop(0.4, "rgba(255,245,230,0.9)");
      coreGrad.addColorStop(1, "rgba(255,220,180,0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    // 2) 폭발: 구 형태로 퍼지는 먼지 + 화면 전체 섬광 + 커지는 초신성
    const drawExplosionPhase = (dt, progress) => {
      const cx = viewW / 2;
      const cy = viewH / 2;

      ctx.clearRect(0, 0, viewW, viewH);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, viewW, viewH);

      // 화면 전체 섬광
      const maxRadiusScreen = Math.sqrt(viewW * viewW + viewH * viewH);
      const flashRadius = maxRadiusScreen * (0.4 + progress * 0.9);
      const flashAlpha = Math.pow(1 - progress, 0.7);

      const flashGrad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        flashRadius
      );
      flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
      flashGrad.addColorStop(0.3, `rgba(255,245,230,${flashAlpha * 0.95})`);
      flashGrad.addColorStop(0.6, `rgba(255,230,190,${flashAlpha * 0.75})`);
      flashGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, flashRadius, 0, Math.PI * 2);
      ctx.fill();

      // 구 형태의 먼지 (초반 빠르고, 바깥에서 느려지는 ease-out)
      ctx.globalCompositeOperation = "lighter";

      for (const p of ringParticles) {
        p.age += dt;
        const tRaw = p.age / p.life;
        const t = clamp01(tRaw);
        const e = easeOutQuad(t); // 0→1, 처음 빠르고 나중 느리게

        const radius = p.maxRadius * e;
        const x = cx + Math.cos(p.angle) * radius;
        const y = cy + Math.sin(p.angle) * radius;

        const fade = 1 - t;
        const alpha = fade * (0.7 + 0.3 * progress);
        const size = p.size * (0.9 + 0.2 * fade);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 초신성 코어: 먼지 구름 안에서 같이 커지는 밝은 코어
      const maxR = Math.max(viewW, viewH) * 0.75;
      const superNorm = easeOutQuad(progress);
      const coreRadius = 12 + superNorm * maxR * 0.45;

      const coreGrad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        coreRadius
      );
      coreGrad.addColorStop(0, "rgba(255,255,255,1)");
      coreGrad.addColorStop(0.25, "rgba(255,245,230,0.98)");
      coreGrad.addColorStop(0.55, "rgba(255,225,190,0.7)");
      coreGrad.addColorStop(0.9, "rgba(200,210,255,0.18)");
      coreGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.arc(cx, cy, 3.0 + superNorm * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    };

    // 3) 우주 형성: 먼지 잔상만 점점 사라지면서 뒤에 SpaceBackground 드러남
    const drawFillPhase = (dt, progress) => {
      const cx = viewW / 2;
      const cy = viewH / 2;

      // ★ 여기서는 더 이상 배경을 검게 칠하지 않는다
      // 캔버스만 깨끗이 지우고, 반투명 먼지만 그려서 서서히 사라지게
      ctx.clearRect(0, 0, viewW, viewH);

      ctx.globalCompositeOperation = "lighter";

      for (const p of ringParticles) {
        p.age += dt;
        const tRaw = p.age / p.life;
        const t = clamp01(tRaw);
        const e = easeOutQuad(t);

        const radius = p.maxRadius * e;
        const x = cx + Math.cos(p.angle) * radius;
        const y = cy + Math.sin(p.angle) * radius;

        const fadeLife = 1.3;
        const fadeT = Math.min(1, tRaw / fadeLife);
        const fade = Math.max(0, 1 - fadeT);

        // 전체 진행(progress)에 따라 먼지 자체도 점점 더 옅어지게
        const alpha = fade * (0.5 * (1 - progress));
        const size = p.size * (0.7 + 0.3 * fade);

        if (alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      // ★ 여기서는 bgStars를 전혀 안 그리고, SpaceBackground만 보이게 둔다
    };

    // ---------------- 메인 루프 ----------------

    const loop = (now) => {
      const elapsedTotal = now - startTime;
      const elapsedPhase = now - phaseStart;
      const dt = now - lastTime;
      lastTime = now;

      if (elapsedTotal >= TOTAL_DURATION) {
        // 마지막에는 완전히 비워진 상태로 두기 (투명)
        ctx.clearRect(0, 0, viewW, viewH);
        return;
      }

      if (phase === "converge") {
        const progress = clamp01(elapsedPhase / CONVERGE_DURATION);
        drawConvergePhase(progress);

        if (progress >= 1) {
          phase = "explosion";
          phaseStart = now;
          createRingParticles();
        }
      } else if (phase === "explosion") {
        const progress = clamp01(elapsedPhase / EXPLOSION_DURATION);
        drawExplosionPhase(dt, progress);

        if (progress >= 1) {
          phase = "fill";
          phaseStart = now;
        }
      } else if (phase === "fill") {
        const progress = clamp01(elapsedPhase / FILL_DURATION);
        drawFillPhase(dt, progress);
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 999,
        pointerEvents: "none",
        background: "transparent", // 마지막에는 투명
      }}
    />
  );
};

export default BigBangCanvas;
