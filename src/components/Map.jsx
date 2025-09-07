import { useEffect, useRef, useState } from "react";

export default function Map() {
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initMap = async () => {
      try {
        await new Promise((resolve) => window.kakao.maps.load(resolve));

        const { maps } = window.kakao;
        const container = mapRef.current;
        if (!container) return;

        // 초기 중심: 선릉역
        const seolleung = new maps.LatLng(37.504, 127.048);
        const map = new maps.Map(container, { center: seolleung, level: 4 });

        // 1) 스토어 목록 가져오기
        const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8081";
        const res = await fetch(`${apiBase}/api/v1/stores`);
        if (!res.ok) throw new Error(`stores fetch failed: ${res.status}`);
        const stores = await res.json(); // [{id,brandId,name,lat,lon,address}, ...]

        // 2) 마커 찍고 bounds 계산
        const bounds = new maps.LatLngBounds();
        stores.forEach((s) => {
          // 좌표가 유효할 때만
          if (typeof s.lat === "number" && typeof s.lon === "number") {
            const pos = new maps.LatLng(s.lat, s.lon);
            const marker = new maps.Marker({ position: pos });
            marker.setMap(map);

            // 간단한 인포윈도우
            const iw = new maps.InfoWindow({
              content: `<div style="padding:6px 8px;font-size:12px">${s.name}</div>`,
            });
            maps.event.addListener(marker, "click", () => iw.open(map, marker));

            bounds.extend(pos);
          }
        });

        // 3) 하나 이상이면 범위 맞추기, 없으면 선릉역 고정
        if (!bounds.isEmpty()) {
          map.setBounds(bounds, 30, 30, 30, 30); // 여백
        } else {
          new maps.Marker({ position: seolleung }).setMap(map);
        }

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
      initMap();
    } else if (script) {
      const onLoad = () => initMap();
      script.addEventListener("load", onLoad, { once: true });
      return () => script.removeEventListener("load", onLoad);
    }
  }, []);

  return (
    <div className="p-4">
      <div
        ref={mapRef}
        id="map"
        className="w-full h-[420px] border border-gray-200 rounded-lg"
      />
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
