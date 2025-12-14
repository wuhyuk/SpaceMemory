// src/components/background/BlackHole.jsx
import React from "react";
import "./BlackHole.css";

function BlackHole({ size = 500 }) {
  const style = {
    "--bh-size": `${size}px`,
  };

  return (
    <div className="bh-wrapper">
      <div className="bh-orbit-glow" />

      <div className="bh-container" style={style}>
        {/* 가로로 퍼진 연속 띠 디스크 (수평선 부분) */}
        <div className="bh-disk-main" />
        <div className="bh-disk-halo" />

        {/* 블랙홀 코어 (완전 어두운 부분) */}
        <div className="bh-core" />

        {/* 포톤 링 (얇은 내부 고리) */}
        <div className="bh-photon-ring" />

        {/* 중력 렌즈 + 위/아래 강한 광채 링 */}
        <div className="bh-lens-ring" />

        {/* 전체 글로우 */}
        <div className="bh-glow" />
      </div>
    </div>
  );
}

export default BlackHole;
