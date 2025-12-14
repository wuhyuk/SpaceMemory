// src/planet/hooks/usePlanetSystem.js
import { useRef, useState, useEffect } from "react";

export default function usePlanetSystem(starId) {
  /* -----------------------------------------------------
     Refs
  ----------------------------------------------------- */
  const planetsRef = useRef([]);
  const labelRefs = useRef([]);
  const isPausedRef = useRef(false);
  const nextId = useRef(0);
  const containerRef = useRef(null);
  const lastLoadedMediaPlanetIdRef = useRef(null);
  // ✅ 로컬 id -> dbId 매핑(백엔드용). 화면 로직은 로컬 id 유지.
  const localToDbIdRef = useRef(new Map());

  /* -----------------------------------------------------
     UI States
  ----------------------------------------------------- */
  const [planetList, setPlanetList] = useState([]);
  const [hoveredListPlanet, setHoveredListPlanet] = useState(null);

  // ✅ 기존: 행성 추가 팝업
  const [popupOpen, setPopupOpen] = useState(false);

  // ✅ 추가: 행성 편집 팝업
  const [planetEditPopup, setPlanetEditPopup] = useState(null); // { planet } | null

  // ✅ 미디어 모달(기존 mediaPopup)
  const [mediaPopup, setMediaPopup] = useState(null);

  /* -----------------------------------------------------
     Inputs for AddPlanet
  ----------------------------------------------------- */
  const [inputName, setInputNameState] = useState("");
  const [inputFile, setInputFile] = useState([]);
  const [inputTag, setInputTag] = useState("");
  const [tags, setTags] = useState([]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const setInputName = (name) => {
    if (typeof name === "string" && name.length > 7) {
      name = name.substring(0, 7);
    }
    setInputNameState(name);
  };

  /* -----------------------------------------------------
     Inputs for MediaAddPopup
  ----------------------------------------------------- */
  const [mediaDescription, setMediaDescription] = useState("");
  const [mediaLocation, setMediaLocation] = useState("");

  const fileInputRef = useRef(null);

  /* -----------------------------------------------------
     ✅ API helpers (백엔드 연결만 최소 추가)
  ----------------------------------------------------- */
  const getContextPath = () => {
    // 운영(/MemorySpace/...) + 개발(루트) 모두 대응
    const p = window.location.pathname || "";
    return p.startsWith("/MemorySpace") ? "/MemorySpace" : "";
  };

  const toAbsoluteUploadUrl = (u) => {
    if (!u || typeof u !== "string") return u;
    const ctx = getContextPath();
    if (u.startsWith("/uploads/") && ctx && !u.startsWith(ctx + "/uploads/")) {
      return ctx + u;
    }
    return u;
  };

  const apiFetchJson = async (url, options) => {
    const resp = await fetch(url, {
      credentials: "include",
      ...options,
    });

    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await resp.text();
      throw new Error(`Non-JSON response: ${text.substring(0, 200)}`);
    }

    const json = await resp.json();

    if (!resp.ok) {
      const msg = (json && json.message) || `HTTP ${resp.status}`;
      throw new Error(msg);
    }
    if (json && json.success === false) {
      throw new Error(json.message || "Request failed");
    }
    return json;
  };

  const resolveDbId = (planetId) => {
    const fromMap = localToDbIdRef.current.get(planetId);
    if (fromMap != null) return fromMap;

    // 혹시 객체에 직접 dbId가 있으면 그것도 지원
    const p = planetList.find((x) => x.id === planetId);
    if (p && p.dbId != null) return p.dbId;

    return null;
  };

  /* -----------------------------------------------------
     ✅ Media API (NEW - 최소 추가)
  ----------------------------------------------------- */
  const mapServerMediaToClient = (m) => {
    const rawUrl = m && m.url ? m.url : null;
    const absUrl = rawUrl ? toAbsoluteUploadUrl(rawUrl) : rawUrl;

    return {
      id: m.id,
      mediaType: m.mediaType, // "image" | "video"
      url: absUrl,

      description: m.description || "",
      location: m.location || "",
      tags: Array.isArray(m.tags) ? m.tags : [],

      liked: !!m.liked,
      likedAt: m.likedAt || null,
      starred: !!m.starred,
      starredAt: m.starredAt || null,
      reported: !!m.reported,
      reportedAt: m.reportedAt || null,
      reportCount: typeof m.reportCount === "number" ? m.reportCount : 0,

      // 서버에서 내려온 데이터는 임시가 아님
      isTemp: false,
    };
  };

  const loadPlanetMediaFromServer = async (planetId) => {
    const dbId = resolveDbId(planetId);
    if (!dbId) return;

    const ctx = getContextPath();
    const url = `${ctx}/api/media/list?planetId=${encodeURIComponent(dbId)}`;

    const json = await apiFetchJson(url, { method: "GET" });
    const serverMedia = Array.isArray(json.media) ? json.media : [];

    const mapped = serverMedia.map(mapServerMediaToClient);

    setPlanetList((prev) =>
      prev.map((p) => {
        if (p.id !== planetId) return p;

        return {
          ...p,
          mediaList: mapped,
          // ✅ preview가 없을 때만 첫 미디어로 세팅
          preview: p.preview || mapped[0]?.url || null,
        };
      })
    );

    setMediaPopup((prev) => {
      if (!prev || !prev.planet || prev.planet.id !== planetId) return prev;

      return {
        ...prev,
        planet: {
          ...prev.planet,
          mediaList: mapped,
          preview: prev.planet.preview || mapped[0]?.url || null,
        },
      };
    });
  };

  const uploadMediaToServer = async (planetId, normalizedMediaList) => {
    const dbId = resolveDbId(planetId);
    if (!dbId) return [];

    // ✅ file + meta를 "같은 인덱스"로 묶어서 보냄
    const items = [];
    for (let i = 0; i < normalizedMediaList.length; i++) {
      const it = normalizedMediaList[i];
      if (it && it.file instanceof File) items.push(it);
    }
    if (items.length === 0) return [];

    const ctx = getContextPath();
    const url = `${ctx}/api/media/add`;

    const fd = new FormData();
    fd.append("planetId", String(dbId));

    for (let i = 0; i < items.length; i++) {
      const it = items[i];

      fd.append("files", it.file);

      // 인덱스 파라미터(description0/location0/tags0)로 전송
      if (it.description != null) fd.append(`description${i}`, String(it.description));
      if (it.location != null) fd.append(`location${i}`, String(it.location));

      // tags는 백엔드가 CSV로 파싱하므로 "a,b,c" 형태로 보냄
      if (Array.isArray(it.tags) && it.tags.length > 0) {
        fd.append(`tags${i}`, it.tags.join(","));
      } else if (typeof it.tags === "string" && it.tags.trim()) {
        fd.append(`tags${i}`, it.tags.trim());
      }
    }

    const json = await apiFetchJson(url, { method: "POST", body: fd });
    const serverMedia = Array.isArray(json.media) ? json.media : [];
    return serverMedia.map(mapServerMediaToClient);
  };

  const deleteMediaFromServer = async (planetId, media) => {
    const dbId = resolveDbId(planetId);
    if (!dbId) return;
    if (!media || !media.id) return;

    const ctx = getContextPath();
    const url = `${ctx}/api/media/delete`;

    const body = new URLSearchParams();
    body.set("planetId", String(dbId));
    body.set("mediaId", String(media.id));

    await apiFetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body.toString(),
    });
  };

  /* -----------------------------------------------------
     Planet Ref Sync
  ----------------------------------------------------- */
  useEffect(() => {
    const sortedPlanetList = [...planetList].sort((a, b) => a.id - b.id);
    planetsRef.current = sortedPlanetList;
  }, [planetList]);

  /* -----------------------------------------------------
     Find Next Planet ID
  ----------------------------------------------------- */
  const findNextPlanetId = (currentPlanetList) => {
    const existingIds = currentPlanetList.map((p) => p.id).sort((a, b) => a - b);

    let nextIdLocal = 1;
    for (const id of existingIds) {
      if (id > nextIdLocal) return nextIdLocal;
      nextIdLocal++;
    }
    return nextIdLocal;
  };

  /* -----------------------------------------------------
     ✅ 초기 로드: 해당 별(starId)의 행성 목록 불러오기
     - 로컬 id는 1..N으로 재부여 (기존 렌더 로직 유지)
     - dbId는 별도 보관
  ----------------------------------------------------- */
  useEffect(() => {
    if (!starId) return;

    const ctx = getContextPath();
    const url = `${ctx}/api/planet/list?starId=${encodeURIComponent(starId)}`;

    (async () => {
      try {
        const json = await apiFetchJson(url, { method: "GET" });
        const serverPlanets =
          (json && Array.isArray(json.planets) ? json.planets : null) ||
          (json && json.data && Array.isArray(json.data.planets) ? json.data.planets : []);

        // 로컬 id 재부여 + 매핑 구성
        const nextMap = new Map();
        let localId = 1;

        const mapped = serverPlanets.map((sp) => {
          const dbId = sp.id;
          const name = sp.name || "";

          const rawThumbUrl = sp.thumbnail && sp.thumbnail.url ? sp.thumbnail.url : null;
          const thumbUrl = rawThumbUrl ? toAbsoluteUploadUrl(rawThumbUrl) : null;
          const thumbType =
            sp.thumbnail && sp.thumbnail.type ? sp.thumbnail.type : "image";

          const normalizedPreviewFiles = thumbUrl
            ? [
                {
                  url: thumbUrl,
                  mediaType: thumbType,
                  liked: false,
                  likedAt: null,
                  starred: false,
                  starredAt: null,
                  reported: false,
                  reportedAt: null,
                  reportCount: 0,
                },
              ]
            : [];

          const getPlanetColorById = (id) => {
            const hue = (id * 137) % 360;
            const saturation = 80 + (id % 15);
            const lightness = 60 + (id % 15);
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          };

          const id = localId++;
          nextMap.set(id, dbId);

          return {
            id,
            dbId,
            r: 10 + id * 4,
            orbit: id * 100 + 150,
            speed: 0.0005 / id,
            color: getPlanetColorById(id),
            angle: Math.random() * Math.PI * 2,
            name,

            previewFiles: normalizedPreviewFiles,
            mediaList: [],

            preview: normalizedPreviewFiles?.[0]?.url || null,

            screenX: 0,
            screenY: 0,
          };
        });

        localToDbIdRef.current = nextMap;
        setPlanetList(mapped);
      } catch (e) {
        console.error("Planet list load failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starId]);

  /* -----------------------------------------------------
     ✅ (NEW) mediaPopup 열릴 때, 서버에서 해당 행성 미디어 로드
     - 기존 "어디서 setMediaPopup을 호출하든" 그대로 동작
  ----------------------------------------------------- */
  useEffect(() => {
    const pid = mediaPopup?.planet?.id;
    if (!pid) return;
    // 같은 planetId로 인해 setMediaPopup(...)가 일어나도 무한 호출되지 않도록 차단
    if (lastLoadedMediaPlanetIdRef.current === pid) return;
    lastLoadedMediaPlanetIdRef.current = pid;
    // dbId가 존재할 때만 서버 조회
    const dbId = resolveDbId(pid);
    if (!dbId) return;
    // 서버 조회 (planetId 변경 시 1회)
    loadPlanetMediaFromServer(pid).catch((e) => {
      console.error("media/list failed:", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaPopup?.planet?.id]);

  /* -----------------------------------------------------
     Add Planet
     - 기존 시그니처/리턴(boolean) 유지
     - 로컬에 즉시 추가 후, 백엔드 create 성공 시 dbId 반영
  ----------------------------------------------------- */
  const MAX_PLANETS_PER_STAR = 7;

  const addPlanet = (name, files) => {
    if (planetList.length >= MAX_PLANETS_PER_STAR) {
      alert("A maximum of 7 planets can be created per star.");
      return false;
    }
    const newId = findNextPlanetId(planetList);

    const normalizedPreviewFiles = files.map((it) => ({
      url: it.url,
      mediaType: it.mediaType,
      liked: false,
      likedAt: null,
      starred: false,
      starredAt: null,
      reported: false,
      reportedAt: null,
      reportCount: 0,
    }));

    const getPlanetColorById = (id) => {
      const hue = (newId * 137) % 360;
      const saturation = 80 + (id % 15);
      const lightness = 60 + (id % 15);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const newPlanet = {
      id: newId,
      dbId: null,
      r: 10 + newId * 4,
      orbit: newId * 100 + 150,
      speed: 0.0005 / newId,
      color: getPlanetColorById(newId),
      angle: Math.random() * Math.PI * 2,
      name,

      previewFiles: normalizedPreviewFiles,
      mediaList: [],

      preview: normalizedPreviewFiles?.[0]?.url || null,

      screenX: 0,
      screenY: 0,
    };

    setPlanetList((prev) => [...prev, newPlanet]);

    if (starId) {
      const ctx = getContextPath();
      const url = `${ctx}/api/planet/create`;

      const first = files && files[0] ? files[0] : null;
      const fileObj = first && first.file instanceof File ? first.file : null;

      if (!fileObj) {
        console.error("addPlanet: thumbnail File not found in inputFile");
        return true;
      }

      const fd = new FormData();
      fd.append("starId", String(starId));
      fd.append("name", String(name));
      fd.append("thumbnail", fileObj);

      fetch(url, { method: "POST", body: fd, credentials: "include" })
        .then(async (resp) => {
          const ct = resp.headers.get("content-type") || "";
          if (!ct.includes("application/json")) {
            const t = await resp.text();
            throw new Error(t);
          }
          const json = await resp.json();
          if (!resp.ok || (json && json.success === false)) {
            throw new Error((json && json.message) || `HTTP ${resp.status}`);
          }

          const data = json.data || {};
          const dbId = data.planetId || data.id;

          if (!dbId) return;

          localToDbIdRef.current.set(newId, dbId);

          const serverThumbUrlRaw = data.thumbnailUrl || null;
          const serverThumbUrl = serverThumbUrlRaw ? toAbsoluteUploadUrl(serverThumbUrlRaw) : null;
          const serverThumbType = data.thumbnailType || "image";

          if (serverThumbUrl) {
            setPlanetList((prev) =>
              prev.map((p) => {
                if (p.id !== newId) return p;
                const pf = [
                  {
                    url: serverThumbUrl,
                    mediaType: serverThumbType,
                    liked: false,
                    likedAt: null,
                    starred: false,
                    starredAt: null,
                    reported: false,
                    reportedAt: null,
                    reportCount: 0,
                  },
                ];
                return { ...p, dbId, previewFiles: pf, preview: serverThumbUrl };
              })
            );
          } else {
            setPlanetList((prev) =>
              prev.map((p) => (p.id === newId ? { ...p, dbId } : p))
            );
          }
        })
        .catch((e) => {
          console.error("planet/create failed:", e);
          setPlanetList((prev) => prev.filter((p) => p.id !== newId));
          localToDbIdRef.current.delete(newId);
        });
    }

    return true;
  };

  /* -----------------------------------------------------
     ✅ Update Planet (이름/썸네일)
     - 기존 로컬 업데이트 로직 유지
     - 서버 update만 추가
  ----------------------------------------------------- */
  const updatePlanet = (planetId, newName, newFile) => {
    let newPreviewUrl = null;
    let newPreviewFiles = null;

    if (newFile instanceof File) {
      newPreviewUrl = URL.createObjectURL(newFile);
      const mediaType = newFile.type?.startsWith("video") ? "video" : "image";

      newPreviewFiles = [
        {
          url: newPreviewUrl,
          mediaType,
          liked: false,
          likedAt: null,
          starred: false,
          starredAt: null,
          reported: false,
          reportedAt: null,
          reportCount: 0,
        },
      ];
    }

    setPlanetList((prev) =>
      prev.map((p) => {
        if (p.id !== planetId) return p;

        const updated = {
          ...p,
          name: typeof newName === "string" ? newName : p.name,
        };

        if (newPreviewFiles) {
          updated.previewFiles = newPreviewFiles;
          updated.preview = newPreviewUrl;
        }

        return updated;
      })
    );

    setMediaPopup((prev) => {
      if (!prev || prev.planet.id !== planetId) return prev;

      const updatedPlanet = {
        ...prev.planet,
        name: typeof newName === "string" ? newName : prev.planet.name,
      };

      if (newPreviewFiles) {
        updatedPlanet.previewFiles = newPreviewFiles;
        updatedPlanet.preview = newPreviewUrl;
      }

      return { ...prev, planet: updatedPlanet };
    });

    if (!starId) return;

    const dbId = resolveDbId(planetId);
    if (!dbId) {
      console.warn("updatePlanet: dbId not found for planetId", planetId);
      return;
    }

    const ctx = getContextPath();
    const url = `${ctx}/api/planet/update`;

    const fd = new FormData();
    fd.append("starId", String(starId));
    fd.append("planetId", String(dbId));
    if (typeof newName === "string") fd.append("name", newName);
    if (newFile instanceof File) fd.append("thumbnail", newFile);

    fetch(url, { method: "POST", body: fd, credentials: "include" })
      .then(async (resp) => {
        const ct = resp.headers.get("content-type") || "";
        if (!ct.includes("application/json")) return;

        const json = await resp.json();
        if (!resp.ok || (json && json.success === false)) return;

        const data = json.data || {};
        const serverThumbUrl = data.thumbnailUrl || null;
        const serverThumbType = data.thumbnailType || "image";

        if (serverThumbUrl) {
          const abs = toAbsoluteUploadUrl(serverThumbUrl);
          const pf = [
            {
              url: abs,
              mediaType: serverThumbType,
              liked: false,
              likedAt: null,
              starred: false,
              starredAt: null,
              reported: false,
              reportedAt: null,
              reportCount: 0,
            },
          ];
          setPlanetList((prev) =>
            prev.map((p) =>
              p.id === planetId ? { ...p, previewFiles: pf, preview: abs } : p
            )
          );
          setMediaPopup((prev) => {
            if (!prev || prev.planet.id !== planetId) return prev;
            return {
              ...prev,
              planet: { ...prev.planet, previewFiles: pf, preview: abs },
            };
          });
        }
      })
      .catch((e) => console.error("planet/update failed:", e));
  };

  /* -----------------------------------------------------
     Delete Planet
     - 기존 로컬 삭제 로직 유지
     - 서버 delete 추가
  ----------------------------------------------------- */
  const deletePlanet = (planetId) => {
    console.log(`🗑️ 행성 삭제 시작: ID ${planetId}`);

    if (starId) {
      const dbId = resolveDbId(planetId);
      if (dbId) {
        const ctx = getContextPath();
        const url = `${ctx}/api/planet/delete`;

        const body = new URLSearchParams();
        body.set("starId", String(starId));
        body.set("planetId", String(dbId));

        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: body.toString(),
          credentials: "include",
        }).catch((e) => console.error("planet/delete failed:", e));
      } else {
        console.warn("deletePlanet: dbId not found for planetId", planetId);
      }
    }

    setHoveredListPlanet(null);
    setMediaPopup(null);
    setPlanetEditPopup(null);
    isPausedRef.current = false;

    setPlanetList((prevList) => {
      const newList = prevList.filter((p) => p.id !== planetId);
      console.log(`✅ 삭제 완료. 남은 행성: ${newList.length}개`);
      console.log(`남은 행성 ID:`, newList.map((p) => p.id));
      return newList;
    });

    localToDbIdRef.current.delete(planetId);
  };

  /* -----------------------------------------------------
     이하 기존 로직은 변경하지 않음
     (addMediaToPlanet / updatePlanetMeta / updateMediaMeta / deleteMediaFromPlanet
      toggleLike/toggleStar/reportMedia 등)
  ----------------------------------------------------- */

  const addMediaToPlanet = (planetId, files) => {
    console.log("🎬 addMediaToPlanet 호출됨");
    console.log("전달된 files:", files);

    const normalizedMedia = files.map((file) => {
      const fileUrl = file.url || file.media || (file instanceof File ? URL.createObjectURL(file) : URL.createObjectURL(file.file));
      const fileType =
        file.mediaType || (file.type?.startsWith("video") ? "video" : "image");

      return {
        ...file,
        url: fileUrl,
        mediaType: fileType,
        liked: false,
        likedAt: null,
        starred: false,
        starredAt: null,
        reported: false,
        reportedAt: null,
        reportCount: 0,

        // ✅ (NEW) 업로드 전 임시 마크
        isTemp: true,
      };
    });

    // ----- 기존: 즉시 로컬 반영(그대로) -----
    setPlanetList((prevList) => {
      return prevList.map((p) => {
        if (p.id !== planetId) return p;

        const updatedPlanet = { ...p };
        updatedPlanet.mediaList = [...(p.mediaList || []), ...normalizedMedia];

        updatedPlanet.preview = updatedPlanet.mediaList[0]?.url || p.preview || null;

        return updatedPlanet;
      });
    });

    setMediaPopup((prev) => {
      if (!prev || prev.planet.id !== planetId) return prev;
      return {
        ...prev,
        planet: {
          ...prev.planet,
          mediaList: [...(prev.planet.mediaList || []), ...normalizedMedia],
        },
      };
    });

    // ----- ✅ (NEW) 서버 업로드 후 서버 데이터로 교체 -----
    uploadMediaToServer(planetId, normalizedMedia)
      .then((serverMedia) => {
        if (!serverMedia || serverMedia.length === 0) return;

        setPlanetList((prev) =>
          prev.map((p) => {
            if (p.id !== planetId) return p;

            const keep = (p.mediaList || []).filter((m) => !m.isTemp);
            const merged = [...keep, ...serverMedia];

            return {
              ...p,
              mediaList: merged,
              preview: merged[0]?.url || p.preview || null,
            };
          })
        );

        setMediaPopup((prev) => {
          if (!prev || prev.planet.id !== planetId) return prev;
          const keep = (prev.planet.mediaList || []).filter((m) => !m.isTemp);
          const merged = [...keep, ...serverMedia];
          return {
            ...prev,
            planet: {
              ...prev.planet,
              mediaList: merged,
              preview: merged[0]?.url || prev.planet.preview || null,
            },
          };
        });
      })
      .catch((e) => {
        console.error("media/add failed:", e);
      });
  };

  const updatePlanetMeta = (planetId, { tags, description, location }) => {
    setPlanetList((prev) =>
      prev.map((p) => {
        if (p.id !== planetId) return p;
        return {
          ...p,
          tags: tags ?? p.tags,
          description: description ?? p.description,
          location: location ?? p.location,
        };
      })
    );

    setMediaPopup((prev) => {
      if (!prev || prev.planet.id !== planetId) return prev;
      return {
        ...prev,
        planet: {
          ...prev.planet,
          tags: tags ?? prev.planet.tags ?? [],
          description: description ?? prev.planet.description ?? "",
          location: location ?? prev.planet.location ?? "",
        },
      };
    });
  };

  const updateMediaMeta = async (planetId, mediaIndex, { description, location, tags }) => {
    const dbPlanetId = resolveDbId(planetId);
    if (!dbPlanetId) return;

    // ✅ FIX: mediaPopup.media 가 아니라 mediaPopup.planet.mediaList
    const media = mediaPopup?.planet?.mediaList?.[mediaIndex];
    if (!media || !media.id) return;

    const ctx = getContextPath();
    const url = `${ctx}/api/media/update`;

    const body = new URLSearchParams();
    body.set("planetId", String(dbPlanetId));
    body.set("mediaId", String(media.id));
    if (description != null) body.set("description", String(description));
    if (location != null) body.set("location", String(location));
    if (Array.isArray(tags)) body.set("tags", tags.join(","));
    else if (typeof tags === "string") body.set("tags", tags);

    // ✅ 서버 반영
    await apiFetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body.toString(),
    });

    // ✅ location이 변경/입력된 경우 좌표 갱신 트리거 (서블릿 파라미터명은 실제 구현에 맞춰 조정 필요)
    if (location != null && String(location).trim()) {
      try {
        const mapUrl = `${ctx}/api/map/update-coordinates`; // 실제 servlet mapping으로 변경
        const mapBody = new URLSearchParams();
        mapBody.set("mediaId", String(media.id));
        mapBody.set("location", String(location));

        await apiFetchJson(mapUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: mapBody.toString(),
        });
      } catch (e) {
        console.warn("map/update-coordinates failed:", e);
      }
    }

    // ✅ (권장) 서버 반영 성공 후 UI도 즉시 동기화(최소 범위)
    setPlanetList((prev) =>
      prev.map((p) => {
        if (p.id !== planetId) return p;
        const nextList = (p.mediaList || []).map((m, idx) => {
          if (idx !== mediaIndex) return m;
          return {
            ...m,
            description: description ?? m.description,
            location: location ?? m.location,
            tags: tags ?? m.tags,
          };
        });
        return { ...p, mediaList: nextList };
      })
    );

    setMediaPopup((prev) => {
      if (!prev || prev.planet?.id !== planetId) return prev;
      const nextList = (prev.planet.mediaList || []).map((m, idx) => {
        if (idx !== mediaIndex) return m;
        return {
          ...m,
          description: description ?? m.description,
          location: location ?? m.location,
          tags: tags ?? m.tags,
        };
      });
      return { ...prev, planet: { ...prev.planet, mediaList: nextList } };
    });
  };

  const deleteMediaFromPlanet = (planetId, mediaIndex) => {
    // ✅ (NEW) 서버 삭제를 위해 삭제 대상 media 캡처
    const planetSnapshot =
      planetsRef.current && planetsRef.current.length
        ? planetsRef.current.find((p) => p.id === planetId)
        : planetList.find((p) => p.id === planetId);

    const mediaSnapshot =
      planetSnapshot && Array.isArray(planetSnapshot.mediaList)
        ? planetSnapshot.mediaList[mediaIndex]
        : null;

    let updatedPlanet = null;

    setPlanetList((prevList) => {
      const target = prevList.find((p) => p.id === planetId);
      if (!target) return prevList;

      const newMediaList = target.mediaList.filter((_, idx) => idx !== mediaIndex);

      const newList = prevList.map((p) => {
        if (p.id !== planetId) return p;

        updatedPlanet = {
          ...p,
          mediaList: newMediaList,
          preview: newMediaList[0]?.url || null,
        };
        return updatedPlanet;
      });

      return newList;
    });

    setMediaPopup((prevPopup) => {
      if (!prevPopup || prevPopup.planet.id !== planetId) return prevPopup;

      if (updatedPlanet) {
        return { planet: updatedPlanet, zoomIndex: null };
      }
      return prevPopup;
    });

    // ✅ (NEW) 서버 soft-delete
    if (mediaSnapshot && mediaSnapshot.id) {
      deleteMediaFromServer(planetId, mediaSnapshot).catch((e) =>
        console.error("media/delete failed:", e)
      );
    }
  };

  const toggleLike = (planetId, mediaIndex) => {
    setPlanetList((prevList) =>
      prevList.map((p) => {
        if (p.id !== planetId) return p;
        return {
          ...p,
          mediaList: p.mediaList.map((m, idx) => {
            if (idx !== mediaIndex) return m;
            const next = !m.liked;
            return { ...m, liked: next, likedAt: next ? new Date().toISOString() : null };
          }),
        };
      })
    );

    setMediaPopup((prev) => {
      if (!prev || prev.planet.id !== planetId) return prev;
      return {
        ...prev,
        planet: {
          ...prev.planet,
          mediaList: prev.planet.mediaList.map((m, idx) => {
            if (idx !== mediaIndex) return m;
            const next = !m.liked;
            return { ...m, liked: next, likedAt: next ? new Date().toISOString() : null };
          }),
        },
      };
    });
  };

  const toggleStar = (planetId, mediaIndex) => {
    setPlanetList((prevList) =>
      prevList.map((p) => {
        if (p.id !== planetId) return p;
        return {
          ...p,
          mediaList: p.mediaList.map((m, idx) => {
            if (idx !== mediaIndex) return m;
            const next = !m.starred;
            return { ...m, starred: next, starredAt: next ? new Date().toISOString() : null };
          }),
        };
      })
    );

    setMediaPopup((prev) => {
      if (!prev || prev.planet.id !== planetId) return prev;
      return {
        ...prev,
        planet: {
          ...prev.planet,
          mediaList: prev.planet.mediaList.map((m, idx) => {
            if (idx !== mediaIndex) return m;
            const next = !m.starred;
            return { ...m, starred: next, starredAt: next ? new Date().toISOString() : null };
          }),
        },
      };
    });
  };

  const reportMedia = (planetId, mediaIndex, reason) => {
    setPlanetList((prevList) =>
      prevList.map((p) => {
        if (p.id !== planetId) return p;
        return {
          ...p,
          mediaList: p.mediaList.map((m, idx) => {
            if (idx !== mediaIndex) return m;
            return {
              ...m,
              reported: true,
              reportedAt: new Date().toISOString(),
              reportCount: (m.reportCount || 0) + 1,
              reportReason: reason,
              reportHistory: [
                ...(m.reportHistory || []),
                { reason, timestamp: new Date().toISOString() },
              ],
            };
          }),
        };
      })
    );

    setMediaPopup((prev) => {
      if (!prev || prev.planet.id !== planetId) return prev;
      return {
        ...prev,
        planet: {
          ...prev.planet,
          mediaList: prev.planet.mediaList.map((m, idx) => {
            if (idx !== mediaIndex) return m;
            return {
              ...m,
              reported: true,
              reportedAt: new Date().toISOString(),
              reportCount: (m.reportCount || 0) + 1,
              reportReason: reason,
              reportHistory: [
                ...(m.reportHistory || []),
                { reason, timestamp: new Date().toISOString() },
              ],
            };
          }),
        },
      };
    });

    alert("Your report has been submitted.");
  };

  const closeAddPopup = () => {
    setPopupOpen(false);
    setHoveredListPlanet(null);
    isPausedRef.current = false;

    setInputFile([]);
    setInputName("");
  };

  const openPlanetEditPopup = (planet) => {
    if (!planet) return;
    setPlanetEditPopup({ planet });
    isPausedRef.current = true;
  };

  const closePlanetEditPopup = () => {
    setPlanetEditPopup(null);
    isPausedRef.current = false;
  };

  const closeMediaPopup = () => {
    setMediaPopup(null);
    lastLoadedMediaPlanetIdRef.current = null;
    setHoveredListPlanet(null);
    isPausedRef.current = false;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    const previewList = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      mediaType: file.type.startsWith("video") ? "video" : "image",
      description: "",
      location: "",
    }));

    setInputFile((prev) => [...prev, ...previewList]);
    e.target.value = "";
  };

  return {
    containerRef,
    planetsRef,
    labelRefs,
    isPausedRef,
    nextId,

    planetList,
    hoveredListPlanet,

    popupOpen,
    planetEditPopup,

    mediaPopup,

    inputName,
    inputFile,
    inputTag,
    tags,
    description,
    location,

    mediaDescription,
    mediaLocation,

    fileInputRef,

    setPlanetList,
    setHoveredListPlanet,
    setPopupOpen,
    setMediaPopup,
    setInputName,
    setInputFile,
    setInputTag,
    setTags,
    setDescription,
    setLocation,
    setMediaDescription,
    setMediaLocation,

    addPlanet,
    updatePlanet,
    updatePlanetMeta,
    updateMediaMeta,

    deletePlanet,
    deleteMediaFromPlanet,
    addMediaToPlanet,

    handleFileChange,
    closeAddPopup,

    openPlanetEditPopup,
    closePlanetEditPopup,

    closeMediaPopup,

    toggleLike,
    toggleStar,
    reportMedia,
  };
}
