import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';

// 🔹 마커 아이콘 이미지 깨짐 방지 코드
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// ⭐️ Context Path 정의 (Java 서버의 Context Root와 일치해야 함)
const CONTEXT_PATH = "/MemorySpace";
const API_BASE = `${CONTEXT_PATH}/api`; // /MemorySpace/api

const MapPage = () => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // ⭐️ 1. API에서 가져온 원본 위치 데이터
  const [rawLocations, setRawLocations] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(3);

  // ✅ 로딩/에러 상태
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // 🔹 파란색 계열 색상 배열
  const blueColors = [
    '#3366FF', '#007FFF', '#00BFFF', '#1E90FF', '#6495ED',
    '#4169E1', '#0000FF', '#0000CD', '#00008B', '#00BFF7'
  ];

  // 🔹 무작위 색상 선택 함수
  const getRandomBlue = () => {
    return blueColors[Math.floor(Math.random() * blueColors.length)];
  };

  // ⭐️ 두 지점 간의 거리 계산 (km 단위)
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ⭐️ 줌 레벨에 따른 클러스터링 거리 계산 (km)
  const getClusterDistance = (zoom) => {
    if (zoom <= 2) return 2000;
    if (zoom <= 3) return 1000;
    if (zoom <= 4) return 500;
    if (zoom <= 5) return 300;
    if (zoom <= 6) return 150;
    if (zoom <= 7) return 80;
    if (zoom <= 8) return 40;
    if (zoom <= 9) return 20;
    if (zoom <= 10) return 10;
    if (zoom <= 11) return 5;
    return 1;
  };

  // ⭐️ 2. 서버에서 지오코딩된 데이터를 가져오는 함수
  const fetchMapData = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`${API_BASE}/map`, {
        method: "GET",
        // ✅ 중요: 세션 쿠키를 포함해서 보냄 (크로스 오리진이면 필수)
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        // ✅ 401이면 더 명확한 메시지 제공
        if (response.status === 401) {
          throw new Error("Login is required. (401)");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRawLocations(data);
    } catch (error) {
      console.error("Failed to fetch map data:", error);
      setRawLocations([]);
      setLoadError(error?.message || "Failed to load map data");
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐️ 3. 거리 기반 클러스터링
  const clusterLocations = (locations, zoom) => {
    const maxDistance = getClusterDistance(zoom);
    const clusters = [];
    const used = new Set();

    locations.forEach((location, index) => {
      if (used.has(index)) return;

      const cluster = {
        lat: location.lat,
        lng: location.lng,
        name: location.name,
        items: [location],
        totalSize: location.value || 0,
        count: 1,
        indices: [index]
      };

      locations.forEach((otherLocation, otherIndex) => {
        if (used.has(otherIndex) || index === otherIndex) return;

        const distance = getDistance(
          location.lat,
          location.lng,
          otherLocation.lat,
          otherLocation.lng
        );

        if (distance <= maxDistance) {
          cluster.items.push(otherLocation);
          cluster.totalSize += otherLocation.value || 0;
          cluster.count += 1;
          cluster.indices.push(otherIndex);
          used.add(otherIndex);
        }
      });

      if (cluster.items.length > 1) {
        const avgLat = cluster.items.reduce((sum, item) => sum + item.lat, 0) / cluster.items.length;
        const avgLng = cluster.items.reduce((sum, item) => sum + item.lng, 0) / cluster.items.length;
        cluster.lat = avgLat;
        cluster.lng = avgLng;
      }

      clusters.push(cluster);
      used.add(index);
    });
    return clusters;
  };

  // ⭐️ 4. 지도 초기화 및 데이터 로딩 (최초 1회 실행)
  useEffect(() => {
    if (mapInstanceRef.current) return;

    // 데이터 로딩 시작
    fetchMapData();

    const DefaultIcon = L.icon({
      iconUrl: iconMarker,
      iconRetinaUrl: iconRetina,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    const corner1 = L.latLng(-85, -180);
    const corner2 = L.latLng(85, 180);
    const bounds = L.latLngBounds(corner1, corner2);

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      noWrap: true,
      bounds: bounds
    }).addTo(map);

    L.control.scale({ imperial: true, metric: true }).addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ⭐️ 5. rawLocations나 currentZoom이 변경될 때마다 마커를 다시 그리기
  useEffect(() => {
    if (!mapInstanceRef.current || rawLocations.length === 0) return;

    const map = mapInstanceRef.current;
    const clusteredLocations = clusterLocations(rawLocations, currentZoom);

    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    clusteredLocations.forEach((loc) => {
      const baseRadius = 15;
      const radiusMultiplier = 0.1;
      const maxPossibleValue = 10000000;

      const scaledValue = Math.min(loc.totalSize, maxPossibleValue);
      const calculatedRadius = baseRadius + (scaledValue / maxPossibleValue) * baseRadius * radiusMultiplier;

      const baseOpacity = 0.9;
      const opacityReductionFactor = 0.5;
      const calculatedOpacity = Math.max(0.3, baseOpacity - (scaledValue / maxPossibleValue) * opacityReductionFactor);

      const randomBlue = getRandomBlue();

      L.circleMarker([loc.lat, loc.lng], {
        color: randomBlue,
        weight: 2,
        fillColor: randomBlue,
        fillOpacity: calculatedOpacity,
        radius: calculatedRadius
      })
        .addTo(map)
        .bindPopup(`
          <b>${loc.name}</b><br>
          Media count: ${loc.count}<br>
          Total size: ${(loc.totalSize / 1024 / 1024).toFixed(2)}MB
        `);

      const numberIcon = L.divIcon({
        className: 'number-icon',
        html: `<div style="
          color: white;
          font-weight: bold;
          font-size: 14px;
          text-align: center;
          line-height: 20px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        ">${loc.count}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([loc.lat, loc.lng], { icon: numberIcon }).addTo(map);
    });

  }, [rawLocations, currentZoom]);

  return (
    <div className="map-page-container">
      <div id="map" ref={mapContainerRef}></div>

      {isLoading && (
        <div className="map-loading-overlay">
          <div className="map-loading-box">
            <div className="map-loading-spinner" />
            <div className="map-loading-text">Loading map...</div>
            <div className="map-loading-subtext">Fetching location data.</div>
          </div>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="map-loading-overlay">
          <div className="map-loading-box">
            <div className="map-loading-text">Failed to load the map.</div>
            <div className="map-loading-subtext">{loadError}</div>
            <button className="map-loading-retry" onClick={fetchMapData}>
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
