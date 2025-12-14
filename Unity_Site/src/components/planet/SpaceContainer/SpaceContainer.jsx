// src/planet/SpaceContainer/SpaceContainer.jsx
import React from "react";
import "./SpaceContainer.css";

import usePlanetSystem from "../hooks/usePlanetSystem";
import CanvasLayer from "../CanvasLayer/CanvasLayer";
import PlanetList from "../PlanetList/PlanetList";

// ✅ 통합 모달
import PlanetModal from "../modals/PlanetModal";
import MediaModal from "../modals/MediaModal";

// ✅ 배경
import SpaceBackground from "../../background/SpaceBackground";

export default function SpaceContainer({ starId }) {
  // ✅ starId를 훅에 전달 (백엔드 연동용)
  const system = usePlanetSystem(starId);

  return (
    <div className="planet-page-root">
      <SpaceBackground interactive={false} />

      <div ref={system.containerRef} className="space-container planet-ui-layer">
        <CanvasLayer system={system} />
        <PlanetList system={system} />
        <PlanetModal system={system} />
        <MediaModal system={system} />
      </div>
    </div>
  );
}
