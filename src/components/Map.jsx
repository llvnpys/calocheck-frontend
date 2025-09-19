import { useEffect, useRef, useState, useCallback } from "react";

export default function Map({ searchParams }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // 지도 이동 감지용
  const [moved, setMoved] = useState(false);
  const [pendingCenter, setPendingCenter] = useState(null); // 사용자가 이동해서 생긴 '임시 중심'

  const DEFAULT_LEVEL = 4;
  const DEFAULT_CENTER = { lat: 37.504, lon: 127.048 }; // 선릉역

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  // 카테고리 → 색상 → Kakao MarkerImage 생성
  const markerImageFor = (maps, category) => {
    const color =
      category === "cafe"
        ? "#10b981" // 초록 (카페)
        : category === "restaurant"
        ? "#3b82f6" // 파랑 (음식점)
        : "#9ca3af"; // 회색 (기타)

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
    <path d="M15 42c6-9 12-14 12-21A12 12 0 1 0 3 21c0 7 6 12 12 21z" fill="${color}"/>
    <circle cx="15" cy="15" r="6" fill="white"/>
  </svg>`;

    const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new window.kakao.maps.MarkerImage(
      url,
      new window.kakao.maps.Size(30, 42),
      { offset: new window.kakao.maps.Point(15, 42) } // 핀 끝이 좌표를 가리키도록
    );
  };

  /**
   * 마커 갱신
   * - opts.center 가 있으면: 지도의 중심/레벨을 고정 유지(또는 호출부에서 제어)하고, 마커만 교체
   * - opts.center 가 없으면: 초기 로드로 간주, 마커 후 bounds 맞춤
   */
  const updateMarkers = useCallback(
    async (opts = {}) => {
      if (!mapInstanceRef.current) return; // 아직 지도 준비 전
      try {
        setError("");

        // Construct payload for API
        const categoriesObj = searchParams?.categories ?? {};
        const categories = Object.entries(categoriesObj)
          .filter(([, v]) => v)
          .map(([k]) => k);

        console.log(categories);

        const getRangeValue = (field) => {
          if (searchParams?.[field] !== undefined) return searchParams[field];
          if (
            searchParams?.[field]?.min !== undefined ||
            searchParams?.[field]?.max !== undefined
          ) {
            return {
              min: searchParams[field]?.min,
              max: searchParams[field]?.max,
            };
          }
          return undefined;
        };

        const caloriesMin =
          searchParams?.caloriesMin ?? searchParams?.calories?.min;
        const caloriesMax =
          searchParams?.caloriesMax ?? searchParams?.calories?.max;
        const proteinMin =
          searchParams?.proteinMin ?? searchParams?.protein?.min;
        const proteinMax =
          searchParams?.proteinMax ?? searchParams?.protein?.max;
        const fatMin = searchParams?.fatMin ?? searchParams?.fat?.min;
        const fatMax = searchParams?.fatMax ?? searchParams?.fat?.max;
        const carbMin = searchParams?.carbMin ?? searchParams?.carb?.min;
        const carbMax = searchParams?.carbMax ?? searchParams?.carb?.max;

        const centerLat =
          opts.center?.lat ?? pendingCenter?.lat ?? DEFAULT_CENTER.lat;
        const centerLon =
          opts.center?.lon ?? pendingCenter?.lon ?? DEFAULT_CENTER.lon;

        const payload = {
          ...(categories.length > 0 ? { categories } : {}),
          ...(caloriesMin !== undefined ? { caloriesMin } : {}),
          ...(caloriesMax !== undefined ? { caloriesMax } : {}),
          ...(proteinMin !== undefined ? { proteinMin } : {}),
          ...(proteinMax !== undefined ? { proteinMax } : {}),
          ...(fatMin !== undefined ? { fatMin } : {}),
          ...(fatMax !== undefined ? { fatMax } : {}),
          ...(carbMin !== undefined ? { carbMin } : {}),
          ...(carbMax !== undefined ? { carbMax } : {}),
          centerLat,
          centerLon,
        };

        // 1) 데이터 가져오기 (필요하면 searchParams를 쿼리스트링으로 변환)
        const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8081";
        const res = await fetch(`${apiBase}/api/v1/stores/filtered`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`stores fetch failed: ${res.status}`);
        const stores = await res.json();

        console.log(stores);

        // 2) 기존 마커 제거 후 새로 렌더링
        const { maps } = window.kakao;
        const map = mapInstanceRef.current;
        clearMarkers();

        const bounds = new maps.LatLngBounds();

        // 2-1) 카테고리 필터 적용
        const activeCats = Object.entries(searchParams?.categories ?? {})
          .filter(([, v]) => v)
          .map(([k]) => k); // ['cafe','restaurant'] 등

        const visibleStores = activeCats.length
          ? stores.filter((s) => {
              const cat = s.brandCategory ?? s.category ?? "etc";
              return activeCats.includes(cat);
            })
          : stores;

        visibleStores.forEach((s) => {
          if (typeof s.lat === "number" && typeof s.lon === "number") {
            const cat = s.brandCategory ?? s.category ?? "etc";
            const image = markerImageFor(maps, cat);
            const pos = new maps.LatLng(s.lat, s.lon);
            const marker = new maps.Marker({ position: pos, image });
            marker.setMap(map);

            const iw = new maps.InfoWindow({
              content: `<div style="padding:6px 8px;font-size:12px">${s.name}</div>`,
            });
            maps.event.addListener(marker, "click", () => iw.open(map, marker));

            markersRef.current.push(marker);
            bounds.extend(pos);
          }
        });

        // opts.center 가 없을 때만 bounds 맞춤 (초기 로드 등)
        if (!opts.center && !bounds.isEmpty()) {
          map.setBounds(bounds, 30, 30, 30, 30);
        }
      } catch (e) {
        console.error(e);
        setError(e.message || "매장 렌더링 실패");
      }
    },
    [clearMarkers, searchParams]
  );

  // 초기 지도 로드
  useEffect(() => {
    const initMap = async () => {
      try {
        await new Promise((resolve) => window.kakao.maps.load(resolve));

        const { maps } = window.kakao;
        const container = mapRef.current;
        if (!container) return;

        const center = new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lon);
        const map = new maps.Map(container, { center, level: DEFAULT_LEVEL });
        mapInstanceRef.current = map;

        // 지도 이동/확대 축소 이벤트 → 재검색 버튼 활성화 & 임시 중심 저장
        const handleMoved = () => {
          const c = map.getCenter();
          setPendingCenter({ lat: c.getLat(), lon: c.getLng() });
          setMoved(true);
        };
        maps.event.addListener(map, "dragend", handleMoved);
        maps.event.addListener(map, "zoom_changed", handleMoved);

        setReady(true);
      } catch (e) {
        console.error(e);
        setError(e.message || "지도 초기화 실패");
      }
    };

    const script = document.querySelector(
      'script[src*="dapi.kakao.com/v2/maps/sdk.js"]'
    );

    if (window.kakao?.maps?.load) {
      initMap().then(() => updateMarkers());
    } else if (script) {
      const onLoad = () => initMap().then(() => updateMarkers());
      script.addEventListener("load", onLoad, { once: true });
      return () => script.removeEventListener("load", onLoad);
    }
  }, [updateMarkers]);

  // 검색 파라미터 변경 시(사이드바) → 마커 갱신
  useEffect(() => {
    if (!ready) return;
    updateMarkers();
  }, [ready, searchParams, updateMarkers]);

  // "이 위치에서 재검색" 클릭 핸들러
  const handleSearchHere = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const { maps } = window.kakao;
    const map = mapInstanceRef.current;

    const center = pendingCenter ?? DEFAULT_CENTER;
    map.setLevel(DEFAULT_LEVEL);
    map.setCenter(new maps.LatLng(center.lat, center.lon));

    // TODO: 백엔드 연동 시, center를 쿼리에 포함해 서버 필터링 호출
    updateMarkers({ center });

    setMoved(false);
  }, [pendingCenter, updateMarkers]);

  return (
    <div className="p-4">
      <div className="relative">
        {/* 재검색 버튼 (지도가 움직였을 때만 노출) */}
        {moved && (
          <button
            onClick={handleSearchHere}
            className="absolute left-1/2 -translate-x-1/2 top-3 z-10 bg-black text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800 transition"
          >
            이 위치에서 재검색
          </button>
        )}

        <div
          ref={mapRef}
          id="map"
          className="w-full h-[420px] border border-gray-200 rounded-lg"
        />
      </div>

      {!ready && !error && (
        <p className="mt-2 text-sm text-gray-600">지도를 불러오는 중…</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">
          에러: {error} (개발자도구 Network 확인)
        </p>
      )}
    </div>
  );
}
