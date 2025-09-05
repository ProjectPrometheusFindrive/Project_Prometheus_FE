// Map-related utilities shared by map components

// Simple point-in-polygon using ray casting; expects {lat, lng}
export function pointInPolygon(pt, poly) {
  if (!pt || !Array.isArray(poly) || poly.length < 3) return false;
  const x = pt.lng, y = pt.lat;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Guess a company HQ coordinate from saved address (rough heuristic)
export function getCompanyLatLng() {
  try {
    const raw = localStorage.getItem("companyInfo");
    const info = raw ? JSON.parse(raw) : null;
    const addr = (info && info.address ? String(info.address) : "").toLowerCase();
    const cityMap = [
      { k: ["seoul", "서울"], lat: 37.5665, lng: 126.978 },
      { k: ["busan", "부산"], lat: 35.1796, lng: 129.0756 },
      { k: ["incheon", "인천"], lat: 37.4563, lng: 126.7052 },
      { k: ["daegu", "대구"], lat: 35.8714, lng: 128.6014 },
      { k: ["daejeon", "대전"], lat: 36.3504, lng: 127.3845 },
      { k: ["gwangju", "광주"], lat: 35.1595, lng: 126.8526 },
      { k: ["ulsan", "울산"], lat: 35.5384, lng: 129.3114 },
      { k: ["jeju", "제주"], lat: 33.4996, lng: 126.5312 },
    ];
    for (const c of cityMap) {
      if (c.k.some((kw) => addr.includes(kw))) return { lat: c.lat, lng: c.lng };
    }
  } catch {}
  // Fallback to Korea center
  return { lat: 36.5, lng: 127.9 };
}

export default {
  pointInPolygon,
  getCompanyLatLng,
};

