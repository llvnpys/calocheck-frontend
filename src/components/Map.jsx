import { useEffect, useRef, useState, useCallback } from "react";

export default function Map({ searchParams }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // 핀 클릭 시 하단 시트로 메뉴를 보여주기 위한 상태
  const [selectedStore, setSelectedStore] = useState(null);
  const [menus, setMenus] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");

  // 지도 이동 감지용
  const [moved, setMoved] = useState(false);
  const [pendingCenter, setPendingCenter] = useState(null); // 사용자가 이동해서 생긴 '임시 중심'

  const DEFAULT_LEVEL = 4;
  const DEFAULT_CENTER = { lat: 37.504, lon: 127.048 }; // 선릉역
  // 줌 레벨 제약 (숫자 작을수록 더 확대된 상태)
  const MIN_LEVEL = 3; // 너무 가까이 들어가지 않게 제한
  const MAX_LEVEL = 6; // 너무 멀리 나가지 않게 제한
  const clampLevel = (lvl) => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, lvl));

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
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
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="32" viewBox="0 0 30 42">
    <path d="M15 42c6-9 12-14 12-21A12 12 0 1 0 3 21c0 7 6 12 12 21z" fill="${color}"/>
    <circle cx="15" cy="15" r="6" fill="white"/>
  </svg>`;

    const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new window.kakao.maps.MarkerImage(
      url,
      new window.kakao.maps.Size(22, 32),
      { offset: new window.kakao.maps.Point(11, 32) }
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
            const marker = new maps.Marker({
              position: pos,
              image,
              clickable: true,
            });
            marker.setMap(map);
            // 라벨보다 위에 있도록 보장 (라벨 zIndex는 2)
            marker.setZIndex?.(3);

            // 매장 이름 라벨 오버레이 (항상 표시, 핀 위쪽에 배치, DOM 클릭으로 바텀시트 열기)
            const label = document.createElement("div");
            label.style.cssText = [
              "white-space:nowrap",
              "background:rgba(255,255,255,0.95)",
              "border:1px solid rgba(0,0,0,0.14)",
              "border-radius:8px",
              "padding:2px 8px",
              "font-size:11px",
              "line-height:1.2",
              "color:#111827",
              "font-weight:600",
              "box-shadow:0 2px 6px rgba(0,0,0,0.18)",
              // 핀과 거의 겹치지 않도록 더 위로 올림
              "transform:translateY(-28px)",
              "pointer-events:auto",
              "user-select:none",
              "cursor:pointer",
            ].join(";");
            label.textContent = s.name;
            const overlay = new maps.CustomOverlay({
              position: pos,
              content: label,
              xAnchor: 0.5, // 중앙 정렬
              yAnchor: 1.0, // 마커 꼭지 기준으로 라벨의 하단을 맞춤 (위로 배치)
              clickable: true,
            });
            overlay.setMap(map);
            // 마커보다 위에 보이도록 (겹침 방지)
            overlay.setZIndex?.(2);
            overlaysRef.current.push(overlay);
            // DOM 이벤트로 바텀시트 열기 (Kakao overlay 이벤트 대신)
            const openBottomSheet = () => {
              setSelectedStore(s);
              fetchMenusForBrand(s.brandId);
            };
            label.addEventListener("click", openBottomSheet);
            label.addEventListener("touchstart", openBottomSheet, {
              passive: true,
            });

            maps.event.addListener(marker, "click", () => {
              setSelectedStore(s);
              fetchMenusForBrand(s.brandId);
            });

            markersRef.current.push(marker);
            bounds.extend(pos);
          }
        });

        // 마커가 있으면 항상 bounds를 한 번 맞추되, 줌 레벨은 min/max로 보정
        if (!bounds.isEmpty()) {
          map.setBounds(bounds, 30, 30, 30, 30);
          const current = map.getLevel();
          const clamped = clampLevel(current);
          if (clamped !== current) map.setLevel(clamped);
          // 사용자가 '이 위치에서 재검색'으로 center를 지정한 경우, 보기 레벨 유지한 채 중심만 재설정
          if (opts.center) {
            map.setCenter(new maps.LatLng(centerLat, centerLon));
          }
        }
      } catch (e) {
        console.error(e);
        setError(e.message || "매장 렌더링 실패");
      }
    },
    [clearMarkers, searchParams]
  );

  // 선택된 브랜드의 메뉴를 현재 필터로 조회
  const fetchMenusForBrand = useCallback(
    async (brandId) => {
      if (!brandId) return;
      try {
        setMenuLoading(true);
        setMenuError("");
        setMenus([]);

        // MenuFilterDto에는 categories가 없으므로 제외
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

        const centerLat = pendingCenter?.lat ?? DEFAULT_CENTER.lat;
        const centerLon = pendingCenter?.lon ?? DEFAULT_CENTER.lon;

        const payload = {
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

        const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8081";
        const res = await fetch(
          `${apiBase}/api/v1/brands/${brandId}/menus/filtered`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) throw new Error(`menus fetch failed: ${res.status}`);
        const data = await res.json();
        setMenus(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setMenuError(e.message || "메뉴 조회 실패");
      } finally {
        setMenuLoading(false);
      }
    },
    [searchParams, pendingCenter]
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
    // 현재 레벨을 기준으로 min/max 제약 적용 (너무 멀면 MAX_LEVEL로, 너무 가까우면 MIN_LEVEL로)
    const current = map.getLevel();
    if (current > MAX_LEVEL) map.setLevel(MAX_LEVEL);
    else if (current < MIN_LEVEL) map.setLevel(MIN_LEVEL);
    map.setCenter(new maps.LatLng(center.lat, center.lon));
    updateMarkers({ center });
    setMoved(false);
  }, [pendingCenter, updateMarkers]);

  return (
    <div className="relative w-full">
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

        <div ref={mapRef} id="map" className="w-full h-[420px]" />
      </div>

      {!ready && !error && (
        <p className="mt-2 text-sm text-gray-600">지도를 불러오는 중…</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">
          에러: {error} (개발자도구 Network 확인)
        </p>
      )}

      {selectedStore && (
        <div
          className="fixed left-0 right-0 bottom-0 z-40 bg-white rounded-t-xl shadow-[0_-8px_24px_rgba(0,0,0,0.15)]"
          style={{ maxHeight: "70vh" }}
        >
          <div className="py-2 border-b border-gray-200 relative">
            <div className="w-10 h-1 bg-gray-300 rounded mx-auto my-1.5" />
            <div className="text-center font-semibold">
              {selectedStore.name}
            </div>
            <button
              onClick={() => {
                setSelectedStore(null);
                setMenus([]);
                setMenuError("");
              }}
              className="absolute right-3 top-2 text-gray-500"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
            {menuLoading && <div className="p-4">불러오는 중…</div>}
            {menuError && <div className="p-4 text-red-600">{menuError}</div>}
            {!menuLoading && !menuError && (
              <ul className="divide-y divide-gray-100">
                {menus.length === 0 && (
                  <li className="p-4 text-gray-600">
                    조건에 맞는 메뉴가 없어요.
                  </li>
                )}
                {menus.map((m) => (
                  <li key={m.id} className="p-4">
                    <div className="font-semibold">
                      {m.name}
                      {m.size ? ` · ${m.size}` : ""}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {m.calories != null ? `${m.calories} kcal` : "-"}
                      {m.protein != null ? ` · P ${m.protein}g` : ""}
                      {m.fat != null ? ` · F ${m.fat}g` : ""}
                      {m.carbohydrate != null ? ` · C ${m.carbohydrate}g` : ""}
                      {m.caffeineMg != null ? ` · Caf ${m.caffeineMg}mg` : ""}
                    </div>
                    <div className="mt-1 font-bold">
                      {m.price != null
                        ? `${Number(m.price).toLocaleString()}원`
                        : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => fetchMenusForBrand(selectedStore.brandId)}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition"
            >
              이 조건으로 다시 검색
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
